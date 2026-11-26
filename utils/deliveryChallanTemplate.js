import { ASTHA_LOGO_BASE64, SWASTIK_LOGO_BASE64 } from './logosBase64.js';

function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Delivery Challan Print HTML Generator (Backend)
 * Matches the physical red challan book of Swastik Art and Astha Fashion
 * Specifically designed for Half A4 Page (A5 Portrait: 148mm x 210mm)
 */
export function generateDeliveryChallanPrintHtml(challan) {
  const firmName = challan.firmName || 'Swastik Art';
  const isAstha = firmName.toLowerCase().includes('astha');

  const firmTitle = isAstha ? 'Astha Fashion' : 'Swastik Art';
  const logoBase64 = isAstha ? ASTHA_LOGO_BASE64 : SWASTIK_LOGO_BASE64;
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

  // Items Table Rows (11 rows fills Half A4 Page)
  const items = challan.items || [];
  const minRows = Math.max(items.length, 11);
  let rowsHtml = '';

  for (let i = 0; i < minRows; i++) {
    const item = items[i];
    if (item) {
      rowsHtml += `
        <tr style="height: 24px;">
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; text-align: center; font-size: 11px; font-weight: bold; color: #222; padding: 2px; white-space: nowrap;">${item.srNo || i + 1}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; padding: 2px 8px; font-size: 12px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${item.particulars || ''}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; text-align: center; font-size: 12px; font-weight: bold; color: #111; padding: 2px; white-space: nowrap;">${item.qty || ''}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; text-align: right; padding: 2px 8px; font-size: 11.5px; color: #222; white-space: nowrap;">${item.rate ? Number(item.rate).toFixed(2) : ''}</td>
          <td style="border-bottom: 1px solid #ffcdd2; text-align: right; padding: 2px 8px; font-size: 12px; font-weight: bold; color: #111; white-space: nowrap;">${item.amount ? Number(item.amount).toFixed(2) : ''}</td>
        </tr>
      `;
    } else {
      rowsHtml += `
        <tr style="height: 24px;">
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
          <td style="border-bottom: 1px solid #ffcdd2;">&nbsp;</td>
        </tr>
      `;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delivery Challan - ${challan.challanNo || 'Challan'}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 4mm 5mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #fff;
      color: #000;
      -webkit-font-smoothing: antialiased;
    }
    .challan-container {
      width: 100%;
      min-height: 100%;
      margin: 0;
      border: 2px solid #c62828;
      border-radius: 2px;
      padding: 6px 8px;
      background: #fff;
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .challan-container::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 250px;
      height: 250px;
      background-image: url('${logoBase64}');
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      opacity: 0.05;
      pointer-events: none;
      z-index: 0;
    }
    .top-badge {
      display: inline-block;
      border: 1px solid #c62828;
      color: #c62828;
      font-size: 9px;
      font-weight: 700;
      padding: 1.5px 8px;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      white-space: nowrap;
    }
    .header-layout {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #c62828;
      position: relative;
      z-index: 1;
    }
    .header-left {
      flex: 1.1;
      padding-top: 1px;
    }
    .header-right {
      flex: 1.2;
      text-align: right;
      font-size: 10px;
      color: #c62828;
      line-height: 1.25;
      font-weight: 600;
      white-space: nowrap;
    }
    .header-right .mobiles {
      font-weight: 800;
      font-size: 11px;
      margin-bottom: 1px;
      white-space: nowrap;
    }
    .header-right .tagline {
      font-style: italic;
      color: #b71c1c;
      font-size: 10px;
      font-weight: 700;
      margin-top: 1px;
      white-space: nowrap;
    }
    .header-right .address {
      font-size: 9px;
      color: #c62828;
      margin-top: 1px;
      white-space: nowrap;
    }
    .party-meta-grid {
      display: flex;
      border-bottom: 1.5px solid #c62828;
      margin-bottom: 0px;
      position: relative;
      z-index: 1;
    }
    .party-section {
      flex: 1.35;
      padding: 2px 6px 2px 0;
      font-size: 11.5px;
    }
    .party-line {
      display: flex;
      align-items: flex-end;
      border-bottom: 1.5px solid #c62828;
      padding-bottom: 1px;
      margin-bottom: 2px;
      min-height: 18px;
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
      border-bottom: 1.5px solid #c62828;
      padding-bottom: 1px;
      margin-bottom: 2px;
      min-height: 18px;
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
      font-size: 11.5px;
    }
    .table-header {
      background-color: #c62828 !important;
      color: #ffffff !important;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      height: 24px;
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
      font-size: 11.5px;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 5px;
      font-size: 10.5px;
      font-weight: 800;
      color: #c62828;
      white-space: nowrap;
      position: relative;
      z-index: 1;
    }
    .footer-signs {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 18px;
      font-size: 10.5px;
      font-weight: 800;
      color: #c62828;
      white-space: nowrap;
      position: relative;
      z-index: 1;
    }
    @media print {
      body {
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .challan-container {
        border: 2px solid #c62828 !important;
      }
    }
  </style>
</head>
<body>
  <div class="challan-container">
    <div>
      <!-- Top Badge -->
      <div>
        <span class="top-badge">Delivery Challan</span>
      </div>

      <!-- Header: Official Logo + Contact/Address -->
      <div class="header-layout">
        <div class="header-left">
          <img src="${logoBase64}" style="max-height: 48px; max-width: 210px; object-fit: contain; display: block;" alt="${firmTitle}" />
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
            <span style="color: #c62828; font-weight: 800; width: 34px; white-space: nowrap; font-size: 12px;">M/s.</span>
            <span style="font-weight: 800; font-size: 12.5px; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${challan.merchantName || ''}</span>
          </div>
          <div class="party-line">
            <span style="font-size: 11px; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${challan.merchantAddress || ''}</span>
          </div>
          <div class="party-line" style="border-bottom: none; margin-bottom: 0;">
            <span style="flex: 1;"></span>
            <span style="color: #c62828; font-weight: 800; margin-right: 4px; white-space: nowrap; font-size: 11.5px;">City:</span>
            <span style="font-weight: 800; font-size: 11.5px; color: #111; white-space: nowrap;">${challan.merchantCity || 'Surat'}</span>
          </div>
        </div>

        <div class="meta-section">
          <div class="meta-line">
            <span style="color: #c62828; font-weight: 800; font-size: 11.5px;">Ch.No. :</span>
            <span style="font-size: 15px; font-weight: 900; color: #c62828; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">${challan.challanNo || ''}</span>
          </div>
          <div class="meta-line">
            <span style="color: #c62828; font-weight: 800; font-size: 11.5px;">Date :</span>
            <span style="font-weight: 800; font-size: 11.5px; color: #111;">${formattedDate}</span>
          </div>
          <div class="meta-line">
            <span style="color: #c62828; font-weight: 800; font-size: 11.5px;">P.Ch.No. :</span>
            <span style="font-weight: 700; font-size: 11.5px; color: #111;">${challan.pChallanNo || '-'}</span>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table class="table-container">
        <thead>
          <tr class="table-header">
            <th style="width: 36px; text-align: center;">No.</th>
            <th style="text-align: left; padding-left: 8px;">Particulars</th>
            <th style="width: 74px; text-align: center;">Qty/Pcs.</th>
            <th style="width: 66px; text-align: right; padding-right: 8px;">Rate</th>
            <th style="width: 86px; text-align: right; padding-right: 8px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <!-- Summary Row -->
          <tr style="height: 25px; border-top: 2px solid #c62828; border-bottom: 2px solid #c62828;">
            <td style="border-right: 1.5px solid #c62828; background: #fff;"></td>
            <td class="summary-box" style="border-right: 1.5px solid #fff;">Total</td>
            <td style="border-right: 1.5px solid #c62828; text-align: center; font-size: 12.5px; font-weight: 900; color: #111; background: #fff; white-space: nowrap; padding: 2px;">
              ${challan.totalQty || 0}
            </td>
            <td class="summary-box" style="border-right: 1.5px solid #fff;">Net. Amo.</td>
            <td style="text-align: right; padding-right: 8px; font-size: 13px; font-weight: 900; color: #111; background: #fff; white-space: nowrap;">
              ₹ ${formatCurrency(challan.netAmount || 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div>
      <div class="footer-meta">
        <div>PAN NO.: <span style="color: #111; font-weight: 800; letter-spacing: 0.5px;">${firmPan}</span></div>
        <div style="font-size: 11.5px; font-weight: 800;">For, ${firmTitle}</div>
      </div>

      <div class="footer-signs">
        <div style="color: #333; font-weight: 700;">Receiver Sign...........................</div>
        <div style="font-weight: 800; color: #c62828;">Propriter/Authority</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
