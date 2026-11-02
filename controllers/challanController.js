import Challan from '../models/Challan.js';
import Merchant from '../models/Merchant.js';
import Profile from '../models/Profile.js';
import { DEFAULT_PROFILES } from '../config/defaultProfiles.js';
import { generateChallanPrintHtml } from '../utils/printTemplate.js';
import {
  syncChallanToGoogleDrive,
  getDriveConfig,
  updateDriveConfig
} from '../utils/googleDriveSync.js';

// નવો ચલણ / બિલ બનાવો (Create Challan / Bill)
export async function createChallan(req, res) {
  try {
    const {
      firm,
      firmName: rawFirmName,
      profileId,
      merchantId,
      merchantName: rawMerchantName,
      merchantAddress: rawMerchantAddress,
      merchantMobile: rawMerchantMobile,
      merchantGstin,
      stateCode,
      billNo: rawBillNo,
      bookNo,
      challanNo,
      date,
      dueDate,
      items,
      discount = 0,
      isGstApplicable = false,
      cgstRate = 0,
      sgstRate = 0,
      igstRate = 0,
      paymentDetails,
      notes,
      status
    } = req.body;

    const chosenFirm = firm || rawFirmName;

    // ૧. ફર્મ પ્રોફાઇલ શોધો અથવા ડિફોલ્ટ લો
    let profile = null;
    if (profileId) {
      profile = await Profile.findById(profileId);
    } else if (chosenFirm) {
      profile = await Profile.findOne({
        firmName: { $regex: new RegExp(`^${chosenFirm.trim()}$`, 'i') }
      });
    }

    // જો DB માં પ્રોફાઇલ ન મળે તો DEFAULT_PROFILES માંથી શોધો
    let firmSnapshot = null;
    if (profile) {
      firmSnapshot = profile.toObject();
    } else {
      const defaultProfile = DEFAULT_PROFILES.find((p) =>
        chosenFirm ? p.firmName.toLowerCase() === chosenFirm.toLowerCase().trim() : p.isDefault
      ) || DEFAULT_PROFILES[0];
      firmSnapshot = defaultProfile;
    }

    const firmName = firmSnapshot.firmName;

    // ૨. મર્ચન્ટ (વેપારી) ની વિગતો મેળવો (ઓટોમેટીક અથવા મેન્યુઅલ)
    let merchantName = rawMerchantName;
    let merchantAddress = rawMerchantAddress;
    let merchantMobile = rawMerchantMobile || '';
    let merchantRef = undefined;

    if (merchantId) {
      const merchantObj = await Merchant.findById(merchantId);
      if (merchantObj) {
        merchantRef = merchantObj._id;
        merchantName = merchantName || merchantObj.name;
        merchantAddress = merchantAddress || merchantObj.address;
        merchantMobile = merchantMobile || merchantObj.mobileNumber;
      }
    }

    if (!merchantName || !merchantAddress) {
      return res.status(400).json({
        success: false,
        message: 'મર્ચન્ટનું નામ અને સરનામું જરૂરી છે. (Merchant name and address are required.)'
      });
    }

    // ૩. આઇટમ્સ વેલિડેશન
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ઓછામાં ઓછી એક આઇટમ ઉમેરવી જરૂરી છે. (At least one item is required.)'
      });
    }

    // ૪. આઇટમ્સ અને રકમની ગણતરી (Calculations)
    let totalQty = 0;
    let subTotal = 0;

    const processedItems = items.map((item, index) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const amount = Number((qty * rate).toFixed(2));

      totalQty += qty;
      subTotal += amount;

      return {
        srNo: item.srNo || index + 1,
        description: (item.description || item.particulars || '').trim(),
        qty,
        rate,
        amount
      };
    });

    const parsedDiscount = Math.max(0, Number(discount) || 0);
    const totalAmountBeforeTax = Math.max(0, Number((subTotal - parsedDiscount).toFixed(2)));

    // ૫. GST ગણતરી (જો GST એડ કરવો હોય તો)
    const hasGst = Boolean(
      isGstApplicable ||
      (merchantGstin && merchantGstin.trim().length > 0) ||
      Number(cgstRate) > 0 ||
      Number(sgstRate) > 0 ||
      Number(igstRate) > 0
    );

    let parsedCgstRate = Number(cgstRate) || 0;
    let parsedSgstRate = Number(sgstRate) || 0;
    let parsedIgstRate = Number(igstRate) || 0;

    // જો GST આપવો હોય પણ રેટ ન આપ્યો હોય તો ડિફોલ્ટ ૨.૫% CGST + ૨.૫% SGST
    if (hasGst && parsedCgstRate === 0 && parsedSgstRate === 0 && parsedIgstRate === 0) {
      parsedCgstRate = 2.5;
      parsedSgstRate = 2.5;
    }

    const cgstAmount = hasGst ? Number(((totalAmountBeforeTax * parsedCgstRate) / 100).toFixed(2)) : 0;
    const sgstAmount = hasGst ? Number(((totalAmountBeforeTax * parsedSgstRate) / 100).toFixed(2)) : 0;
    const igstAmount = hasGst ? Number(((totalAmountBeforeTax * parsedIgstRate) / 100).toFixed(2)) : 0;
    const totalGst = Number((cgstAmount + sgstAmount + igstAmount).toFixed(2));
    const grandTotal = Number((totalAmountBeforeTax + totalGst).toFixed(2));

    // ૬. બિલ નંબર અને ચલાણ નંબર ઓટો-જનરેટ
    let billNo = rawBillNo;
    if (!billNo) {
      const lastChallan = await Challan.findOne({ firmName }).sort({ createdAt: -1 });
      if (lastChallan && !isNaN(Number(lastChallan.billNo))) {
        billNo = String(Number(lastChallan.billNo) + 1);
      } else {
        const anyLast = await Challan.findOne().sort({ createdAt: -1 });
        billNo = (anyLast && !isNaN(Number(anyLast.billNo))) ? String(Number(anyLast.billNo) + 1) : '1';
      }
    }

    let finalChallanNo = challanNo;
    if (!finalChallanNo) {
      const lastChallanWithCh = await Challan.findOne({
        firmName,
        challanNo: { $exists: true, $ne: '' }
      }).sort({ createdAt: -1 });

      if (lastChallanWithCh && !isNaN(Number(lastChallanWithCh.challanNo))) {
        finalChallanNo = String(Number(lastChallanWithCh.challanNo) + 1);
      } else {
        finalChallanNo = billNo;
      }
    }

    // ૭. સેવ કરો (DB Insertion)
    const challan = await Challan.create({
      user: req.user ? req.user.id : undefined,
      profile: profile ? profile._id : undefined,
      firmName,
      merchant: merchantRef,
      merchantName: merchantName.trim(),
      merchantAddress: merchantAddress.trim(),
      merchantMobile: (merchantMobile || '').trim(),
      merchantGstin: (merchantGstin || '').trim(),
      stateCode: stateCode || '24',
      billNo: String(billNo).trim(),
      bookNo: (bookNo || '').trim(),
      challanNo: String(finalChallanNo).trim(),
      date: date ? new Date(date) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      items: processedItems,
      totalQty,
      subTotal: Number(subTotal.toFixed(2)),
      discount: parsedDiscount,
      totalAmountBeforeTax,
      isGstApplicable: hasGst,
      cgstRate: parsedCgstRate,
      cgstAmount,
      sgstRate: parsedSgstRate,
      sgstAmount,
      igstRate: parsedIgstRate,
      igstAmount,
      totalGst,
      grandTotal,
      paymentDetails: paymentDetails || {},
      firmSnapshot,
      notes: notes || '',
      status: status || 'Pending'
    });

    // ૮. Google Drive & Google Sheet ઓટો-સિંક (swastikelegance065@gmail.com)
    syncChallanToGoogleDrive(challan).catch((syncErr) => {
      console.warn('Background Google Drive sync warning:', syncErr.message);
    });

    return res.status(201).json({
      success: true,
      message: 'ચલણ / બિલ સફળતાપૂર્વક બની ગયું! (Challan created successfully!)',
      challan,
      printUrl: `/api/challans/${challan._id}/print`
    });
  } catch (error) {
    console.error('Error creating challan:', error);
    return res.status(500).json({
      success: false,
      message: 'ચલણ બનાવવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// ચલણ લિસ્ટ મેળવો (List Challans with Filters)
export async function listChallans(req, res) {
  try {
    const { firm, merchantId, startDate, endDate, status, search } = req.query;
    const query = {};

    // ૧. ફર્મ વાઈઝ ફિલ્ટર
    if (firm) {
      query.firmName = { $regex: new RegExp(firm.trim(), 'i') };
    }

    // ૨. મર્ચન્ટ ફિલ્ટર
    if (merchantId) {
      query.merchant = merchantId;
    }

    // ૩. સ્ટેટસ ફિલ્ટર
    if (status) {
      query.status = status;
    }

    // ૪. તારીખ રેન્જ ફિલ્ટર
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // ૫. સર્ચ ફિલ્ટર
    if (search) {
      query.$or = [
        { merchantName: { $regex: search, $options: 'i' } },
        { billNo: { $regex: search, $options: 'i' } },
        { challanNo: { $regex: search, $options: 'i' } },
        { merchantMobile: { $regex: search, $options: 'i' } }
      ];
    }

    const challans = await Challan.find(query).sort({ date: -1, createdAt: -1 });

    // સરવાળા (Summary totals)
    const totalAmountSum = challans.reduce((sum, c) => sum + (c.grandTotal || 0), 0);
    const totalQtySum = challans.reduce((sum, c) => sum + (c.totalQty || 0), 0);

    return res.json({
      success: true,
      count: challans.length,
      totalAmountSum: Number(totalAmountSum.toFixed(2)),
      totalQtySum,
      challans
    });
  } catch (error) {
    console.error('Error listing challans:', error);
    return res.status(500).json({
      success: false,
      message: 'ચલણ લિસ્ટ લાવવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// તારીખ વાઈઝ ટોટલ સમરી (Date-wise Total Summary API)
export async function getDateWiseSummary(req, res) {
  try {
    const { firm, startDate, endDate } = req.query;
    const match = {};

    if (firm) {
      match.firmName = { $regex: new RegExp(firm.trim(), 'i') };
    }

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.date.$lte = end;
      }
    }

    const summary = await Challan.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalBills: { $sum: 1 },
          totalQty: { $sum: '$totalQty' },
          subTotal: { $sum: '$subTotal' },
          totalDiscount: { $sum: '$discount' },
          taxableAmount: { $sum: '$totalAmountBeforeTax' },
          totalGst: { $sum: '$totalGst' },
          grandTotal: { $sum: '$grandTotal' }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const overallTotals = summary.reduce(
      (acc, curr) => {
        acc.totalBills += curr.totalBills;
        acc.totalQty += curr.totalQty;
        acc.grandTotal += curr.grandTotal;
        acc.totalGst += curr.totalGst;
        return acc;
      },
      { totalBills: 0, totalQty: 0, grandTotal: 0, totalGst: 0 }
    );

    overallTotals.grandTotal = Number(overallTotals.grandTotal.toFixed(2));
    overallTotals.totalGst = Number(overallTotals.totalGst.toFixed(2));

    return res.json({
      success: true,
      firm: firm || 'All Firms',
      overallTotals,
      dailyBreakdown: summary
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return res.status(500).json({
      success: false,
      message: 'સમરી લાવવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// સિંગલ ચલણ મેળવો (Get Single Challan by ID)
export async function getChallan(req, res) {
  try {
    const challan = await Challan.findById(req.params.id)
      .populate('merchant')
      .populate('profile');

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'ચલણ મળ્યું નથી (Challan not found)'
      });
    }

    return res.json({ success: true, challan });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ચલણ પ્રિન્ટ API (Print Challan HTML View)
export async function printChallan(req, res) {
  try {
    const challan = await Challan.findById(req.params.id);

    if (!challan) {
      return res.status(404).send('<h1>ચલણ મળ્યું નથી (Challan not found)</h1>');
    }

    const html = generateChallanPrintHtml(challan);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).send(`<h1>પ્રિન્ટ જનરેટ કરવામાં ભૂલ આવી: ${error.message}</h1>`);
  }
}

// ચલણ અપડેટ કરો (Update Challan)
export async function updateChallan(req, res) {
  try {
    const challan = await Challan.findById(req.params.id);
    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'ચલણ મળ્યું નથી (Challan not found)'
      });
    }

    const {
      items,
      discount,
      isGstApplicable,
      cgstRate,
      sgstRate,
      igstRate,
      merchantName,
      merchantAddress,
      merchantMobile,
      merchantGstin,
      billNo,
      bookNo,
      challanNo,
      date,
      dueDate,
      paymentDetails,
      notes,
      status
    } = req.body;

    if (merchantName) challan.merchantName = merchantName.trim();
    if (merchantAddress) challan.merchantAddress = merchantAddress.trim();
    if (merchantMobile !== undefined) challan.merchantMobile = merchantMobile.trim();
    if (merchantGstin !== undefined) challan.merchantGstin = merchantGstin.trim();
    if (billNo) challan.billNo = String(billNo).trim();
    if (bookNo !== undefined) challan.bookNo = bookNo.trim();
    if (challanNo !== undefined) challan.challanNo = challanNo.trim();
    if (date) challan.date = new Date(date);
    if (dueDate) challan.dueDate = new Date(dueDate);
    if (paymentDetails) challan.paymentDetails = paymentDetails;
    if (notes !== undefined) challan.notes = notes;
    if (status) challan.status = status;

    // જો આઇટમ્સ અથવા રેટ અપડેટ થયા હોય તો ફરી ગણતરી કરો
    if (items && Array.isArray(items)) {
      let totalQty = 0;
      let subTotal = 0;

      challan.items = items.map((item, index) => {
        const qty = Number(item.qty) || 0;
        const rate = Number(item.rate) || 0;
        const amount = Number((qty * rate).toFixed(2));

        totalQty += qty;
        subTotal += amount;

        return {
          srNo: item.srNo || index + 1,
          description: (item.description || item.particulars || '').trim(),
          qty,
          rate,
          amount
        };
      });

      challan.totalQty = totalQty;
      challan.subTotal = Number(subTotal.toFixed(2));
    }

    if (discount !== undefined) {
      challan.discount = Math.max(0, Number(discount) || 0);
    }

    challan.totalAmountBeforeTax = Math.max(0, Number((challan.subTotal - challan.discount).toFixed(2)));

    const applyGst = isGstApplicable !== undefined ? Boolean(isGstApplicable) : challan.isGstApplicable;
    challan.isGstApplicable = applyGst;

    if (cgstRate !== undefined) challan.cgstRate = Number(cgstRate) || 0;
    if (sgstRate !== undefined) challan.sgstRate = Number(sgstRate) || 0;
    if (igstRate !== undefined) challan.igstRate = Number(igstRate) || 0;

    if (challan.isGstApplicable) {
      challan.cgstAmount = Number(((challan.totalAmountBeforeTax * challan.cgstRate) / 100).toFixed(2));
      challan.sgstAmount = Number(((challan.totalAmountBeforeTax * challan.sgstRate) / 100).toFixed(2));
      challan.igstAmount = Number(((challan.totalAmountBeforeTax * challan.igstRate) / 100).toFixed(2));
      challan.totalGst = Number((challan.cgstAmount + challan.sgstAmount + challan.igstAmount).toFixed(2));
    } else {
      challan.cgstAmount = 0;
      challan.sgstAmount = 0;
      challan.igstAmount = 0;
      challan.totalGst = 0;
    }

    challan.grandTotal = Number((challan.totalAmountBeforeTax + challan.totalGst).toFixed(2));

    await challan.save();

    // Google Drive પર પણ અપડેટ કરો
    syncChallanToGoogleDrive(challan).catch((syncErr) => {
      console.warn('Background Google Drive sync warning on update:', syncErr.message);
    });

    return res.json({
      success: true,
      message: 'ચલણ સફળતાપૂર્વક અપડેટ થઈ ગયું! (Challan updated successfully!)',
      challan
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ચલણ ડિલીટ કરો (Delete Challan)
export async function deleteChallan(req, res) {
  try {
    const challan = await Challan.findByIdAndDelete(req.params.id);
    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'ચલણ મળ્યું નથી (Challan not found)'
      });
    }

    return res.json({
      success: true,
      message: 'ચલણ સફળતાપૂર્વક ડિલીટ થઈ ગયું! (Challan deleted successfully!)'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// =========================================================================
// GOOGLE DRIVE & GOOGLE SHEET SYNC APIS (swastikelegance065@gmail.com)
// =========================================================================

/**
 * મેળવો Google Drive સેટિંગ્સ
 */
export async function getGoogleDriveConfigHandler(req, res) {
  try {
    const config = await getDriveConfig();
    return res.json({
      success: true,
      config: {
        ...config,
        isConfigured: Boolean(config.webhookUrl && config.webhookUrl.trim().startsWith('http'))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * અપડેટ કરો Google Drive સેટિંગ્સ
 */
export async function updateGoogleDriveConfigHandler(req, res) {
  try {
    const { webhookUrl, autoSync, email } = req.body;
    const updated = await updateDriveConfig({
      webhookUrl: (webhookUrl || '').trim(),
      autoSync: autoSync !== undefined ? Boolean(autoSync) : true,
      email: (email || 'swastikelegance065@gmail.com').trim()
    });
    return res.json({
      success: true,
      message: 'Google Drive સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગઈ!',
      config: {
        ...updated,
        isConfigured: Boolean(updated.webhookUrl && updated.webhookUrl.trim().startsWith('http'))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * સિંગલ ચલાણ Google Drive માં સિંક કરો
 */
export async function syncSingleToDriveHandler(req, res) {
  try {
    const challan = await Challan.findById(req.params.id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'ચલાણ મળ્યું નથી' });
    }

    const result = await syncChallanToGoogleDrive(challan);
    const updatedChallan = await Challan.findById(req.params.id);

    return res.json({
      success: result.success,
      message: result.message || (result.success ? 'Google Drive માં સિંક થઈ ગયું!' : (result.error || 'Webhook URL કન્ફિગર કરેલ નથી')),
      challan: updatedChallan,
      data: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * તમામ ચલાણ બેચમાં Google Drive માં સિંક કરો
 */
export async function syncAllToDriveHandler(req, res) {
  try {
    const { forceAll } = req.body;
    const query = forceAll ? {} : { googleDriveSynced: { $ne: true } };
    const challans = await Challan.find(query).sort({ date: 1 });

    let syncedCount = 0;
    let failedCount = 0;

    for (const c of challans) {
      const result = await syncChallanToGoogleDrive(c);
      if (result.success) syncedCount++;
      else failedCount++;
    }

    return res.json({
      success: true,
      message: `${syncedCount} બિલો સફળતાપૂર્વક Google Drive & Sheet માં સિંક થઈ ગયા!`,
      syncedCount,
      failedCount,
      totalProcessed: challans.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}


