import { ASTHA_LOGO_BASE64, SWASTIK_LOGO_BASE64 } from './logosBase64.js';

function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(d) {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

export function generateChallanPrintHtml(challan) {
  const firm = (challan.firmSnapshot && typeof challan.firmSnapshot.toObject === 'function')
    ? challan.firmSnapshot.toObject()
    : (challan.firmSnapshot || {});

  const isAstha = (challan.firmName && challan.firmName.toLowerCase().includes('astha')) ||
                  (firm.templateType === 'astha');

  const firmName = isAstha
    ? (firm.firmName || 'Astha Fashion')
    : (firm.firmName || 'Swastik Art');

  const logoBase64 = isAstha ? ASTHA_LOGO_BASE64 : SWASTIK_LOGO_BASE64;

  const tagline = isAstha
    ? (firm.businessType || 'All Types of Embroidery Job Work')
    : (firm.businessType || 'All Type of Sequence Embroidery Job Work');

  const ownerName = firm.ownerName || (isAstha ? 'Maheshbhai L. Sutariya' : '');

  const mobile1 = isAstha
    ? ((firm.mobileNumbers && firm.mobileNumbers[0]) || '99045 84177')
    : ((firm.mobileNumbers && firm.mobileNumbers[0]) || '98255 85058');

  const mobile2 = isAstha
    ? ((firm.mobileNumbers && firm.mobileNumbers[1]) || '98255 85058')
    : ((firm.mobileNumbers && firm.mobileNumbers[1]) || '99045 84177');

  const address = isAstha
    ? (firm.address || 'A-22, Mahatma Industries, Nr. Kapodra Police Station, Varachha Road, Surat - 395006')
    : (firm.address || '66,67, 3rd Floor, R.K. Industries, Kapodra, Varachha Road, Surat');

  const gstin = firm.gstin || (isAstha ? '' : '24BKJPS1499H1ZP');
  const panNo = firm.panNo || (isAstha ? 'DFQPS3042G' : '');

  // Bank details
  const bank = firm.bankDetails || {};
  const bankName = isAstha
    ? (bank.bankName || 'The Panchsheel Mercantile Co. Op. Bank Ltd.')
    : (bank.bankName || 'The Panchsheel Mercantile Co-Op. Bank LTD.');

  const acNo = isAstha
    ? (bank.accountNo || '1007005000285')
    : (bank.accountNo || '1002021012299');

  const ifsc = isAstha
    ? (bank.ifscCode || 'Yesb0pmcb07')
    : (bank.ifscCode || 'YESB0PMCB02');

  const branch = isAstha
    ? (bank.branch || 'Varachha Road, Surat')
    : (bank.branch || 'Ring Road, Surat');

  const rowsCount = Math.max(10, (challan.items || []).length);
  const rowsHtml = [];

  for (let i = 0; i < rowsCount; i++) {
    const item = challan.items && challan.items[i];
    if (item) {
      rowsHtml.push(`
        <tr>
          <td class="text-center font-bold">${i + 1}</td>
          <td>${item.description || item.particulars || ''}</td>
          <td class="text-center font-bold">${item.qty}</td>
          <td class="text-right">${formatCurrency(item.rate)}</td>
          <td class="text-right font-bold">${formatCurrency(item.amount)}</td>
        </tr>
      `);
    } else {
      rowsHtml.push(`
        <tr class="empty-row">
          <td class="text-center">${i + 1}</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      `);
    }
  }

  let bannerPill = '';
  if (gstin) {
    bannerPill = `<div class="gstin-pill">GSTIN :- ${gstin}</div>`;
  } else if (panNo) {
    bannerPill = `<div class="gstin-pill">PAN No. :- ${panNo}</div>`;
  }

  const displayChallanNo = challan.challanNo || challan.billNo || '-';

  return `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <title>Bill / Challan - ${firmName} - ${challan.billNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      background: #eef2f5;
      margin: 0;
      padding: 16px;
      color: #111;
    }
    .no-print-toolbar {
      max-width: 800px;
      margin: 0 auto 15px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .print-btn {
      background: #dc2626;
      color: #fff;
      border: none;
      padding: 9px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-btn:hover {
      background: #b91c1c;
    }
    .bill-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #b71c1c;
      padding: 18px 22px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
      position: relative;
    }
    .bill-container::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 360px;
      height: 360px;
      background-image: url('${logoBase64}');
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      opacity: 0.08;
      pointer-events: none;
      z-index: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      position: relative;
      z-index: 1;
    }
    .brand-section {
      vertical-align: top;
      width: 55%;
    }
    .brand-tagline {
      font-size: 11.5px;
      font-weight: 700;
      color: #b71c1c;
      font-style: italic;
      margin-top: 2px;
    }
    .gstin-pill {
      display: inline-block;
      background: #b71c1c;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12.5px;
      font-weight: bold;
      margin-top: 6px;
      letter-spacing: 0.5px;
    }
    .header-contact {
      text-align: right;
      font-size: 11.5px;
      line-height: 1.4;
      vertical-align: top;
    }
    .contact-phone {
      font-weight: bold;
      color: #0f172a;
      font-size: 13px;
    }
    .details-box {
      border: 1px solid #b71c1c;
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      margin-top: 8px;
      margin-bottom: 8px;
      font-size: 12.5px;
      background: #fffafa;
      position: relative;
      z-index: 1;
    }
    .details-left {
      width: 65%;
      line-height: 1.6;
    }
    .details-right {
      width: 35%;
      line-height: 1.6;
      text-align: right;
    }
    .detail-row {
      display: flex;
      margin-bottom: 2px;
    }
    .detail-label {
      font-weight: bold;
      color: #334155;
      min-width: 65px;
    }
    .detail-val {
      font-weight: 600;
      color: #0f172a;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      border: 1px solid #b71c1c;
      position: relative;
      z-index: 1;
    }
    .items-table th {
      background: #b71c1c;
      color: #ffffff;
      padding: 7px 6px;
      font-size: 12.5px;
      font-weight: 700;
      border: 1px solid #b71c1c;
      text-transform: uppercase;
    }
    .items-table td {
      border: 1px solid #f0a3a3;
      padding: 5px 8px;
      font-size: 12.5px;
    }
    .empty-row td {
      height: 22px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0px;
      border: 1px solid #b71c1c;
      border-top: none;
      position: relative;
      z-index: 1;
    }
    .summary-left {
      width: 58%;
      vertical-align: top;
      padding: 8px 12px;
      border-right: 1px solid #b71c1c;
      font-size: 11px;
    }
    .summary-right {
      width: 42%;
      vertical-align: top;
      padding: 0;
    }
    .bank-details-title {
      font-weight: bold;
      color: #b71c1c;
      font-size: 11.5px;
      margin-bottom: 3px;
    }
    .tax-row {
      display: flex;
      justify-content: space-between;
      padding: 3.5px 10px;
      font-size: 12px;
      border-bottom: 1px solid #fecaca;
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      font-size: 14.5px;
      font-weight: bold;
      background: #b71c1c;
      color: #ffffff;
    }
    .sign-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
      font-size: 11.5px;
      position: relative;
      z-index: 1;
    }
    .sign-authority {
      text-align: right;
    }
    .terms-box {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.4;
      margin-top: 8px;
      border-top: 1px dashed #f87171;
      padding-top: 4px;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .no-print-toolbar {
        display: none !important;
      }
      .bill-container {
        border: 2px solid #b71c1c !important;
        box-shadow: none !important;
        max-width: 100% !important;
        padding: 10px !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-toolbar">
    <div>
      <strong>📄 Bill / Challan: ${challan.billNo}</strong> (${firmName})
    </div>
    <div>
      <button class="print-btn" onclick="window.print()">🖨️ Print Bill / PDF</button>
    </div>
  </div>

  <div class="bill-container">
    <table class="header-table">
      <tr>
        <td class="brand-section">
          <div style="margin-bottom: 3px;">
            <img src="${logoBase64}" style="max-height: 54px; max-width: 250px; object-fit: contain;" alt="${firmName}" />
          </div>
          <div class="brand-tagline">${tagline}</div>
          ${bannerPill}
        </td>
        <td class="header-contact">
          ${ownerName ? `<div style="font-weight: bold; color: #0f172a; font-size: 13.5px; margin-bottom: 2px;">${ownerName}</div>` : ''}
          <div class="contact-phone">Mo. ${mobile1}</div>
          <div class="contact-phone">Mo. ${mobile2}</div>
          <div style="margin-top: 3px; color: #334155;">${address}</div>
        </td>
      </tr>
    </table>

    <div class="details-box">
      <!-- Left: Customer Name and Address (GSTIN removed as requested) -->
      <div class="details-left">
        <div class="detail-row">
          <span class="detail-label">Name :</span>
          <span class="detail-val">${challan.merchantName || ''}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Add. :</span>
          <span class="detail-val">${challan.merchantAddress || ''}</span>
        </div>
      </div>

      <!-- Right: Bill No, Ch No, Date -->
      <div class="details-right">
        <div class="detail-row" style="justify-content: flex-end;">
          <span class="detail-label" style="text-align: right; min-width: auto; margin-right: 6px;">Bill No. :-</span>
          <span class="detail-val" style="color: #b71c1c; font-size: 16px;">${challan.billNo || '1'}</span>
        </div>
        <div class="detail-row" style="justify-content: flex-end;">
          <span class="detail-label" style="text-align: right; min-width: auto; margin-right: 6px;">Ch. No. :-</span>
          <span class="detail-val">${displayChallanNo}</span>
        </div>
        <div class="detail-row" style="justify-content: flex-end;">
          <span class="detail-label" style="text-align: right; min-width: auto; margin-right: 6px;">Date :-</span>
          <span class="detail-val">${formatDate(challan.date)}</span>
        </div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 7%;">Sr. No.</th>
          <th style="width: 53%;">Particulars</th>
          <th style="width: 13%;">Qty.</th>
          <th style="width: 13%;">Rate</th>
          <th style="width: 14%;">Amount .</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.join('')}
      </tbody>
    </table>

    <table class="summary-table">
      <tr>
        <td class="summary-left">
          <div class="bank-details-title">Bank Details:</div>
          <div><strong>Bank Name :</strong> ${bankName}</div>
          <div><strong>Ac No. :</strong> ${acNo}</div>
          <div><strong>IFSC Code :</strong> ${ifsc}</div>
          <div><strong>Branch :</strong> ${branch}</div>
          ${panNo && isAstha ? `<div><strong>Pan No. :</strong> ${panNo}</div>` : ''}

          <div class="terms-box">
            <strong>TERMS & CONDITIONS</strong><br/>
            &bull; Interest 2% on the bill amount after due date.<br/>
            &bull; Complaint if any regarding this invoice must be settled with in 24 hours.<br/>
            &bull; due date 7 days.<br/>
            &bull; Subject to SURAT Jurisdiction
          </div>
        </td>

        <td class="summary-right">
          <div class="tax-row">
            <span>Sub Total</span>
            <strong>${formatCurrency(challan.subTotal)}</strong>
          </div>
          ${challan.discount ? `
          <div class="tax-row">
            <span>Discount</span>
            <span>-${formatCurrency(challan.discount)}</span>
          </div>` : ''}
          <div class="tax-row">
            <span>Total Amount before Tax</span>
            <strong>${formatCurrency(challan.totalAmountBeforeTax)}</strong>
          </div>
          ${challan.isGstApplicable ? `
          <div class="tax-row">
            <span>Add : CGST ${challan.cgstRate || 2.5}%</span>
            <span>${formatCurrency(challan.cgstAmount)}</span>
          </div>
          <div class="tax-row">
            <span>Add : SGST ${challan.sgstRate || 2.5}%</span>
            <span>${formatCurrency(challan.sgstAmount)}</span>
          </div>
          ${challan.igstRate ? `
          <div class="tax-row">
            <span>Add : IGST ${challan.igstRate}%</span>
            <span>${formatCurrency(challan.igstAmount)}</span>
          </div>` : ''}
          ` : ''}
          <!-- Label Changed to Total Amount -->
          <div class="grand-total-row">
            <span>Total Amount</span>
            <span>₹ ${formatCurrency(challan.grandTotal)}</span>
          </div>
        </td>
      </tr>
    </table>

    <div class="sign-section">
      <div>
        <strong>Receiver's Sign. ____________</strong>
        <span style="margin-left: 14px; font-weight: bold; color: #64748b;">E. & O. E.</span>
      </div>
      <div class="sign-authority">
        <div style="font-weight: bold; color: #b71c1c; font-size: 13px;">For, ${firmName}</div>
        <div style="margin-top: 32px; font-weight: 700; color: #1e293b;">Propriter/Authority</div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
