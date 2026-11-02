import Setting from '../models/Setting.js';
import Challan from '../models/Challan.js';
import { generateChallanPrintHtml } from './printTemplate.js';

const DEFAULT_DRIVE_CONFIG = {
  email: 'swastikelegance065@gmail.com',
  webhookUrl: process.env.GOOGLE_DRIVE_WEBHOOK_URL || '',
  autoSync: true,
  folderName: 'Swastik Art - Challans & Bills',
  sheetName: 'Challans & Bills Master Record'
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
        // Override with env if not set in DB
        webhookUrl: setting.value.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL || ''
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
 * Synchronize a single Challan to Google Drive & Google Sheet
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
    const fileName = `Bill_${challanObj.billNo || '0'}_${cleanFirmName}_${cleanMerchantName}.html`;

    const payload = {
      action: 'SAVE_CHALLAN',
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

    console.log(`📤 Sending Bill #${challanObj.billNo} (${challanObj.firmName}) to Google Drive Webhook...`);

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

    if (response.ok && (result.success !== false)) {
      console.log(`✅ Bill #${challanObj.billNo} successfully saved to Google Drive & Google Sheet!`);

      // Update Challan in MongoDB
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
        message: 'ગૂગલ ડ્રાઇવ અને શીટમાં સફળતાપૂર્વક સેવ થઈ ગયું!'
      };
    } else {
      console.error('❌ Google Drive Webhook returned error:', result);
      return {
        success: false,
        configured: true,
        error: result.error || responseText || 'Unknown error'
      };
    }
  } catch (error) {
    console.error('❌ Error syncing to Google Drive:', error.message);
    return {
      success: false,
      configured: true,
      error: error.message
    };
  }
}
