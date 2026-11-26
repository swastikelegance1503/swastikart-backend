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
 * Required Layout: A4 Portrait (210 x 297 mm) with 2 Challan Copies
 * - Top Half: First Copy (Original)
 * - Middle: "--- ✂ CUT HERE ✂ ---" dashed separator line
 * - Bottom Half: Second Copy (Duplicate)
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

  // Items Table Rows: 11 rows per slip gives an authentic challan pad look and fills the A4 page evenly
  const items = challan.items || [];
  const minRows = Math.max(items.length, 11);
  let rowsHtml = '';

  for (let i = 0; i < minRows; i++) {
    const item = items[i];
    if (item) {
      rowsHtml += `
        <tr style="height: 24px;">
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; text-align: center; font-size: 10.5px; font-weight: bold; color: #222; padding: 1px 2px; white-space: nowrap;">${item.srNo || i + 1}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; padding: 1px 6px; font-size: 11px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;">${item.particulars || ''}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; text-align: center; font-size: 11px; font-weight: bold; color: #111; padding: 1px 2px; white-space: nowrap;">${item.qty || ''}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ffcdd2; text-align: right; padding: 1px 6px; font-size: 11px; color: #222; white-space: nowrap;">${item.rate ? Number(item.rate).toFixed(2) : ''}</td>
          <td style="border-bottom: 1px solid #ffcdd2; text-align: right; padding: 1px 6px; font-size: 11px; font-weight: bold; color: #111; white-space: nowrap;">${item.amount ? Number(item.amount).toFixed(2) : ''}</td>
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

  // Generates markup for a single slip
  const renderSingleSlip = () => `
    <div class="challan-slip">
      <!-- Watermark Logo -->
      <div class="watermark-bg"></div>

      <!-- Header: Logo (Left) + Centered Delivery Challan + Contact (Right) -->
      <div class="header-layout">
        <div class="header-left">
          <img src="${logoBase64}" style="max-height: 44px; max-width: 190px; object-fit: contain; display: block;" alt="${firmTitle}" />
        </div>
        <div class="header-center">
          <span class="challan-title-pill">Delivery Challan</span>
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
            <span style="color: #c62828; font-weight: 800; width: 32px; white-space: nowrap; font-size: 11px;">M/s.</span>
            <span style="font-weight: 800; font-size: 12px; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${challan.merchantName || ''}</span>
          </div>
          <div class="party-line">
            <span style="font-size: 10px; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${challan.merchantAddress || ''}</span>
          </div>
          <div class="party-line" style="border-bottom: none; margin-bottom: 0;">
            <span style="flex: 1;"></span>
            <span style="color: #c62828; font-weight: 800; margin-right: 4px; white-space: nowrap; font-size: 10.5px;">City:</span>
            <span style="font-weight: 800; font-size: 10.5px; color: #111; white-space: nowrap;">${challan.merchantCity || 'Surat'}</span>
          </div>
        </div>

        <div class="meta-section">
          <div class="meta-line">
            <span style="color: #c62828; font-weight: 800; font-size: 10.5px;">Ch.No. :</span>
            <span style="font-size: 14px; font-weight: 900; color: #c62828; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">${challan.challanNo || ''}</span>
          </div>
          <div class="meta-line">
            <span style="color: #c62828; font-weight: 800; font-size: 10.5px;">Date :</span>
            <span style="font-weight: 800; font-size: 10.5px; color: #111;">${formattedDate}</span>
          </div>
          <div class="meta-line">
            <span style="color: #c62828; font-weight: 800; font-size: 10.5px;">P.Ch.No. :</span>
            <span style="font-weight: 700; font-size: 10.5px; color: #111;">${challan.pChallanNo || '-'}</span>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table class="table-container">
        <thead>
          <tr class="table-header">
            <th style="width: 34px; text-align: center;">No.</th>
            <th style="text-align: left; padding-left: 6px;">Particulars</th>
            <th style="width: 68px; text-align: center;">Qty/Pcs.</th>
            <th style="width: 62px; text-align: right; padding-right: 6px;">Rate</th>
            <th style="width: 78px; text-align: right; padding-right: 6px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <!-- Summary Row -->
          <tr style="height: 22px; border-top: 1.5px solid #c62828; border-bottom: 1.5px solid #c62828;">
            <td style="border-right: 1.5px solid #c62828; background: #fff;"></td>
            <td class="summary-box" style="border-right: 1.5px solid #fff;">Total</td>
            <td style="border-right: 1.5px solid #c62828; text-align: center; font-size: 11.5px; font-weight: 900; color: #111; background: #fff; white-space: nowrap; padding: 1px;">
              ${challan.totalQty || 0}
            </td>
            <td class="summary-box" style="border-right: 1.5px solid #fff;">Net. Amo.</td>
            <td style="text-align: right; padding-right: 6px; font-size: 12px; font-weight: 900; color: #111; background: #fff; white-space: nowrap;">
              ₹ ${formatCurrency(challan.netAmount || 0)}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Footer -->
      <div style="margin-top: 5px;">
        <div class="footer-meta">
          <div>PAN NO.: <span style="color: #111; font-weight: 800; letter-spacing: 0.5px;">${firmPan}</span></div>
          <div style="font-size: 11px; font-weight: 800;">For, ${firmTitle}</div>
        </div>

        <div class="footer-signs">
          <div style="color: #333; font-weight: 700;">Receiver Sign...........................</div>
          <div style="font-weight: 800; color: #c62828;">Propriter/Authority</div>
        </div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delivery Challan - #${challan.challanNo || '1'} (2 Copies - A4)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 5mm 6mm;
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #fff;
      color: #000;
      -webkit-font-smoothing: antialiased;
    }
    .a4-sheet {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .slip-wrapper {
      width: 100%;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .challan-slip {
      width: 100%;
      border: 1.5px solid #c62828;
      border-radius: 2px;
      padding: 6px 9px 6px 9px;
      background: #fff;
      position: relative;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .watermark-bg {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 220px;
      height: 220px;
      background-image: url('${logoBase64}');
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      opacity: 0.04;
      pointer-events: none;
      z-index: 0;
    }
    .challan-title-pill {
      display: inline-block;
      border: 1.5px solid #c62828;
      color: #c62828;
      font-size: 11px;
      font-weight: 900;
      padding: 2px 14px;
      border-radius: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      white-space: nowrap;
      background: #fff;
    }
    .header-layout {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
      padding-bottom: 3px;
      border-bottom: 1.5px solid #c62828;
      position: relative;
      z-index: 1;
    }
    .header-left {
      flex: 1.1;
      display: flex;
      align-items: center;
    }
    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .header-right {
      flex: 1.2;
      text-align: right;
      font-size: 9.5px;
      color: #c62828;
      line-height: 1.25;
      font-weight: 600;
      white-space: nowrap;
    }
    .header-right .mobiles {
      font-weight: 800;
      font-size: 10px;
      margin-bottom: 1px;
      white-space: nowrap;
    }
    .header-right .tagline {
      font-style: italic;
      color: #b71c1c;
      font-size: 9px;
      font-weight: 700;
      margin-top: 1px;
      white-space: nowrap;
    }
    .header-right .address {
      font-size: 8px;
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
      padding: 1px 5px 1px 0;
      font-size: 11px;
    }
    .party-line {
      display: flex;
      align-items: flex-end;
      border-bottom: 1px solid #c62828;
      padding-bottom: 1px;
      margin-bottom: 1.5px;
      min-height: 16px;
      white-space: nowrap;
    }
    .meta-section {
      flex: 0.95;
      border-left: 1.5px solid #c62828;
      padding: 1px 0 1px 5px;
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
      margin-bottom: 1.5px;
      min-height: 16px;
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
      font-size: 10.5px;
    }
    .table-header {
      background-color: #c62828 !important;
      color: #ffffff !important;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      height: 20px;
      white-space: nowrap;
    }
    .table-header th {
      border-right: 1.5px solid #ffffff;
      padding: 1px 4px;
    }
    .table-header th:last-child {
      border-right: none;
    }
    .summary-box {
      background-color: #c62828 !important;
      color: #ffffff !important;
      font-size: 10.5px;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
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
      margin-top: 38px;
      font-size: 10px;
      font-weight: 800;
      color: #c62828;
      white-space: nowrap;
      position: relative;
      z-index: 1;
    }
    .cut-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      margin: 6px 0;
      padding: 2px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .cut-line {
      flex: 1;
      border-top: 1.5px dashed #c62828;
      height: 1px;
    }
    .cut-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 10px;
      background: #fff;
      color: #c62828;
      font-size: 9.5px;
      font-weight: 900;
      letter-spacing: 1.5px;
      white-space: nowrap;
    }
    @media print {
      html, body {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      .a4-sheet {
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .slip-wrapper, .challan-slip, .cut-divider {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="a4-sheet">
    <!-- TOP HALF -->
    <div class="slip-wrapper">
      ${renderSingleSlip()}
    </div>

    <!-- MIDDLE: CUT HERE DIVIDER -->
    <div class="cut-divider">
      <div class="cut-line"></div>
      <div class="cut-badge">
        <span>✂</span>
        <span>CUT HERE (અહીંથી કાપો)</span>
        <span>✂</span>
      </div>
      <div class="cut-line"></div>
    </div>

    <!-- BOTTOM HALF -->
    <div class="slip-wrapper">
      ${renderSingleSlip()}
    </div>
  </div>
</body>
</html>`;
}
