import Setting from '../models/Setting.js';
import Challan from '../models/Challan.js';
import DeliveryChallan from '../models/DeliveryChallan.js';
import { generateChallanPrintHtml } from './printTemplate.js';
import { generateDeliveryChallanPrintHtml } from './deliveryChallanTemplate.js';

const DEFAULT_DRIVE_CONFIG = {
  email: 'swastikelegance065@gmail.com',
  webhookUrl: process.env.GOOGLE_DRIVE_WEBHOOK_URL || '',
  autoSync: true,
  folderName: 'Swastik Art - Challans & Bills',
  billsSheetName: 'Swastik Art - Bills Record',
  challansSheetName: 'Swastik Art - Delivery Challans Record',
  sheetName: 'Challans & Bills Master Record' // fallback for backward compatibility
};

/**
 * Get Google Drive Configuration
 */
export async function getDriveConfig() {
  try {
    const setting = await Setting.findOne({ key: 'google_drive' });
    if (setting && setting.value) {
      return {
        ...DEFAULT_DRIVE_CONFIG,
        ...setting.value,
        webhookUrl: setting.value.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL || '',
        billsSheetName: setting.value.billsSheetName || DEFAULT_DRIVE_CONFIG.billsSheetName,
        challansSheetName: setting.value.challansSheetName || DEFAULT_DRIVE_CONFIG.challansSheetName
      };
    }
  } catch (err) {
    console.warn('Error fetching drive config:', err.message);
  }
  return DEFAULT_DRIVE_CONFIG;
}

/**
 * Update Google Drive Configuration
 */
export async function updateDriveConfig(newConfig) {
  const current = await getDriveConfig();
  const merged = { ...current, ...newConfig };
  
  await Setting.findOneAndUpdate(
    { key: 'google_drive' },
    { key: 'google_drive', value: merged },
    { upsert: true, returnDocument: 'after' }
  );

  return merged;
}

/**
 * Synchronize a single Bill (Tax Invoice / Challan) to Google Drive & Google Sheet
 */
export async function syncChallanToGoogleDrive(challan) {
  try {
    const config = await getDriveConfig();

    if (!config.webhookUrl || !config.webhookUrl.trim().startsWith('http')) {
      console.log('ℹ️ Google Drive Webhook URL is not configured yet. Skipping auto-sync.');
      return {
        success: false,
        configured: false,
        message: 'Google Drive Webhook URL is not configured yet.'
      };
    }

    const challanObj = typeof challan.toObject === 'function' ? challan.toObject() : challan;
    const printHtml = generateChallanPrintHtml(challanObj);

    // Build items summary
    const itemsSummary = (challanObj.items || [])
      .map((it, idx) => `${idx + 1}. ${it.description} (Qty: ${it.qty}, Rate: ${it.rate}, Amt: ${it.amount})`)
      .join('; ');

    const cleanFirmName = (challanObj.firmName || 'Firm').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanMerchantName = (challanObj.merchantName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Bill_${challanObj.billNo || '0'}_${cleanFirmName}_${cleanMerchantName}.pdf`;

    const payload = {
      action: 'SAVE_CHALLAN',
      recordType: 'BILL',
      targetSheetName: config.billsSheetName || 'Swastik Art - Bills Record',
      targetTabName: 'Bills',
      folderName: config.folderName || 'Swastik Art - Challans & Bills',
      driveEmail: config.email || 'swastikelegance065@gmail.com',
      challanId: String(challanObj._id),
      billNo: challanObj.billNo || '',
      challanNo: challanObj.challanNo || challanObj.billNo || '',
      firmName: challanObj.firmName || '',
      date: challanObj.date,
      dueDate: challanObj.dueDate,
      merchantName: challanObj.merchantName || '',
      merchantAddress: challanObj.merchantAddress || '',
      merchantMobile: challanObj.merchantMobile || '',
      merchantGstin: challanObj.merchantGstin || '',
      totalQty: challanObj.totalQty || 0,
      subTotal: challanObj.subTotal || 0,
      discount: challanObj.discount || 0,
      taxableAmount: challanObj.totalAmountBeforeTax || 0,
      totalGst: challanObj.totalGst || 0,
      grandTotal: challanObj.grandTotal || 0,
      status: challanObj.status || 'Pending',
      itemsSummary,
      htmlContent: printHtml,
      fileName
    };

    console.log(`📤 Sending Bill #${challanObj.billNo} (${challanObj.firmName}) to Google Drive Webhook (${config.billsSheetName})...`);

    const response = await fetch(config.webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const responseText = await response.text();
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    const isHtmlResponse = typeof responseText === 'string' && (
      responseText.trim().startsWith('<') ||
      responseText.includes('<!DOCTYPE') ||
      responseText.includes('<html') ||
      responseText.includes('Sorry, unable to open') ||
      responseText.includes('accounts.google.com')
    );

    if (response.ok && !isHtmlResponse && (result.success !== false)) {
      console.log(`✅ Bill #${challanObj.billNo} successfully saved to Google Drive & Google Sheet (${config.billsSheetName})!`);

      await Challan.findByIdAndUpdate(challanObj._id, {
        googleDriveSynced: true,
        googleDriveFileUrl: result.fileUrl || '',
        googleDriveSheetUrl: result.sheetUrl || '',
        googleDriveSyncedAt: new Date()
      });

      return {
        success: true,
        configured: true,
        fileUrl: result.fileUrl,
        sheetUrl: result.sheetUrl,
        folderUrl: result.folderUrl,
        message: 'બિલ ગૂગલ ડ્રાઇવ અને અલગ બિલ શીટમાં સફળતાપૂર્વક સેવ થઈ ગયું!'
      };
    } else {
      console.error('❌ Google Drive Webhook returned error. Status:', response.status);

      let cleanErrorMessage = 'Google Drive માં સિંક કરતી વખતે ભૂલ આવી.';
      if (response.status === 401 || isHtmlResponse) {
        cleanErrorMessage = "Google Apps Script Access પરમિશન ભૂલ: Apps Script માં 'Deploy' > 'Manage deployments' > ✏️ Edit > 'Who has access' ને 'Anyone' પર સેટ કરીને 'New version' Deploy કરો.";
      } else if (result.error) {
        cleanErrorMessage = typeof result.error === 'string' ? result.error.replace(/<[^>]*>/g, '') : JSON.stringify(result.error);
      }

      return {
        success: false,
        configured: true,
        error: cleanErrorMessage
      };
    }
  } catch (error) {
    console.error('❌ Error syncing Bill to Google Drive:', error.message);
    return {
      success: false,
      configured: true,
      error: error.message
    };
  }
}

/**
 * Delete a Bill from Google Drive and Google Sheet
 */
export async function deleteChallanFromGoogleDrive(challan) {
  try {
    const config = await getDriveConfig();

    if (!config.webhookUrl || !config.webhookUrl.trim().startsWith('http')) {
      return {
        success: false,
        configured: false,
        message: 'Google Drive Webhook URL is not configured yet.'
      };
    }

    const challanObj = typeof challan.toObject === 'function' ? challan.toObject() : challan;
    const cleanFirmName = (challanObj.firmName || 'Firm').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanMerchantName = (challanObj.merchantName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Bill_${challanObj.billNo || '0'}_${cleanFirmName}_${cleanMerchantName}.pdf`;

    const payload = {
      action: 'DELETE_CHALLAN',
      recordType: 'BILL',
      targetSheetName: config.billsSheetName || 'Swastik Art - Bills Record',
      targetTabName: 'Bills',
      folderName: config.folderName || 'Swastik Art - Challans & Bills',
      driveEmail: config.email || 'swastikelegance065@gmail.com',
      challanId: String(challanObj._id),
      billNo: String(challanObj.billNo || ''),
      challanNo: String(challanObj.challanNo || challanObj.billNo || ''),
      firmName: challanObj.firmName || '',
      fileName
    };

    console.log(`🗑️ Sending Delete Bill #${challanObj.billNo} (${challanObj.firmName}) to Google Drive Webhook...`);

    const response = await fetch(config.webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const responseText = await response.text();
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (response.ok && result.success !== false) {
      console.log(`✅ Bill #${challanObj.billNo} successfully removed from Google Drive & Sheet!`);
      return {
        success: true,
        message: 'Google Drive અને Sheet માંથી બિલ સફળતાપૂર્વક ડિલીટ થઈ ગયું!'
      };
    } else {
      console.warn('⚠️ Google Drive delete webhook response:', response.status, result);
      return {
        success: false,
        message: result.error || 'Google Drive delete webhook failed'
      };
    }
  } catch (error) {
    console.error('❌ Error deleting Bill from Google Drive:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Synchronize a single Delivery Challan to Google Drive & Google Sheet
 */
export async function syncDeliveryChallanToGoogleDrive(deliveryChallan) {
  try {
    const config = await getDriveConfig();

    if (!config.webhookUrl || !config.webhookUrl.trim().startsWith('http')) {
      console.log('ℹ️ Google Drive Webhook URL is not configured yet. Skipping challan auto-sync.');
      return {
        success: false,
        configured: false,
        message: 'Google Drive Webhook URL is not configured yet.'
      };
    }

    const challanObj = typeof deliveryChallan.toObject === 'function' ? deliveryChallan.toObject() : deliveryChallan;
    const printHtml = generateDeliveryChallanPrintHtml(challanObj);

    // Build items summary
    const itemsSummary = (challanObj.items || [])
      .map((it, idx) => `${idx + 1}. ${it.particulars || 'Embroidery Job Work'} (Qty: ${it.qty}, Rate: ${it.rate}, Amt: ${it.amount})`)
      .join('; ');

    const cleanFirmName = (challanObj.firmName || 'Firm').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanMerchantName = (challanObj.merchantName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Challan_${challanObj.challanNo || '0'}_${cleanFirmName}_${cleanMerchantName}.pdf`;

    const payload = {
      action: 'SAVE_DELIVERY_CHALLAN',
      recordType: 'DELIVERY_CHALLAN',
      targetSheetName: config.challansSheetName || 'Swastik Art - Delivery Challans Record',
      targetTabName: 'Delivery Challans',
      folderName: config.folderName || 'Swastik Art - Challans & Bills',
      driveEmail: config.email || 'swastikelegance065@gmail.com',
      challanId: String(challanObj._id),
      challanNo: String(challanObj.challanNo || ''),
      pChallanNo: String(challanObj.pChallanNo || '-'),
      firmName: challanObj.firmName || '',
      date: challanObj.date,
      merchantName: challanObj.merchantName || '',
      merchantAddress: challanObj.merchantAddress || '',
      merchantCity: challanObj.merchantCity || 'Surat',
      merchantMobile: challanObj.merchantMobile || '',
      totalQty: Number(challanObj.totalQty) || 0,
      rate: challanObj.items?.[0]?.rate || 0,
      netAmount: Number(challanObj.netAmount) || 0,
      status: challanObj.status || 'Delivered',
      itemsSummary,
      htmlContent: printHtml,
      fileName
    };

    console.log(`📤 Sending Delivery Challan #${challanObj.challanNo} (${challanObj.firmName}) to Google Drive Webhook (${config.challansSheetName})...`);

    const response = await fetch(config.webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const responseText = await response.text();
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    const isHtmlResponse = typeof responseText === 'string' && (
      responseText.trim().startsWith('<') ||
      responseText.includes('<!DOCTYPE') ||
      responseText.includes('<html') ||
      responseText.includes('Sorry, unable to open') ||
      responseText.includes('accounts.google.com')
    );

    if (response.ok && !isHtmlResponse && (result.success !== false)) {
      console.log(`✅ Delivery Challan #${challanObj.challanNo} successfully saved to Google Drive & Google Sheet (${config.challansSheetName})!`);

      await DeliveryChallan.findByIdAndUpdate(challanObj._id, {
        googleDriveSynced: true,
        googleDriveFileUrl: result.fileUrl || '',
        googleDriveSheetUrl: result.sheetUrl || '',
        googleDriveSyncedAt: new Date()
      });

      return {
        success: true,
        configured: true,
        fileUrl: result.fileUrl,
        sheetUrl: result.sheetUrl,
        folderUrl: result.folderUrl,
        message: 'ચલાણ ગૂગલ ડ્રાઇવ અને અલગ ચલાણ શીટમાં સફળતાપૂર્વક સેવ થઈ ગયું!'
      };
    } else {
      console.error('❌ Google Drive Webhook returned error. Status:', response.status);

      let cleanErrorMessage = 'Google Drive માં ચલાણ સિંક કરતી વખતે ભૂલ આવી.';
      if (response.status === 401 || isHtmlResponse) {
        cleanErrorMessage = "Google Apps Script Access પરમિશન ભૂલ: Apps Script માં 'Deploy' > 'Manage deployments' > ✏️ Edit > 'Who has access' ને 'Anyone' પર સેટ કરીને 'New version' Deploy કરો.";
      } else if (result.error) {
        cleanErrorMessage = typeof result.error === 'string' ? result.error.replace(/<[^>]*>/g, '') : JSON.stringify(result.error);
      }

      return {
        success: false,
        configured: true,
        error: cleanErrorMessage
      };
    }
  } catch (error) {
    console.error('❌ Error syncing Delivery Challan to Google Drive:', error.message);
    return {
      success: false,
      configured: true,
      error: error.message
    };
  }
}

/**
 * Delete a Delivery Challan from Google Drive and Google Sheet
 */
export async function deleteDeliveryChallanFromGoogleDrive(deliveryChallan) {
  try {
    const config = await getDriveConfig();

    if (!config.webhookUrl || !config.webhookUrl.trim().startsWith('http')) {
      return {
        success: false,
        configured: false,
        message: 'Google Drive Webhook URL is not configured yet.'
      };
    }

    const challanObj = typeof deliveryChallan.toObject === 'function' ? deliveryChallan.toObject() : deliveryChallan;
    const cleanFirmName = (challanObj.firmName || 'Firm').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanMerchantName = (challanObj.merchantName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Challan_${challanObj.challanNo || '0'}_${cleanFirmName}_${cleanMerchantName}.pdf`;

    const payload = {
      action: 'DELETE_DELIVERY_CHALLAN',
      recordType: 'DELIVERY_CHALLAN',
      targetSheetName: config.challansSheetName || 'Swastik Art - Delivery Challans Record',
      targetTabName: 'Delivery Challans',
      folderName: config.folderName || 'Swastik Art - Challans & Bills',
      driveEmail: config.email || 'swastikelegance065@gmail.com',
      challanId: String(challanObj._id),
      challanNo: String(challanObj.challanNo || ''),
      firmName: challanObj.firmName || '',
      fileName
    };

    console.log(`🗑️ Sending Delete Delivery Challan #${challanObj.challanNo} (${challanObj.firmName}) to Google Drive Webhook...`);

    const response = await fetch(config.webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const responseText = await response.text();
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (response.ok && result.success !== false) {
      console.log(`✅ Delivery Challan #${challanObj.challanNo} successfully removed from Google Drive & Sheet!`);
      return {
        success: true,
        message: 'Google Drive અને Sheet માંથી ચલાણ સફળતાપૂર્વક ડિલીટ થઈ ગયું!'
      };
    } else {
      console.warn('⚠️ Google Drive delete webhook response:', response.status, result);
      return {
        success: false,
        message: result.error || 'Google Drive delete webhook failed'
      };
    }
  } catch (error) {
    console.error('❌ Error deleting Delivery Challan from Google Drive:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
