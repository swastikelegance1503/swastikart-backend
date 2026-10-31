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
  const firm = (challan.firmSnapshot && typeof challan.firmSnapshot.toObject === 'function') ? challan.firmSnapshot.toObject() : (challan.firmSnapshot || {});
  const isAstha = (challan.firmName && challan.firmName.toLowerCase().includes('astha')) ||
                  (firm.templateType === 'astha');

  return isAstha ? generateAsthaHtml(challan, firm) : generateSwastikHtml(challan, firm);
}

// ==========================================
// 1. ASTHA FASHION BILL TEMPLATE (Photo 1)
// ==========================================
function generateAsthaHtml(challan, firm) {
  const firmName = firm.firmName || challan.firmName || 'Astha Fashion';
  const ownerName = firm.ownerName || 'Maheshbhai L. Sutariya';
  const mobile1 = (firm.mobileNumbers && firm.mobileNumbers[0]) || '99045 84177';
  const mobile2 = (firm.mobileNumbers && firm.mobileNumbers[1]) || '98255 85058';
  const address = firm.address || 'A-22, Mahatma Industries, Nr.Kapodra Police Station, Varachha Road, Surat - 395006';
  const bank = firm.bankDetails || {};
  const bankName = bank.bankName || 'The Panchsheel Mercantile Co. Op. Bank Ltd.';
  const acNo = bank.accountNo || '1007005000285';
  const ifsc = bank.ifscCode || 'Yesb0pmcb07';
  const panNo = firm.panNo || 'DFQPS3042G';

  const rowsCount = Math.max(13, (challan.items || []).length);
  const rowsHtml = [];

  for (let i = 0; i < rowsCount; i++) {
    const item = challan.items && challan.items[i];
    if (item) {
      rowsHtml.push(`
        <tr>
          <td class="text-center">${i + 1}</td>
          <td>${item.description || ''}</td>
          <td class="text-center">${item.qty}</td>
          <td class="text-right">${formatCurrency(item.rate)}</td>
          <td class="text-right">${formatCurrency(item.amount)}</td>
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

  return `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <title>Challan / Bill - ${firmName} - ${challan.billNo}</title>
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
      padding: 20px;
      color: #222;
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
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 10px 22px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    .bill-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fbf8e8;
      border: 2px solid #85754d;
      padding: 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      position: relative;
    }
    .top-header {
      text-align: center;
      font-size: 13px;
      color: #795548;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .firm-brand {
      font-size: 40px;
      font-weight: 900;
      font-style: italic;
      color: #1e5c3e;
      letter-spacing: -1px;
      line-height: 1;
    }
    .firm-brand span {
      font-family: "Brush Script MT", cursive, serif;
      color: #1a4d2e;
    }
    .firm-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: #555;
      margin-top: 4px;
    }
    .owner-info {
      text-align: right;
      font-size: 12px;
      line-height: 1.4;
    }
    .owner-name {
      font-size: 16px;
      font-weight: bold;
      color: #1a202c;
    }
    .phone-badge {
      display: inline-block;
      color: #15803d;
      font-weight: 700;
      font-size: 13px;
    }
    .party-info-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 14px;
      font-size: 14px;
    }
    .party-info-table td {
      padding: 4px 6px;
      vertical-align: top;
    }
    .underline-field {
      border-bottom: 1px dotted #555;
      display: inline-block;
      width: 80%;
      min-height: 18px;
      font-weight: 600;
    }
    .bill-no-red {
      color: #dc2626;
      font-size: 20px;
      font-weight: 900;
    }
    /* Main Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      border: 1px solid #7c6f50;
    }
    .items-table th {
      background: #235d46;
      color: #ffffff;
      padding: 8px 6px;
      font-size: 13px;
      font-weight: 700;
      border: 1px solid #7c6f50;
      text-transform: uppercase;
    }
    .items-table td {
      border: 1px solid #c2b697;
      padding: 6px 8px;
      font-size: 13px;
    }
    .empty-row td {
      height: 24px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bottom-section {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      font-size: 12px;
    }
    .bottom-left {
      width: 58%;
    }
    .payment-box {
      border: 1px solid #a39572;
      border-radius: 6px;
      padding: 8px;
      background: #faf6dc;
      margin-top: 6px;
      line-height: 1.5;
    }
    .bank-box {
      border: 1px solid #a39572;
      border-radius: 6px;
      padding: 8px;
      background: #faf6dc;
      margin-top: 8px;
      font-size: 11px;
      line-height: 1.4;
    }
    .bottom-right {
      width: 38%;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .total-box-container {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .total-title {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 1px;
    }
    .total-amount-box {
      border: 2px solid #235d46;
      background: #ffffff;
      min-width: 130px;
      text-align: right;
      padding: 6px 10px;
      font-size: 16px;
      font-weight: bold;
    }
    .sign-container {
      text-align: center;
      margin-top: 25px;
    }
    .sign-title {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
    }
    .sign-auth {
      margin-top: 45px;
      color: #dc2626;
      font-weight: 700;
      font-size: 13px;
    }
    .terms {
      margin-top: 16px;
      border-top: 1px dashed #998a67;
      padding-top: 8px;
      font-size: 10px;
      color: #4b5563;
      line-height: 1.4;
    }
    .footer-signs {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 11px;
      font-weight: 600;
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
        border: 1px solid #000;
        box-shadow: none;
        max-width: 100%;
        padding: 10px;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-toolbar">
    <div>
      <strong>📄 Challan / Bill: ${challan.billNo}</strong> (${firmName})
    </div>
    <div>
      <button class="print-btn" onclick="window.print()">🖨️ Print Bill / PDF</button>
    </div>
  </div>

  <div class="bill-container">
    <div class="top-header">Shree Ganeshay Namah</div>

    <table class="header-table">
      <tr>
        <td style="width: 55%; vertical-align: top;">
          <div class="firm-brand">astha <span>fashion</span></div>
          <div class="firm-subtitle">${firm.businessType || 'All Types of Embroidery Job Work'}</div>
        </td>
        <td style="width: 45%; vertical-align: top;" class="owner-info">
          <div class="owner-name">${ownerName}</div>
          <div class="phone-badge">📞 ${mobile1} &bull; ${mobile2}</div>
          <div style="margin-top: 4px; color: #444;">${address}</div>
        </td>
      </tr>
    </table>

    <table class="party-info-table">
      <tr>
        <td style="width: 60%;">
          <strong>M/s.</strong> <span class="underline-field">${challan.merchantName}</span>
        </td>
        <td style="width: 40%; text-align: right;">
          <strong>Book No. :</strong> <span style="display:inline-block; min-width: 60px; font-weight:600;">${challan.bookNo || '-'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <strong>Add.</strong> <span class="underline-field">${challan.merchantAddress}</span>
        </td>
        <td style="text-align: right;">
          <strong>Bill No. :</strong> <span class="bill-no-red">${challan.billNo}</span>
        </td>
      </tr>
      <tr>
        <td>
          ${challan.merchantMobile ? `<strong>Mo. :</strong> ${challan.merchantMobile}` : ''}
          ${challan.merchantGstin ? `&nbsp;|&nbsp;<strong>GSTIN :</strong> ${challan.merchantGstin}` : ''}
        </td>
        <td style="text-align: right;">
          <strong>Date :</strong> <span style="font-weight: 700;">${formatDate(challan.date)}</span>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 8%;">No.</th>
          <th style="width: 52%;">Description</th>
          <th style="width: 12%;">Qty.</th>
          <th style="width: 13%;">Rate</th>
          <th style="width: 15%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.join('')}
      </tbody>
    </table>

    <div class="bottom-section">
      <div class="bottom-left">
        <div>Payment within <u>${challan.paymentDetails?.paymentWithinDays || '____'}</u> Days. Due Date : <u>${formatDate(challan.dueDate) || '__________'}</u></div>

        <div class="payment-box">
          <div><strong>Date :</strong> ${formatDate(challan.paymentDetails?.chequeDate) || '______________'}</div>
          <div><strong>Cheque No. :</strong> ${challan.paymentDetails?.chequeNo || '______________'}</div>
          <div><strong>Amount :</strong> ${challan.paymentDetails?.amount ? formatCurrency(challan.paymentDetails.amount) : '______________'}</div>
          <div><strong>Bank :</strong> ${challan.paymentDetails?.bankName || '______________'}</div>
        </div>

        <div class="bank-box">
          <div><strong>Bank :</strong> ${bankName}</div>
          <div><strong>A/c. No. :</strong> ${acNo}</div>
          <div><strong>IFSC Code :</strong> ${ifsc}</div>
          <div><strong>Pan No. :</strong> ${panNo}</div>
        </div>
      </div>

      <div class="bottom-right">
        <div class="total-box-container">
          <div class="total-title">TOTAL</div>
          <div class="total-amount-box">&#8377; ${formatCurrency(challan.grandTotal)}</div>
        </div>

        <div class="sign-container">
          <div class="sign-title">For, ${firmName}</div>
          <div class="sign-auth">Authorised Signatory</div>
        </div>
      </div>
    </div>

    <div class="terms">
      <strong>TERMS & CONDITIONS :</strong><br/>
      (1) Interest at 2% per month will be charge on amount remaining from the date of bill.<br/>
      (2) Complaints it regarding this invoice must be settle within 24 hours.<br/>
      (3) No Colour Guarantee.<br/>
      (4) Open Rates Goods will be dispatched on buyer's risk.<br/>
      (5) Subject to Surat Jurisdiction.
    </div>

    <div class="footer-signs">
      <div>Checked by : ________________</div>
      <div>Received Sign : ________________</div>
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// 2. SWASTIK ART BILL TEMPLATE (Photo 2)
// ==========================================
function generateSwastikHtml(challan, firm) {
  const firmName = firm.firmName || challan.firmName || 'Swastik Art';
  const mobile1 = (firm.mobileNumbers && firm.mobileNumbers[0]) || '98255 85058';
  const mobile2 = (firm.mobileNumbers && firm.mobileNumbers[1]) || '99045 84177';
  const address = firm.address || '66,67, 3rd Floor, R.K. Industries, Kapodra, Varachha Road, Surat';
  const gstin = firm.gstin || '24BKJPS1499H1ZP';
  const bank = firm.bankDetails || {};
  const bankName = bank.bankName || 'The Panchsheel Mercantile Co-Op. Bank LTD.';
  const acNo = bank.accountNo || '1002021012299';
  const ifsc = bank.ifscCode || 'YESB0PMCB02';
  const branch = bank.branch || 'Ring Road, Surat';

  const rowsCount = Math.max(10, (challan.items || []).length);
  const rowsHtml = [];

  for (let i = 0; i < rowsCount; i++) {
    const item = challan.items && challan.items[i];
    if (item) {
      rowsHtml.push(`
        <tr>
          <td class="text-center">${i + 1}</td>
          <td>${item.description || ''}</td>
          <td class="text-center">${item.qty}</td>
          <td class="text-right">${formatCurrency(item.rate)}</td>
          <td class="text-right">${formatCurrency(item.amount)}</td>
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
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
      color: #1e293b;
    }
    .no-print-toolbar {
      max-width: 800px;
      margin: 0 auto 15px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .print-btn {
      background: #dc2626;
      color: #fff;
      border: none;
      padding: 10px 22px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover {
      background: #b91c1c;
    }
    .bill-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #b71c1c;
      padding: 20px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
      position: relative;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .brand-section {
      vertical-align: top;
      width: 55%;
    }
    .brand-logo {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 38px;
      font-weight: 900;
      color: #b71c1c;
      letter-spacing: -0.5px;
    }
    .brand-swastik-symbol {
      display: inline-block;
      font-size: 32px;
      border: 2px solid #b71c1c;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      line-height: 40px;
      text-align: center;
      margin-right: 4px;
    }
    .brand-tagline {
      font-size: 12px;
      font-style: italic;
      color: #b71c1c;
      margin-top: 2px;
      font-weight: 600;
    }
    .gstin-pill {
      background: #b71c1c;
      color: #ffffff;
      padding: 5px 12px;
      font-weight: 700;
      font-size: 13px;
      margin-top: 6px;
      display: inline-block;
      letter-spacing: 0.5px;
    }
    .header-contact {
      text-align: right;
      vertical-align: top;
      font-size: 12px;
      line-height: 1.4;
      width: 45%;
    }
    .contact-phone {
      font-size: 14px;
      font-weight: 700;
      color: #b71c1c;
    }
    /* Party & Bill Details Box */
    .details-box {
      border: 1px solid #b71c1c;
      margin-top: 8px;
      margin-bottom: 12px;
      display: flex;
    }
    .details-left {
      width: 62%;
      padding: 8px;
      border-right: 1px solid #b71c1c;
      font-size: 13px;
      line-height: 1.6;
    }
    .details-right {
      width: 38%;
      padding: 8px;
      font-size: 13px;
      line-height: 1.6;
    }
    .detail-row {
      display: flex;
      margin-bottom: 3px;
    }
    .detail-label {
      font-weight: 700;
      min-width: 65px;
    }
    .detail-val {
      flex: 1;
      font-weight: 600;
    }
    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #b71c1c;
    }
    .items-table th {
      background: #b71c1c;
      color: #fff;
      padding: 7px 6px;
      font-size: 13px;
      border: 1px solid #b71c1c;
      text-align: center;
    }
    .items-table td {
      border: 1px solid #b71c1c;
      padding: 6px 8px;
      font-size: 13px;
    }
    .empty-row td {
      height: 24px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    /* Summary section */
    .bottom-section {
      display: flex;
      border: 1px solid #b71c1c;
      border-top: none;
    }
    .bottom-left-bank {
      width: 55%;
      padding: 10px;
      font-size: 12px;
      border-right: 1px solid #b71c1c;
      line-height: 1.5;
    }
    .tax-summary-table {
      width: 45%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .tax-summary-table td {
      border-bottom: 1px solid #b71c1c;
      padding: 4px 8px;
    }
    .tax-summary-table tr:last-child td {
      border-bottom: none;
      background: #fff5f5;
      font-size: 14px;
      font-weight: bold;
      color: #b71c1c;
    }
    /* Terms & Signature */
    .footer-section {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      font-size: 11px;
    }
    .terms-box {
      width: 60%;
      line-height: 1.4;
      color: #475569;
    }
    .signature-box {
      width: 35%;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 80px;
    }
    .for-firm {
      font-size: 14px;
      font-weight: bold;
      color: #b71c1c;
    }
    .sign-label {
      font-weight: 600;
      color: #334155;
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
        border: 2px solid #b71c1c;
        box-shadow: none;
        max-width: 100%;
        padding: 10px;
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
          <div class="brand-logo">
            <span class="brand-swastik-symbol">&#21328;</span>wastik<span style="color:#000;">Art</span>
          </div>
          <div class="brand-tagline">${firm.businessType || 'All Type of Sequence Embroidery Job Work'}</div>
          ${gstin ? `<div class="gstin-pill">GSTIN :- ${gstin}</div>` : ''}
        </td>
        <td class="header-contact">
          <div class="contact-phone">Mo. ${mobile1}</div>
          <div class="contact-phone">Mo. ${mobile2}</div>
          <div style="margin-top: 4px; color: #334155;">${address}</div>
        </td>
      </tr>
    </table>

    <div class="details-box">
      <div class="details-left">
        <div class="detail-row">
          <span class="detail-label">Name :</span>
          <span class="detail-val">${challan.merchantName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Add. :</span>
          <span class="detail-val">${challan.merchantAddress}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">GSTIN :</span>
          <span class="detail-val">${challan.merchantGstin || '-'}</span>
          <span style="font-weight:700; margin-left: 10px; margin-right: 5px;">State Code :</span>
          <span>${challan.stateCode || '24'}</span>
        </div>
      </div>
      <div class="details-right">
        <div class="detail-row">
          <span class="detail-label">Bill No. :-</span>
          <span class="detail-val" style="color: #b71c1c; font-size: 15px;">${challan.billNo}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Ch. No. :-</span>
          <span class="detail-val">${challan.challanNo || '-'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date :-</span>
          <span class="detail-val">${formatDate(challan.date)}</span>
        </div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 8%;">Sr. No.</th>
          <th style="width: 52%;">Particulars</th>
          <th style="width: 12%;">Qty.</th>
          <th style="width: 13%;">Rate</th>
          <th style="width: 15%;">Amount .</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.join('')}
      </tbody>
    </table>

    <div class="bottom-section">
      <div class="bottom-left-bank">
        <div><strong>Bank Name :</strong> ${bankName}</div>
        <div><strong>Ac No. :</strong> ${acNo}</div>
        <div><strong>IFSC Code :</strong> ${ifsc}</div>
        <div><strong>Branch :</strong> ${branch}</div>
      </div>
      <table class="tax-summary-table">
        <tr>
          <td style="width: 60%;">Total Amount</td>
          <td style="width: 40%;" class="text-right">${formatCurrency(challan.subTotal)}</td>
        </tr>
        <tr>
          <td>Discount</td>
          <td class="text-right">${formatCurrency(challan.discount)}</td>
        </tr>
        <tr>
          <td>Total Amount before Tax</td>
          <td class="text-right">${formatCurrency(challan.totalAmountBeforeTax)}</td>
        </tr>
        ${challan.isGstApplicable ? `
        <tr>
          <td>Add : CGST ${challan.cgstRate ? challan.cgstRate + '%' : ''}</td>
          <td class="text-right">${formatCurrency(challan.cgstAmount)}</td>
        </tr>
        <tr>
          <td>Add : SGST ${challan.sgstRate ? challan.sgstRate + '%' : ''}</td>
          <td class="text-right">${formatCurrency(challan.sgstAmount)}</td>
        </tr>
        <tr>
          <td>Add : IGST ${challan.igstRate ? challan.igstRate + '%' : ''}</td>
          <td class="text-right">${formatCurrency(challan.igstAmount)}</td>
        </tr>
        ` : ''}
        <tr>
          <td><strong>Total Amount After Tax</strong></td>
          <td class="text-right"><strong>&#8377; ${formatCurrency(challan.grandTotal)}</strong></td>
        </tr>
      </table>
    </div>

    <div class="footer-section">
      <div class="terms-box">
        <strong>TERMS & CONDITIONS :</strong><br/>
        &bull; Interest 2% on the bill amount after due date.<br/>
        &bull; Complaint if any regarding this invoice must be settled with in 24 hours.<br/>
        &bull; due date 7 days.<br/>
        &bull; Subject to SURAT Jurisdiction<br/><br/>
        <strong>Receiver's Sign</strong> ____________________ &nbsp;&nbsp;&nbsp;&nbsp; <strong>E.& O. E.</strong>
      </div>
      <div class="signature-box">
        <div class="for-firm">For, ${firmName}</div>
        <div class="sign-label">Propriter/Authority</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
