/**
 * ============================================================================
 * SWASTIK ART & ASTHA FASHION - GOOGLE DRIVE & GOOGLE SHEET AUTO-SYNC SCRIPT
 * Target Account: swastikelegance065@gmail.com
 * ============================================================================
 * 
 * મહત્વપૂર્ણ પગલાં (Authorization & Deployment Guide):
 * 1. કોડ પેસ્ટ કર્યા પછી ઉપર ડ્રોપડાઉનમાંથી "testAuth" પસંદ કરો અને "Run" (▶️) દબાવો.
 * 2. "Authorization required" પૂછશે -> "Review permissions" -> swastikelegance065@gmail.com પસંદ કરો.
 * 3. નીચે "Advanced" પર ક્લિક કરો -> "Go to Untitled project (unsafe)" પર ક્લિક કરો -> "Allow" આપો.
 * 4. હવે ઉપર "Deploy" -> "Manage deployments" (અથવા New deployment) કરો.
 * 5. પેન્સિલ (Edit) દબાવી Version: "New version" કરો.
 * 6. "Execute as": "Me (swastikelegance065@gmail.com)" હોવું જોઈએ.
 * 7. "Who has access": "Anyone" હોવું જોઈએ.
 * 8. Deploy દબાવો!
 */

// ૧. પરમિશન મંજૂર કરવા માટે આ ફંક્શન રન (Run ▶️) કરો
function testAuth() {
  Logger.log("Google Drive પરમિશન ચેક થઈ રહી છે...");
  const root = DriveApp.getRootFolder();
  Logger.log("Drive Root Folder: " + root.getName());
  Logger.log("સફળતા! Google Drive અને Sheet ની તમામ પરમિશન મંજૂર થઈ ગઈ છે.");
  return "OK";
}

function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const data = JSON.parse(rawData);

    // 1. Google Drive ફોલ્ડર (જો ન હોય તો આપમેળે બનાવી દેશે)
    const folderName = "Swastik Art - Challans & Bills";
    const sheetName = "Challans & Bills Master Record";

    let folder;
    const folderIter = DriveApp.getFoldersByName(folderName);
    if (folderIter.hasNext()) {
      folder = folderIter.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      folder.setDescription("Swastik Art and Astha Fashion Automated Challans & Bills Backup");
    }

    // 2. બિલ HTML / PDF ફાઈલ Drive ફોલ્ડરમાં સેવ કરવી
    const fileName = data.fileName || ("Bill_" + (data.billNo || "0") + "_" + (data.firmName || "Firm") + ".html");
    const blob = Utilities.newBlob(data.htmlContent || "", "text/html", fileName);

    let file;
    const fileIter = folder.getFilesByName(fileName);
    if (fileIter.hasNext()) {
      file = fileIter.next();
      file.setContent(data.htmlContent || "");
    } else {
      file = folder.createFile(blob);
    }

    // ફાઈલ લિંકથી કોઈ પણ જોઈ શકે તેવું એક્સેસ
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();

    // 3. Google Sheet માં એન્ટ્રી કરવી (માસ્ટર રેકોર્ડ સ્પ્રેડશીટ)
    let spreadsheet;
    const sheetFileIter = folder.getFilesByName(sheetName);
    if (sheetFileIter.hasNext()) {
      const sFile = sheetFileIter.next();
      spreadsheet = SpreadsheetApp.open(sFile);
    } else {
      spreadsheet = SpreadsheetApp.create(sheetName);
      const sFile = DriveApp.getFileById(spreadsheet.getId());
      folder.addFile(sFile);
      DriveApp.getRootFolder().removeFile(sFile);
    }

    const sheet = spreadsheet.getActiveSheet();

    // જો નવી શીટ હોય તો પ્રીમિયમ હેડર સેટ કરો
    if (sheet.getLastRow() === 0) {
      const headers = [
        "Date (તારીખ)",
        "Bill No",
        "Challan No",
        "Firm Name (પેઢી)",
        "Merchant / Customer (વેપારી)",
        "Address",
        "Mobile",
        "Items Summary (આઇટમ્સ)",
        "Total Qty",
        "Taxable Amount (Rs)",
        "GST Amount (Rs)",
        "Grand Total (Rs)",
        "Payment Status",
        "Drive Bill File Link (બિલ જુઓ)",
        "Synced At (સિંક સમય)"
      ];
      sheet.appendRow(headers);

      // હેડર સ્ટાઇલ (Swastik Art Red Theme)
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#b71c1c");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setFontSize(11);
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // ડુપ્લિકેટ અટકાવવા માટે: જો આ બિલ નંબર અને ફર્મ પહેલેથી હોય તો તે રો અપડેટ થશે
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (
        String(values[i][1]).trim() === String(data.billNo).trim() &&
        String(values[i][3]).trim().toLowerCase() === String(data.firmName).trim().toLowerCase()
      ) {
        rowIndex = i + 1; // 1-based row index
        break;
      }
    }

    // તારીખ ફોર્મેટિંગ
    let formattedDate = "";
    if (data.date) {
      try {
        formattedDate = Utilities.formatDate(new Date(data.date), "Asia/Kolkata", "dd/MM/yyyy");
      } catch (e) {
        formattedDate = String(data.date);
      }
    }

    const nowFormatted = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");

    const rowData = [
      formattedDate,
      String(data.billNo || ""),
      String(data.challanNo || ""),
      String(data.firmName || ""),
      String(data.merchantName || ""),
      String(data.merchantAddress || ""),
      String(data.merchantMobile || ""),
      String(data.itemsSummary || ""),
      Number(data.totalQty) || 0,
      Number(data.taxableAmount) || 0,
      Number(data.totalGst) || 0,
      Number(data.grandTotal) || 0,
      String(data.status || "Pending"),
      fileUrl,
      nowFormatted
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    // ફોર્મેટિંગ નંબર્સ
    const lastRow = rowIndex > 0 ? rowIndex : sheet.getLastRow();
    sheet.getRange(lastRow, 9).setNumberFormat("#,##0");
    sheet.getRange(lastRow, 10, 1, 3).setNumberFormat("₹#,##0.00");

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Bill successfully saved to Google Drive & Google Sheet!",
      fileUrl: fileUrl,
      sheetUrl: spreadsheet.getUrl(),
      folderUrl: folder.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Swastik Art Google Drive Webhook is ACTIVE for swastikelegance065@gmail.com",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
