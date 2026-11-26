/**
 * Delivery Challan Print HTML Generator (Backend)
 * Matches the physical red challan book of Swastik Art and Astha Fashion
 * Specifically designed for Half A4 Page (A5 Portrait: 148mm x 210mm)
 */

export function generateDeliveryChallanPrintHtml(challan) {
  const firmName = challan.firmName || 'Swastik Art';
  const isAstha = firmName.toLowerCase().includes('astha');

  const firmTitle = isAstha ? 'Astha Fashion' : 'Swastik Art';
  const firmAddress = isAstha
    ? 'A-22, Mahatma Industries, Nr. Kapodra Police Station, Varachha Road, Surat - 395006'
    : '66,67, 3rd Floor, R.K. Industries, Kapodra, Varachha Road, Surat';
  const firmMobiles = isAstha
    ? ['99045 84177', '98255 85058']
    : ['98255 85058', '99045 84177'];
  const firmPan = isAstha ? 'DFQPS3042G' : 'BKJPS1499H';

  // Format Date (DD/MM/YYYY)
  let formattedDate = '';
  if (challan.date) {
    const d = new Date(challan.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    formattedDate = `${day}/${month}/${year}`;
  }

  // Items Table Rows (8 rows fits Half A4 Page)
  const items = challan.items || [];
  const minRows = Math.max(items.length, 8);
  let rowsHtml = '';

  for (let i = 0; i < minRows; i++) {
    const item = items[i];
    if (item) {
      rowsHtml += `
        <tr style="height: 22px;">
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; text-align: center; font-size: 11px; font-weight: bold; color: #222; padding: 2px; white-space: nowrap;">${item.srNo || i + 1}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; padding: 2px 6px; font-size: 11.5px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px;">${item.particulars || ''}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; text-align: center; font-size: 11.5px; font-weight: bold; color: #111; padding: 2px; white-space: nowrap;">${item.qty || ''}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; text-align: right; padding: 2px 6px; font-size: 11px; color: #222; white-space: nowrap;">${item.rate ? Number(item.rate).toFixed(2) : ''}</td>
          <td style="border-bottom: 1px solid #ffcdd2; text-align: right; padding: 2px 6px; font-size: 11.5px; font-weight: bold; color: #111; white-space: nowrap;">${item.amount ? Number(item.amount).toFixed(2) : ''}</td>
        </tr>
      `;
    } else {
      rowsHtml += `
        <tr style="height: 22px;">
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
          <td style="border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
        </tr>
      `;
    }
  }

  const logoMarkup = isAstha
    ? `<div style="border: 1.5px solid #c62828; border-radius: 14px; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px; background: #fff;">
        <span style="border: 1.5px solid #c62828; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: #c62828;">AF</span>
        <span style="font-size: 17px; font-weight: 900; color: #c62828; letter-spacing: -0.3px; white-space: nowrap;">Astha <span style="font-weight: 500;">Fashion</span></span>
       </div>`
    : `<div style="border: 1.5px solid #c62828; border-radius: 14px; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px; background: #fff;">
        <span style="border: 1.5px solid #c62828; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #c62828;">卐</span>
        <span style="font-size: 18px; font-weight: 900; color: #c62828; letter-spacing: -0.5px; white-space: nowrap;">Swastik<span style="font-weight: 500; margin-left: 2px;">Art</span></span>
       </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delivery Challan - ${challan.challanNo || 'Challan'} (Half A4 Page)</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 4mm 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      background: #fff;
      color: #000;
    }
    .challan-container {
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
      border: 1.5px solid #c62828;
      border-radius: 3px;
      padding: 6px 8px;
      background: #fff;
      position: relative;
      box-sizing: border-box;
    }
    .watermark {
      position: absolute;
      top: 55%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 40px;
      font-weight: 900;
      color: rgba(198, 40, 40, 0.04);
      pointer-events: none;
      white-space: nowrap;
      z-index: 0;
      letter-spacing: 3px;
    }
    .top-badge {
      display: inline-block;
      border: 1px solid #c62828;
      color: #c62828;
      font-size: 8.5px;
      font-weight: bold;
      padding: 1px 6px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      white-space: nowrap;
    }
    .header-layout {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #c62828;
    }
    .header-left {
      flex: 1;
      padding-top: 1px;
    }
    .header-right {
      text-align: right;
      font-size: 9.5px;
      color: #c62828;
      line-height: 1.25;
      font-weight: 600;
      white-space: nowrap;
    }
    .header-right .mobiles {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 1px;
      white-space: nowrap;
    }
    .header-right .tagline {
      font-style: italic;
      color: #b71c1c;
      font-size: 9.5px;
      margin-top: 1px;
      white-space: nowrap;
    }
    .header-right .address {
      font-size: 8.5px;
      color: #c62828;
      margin-top: 1px;
      white-space: nowrap;
    }
    .party-meta-grid {
      display: flex;
      border-bottom: 1.5px solid #c62828;
      margin-bottom: 0px;
    }
    .party-section {
      flex: 1.35;
      padding: 2px 6px 2px 0;
      font-size: 11px;
    }
    .party-line {
      display: flex;
      align-items: flex-end;
      border-bottom: 1px solid #c62828;
      padding-bottom: 1px;
      margin-bottom: 2px;
      min-height: 16px;
      white-space: nowrap;
    }
    .meta-section {
      flex: 0.95;
      border-left: 1.5px solid #c62828;
      padding: 2px 0 2px 6px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .meta-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #c62828;
      padding-bottom: 1px;
      margin-bottom: 2px;
      white-space: nowrap;
    }
    .meta-line:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    .table-container {
      width: 100%;
      border-collapse: collapse;
      position: relative;
      z-index: 1;
      font-size: 11px;
    }
    .table-header {
      background-color: #c62828 !important;
      color: #ffffff !important;
      font-size: 10.5px;
      font-weight: bold;
      text-transform: uppercase;
      height: 22px;
      white-space: nowrap;
    }
    .table-header th {
      border-right: 1.5px solid #ffffff;
      padding: 2px 4px;
    }
    .table-header th:last-child {
      border-right: none;
    }
    .summary-box {
      background-color: #c62828 !important;
      color: #ffffff !important;
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      font-size: 10px;
      font-weight: bold;
      color: #c62828;
      white-space: nowrap;
    }
    .footer-signs {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
      font-size: 10px;
      font-weight: bold;
      color: #c62828;
      white-space: nowrap;
    }
    @media screen {
      html, body {
        margin: 0;
        padding: 4px;
        background: transparent;
        display: flex;
        justify-content: center;
      }
      .challan-container {
        box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      }
    }
  </style>
</head>
<body>
  <div class="challan-container">
    <div class="watermark">${firmTitle.toUpperCase()}</div>

    <!-- Top Badge -->
    <div>
      <span class="top-badge">Delivery Challan</span>
    </div>

    <!-- Header: Logo + Contact/Address -->
    <div class="header-layout">
      <div class="header-left">
        ${logoMarkup}
      </div>
      <div class="header-right">
        <div class="mobiles">
          Mo. ${firmMobiles[0]}<br>
          Mo. ${firmMobiles[1]}
        </div>
        <div class="tagline">All Type of sequence Embroidery Job Work</div>
        <div class="address">${firmAddress}</div>
      </div>
    </div>

    <!-- Party & Challan Meta Grid -->
    <div class="party-meta-grid">
      <div class="party-section">
        <div class="party-line">
          <span style="color: #c62828; font-weight: bold; width: 32px; white-space: nowrap;">M/s.</span>
          <span style="font-weight: bold; font-size: 12px; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${challan.merchantName || ''}</span>
        </div>
        <div class="party-line">
          <span style="font-size: 10.5px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${challan.merchantAddress || ''}</span>
        </div>
        <div class="party-line" style="border-bottom: none; margin-bottom: 0;">
          <span style="flex: 1;"></span>
          <span style="color: #c62828; font-weight: bold; margin-right: 4px; white-space: nowrap;">City:</span>
          <span style="font-weight: bold; font-size: 11px; color: #111; white-space: nowrap;">${challan.merchantCity || 'Surat'}</span>
        </div>
      </div>

      <div class="meta-section">
        <div class="meta-line">
          <span style="color: #c62828; font-weight: bold;">Ch.No. :</span>
          <span style="font-size: 16px; font-weight: 900; color: #c62828; font-family: monospace;">${challan.challanNo || ''}</span>
        </div>
        <div class="meta-line">
          <span style="color: #c62828; font-weight: bold;">Date :</span>
          <span style="font-weight: bold; font-size: 11px; color: #111;">${formattedDate}</span>
        </div>
        <div class="meta-line">
          <span style="color: #c62828; font-weight: bold;">P.Ch.No. :</span>
          <span style="font-weight: bold; font-size: 11px; color: #111;">${challan.pChallanNo || '-'}</span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="table-container">
      <thead>
        <tr class="table-header">
          <th style="width: 34px; text-align: center;">No.</th>
          <th style="text-align: left; padding-left: 6px;">Particulars</th>
          <th style="width: 70px; text-align: center;">Qty/Pcs.</th>
          <th style="width: 60px; text-align: right; padding-right: 6px;">Rate</th>
          <th style="width: 80px; text-align: right; padding-right: 6px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <!-- Summary Row -->
        <tr style="height: 23px; border-top: 1.5px solid #c62828; border-bottom: 1.5px solid #c62828;">
          <td style="border-right: 1.5px solid #c62828; background: #fff;"></td>
          <td class="summary-box" style="border-right: 1.5px solid #fff;">Total</td>
          <td style="border-right: 1.5px solid #c62828; text-align: center; font-size: 12px; font-weight: 900; color: #111; background: #fff; white-space: nowrap; padding: 2px;">
            ${challan.totalQty || 0}
          </td>
          <td class="summary-box" style="border-right: 1.5px solid #fff;">Net. Amo.</td>
          <td style="text-align: right; padding-right: 6px; font-size: 12px; font-weight: 900; color: #111; background: #fff; white-space: nowrap;">
            ₹ ${(challan.netAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Footer -->
    <div class="footer-meta">
      <div>PAN NO.: <span style="color: #111; letter-spacing: 0.5px;">${firmPan}</span></div>
      <div style="font-size: 11px;">For, ${firmTitle}</div>
    </div>

    <div class="footer-signs">
      <div style="color: #333;">Receiver Sign...........................</div>
      <div>Propriter/Authority</div>
    </div>
  </div>
</body>
</html>`;
}
