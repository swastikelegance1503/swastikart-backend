/**
 * ============================================================================
 * SWASTIK ART & ASTHA FASHION - GOOGLE DRIVE & GOOGLE SHEET AUTO-SYNC SCRIPT
 * Target Account: swastikelegance065@gmail.com
 * ============================================================================
 * 
 * ફીચર્સ:
 * ૧. Bills (GST/ઇન્વોઇસ બિલ) અને Delivery Challans (ચલાણ) બંને આપમેળે
 *    અલગ અલગ Google Sheet (અથવા અલગ અલગ Tabs) માં સેવ થશે.
 *    - Bills Sheet: "Swastik Art - Bills Record" (Tab: "Bills")
 *    - Challans Sheet: "Swastik Art - Delivery Challans Record" (Tab: "Delivery Challans")
 * ૨. Google Drive ફોલ્ડર: "Swastik Art - Challans & Bills"
 * ૩. ડુપ્લિકેટ નહીં થાય - એક જ નંબર અને પેઢી હોય તો તે રો અપડેટ થશે.
 * ૪. ડિલીટ કરતી વખતે શીટ અને ડ્રાઇવમાંથી ફાઇલ આપમેળે હટી જશે.
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

    // ૧. Google Drive મુખ્ય ફોલ્ડર મેળવો અથવા બનાવો
    const folderName = data.folderName || "Swastik Art - Challans & Bills";
    let folder;
    const folderIter = DriveApp.getFoldersByName(folderName);
    if (folderIter.hasNext()) {
      folder = folderIter.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      folder.setDescription("Swastik Art and Astha Fashion Automated Challans & Bills Backup");
    }

    // પ્રકાર નક્કી કરો: ડિલિવરી ચલાણ (CHALLAN) કે જીએસટી બિલ (BILL)
    const isDeliveryChallan = Boolean(
      data.recordType === "DELIVERY_CHALLAN" ||
      data.action === "SAVE_DELIVERY_CHALLAN" ||
      data.action === "DELETE_DELIVERY_CHALLAN" ||
      (data.challanNo && !data.billNo)
    );

    // બંને માટે અલગ અલગ શીટ ફાઈલ અને ટેબ નામ
    const targetSheetFileName = data.targetSheetName || (
      isDeliveryChallan ? "Swastik Art - Delivery Challans Record" : "Swastik Art - Bills Record"
    );
    const targetTabName = data.targetTabName || (
      isDeliveryChallan ? "Delivery Challans" : "Bills"
    );

    // ------------------------------------------------------------------------
    // એક્શન ૧: ડિલીટ કરવું (DELETE_CHALLAN / DELETE_DELIVERY_CHALLAN)
    // ------------------------------------------------------------------------
    if (data.action === "DELETE_CHALLAN" || data.action === "DELETE_DELIVERY_CHALLAN") {
      let rowDeleted = false;
      let fileDeleted = false;

      // સ્પ્રેડશીટ શોધો
      const sheetFilesToSearch = [targetSheetFileName, "Challans & Bills Master Record"];
      sheetFilesToSearch.forEach(function(fileName) {
        const sheetFileIter = folder.getFilesByName(fileName);
        while (sheetFileIter.hasNext()) {
          try {
            const spreadsheet = SpreadsheetApp.open(sheetFileIter.next());
            const targetSheet = spreadsheet.getSheetByName(targetTabName) || spreadsheet.getActiveSheet();
            const values = targetSheet.getDataRange().getValues();

            for (let i = values.length - 1; i >= 1; i--) {
              const rowId = String(values[i][1]).trim();
              const rowFirm = String(values[i][3]).trim().toLowerCase();
              const targetId = String(isDeliveryChallan ? (data.challanNo || data.billNo) : data.billNo).trim();
              const targetFirm = String(data.firmName || "").trim().toLowerCase();

              if (rowId === targetId && (!targetFirm || rowFirm === targetFirm)) {
                targetSheet.deleteRow(i + 1);
                rowDeleted = true;
              }
            }
          } catch (e) {
            Logger.log("Delete search error in " + fileName + ": " + e);
          }
        }
      });

      // ફાઈલ ડિલીટ (Trash)
      if (data.fileName) {
        const fileIter = folder.getFilesByName(data.fileName);
        while (fileIter.hasNext()) {
          fileIter.next().setTrashed(true);
          fileDeleted = true;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: data.action,
        recordType: isDeliveryChallan ? "DELIVERY_CHALLAN" : "BILL",
        rowDeleted: rowDeleted,
        fileDeleted: fileDeleted,
        message: rowDeleted ? "રેકોર્ડ Google Sheet માંથી સફળતાપૂર્વક ડિલીટ થઈ ગયો!" : "રેકોર્ડ Google Sheet માં મળ્યો નથી"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ------------------------------------------------------------------------
    // એક્શન ૨: ફાઈલ સેવ કરવી (HTML / PDF Preview Backup)
    // ------------------------------------------------------------------------
    const defaultFileName = isDeliveryChallan
      ? ("Challan_" + (data.challanNo || "0") + "_" + (data.firmName || "Firm") + ".html")
      : ("Bill_" + (data.billNo || "0") + "_" + (data.firmName || "Firm") + ".html");
    const fileName = data.fileName || defaultFileName;
    const blob = Utilities.newBlob(data.htmlContent || "", "text/html", fileName);

    let file;
    const fileIter = folder.getFilesByName(fileName);
    if (fileIter.hasNext()) {
      file = fileIter.next();
      file.setContent(data.htmlContent || "");
    } else {
      file = folder.createFile(blob);
    }
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();

    // ------------------------------------------------------------------------
    // એક્શન ૩: સ્પ્રેડશીટ મેળવવી અથવા અલગ શીટ ફાઈલ બનાવવી
    // ------------------------------------------------------------------------
    let spreadsheet;
    const sheetFileIter = folder.getFilesByName(targetSheetFileName);
    if (sheetFileIter.hasNext()) {
      spreadsheet = SpreadsheetApp.open(sheetFileIter.next());
    } else {
      spreadsheet = SpreadsheetApp.create(targetSheetFileName);
      const sFile = DriveApp.getFileById(spreadsheet.getId());
      folder.addFile(sFile);
      DriveApp.getRootFolder().removeFile(sFile);
    }

    // નિર્ધારિત Tab (Sheet) મેળવો અથવા બનાવો
    let sheet = spreadsheet.getSheetByName(targetTabName);
    if (!sheet) {
      const allSheets = spreadsheet.getSheets();
      if (allSheets.length === 1 && allSheets[0].getLastRow() === 0) {
        sheet = allSheets[0];
        sheet.setName(targetTabName);
      } else {
        sheet = spreadsheet.insertSheet(targetTabName);
      }
    }

    // તારીખ ફોર્મેટ
    let formattedDate = "";
    if (data.date) {
      try {
        formattedDate = Utilities.formatDate(new Date(data.date), "Asia/Kolkata", "dd/MM/yyyy");
      } catch (e) {
        formattedDate = String(data.date);
      }
    }
    const nowFormatted = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");

    // ------------------------------------------------------------------------
    // A. ડિલિવરી ચલાણ હેડર અને રો ડેટા (Delivery Challan Row Data)
    // ------------------------------------------------------------------------
    if (isDeliveryChallan) {
      if (sheet.getLastRow() === 0) {
        const challanHeaders = [
          "Date (તારીખ)",
          "Challan No (ચલાણ નં)",
          "P.Challan No (પાર્ટી ચલાણ નં)",
          "Firm Name (પેઢી)",
          "Merchant / Party (વેપારી)",
          "City (શહેર)",
          "Address (સરનામું)",
          "Mobile (મોબાઇલ નં)",
          "Particulars / Work (કામની વિગત)",
          "Total Qty / Pcs (કુલ જથ્થો / નંગ)",
          "Rate (ભાવ ₹)",
          "Net Amount (કુલ નેટ રકમ ₹)",
          "Status (સ્ટેટસ)",
          "Challan File Link (ચલાણ જુઓ)",
          "Synced At (સિંક સમય)"
        ];
        sheet.appendRow(challanHeaders);

        const hRange = sheet.getRange(1, 1, 1, challanHeaders.length);
        hRange.setBackground("#991b1b");
        hRange.setFontColor("#ffffff");
        hRange.setFontWeight("bold");
        hRange.setFontSize(11);
        hRange.setHorizontalAlignment("center");
        sheet.setFrozenRows(1);
      }

      // ડુપ્લિકેટ ચેક અને અપડેટ
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (
          String(values[i][1]).trim() === String(data.challanNo).trim() &&
          String(values[i][3]).trim().toLowerCase() === String(data.firmName).trim().toLowerCase()
        ) {
          rowIndex = i + 1;
          break;
        }
      }

      const rowData = [
        formattedDate,
        String(data.challanNo || ""),
        String(data.pChallanNo || "-"),
        String(data.firmName || ""),
        String(data.merchantName || ""),
        String(data.merchantCity || "Surat"),
        String(data.merchantAddress || ""),
        String(data.merchantMobile || ""),
        String(data.itemsSummary || ""),
        Number(data.totalQty) || 0,
        Number(data.rate) || 0,
        Number(data.netAmount || data.grandTotal) || 0,
        String(data.status || "Delivered"),
        fileUrl,
        nowFormatted
      ];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }

      const targetRow = rowIndex > 0 ? rowIndex : sheet.getLastRow();
      sheet.getRange(targetRow, 10).setNumberFormat("#,##0");
      sheet.getRange(targetRow, 11).setNumberFormat("₹#,##0.00");
      sheet.getRange(targetRow, 12).setNumberFormat("₹#,##0.00");
    }
    // ------------------------------------------------------------------------
    // B. જીએસટી / બિલ હેડર અને રો ડેટા (Bill Row Data)
    // ------------------------------------------------------------------------
    else {
      if (sheet.getLastRow() === 0) {
        const billHeaders = [
          "Date (તારીખ)",
          "Bill No (બિલ નં)",
          "Challan / Ref No (ચલાણ / રેફ. નં)",
          "Firm Name (પેઢી)",
          "Merchant / Customer (વેપારી)",
          "Address (સરનામું)",
          "Mobile (મોબાઇલ નં)",
          "Items Summary (આઇટમ્સ વિગત)",
          "Total Qty (કુલ જથ્થો)",
          "Taxable Amount (કરપાત્ર રકમ ₹)",
          "GST Amount (કુલ GST ₹)",
          "Grand Total (કુલ રકમ ₹)",
          "Payment Status (પેમેન્ટ સ્ટેટસ)",
          "Drive Bill File Link (બિલ જુઓ)",
          "Synced At (સિંક સમય)"
        ];
        sheet.appendRow(billHeaders);

        const hRange = sheet.getRange(1, 1, 1, billHeaders.length);
        hRange.setBackground("#b71c1c");
        hRange.setFontColor("#ffffff");
        hRange.setFontWeight("bold");
        hRange.setFontSize(11);
        hRange.setHorizontalAlignment("center");
        sheet.setFrozenRows(1);
      }

      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (
          String(values[i][1]).trim() === String(data.billNo).trim() &&
          String(values[i][3]).trim().toLowerCase() === String(data.firmName).trim().toLowerCase()
        ) {
          rowIndex = i + 1;
          break;
        }
      }

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

      const targetRow = rowIndex > 0 ? rowIndex : sheet.getLastRow();
      sheet.getRange(targetRow, 9).setNumberFormat("#,##0");
      sheet.getRange(targetRow, 10, 1, 3).setNumberFormat("₹#,##0.00");
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      recordType: isDeliveryChallan ? "DELIVERY_CHALLAN" : "BILL",
      targetSheetName: targetSheetFileName,
      targetTabName: targetTabName,
      message: (isDeliveryChallan ? "ચલાણ" : "બિલ") + " સફળતાપૂર્વક Google Drive અને તેની અલગ Google Sheet માં સેવ થઈ ગયું!",
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
    message: "Swastik Art Multi-Sheet Sync Webhook is ACTIVE for swastikelegance065@gmail.com",
    features: [
      "Bills Sheet: Swastik Art - Bills Record",
      "Challans Sheet: Swastik Art - Delivery Challans Record"
    ],
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
