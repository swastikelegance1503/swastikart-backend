/**
 * Delivery Challan Print HTML Generator
 * Matches the physical red challan book of Swastik Art and Astha Fashion
 */

export function generateDeliveryChallanPrintHtml(challan) {
  const firmName = challan.firmName || 'Swastik Art';
  const isAstha = firmName.toLowerCase().includes('astha');

  const firmTitle = isAstha ? 'Astha Fashion' : 'Swastik Art';
  const firmAddress = '66, 67, 3rd Floor, R.K. Industries, Kapodra, Varachha Road, Surat';
  const firmMobiles = ['98255 85058', '99045 84177'];
  const firmPan = 'BKJPS1499H';

  // Format Date
  let formattedDate = '';
  if (challan.date) {
    const d = new Date(challan.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    formattedDate = `${day}/${month}/${year}`;
  }

  // Generate Items Table Rows (minimum 8 rows for traditional slip aesthetic)
  const items = challan.items || [];
  const minRows = Math.max(items.length, 8);
  let rowsHtml = '';

  for (let i = 0; i < minRows; i++) {
    const item = items[i];
    if (item) {
      rowsHtml += `
        <tr style="height: 28px;">
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ef9a9a; text-align: center; font-size: 13px; font-weight: bold; color: #333;">${item.srNo || i + 1}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ef9a9a; padding: 4px 8px; font-size: 13px; font-weight: 600; color: #111;">${item.particulars || ''}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ef9a9a; text-align: center; font-size: 13px; font-weight: bold; color: #111;">${item.qty || ''}</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ef9a9a; text-align: right; padding-right: 8px; font-size: 13px; color: #333;">${item.rate ? Number(item.rate).toFixed(2) : ''}</td>
          <td style="border-bottom: 1px solid #ef9a9a; text-align: right; padding-right: 8px; font-size: 13px; font-weight: bold; color: #111;">${item.amount ? Number(item.amount).toFixed(2) : ''}</td>
        </tr>
      `;
    } else {
      rowsHtml += `
        <tr style="height: 28px;">
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ef9a9a;">&nbsp;</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ef9a9a;">&nbsp;</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ef9a9a;">&nbsp;</td>
          <td style="border-right: 1.5px solid #c62828; border-bottom: 1px solid #ef9a9a;">&nbsp;</td>
          <td style="border-bottom: 1px solid #ef9a9a;">&nbsp;</td>
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
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #000;
    }
    .challan-container {
      width: 100%;
      max-width: 580px;
      margin: 0 auto;
      border: 2px solid #c62828;
      border-radius: 4px;
      padding: 8px 10px;
      background: #fff;
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 52%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 56px;
      font-weight: bold;
      color: rgba(198, 40, 40, 0.06);
      pointer-events: none;
      white-space: nowrap;
      z-index: 0;
      letter-spacing: 4px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .badge-challan {
      border: 1.5px solid #c62828;
      color: #c62828;
      font-size: 11px;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .mobiles {
      font-size: 11px;
      font-weight: bold;
      color: #c62828;
      text-align: right;
      line-height: 1.3;
    }
    .brand-title {
      text-align: center;
      margin-top: -6px;
      margin-bottom: 2px;
    }
    .brand-title h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 900;
      color: #c62828;
      letter-spacing: 1px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .brand-subtitle {
      font-size: 11px;
      font-style: italic;
      color: #c62828;
      font-weight: 600;
      margin-top: 1px;
      text-align: center;
    }
    .brand-address {
      font-size: 10px;
      color: #c62828;
      font-weight: 600;
      text-align: center;
      margin-top: 2px;
      padding-bottom: 6px;
      border-bottom: 2px solid #c62828;
    }
    .party-meta-grid {
      display: flex;
      border-bottom: 2px solid #c62828;
      margin-bottom: 0px;
    }
    .party-info {
      flex: 1.3;
      padding: 6px 8px 6px 0;
      border-right: 2px solid #c62828;
      font-size: 12px;
      line-height: 1.45;
    }
    .party-name {
      font-size: 14px;
      font-weight: bold;
      color: #111;
    }
    .meta-info {
      flex: 0.9;
      padding: 6px 0 6px 8px;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .ch-no {
      font-size: 17px;
      font-weight: 900;
      color: #c62828;
    }
    .table-container {
      width: 100%;
      border-collapse: collapse;
      position: relative;
      z-index: 1;
    }
    .table-header {
      background-color: #c62828 !important;
      color: #ffffff !important;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      height: 26px;
    }
    .table-header th {
      border-right: 1.5px solid #ffffff;
      padding: 4px 6px;
    }
    .table-header th:last-child {
      border-right: none;
    }
    .summary-bar {
      background-color: #c62828 !important;
      color: #ffffff !important;
      font-size: 13px;
      font-weight: bold;
      text-align: center;
    }
    .footer-section {
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
      font-weight: bold;
      color: #c62828;
      padding-top: 6px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 36px;
      font-size: 11px;
      font-weight: bold;
      color: #c62828;
    }
  </style>
</head>
<body>
  <div class="challan-container">
    <div class="watermark">${firmTitle.toUpperCase()}</div>

    <!-- Top Badge & Phone -->
    <div class="header-top">
      <div class="badge-challan">Delivery Challan</div>
      <div class="mobiles">
        Mo. ${firmMobiles[0]}<br>
        Mo. ${firmMobiles[1]}
      </div>
    </div>

    <!-- Firm Header -->
    <div class="brand-title">
      <h1>
        <span style="border: 2px solid #c62828; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; margin-right: 2px;">卐</span>
        ${firmTitle}
      </h1>
      <div class="brand-subtitle">All Type of sequence Embroidery Job Work</div>
      <div class="brand-address">${firmAddress}</div>
    </div>

    <!-- Party & Challan Meta -->
    <div class="party-meta-grid">
      <div class="party-info">
        <div style="color: #c62828; font-weight: bold; margin-bottom: 2px;">M/s. <span class="party-name">${challan.merchantName || ''}</span></div>
        <div style="color: #444;">${challan.merchantAddress || ''}</div>
        <div style="color: #c62828; font-weight: bold; margin-top: 4px;">City: <span style="color: #111; font-weight: 600;">${challan.merchantCity || 'Surat'}</span></div>
      </div>
      <div class="meta-info">
        <div class="meta-row">
          <span style="color: #c62828; font-weight: bold;">Ch.No. :</span>
          <span class="ch-no">${challan.challanNo || ''}</span>
        </div>
        <div class="meta-row">
          <span style="color: #c62828; font-weight: bold;">Date :</span>
          <span style="font-weight: bold; color: #111;">${formattedDate}</span>
        </div>
        <div class="meta-row">
          <span style="color: #c62828; font-weight: bold;">P.Ch.No. :</span>
          <span style="font-weight: bold; color: #111;">${challan.pChallanNo || '-'}</span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="table-container">
      <thead>
        <tr class="table-header">
          <th style="width: 38px; text-align: center;">No.</th>
          <th style="text-align: left; padding-left: 8px;">Particulars</th>
          <th style="width: 75px; text-align: center;">Qty/Pcs.</th>
          <th style="width: 65px; text-align: right; padding-right: 8px;">Rate</th>
          <th style="width: 85px; text-align: right; padding-right: 8px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <!-- Summary Row -->
        <tr style="height: 28px; border-top: 2px solid #c62828; border-bottom: 2px solid #c62828;">
          <td style="border-right: 1.5px solid #c62828; background: #fff;"></td>
          <td class="summary-bar" style="border-right: 1.5px solid #fff;">Total</td>
          <td style="border-right: 1.5px solid #c62828; text-align: center; font-size: 14px; font-weight: 900; color: #c62828; background: #fff;">
            ${challan.totalQty || 0}
          </td>
          <td class="summary-bar" style="border-right: 1.5px solid #fff;">Net. Amo.</td>
          <td style="text-align: right; padding-right: 8px; font-size: 14px; font-weight: 900; color: #c62828; background: #fff;">
            ₹ ${(challan.netAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Footer -->
    <div class="footer-section">
      <div>PAN NO.: <span style="color: #111;">${firmPan}</span></div>
      <div style="font-size: 13px;">For, ${firmTitle}</div>
    </div>

    <div class="signatures">
      <div>Receiver Sign...........................</div>
      <div>Propriter/Authority</div>
    </div>
  </div>
</body>
</html>`;
}
