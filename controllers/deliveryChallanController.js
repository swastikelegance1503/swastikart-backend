import DeliveryChallan from '../models/DeliveryChallan.js';
import Merchant from '../models/Merchant.js';
import { generateDeliveryChallanPrintHtml } from '../utils/deliveryChallanTemplate.js';
import {
  getDriveConfig,
  updateDriveConfig,
  syncDeliveryChallanToGoogleDrive,
  deleteDeliveryChallanFromGoogleDrive
} from '../utils/googleDriveSync.js';

/**
 * મેળવો તમામ ડિલિવરી ચલાણ (Get All Delivery Challans with Filters)
 */
export async function getDeliveryChallans(req, res) {
  try {
    const { firm, status, search, startDate, endDate, merchantId } = req.query;
    const query = {};

    if (firm && firm !== 'All') {
      query.firmName = firm;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (merchantId) {
      query.merchant = merchantId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      const numTerm = Number(term);
      const orConditions = [
        { merchantName: { $regex: term, $options: 'i' } },
        { challanNo: { $regex: term, $options: 'i' } },
        { pChallanNo: { $regex: term, $options: 'i' } },
        { merchantCity: { $regex: term, $options: 'i' } },
        { merchantMobile: { $regex: term, $options: 'i' } }
      ];
      if (!isNaN(numTerm)) {
        orConditions.push({ totalQty: numTerm }, { netAmount: numTerm });
      }
      query.$or = orConditions;
    }

    const challans = await DeliveryChallan.find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: challans.length,
      data: challans
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * આગામી ચલાણ નંબર મેળવો (Get Next Auto-Increment Challan No & P.Challan No)
 */
export async function getNextChallanNo(req, res) {
  try {
    const { firm } = req.query;
    const firmName = firm || 'Swastik Art';

    const latest = await DeliveryChallan.find({ firmName })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    let maxNum = 0;
    let maxPNum = 0;
    latest.forEach((c) => {
      const parsed = parseInt(c.challanNo, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }

      const val = c.pChallanNo || c.challanNo;
      if (val) {
        const cleanP = String(val).replace(/\D/g, '');
        const parsedP = parseInt(cleanP, 10);
        if (!isNaN(parsedP) && parsedP > maxPNum) {
          maxPNum = parsedP;
        }
      }
    });

    const nextNo = maxNum > 0 ? String(maxNum + 1) : '1';
    const nextPNo = maxPNum > 0 ? String(maxPNum + 1) : nextNo;

    return res.json({
      success: true,
      firmName,
      nextChallanNo: nextNo,
      nextPChallanNo: nextPNo
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * મેળવો એક જ ચલાણ (Get Delivery Challan by ID)
 */
export async function getDeliveryChallanById(req, res) {
  try {
    const challan = await DeliveryChallan.findById(req.params.id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'ચલાણ મળ્યું નથી (Delivery Challan not found)' });
    }
    return res.json({ success: true, data: challan });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * નવો ડિલિવરી ચલાણ બનાવો (Create Delivery Challan)
 */
export async function createDeliveryChallan(req, res) {
  try {
    const {
      firmName = 'Swastik Art',
      challanNo: userChallanNo,
      pChallanNo = '',
      date = new Date(),
      merchantId,
      merchantName: rawMerchantName,
      merchantAddress: rawMerchantAddress,
      merchantCity = 'Surat',
      merchantMobile = '',
      items = [],
      status = 'Delivered',
      notes = ''
    } = req.body;

    let merchantName = rawMerchantName;
    let merchantAddress = rawMerchantAddress;
    let merchantCityVal = merchantCity;
    let merchantMobileVal = merchantMobile;

    if (merchantId) {
      const merchantObj = await Merchant.findById(merchantId);
      if (merchantObj) {
        merchantName = merchantName || merchantObj.name;
        merchantAddress = merchantAddress || merchantObj.address || '';
        merchantCityVal = merchantCityVal || merchantObj.city || 'Surat';
        merchantMobileVal = merchantMobileVal || merchantObj.mobile || '';
      }
    }

    if (!merchantName || !merchantName.trim()) {
      return res.status(400).json({ success: false, message: 'વેપારીનું નામ જરૂરી છે (Merchant name is required)' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'ઓછામાં ઓછી એક આઇટમ ઉમેરો (At least one item required)' });
    }

    // Auto-calculate Item Amounts & Totals
    let totalQty = 0;
    let netAmount = 0;

    const formattedItems = items.map((item, index) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const amount = Number(item.amount) || qty * rate;
      totalQty += qty;
      netAmount += amount;
      return {
        srNo: item.srNo || index + 1,
        particulars: item.particulars || 'Embroidery Job Work',
        qty,
        rate,
        amount
      };
    });

    // Check / Generate Challan No
    let challanNo = userChallanNo ? String(userChallanNo).trim() : '';
    if (!challanNo) {
      const last = await DeliveryChallan.findOne({ firmName }).sort({ createdAt: -1 });
      const lastNum = last ? parseInt(last.challanNo, 10) : 0;
      challanNo = !isNaN(lastNum) && lastNum > 0 ? String(lastNum + 1) : '1';
    }

    // Check / Generate P.Challan No
    let finalPChallanNo = pChallanNo ? String(pChallanNo).trim() : '';
    if (!finalPChallanNo) {
      const latest = await DeliveryChallan.find({ firmName }).sort({ createdAt: -1 }).limit(50).lean();
      let maxPNum = 0;
      latest.forEach((c) => {
        const val = c.pChallanNo || c.challanNo;
        if (val) {
          const cleanP = String(val).replace(/\D/g, '');
          const parsedP = parseInt(cleanP, 10);
          if (!isNaN(parsedP) && parsedP > maxPNum) {
            maxPNum = parsedP;
          }
        }
      });
      finalPChallanNo = maxPNum > 0 ? String(maxPNum + 1) : challanNo;
    }

    const deliveryChallan = new DeliveryChallan({
      user: req.user?._id || req.user?.id,
      firmName,
      challanNo,
      pChallanNo: finalPChallanNo,
      date,
      merchant: merchantId || null,
      merchantName: merchantName.trim(),
      merchantAddress: merchantAddress ? merchantAddress.trim() : '',
      merchantCity: merchantCityVal ? merchantCityVal.trim() : 'Surat',
      merchantMobile: merchantMobileVal ? merchantMobileVal.trim() : '',
      items: formattedItems,
      totalQty,
      netAmount,
      status,
      notes
    });

    await deliveryChallan.save();

    // Background Google Drive & Google Sheet Auto-Sync (Separate Challans Sheet)
    syncDeliveryChallanToGoogleDrive(deliveryChallan).catch((err) =>
      console.warn('Delivery challan drive sync warning:', err.message)
    );

    return res.status(201).json({
      success: true,
      message: `ચલાણ #${deliveryChallan.challanNo} સફળતાપૂર્વક બની ગયું!`,
      data: deliveryChallan
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * અપડેટ કરો ડિલિવરી ચલાણ (Update Delivery Challan)
 */
export async function updateDeliveryChallan(req, res) {
  try {
    const { id } = req.params;
    const existing = await DeliveryChallan.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ચલાણ મળ્યું નથી (Delivery Challan not found)' });
    }

    const {
      firmName,
      challanNo,
      pChallanNo,
      date,
      merchantId,
      merchantName,
      merchantAddress,
      merchantCity,
      merchantMobile,
      items,
      status,
      notes
    } = req.body;

    if (items && Array.isArray(items)) {
      let totalQty = 0;
      let netAmount = 0;
      existing.items = items.map((item, index) => {
        const qty = Number(item.qty) || 0;
        const rate = Number(item.rate) || 0;
        const amount = Number(item.amount) || qty * rate;
        totalQty += qty;
        netAmount += amount;
        return {
          srNo: item.srNo || index + 1,
          particulars: item.particulars || 'Embroidery Job Work',
          qty,
          rate,
          amount
        };
      });
      existing.totalQty = totalQty;
      existing.netAmount = netAmount;
    }

    if (firmName) existing.firmName = firmName;
    if (challanNo) existing.challanNo = String(challanNo).trim();
    if (pChallanNo !== undefined) {
      existing.pChallanNo = String(pChallanNo).trim() || existing.pChallanNo || existing.challanNo || '1';
    }
    if (date) existing.date = date;
    if (merchantId !== undefined) existing.merchant = merchantId || null;
    if (merchantName) existing.merchantName = merchantName.trim();
    if (merchantAddress !== undefined) existing.merchantAddress = merchantAddress.trim();
    if (merchantCity !== undefined) existing.merchantCity = merchantCity.trim();
    if (merchantMobile !== undefined) existing.merchantMobile = merchantMobile.trim();
    if (status) existing.status = status;
    if (notes !== undefined) existing.notes = notes;

    await existing.save();

    // Background Drive sync (Separate Challans Sheet)
    syncDeliveryChallanToGoogleDrive(existing).catch((err) =>
      console.warn('Delivery challan drive sync warning:', err.message)
    );

    return res.json({
      success: true,
      message: `ચલાણ #${existing.challanNo} સફળતાપૂર્વક અપડેટ થઈ ગયું!`,
      data: existing
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * ડિલીટ કરો ડિલિવરી ચલાણ (Delete Delivery Challan)
 */
export async function deleteDeliveryChallan(req, res) {
  try {
    const challan = await DeliveryChallan.findByIdAndDelete(req.params.id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'ચલાણ મળ્યું નથી (Delivery Challan not found)' });
    }

    // Google Drive / Sheet delete sync (Separate Challans Sheet)
    deleteDeliveryChallanFromGoogleDrive(challan).catch((err) =>
      console.warn('Delivery challan drive delete warning:', err.message)
    );

    return res.json({
      success: true,
      message: `ચલાણ #${challan.challanNo} સફળતાપૂર્વક ડિલીટ થઈ ગયું!`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * પ્રિન્ટ HTML મેળવો (Get Delivery Challan Print HTML)
 */
export async function printDeliveryChallan(req, res) {
  try {
    const challan = await DeliveryChallan.findById(req.params.id).lean();
    if (!challan) {
      return res.status(404).send('<h2>Delivery Challan not found</h2>');
    }
    const html = generateDeliveryChallanPrintHtml(challan);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).send(`<h2>Error: ${error.message}</h2>`);
  }
}

/**
 * એક જ ડિલિવરી ચલાણ Google Drive & Sheet માં સિંક કરો (Manual Sync)
 */
export async function syncSingleDeliveryChallanToDriveHandler(req, res) {
  try {
    const challan = await DeliveryChallan.findById(req.params.id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'ચલાણ મળ્યું નથી' });
    }

    const result = await syncDeliveryChallanToGoogleDrive(challan);
    const updated = await DeliveryChallan.findById(req.params.id);

    return res.json({
      success: result.success,
      message: result.message || (result.success ? 'Google Drive અને અલગ ચલાણ શીટમાં સેવ થઈ ગયું!' : result.error),
      error: result.error,
      data: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * બધા ડિલિવરી ચલાણ Google Drive & Sheet માં એક સાથે સિંક કરો (Batch Sync)
 */
export async function syncAllDeliveryChallansToDriveHandler(req, res) {
  try {
    const challans = await DeliveryChallan.find().sort({ createdAt: 1 });
    let syncedCount = 0;
    let failedCount = 0;

    for (const c of challans) {
      const result = await syncDeliveryChallanToGoogleDrive(c);
      if (result.success) syncedCount++;
      else failedCount++;
    }

    return res.json({
      success: true,
      message: `કુલ ${syncedCount} ચલાણ Google Drive & અલગ ચલાણ શીટમાં સિંક થયા.${failedCount > 0 ? ` (${failedCount} નિષ્ફળ)` : ''}`,
      total: challans.length,
      synced: syncedCount,
      failed: failedCount
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

