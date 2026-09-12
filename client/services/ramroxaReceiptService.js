/**
 * Ramroxa Global Thermal Receipt & Invoice Generation Service
 * Produces pixel-perfect Abbreviated / Full Tax Invoices matching the Ramroxa Global POS thermal layout.
 * Supports: View Receipt | Print | Download PDF
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Zero Rupees Only';
  const val = Math.max(0, Number(num));
  const rupees = Math.floor(val);
  const paisa = Math.round((val - rupees) * 100);

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(n) {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += ones[n] + ' ';
      } else {
        str += tens[Math.floor(n / 10)];
        if (n % 10 > 0) {
          str += ' ' + ones[n % 10];
        }
        str += ' ';
      }
    }
    return str.trim();
  }

  function convertFull(n) {
    if (n === 0) return 'Zero';
    let result = '';
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const remainder = n;

    if (crore > 0) result += convertFull(crore) + ' Crore ';
    if (lakh > 0) result += convertBelowThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertBelowThousand(thousand) + ' Thousand ';
    if (remainder > 0) result += convertBelowThousand(remainder) + ' ';

    return result.trim();
  }

  const rupeeWords = (rupees === 0 ? 'Zero' : convertFull(rupees)) + ' Rupees';
  const paisaWords = paisa > 0 ? ' and ' + convertBelowThousand(paisa) + ' Paisa' : '';
  return (rupeeWords + paisaWords + ' Only').replace(/\s+/g, ' ');
}

export function formatReceiptDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '15.12.2026';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatReceiptTime(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

// Accurate Bikram Sambat (BS) month lengths lookup table (BS 2080 - 2085)
const BS_MONTH_DAYS = {
  2080: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], // Starts 2023-04-14
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // Starts 2024-04-13
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], // Starts 2025-04-14
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // Starts 2026-04-14
  2084: [31, 31, 32, 31, 32, 30, 30, 30, 29, 30, 29, 31], // Starts 2027-04-14
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31]  // Starts 2028-04-13
};

const BS_NEW_YEARS_AD = {
  2080: new Date(2023, 3, 14), // 2023-04-14
  2081: new Date(2024, 3, 13), // 2024-04-13
  2082: new Date(2025, 3, 14), // 2025-04-14
  2083: new Date(2026, 3, 14), // 2026-04-14
  2084: new Date(2027, 3, 14), // 2027-04-14
  2085: new Date(2028, 3, 13)  // 2028-04-13
};

export function adToBs(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '27.05.2083';

  // Find corresponding BS year
  let bsYear = 2083;
  if (d >= BS_NEW_YEARS_AD[2084]) bsYear = 2084;
  else if (d >= BS_NEW_YEARS_AD[2083]) bsYear = 2083;
  else if (d >= BS_NEW_YEARS_AD[2082]) bsYear = 2082;
  else if (d >= BS_NEW_YEARS_AD[2081]) bsYear = 2081;
  else if (d >= BS_NEW_YEARS_AD[2080]) bsYear = 2080;
  else bsYear = d.getFullYear() + 57;

  const nyDate = BS_NEW_YEARS_AD[bsYear] || new Date(d.getFullYear(), 3, 14);
  let daysDiff = Math.floor((d.setHours(0,0,0,0) - nyDate.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    // Falls in previous BS year
    bsYear -= 1;
    const prevNy = BS_NEW_YEARS_AD[bsYear] || new Date(nyDate.getFullYear() - 1, 3, 14);
    daysDiff = Math.floor((d - prevNy) / (1000 * 60 * 60 * 24));
  }

  const monthLengths = BS_MONTH_DAYS[bsYear] || [31, 31, 32, 31, 31, 30, 30, 29, 30, 29, 30, 30];
  let bsMonth = 1;
  let bsDay = daysDiff + 1;

  for (let m = 0; m < 12; m++) {
    if (bsDay <= monthLengths[m]) {
      bsMonth = m + 1;
      break;
    }
    bsDay -= monthLengths[m];
  }

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(bsDay)}.${pad(bsMonth)}.${bsYear}`;
}

export function detectProductType(item = {}) {
  if (item.productType) return item.productType;
  if (item.category) return item.category;
  if (item.categoryId) {
    const cat = String(item.categoryId).toLowerCase();
    if (cat.includes('jacket')) return 'Jacket';
    if (cat.includes('shoe') || cat.includes('foot')) return 'Shoes';
    if (cat.includes('glass') || cat.includes('shade')) return 'Sunglasses';
    if (cat.includes('top') || cat.includes('tee')) return 'T-Shirt';
    if (cat.includes('hoodie')) return 'Hoodie';
    if (cat.includes('pant') || cat.includes('bottom')) return 'Pants';
  }

  const name = String(item.name || item.desc || '').toLowerCase();
  if (name.includes('jacket') || name.includes('puffer') || name.includes('bomber') || name.includes('blazer') || name.includes('coat')) return 'Jacket';
  if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot') || name.includes('loafer') || name.includes('runner') || name.includes('slide')) return 'Shoes';
  if (name.includes('sunglass') || name.includes('aviator') || name.includes('shade') || name.includes('eyewear')) return 'Sunglasses';
  if (name.includes('hoodie') || name.includes('sweater') || name.includes('sweatshirt')) return 'Hoodie';
  if (name.includes('tee') || name.includes('t-shirt') || name.includes('shirt') || name.includes('top') || name.includes('polo')) return 'T-Shirt';
  if (name.includes('pant') || name.includes('trouser') || name.includes('cargo') || name.includes('jean') || name.includes('short')) return 'Pants';
  if (name.includes('cap') || name.includes('hat') || name.includes('beanie')) return 'Cap';
  if (name.includes('bag') || name.includes('backpack') || name.includes('tote')) return 'Bag';
  if (name.includes('belt') || name.includes('wallet') || name.includes('sock')) return 'Accessories';

  const firstWord = String(item.name || '').trim().split(' ')[0];
  if (firstWord && firstWord.length >= 3) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }
  return 'Apparel';
}

export function formatVariantDetails(item = {}) {
  if (item.variantLabel && String(item.variantLabel).trim()) {
    return String(item.variantLabel).trim();
  }
  const parts = [];
  if (item.color || item.colour) parts.push(item.color || item.colour);
  if (item.size) parts.push(item.size);
  if (parts.length) return parts.join(' / ');

  if (item.variant && typeof item.variant === 'object') {
    const vParts = [];
    if (item.variant.color || item.variant.colour) vParts.push(item.variant.color || item.variant.colour);
    if (item.variant.size) vParts.push(item.variant.size);
    if (vParts.length) return vParts.join(' / ');
  }
  return '';
}

/**
 * Normalizes any order object into dynamic receipt structure
 */
export function normalizeOrderForReceipt(order = {}) {
  // Bill No
  const billNo = order.orderNo || order.invoice || order.no || (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'INV-001');

  // Dates & Time
  const rawDate = order.createdAt || order.date || order.placedAt || new Date();
  const dateStr = formatReceiptDate(rawDate);
  const timeStr = order.time || formatReceiptTime(rawDate);
  const mitiStr = order.miti || adToBs(rawDate);

  // Payment method
  let paymentMethod = order.paymentMethod || order.payment || order.pay || 'COD';
  if (String(paymentMethod).toUpperCase() === 'COD') paymentMethod = 'Cash on Delivery';
  else paymentMethod = String(paymentMethod).charAt(0).toUpperCase() + String(paymentMethod).slice(1).toLowerCase();

  // Customer info - Clean genuine customer data without dummy fallbacks
  const shipping = order.shippingAddress || {};
  const customerName = shipping.fullName || order.customer || order.customerName || order.user?.name || order.guestPhone || 'Walk-in Customer';
  const customerCompany = order.company || order.customerCompany || shipping.company || '';
  
  let customerAddress = shipping.line1 || order.address || '';
  if (shipping.city && !customerAddress.toLowerCase().includes(shipping.city.toLowerCase())) {
    customerAddress = customerAddress ? `${customerAddress}, ${shipping.city}` : shipping.city;
  }
  if (!customerAddress) customerAddress = 'Kathmandu, Nepal';

  // Buyer PAN: If unregistered B2C, leave blank or N/A; never inject a dummy third-party PAN
  const customerPan = order.pan || order.customerPan || shipping.pan || order.buyerPan || '';

  // Items extraction
  let items = [];
  const rawItems = order.items || [];
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    items = rawItems.map((it, idx) => {
      const type = detectProductType(it);
      const name = it.name || it.desc || it.title || `Item ${idx + 1}`;
      const variant = formatVariantDetails(it);
      const qty = Number(it.qty) || 1;

      // Rate extraction: DB stores prices in integer Paisa (e.g. 250000 = Rs 2500)
      let rate = 0;
      if (it.unitPrice != null) {
        rate = Number(it.unitPrice) / 100;
      } else if (it.rate != null) {
        rate = Number(it.rate) > 50000 ? Number(it.rate) / 100 : Number(it.rate);
      } else if (it.price != null) {
        rate = Number(it.price) > 50000 ? Number(it.price) / 100 : Number(it.price);
      }

      let amount = it.lineTotal != null ? Number(it.lineTotal) / 100 : (it.amount != null && Number(it.amount) > 50000 ? Number(it.amount) / 100 : qty * rate);
      if (!amount || amount === 0) amount = qty * rate;

      return {
        sn: idx + 1,
        type,
        name,
        variant,
        qty,
        rate: Number(rate.toFixed(2)),
        amount: Number(amount.toFixed(2))
      };
    });
  } else {
    items = [
      { sn: 1, type: 'Apparel', name: 'Retail Order Item', variant: 'Standard', qty: 1, rate: 0, amount: 0 }
    ];
  }

  // Totals calculations
  let grossAmount = items.reduce((acc, it) => acc + (Number(it.amount) || (it.qty * it.rate)), 0);
  if (order.subtotal != null && grossAmount === 0) {
    grossAmount = Number(order.subtotal) > 50000 ? Math.round(order.subtotal / 100) : Number(order.subtotal);
  }

  let discount = 0;
  if (order.discountTotal != null) {
    discount = Number(order.discountTotal) > 50000 ? Number(order.discountTotal) / 100 : Number(order.discountTotal);
  } else if (order.discount != null) {
    discount = Number(order.discount);
  }

  const vatRate = 13;
  // Retail pricing is VAT-inclusive
  const discountedTotal = Math.max(0, grossAmount - discount);
  const vat = Number(((discountedTotal * vatRate) / (100 + vatRate)).toFixed(2));
  const taxableAmount = Number((discountedTotal - vat).toFixed(2));
  const nonTaxableAmount = Number(order.nonTaxableAmount || 0);

  let netAmount = discountedTotal;
  if (order.grandTotal != null && Number(order.grandTotal) > 0) {
    netAmount = Number(order.grandTotal) > 50000 ? Math.round(order.grandTotal / 100) : Number(order.grandTotal);
  }

  const words = numberToWords(netAmount);

  // Ramroxa Store details
  const store = {
    brandTitle: 'RAMROXA',
    brandSub: 'NEPAL',
    categories: 'CLOTHING  •  FOOTWEAR  •  ACCESSORIES',
    address: 'Kathmandu, Nepal',
    panNo: '606387590',
    contactNo: '01-453178',
    invoiceTitle: 'TAX INVOICE',
    footerMessage: 'Thank you for shopping with Ramroxa.\nQuality essentials designed in Kathmandu, delivered across Nepal.',
    website: 'www.ramroxa.com',
    socialHandle: '@ramroxanepal',
    phone: '01-453178',
    poweredBy: 'RamroXa Retail Systems'
  };

  return {
    billNo,
    date: dateStr,
    time: timeStr,
    miti: mitiStr,
    paymentMethod,
    customerName,
    customerCompany,
    customerAddress,
    customerPan,
    items,
    grossAmount: grossAmount.toFixed(2),
    discount: discount.toFixed(2),
    taxableAmount: taxableAmount.toFixed(2),
    nonTaxableAmount: nonTaxableAmount.toFixed(2),
    vat: vat.toFixed(2),
    netAmount: netAmount.toFixed(2),
    words,
    store
  };
}

/**
 * Normalizes a SalesReturn / Credit Note document conforming to IRD Schedule 10
 */
export function normalizeCreditNoteForReceipt(ret) {
  if (!ret) return null;
  const cnNo = ret.creditNoteNo || ret.no || 'CN-1001';
  const origInvoice = ret.invoice || ret.orderNo || 'TINV-Original';
  const dateStr = formatReceiptDate(ret.date || ret.createdAt);
  const mitiStr = adToBs(ret.date || ret.createdAt);

  const rawItems = ret.items || [];
  let items = [];
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    items = rawItems.map((it, idx) => {
      const type = detectProductType(it);
      const name = it.desc || it.name || `Returned item ${idx + 1}`;
      const variant = it.sku ? `SKU: ${it.sku}` : '';
      const qty = Number(it.returnQty || it.qty) || 1;
      const rate = Number(it.rate) > 50000 ? Number(it.rate) / 100 : Number(it.rate || 0);
      const amount = qty * rate;
      return {
        sn: idx + 1,
        type,
        name,
        variant,
        qty,
        rate: Number(rate.toFixed(2)),
        amount: Number(amount.toFixed(2))
      };
    });
  } else {
    const refundNpr = Number(ret.refundAmount) > 50000 ? Number(ret.refundAmount) / 100 : Number(ret.refundAmount || 0);
    items = [
      {
        sn: 1,
        type: 'Return Item',
        name: ret.reason || 'Customer Return & Allowance',
        variant: `Ref: ${origInvoice}`,
        qty: 1,
        rate: refundNpr,
        amount: refundNpr
      }
    ];
  }

  const refundTotalPaisa = Number(ret.refundAmount) || 0;
  const refundTotalNpr = refundTotalPaisa > 50000 ? refundTotalPaisa / 100 : refundTotalPaisa;
  const refundVatPaisa = Number(ret.refundVat) || Math.round((refundTotalPaisa * 13) / 113);
  const refundVatNpr = refundVatPaisa > 50000 ? refundVatPaisa / 100 : (refundTotalNpr > 0 ? (refundTotalNpr * 13) / 113 : 0);
  const taxableNpr = Math.max(0, refundTotalNpr - refundVatNpr);

  const words = numberToWords(refundTotalNpr);

  const store = {
    brandTitle: 'RAMROXA',
    brandSub: 'NEPAL',
    categories: 'CLOTHING  •  FOOTWEAR  •  ACCESSORIES',
    address: 'Kathmandu, Nepal',
    panNo: '606387590',
    contactNo: '01-453178',
    invoiceTitle: 'CREDIT NOTE / क्रेडिट नोट (अनुसूची १०)',
    footerMessage: 'Credit Note issued under Nepal VAT Act 2052 (Schedule 10).\nAmount reversed against customer account / refunded.',
    website: 'www.ramroxa.com',
    socialHandle: '@ramroxanepal',
    phone: '01-453178',
    poweredBy: 'RamroXa Retail Systems'
  };

  return {
    isCreditNote: true,
    billNo: cnNo,
    origInvoice,
    returnReason: ret.reason || 'Customer return',
    date: dateStr,
    time: '',
    miti: mitiStr,
    paymentMethod: 'Credit Adjustment',
    customerName: ret.customer || 'Customer',
    customerCompany: '',
    customerAddress: ret.address || 'Kathmandu, Nepal',
    customerPan: ret.customerPan || '',
    items,
    grossAmount: refundTotalNpr.toFixed(2),
    discount: '0.00',
    taxableAmount: taxableNpr.toFixed(2),
    nonTaxableAmount: '0.00',
    vat: refundVatNpr.toFixed(2),
    netAmount: refundTotalNpr.toFixed(2),
    words,
    store
  };
}

/**
 * Generates exact thermal receipt HTML matching the Ramroxa Global reference image
 */
export function generateThermalReceiptHtml(receipt) {
  const { store } = receipt;

  const itemsHtml = receipt.items.map((it) => `
    <div style="margin: 4px 0 6px 0; font-size: 13px; line-height: 1.35;">
      <!-- Line 1: SN & Product Type -->
      <div style="display: flex; align-items: baseline;">
        <span style="width: 26px; font-weight: 500;">${it.sn}</span>
        <span style="font-weight: 500;">${escapeHtml(it.type)}</span>
      </div>
      <!-- Line 2: Product Name + Qty + Rate + Amount -->
      <div style="display: flex; align-items: baseline; justify-content: space-between;">
        <div style="padding-left: 26px; flex: 1; padding-right: 8px; font-weight: 400;">
          ${escapeHtml(it.name)}
        </div>
        <div style="width: 32px; text-align: right;">${it.qty}</div>
        <div style="width: 68px; text-align: right;">${Number(it.rate).toFixed(2)}</div>
        <div style="width: 76px; text-align: right;">${Number(it.amount).toFixed(2)}</div>
      </div>
      <!-- Line 3: Variant (Size / Colour) -->
      ${it.variant ? `
        <div style="padding-left: 26px; font-size: 12px; color: #111;">
          ${escapeHtml(it.variant)}
        </div>
      ` : ''}
    </div>
    <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
  `).join('');

  return `
  <div id="ramroxa-thermal-receipt" class="ramroxa-receipt" style="
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
    padding: 16px 14px 24px 14px;
    background: #fff;
    color: #000;
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    line-height: 1.35;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  ">
    <!-- Brand Header -->
    <div style="text-align: center; margin-bottom: 6px;">
      <div style="
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 26px;
        font-weight: 900;
        letter-spacing: 6px;
        line-height: 1.1;
        margin-bottom: 2px;
      ">
        ${escapeHtml(store.brandTitle)}
      </div>
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 4px;
        margin-bottom: 6px;
      ">
        <span style="display: inline-block; width: 34px; height: 1.5px; background: #000;"></span>
        <span>${escapeHtml(store.brandSub)}</span>
        <span style="display: inline-block; width: 34px; height: 1.5px; background: #000;"></span>
      </div>
      <div style="font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 3px;">
        ${escapeHtml(store.categories)}
      </div>
      <div style="font-size: 12px; margin-bottom: 1px;">${escapeHtml(store.address)}</div>
      <div style="font-size: 12px; margin-bottom: 1px;">PAN No: ${escapeHtml(store.panNo)}</div>
      <div style="font-size: 12px; margin-bottom: 6px;">Contact No. ${escapeHtml(store.contactNo)}</div>
      <div style="font-size: 14px; font-weight: bold; letter-spacing: 1px;">
        ${escapeHtml(store.invoiceTitle)}
      </div>
    </div>

    <!-- Dashed separator -->
    <div style="border-top: 1px dashed #000; margin: 7px 0;"></div>

    <!-- Bill / Customer Info Table -->
    <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; line-height: 1.35;">
      <tbody>
        <tr>
          <td style="padding: 1px 0; width: 55%; vertical-align: top;">
            ${receipt.isCreditNote ? 'Credit Note No:' : 'Bill No.&nbsp;&nbsp;:'} <strong>${escapeHtml(receipt.billNo)}</strong>
          </td>
          <td style="padding: 1px 0; width: 45%; vertical-align: top;">
            ${receipt.isCreditNote ? `Orig Inv: <strong>${escapeHtml(receipt.origInvoice || 'N/A')}</strong>` : `Payment By : ${escapeHtml(receipt.paymentMethod)}`}
          </td>
        </tr>
        ${receipt.isCreditNote && receipt.returnReason ? `
        <tr>
          <td colspan="2" style="padding: 1px 0; vertical-align: top;">
            Reason&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${escapeHtml(receipt.returnReason)}
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 1px 0; vertical-align: top;">
            Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${escapeHtml(receipt.date)}
          </td>
          <td style="padding: 1px 0; vertical-align: top;">
            Miti&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${escapeHtml(receipt.miti)}
          </td>
        </tr>
        ${receipt.time ? `
        <tr>
          <td colspan="2" style="padding: 1px 0; vertical-align: top;">
            Time&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${escapeHtml(receipt.time)}
          </td>
        </tr>
        ` : ''}
        <tr>
          <td colspan="2" style="padding: 1px 0; vertical-align: top;">
            Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${escapeHtml(receipt.customerName)}
          </td>
        </tr>
        ${receipt.customerCompany ? `
        <tr>
          <td colspan="2" style="padding: 1px 0; vertical-align: top;">
            Company&nbsp;&nbsp;: ${escapeHtml(receipt.customerCompany)}
          </td>
        </tr>
        ` : ''}
        <tr>
          <td colspan="2" style="padding: 1px 0; vertical-align: top;">
            Address&nbsp;&nbsp;: ${escapeHtml(receipt.customerAddress)}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 1px 0; vertical-align: top;">
            PAN&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${escapeHtml(receipt.customerPan || '')}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Dashed separator -->
    <div style="border-top: 1px dashed #000; margin: 7px 0;"></div>

    <!-- Particulars Table Header -->
    <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: bold; padding: 2px 0;">
      <div style="width: 26px;">SN</div>
      <div style="flex: 1;">PARTICULARS</div>
      <div style="width: 32px; text-align: right;">QTY</div>
      <div style="width: 68px; text-align: right;">RATE</div>
      <div style="width: 76px; text-align: right;">AMOUNT</div>
    </div>

    <!-- Dashed separator -->
    <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>

    <!-- Dynamic Items List -->
    <div class="receipt-items-container">
      ${itemsHtml}
    </div>

    <!-- Totals Summary -->
    <div style="display: flex; justify-content: flex-end; font-size: 12.5px;">
      <table style="border-collapse: collapse; min-width: 240px;">
        <tbody>
          <tr>
            <td style="padding: 2px 0; text-align: left;">Gross Amount</td>
            <td style="padding: 2px 8px; text-align: center;">:</td>
            <td style="padding: 2px 0; text-align: right;">${receipt.grossAmount}</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; text-align: left;">Discount</td>
            <td style="padding: 2px 8px; text-align: center;">:</td>
            <td style="padding: 2px 0; text-align: right;">${receipt.discount}</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; text-align: left;">Taxable Amount</td>
            <td style="padding: 2px 8px; text-align: center;">:</td>
            <td style="padding: 2px 0; text-align: right;">${receipt.taxableAmount}</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; text-align: left;">Non-Taxable Amount</td>
            <td style="padding: 2px 8px; text-align: center;">:</td>
            <td style="padding: 2px 0; text-align: right;">${receipt.nonTaxableAmount}</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; text-align: left;">VAT (13%)</td>
            <td style="padding: 2px 8px; text-align: center;">:</td>
            <td style="padding: 2px 0; text-align: right;">${receipt.vat}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Dashed separator right before Net Amount -->
    <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

    <!-- Net Amount row -->
    <div style="display: flex; justify-content: flex-end; font-size: 14px; font-weight: bold;">
      <table style="border-collapse: collapse; min-width: 240px;">
        <tbody>
          <tr>
            <td style="padding: 2px 0; text-align: left;">Net Amount</td>
            <td style="padding: 2px 8px; text-align: center;">:</td>
            <td style="padding: 2px 0; text-align: right; font-size: 15px;">${receipt.netAmount}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Dashed separator -->
    <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

    <!-- In words -->
    <div style="font-size: 12px; margin: 4px 0; line-height: 1.4;">
      <div>In words:</div>
      <div style="font-weight: 500;">${escapeHtml(receipt.words)}</div>
    </div>

    <!-- Dashed separator -->
    <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

    <!-- Footer Note -->
    <div style="text-align: center; font-size: 11.5px; line-height: 1.45; margin: 8px 0;">
      ${escapeHtml(store.footerMessage).replace(/\n/g, '<br />')}
    </div>

    <!-- Dashed separator -->
    <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

    <!-- Social / Web Footer Bar -->
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10.5px;
      margin-top: 6px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    ">
      <div>${escapeHtml(store.website)}</div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="border: 1px solid #000; border-radius: 50%; width: 15px; height: 15px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold;">f</span>
        <span style="border: 1px solid #000; border-radius: 50%; width: 15px; height: 15px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold;">ig</span>
        <span style="margin-left: 2px;">${escapeHtml(store.socialHandle)}</span>
      </div>
      <div>${escapeHtml(store.phone)}</div>
    </div>
  </div>
  `;
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Triggers clean isolated thermal print dialog via hidden iframe
 */
export function printThermalReceipt(rawOrder) {
  if (typeof window === 'undefined') return;

  const receipt = normalizeOrderForReceipt(rawOrder);
  const receiptHtml = generateThermalReceiptHtml(receipt);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('title', `Print Thermal Receipt ${receipt.billNo}`);
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${escapeHtml(receipt.billNo)}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 2mm 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 2px;
            background: #fff;
            color: #000;
            font-family: 'Courier New', Courier, monospace;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${receiptHtml}
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print receipt error:', e);
    } finally {
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  }, 250);
}

/**
 * Direct PDF Download: captures the receipt DOM element or isolated container
 * and downloads a high-resolution PDF file.
 */
export async function downloadReceiptPdf(rawOrder, targetElementId = null) {
  if (typeof window === 'undefined') return;

  const receipt = normalizeOrderForReceipt(rawOrder);

  // If already rendered inside the modal, capture the visible DOM node
  let container = targetElementId ? document.getElementById(targetElementId) : null;
  let tempWrapper = null;

  if (!container) {
    // Generate offscreen container to capture
    tempWrapper = document.createElement('div');
    tempWrapper.style.position = 'fixed';
    tempWrapper.style.left = '-9999px';
    tempWrapper.style.top = '0';
    tempWrapper.style.width = '380px';
    tempWrapper.style.background = '#fff';
    tempWrapper.innerHTML = generateThermalReceiptHtml(receipt);
    document.body.appendChild(tempWrapper);
    container = tempWrapper.firstElementChild;
  }

  try {
    const canvas = await html2canvas(container, {
      scale: 2.5, // Crisp 2.5x resolution for print clarity
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 80; // 80mm standard POS receipt width
    const pageHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [imgWidth, Math.max(pageHeight + 4, 100)]
    });

    pdf.addImage(imgData, 'PNG', 0, 2, imgWidth, pageHeight);
    pdf.save(`Ramroxa-Receipt-${receipt.billNo}.pdf`);
  } catch (err) {
    console.error('Failed to generate receipt PDF:', err);
    // Fallback: trigger print dialog for Save as PDF
    printThermalReceipt(rawOrder);
  } finally {
    if (tempWrapper && tempWrapper.parentNode) {
      tempWrapper.parentNode.removeChild(tempWrapper);
    }
  }
}

/**
 * Print a formal IRD Schedule 10 Credit Note via thermal layout
 */
export function printCreditNote(ret) {
  if (typeof window === 'undefined') return;
  const receipt = normalizeCreditNoteForReceipt(ret);
  const receiptHtml = generateThermalReceiptHtml(receipt);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Credit Note ${receipt.billNo}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; padding: 0; background: #fff; }
        </style>
      </head>
      <body>${receiptHtml}</body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print credit note error:', e);
    } finally {
      setTimeout(() => {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    }
  }, 250);
}

export default {
  numberToWords,
  formatReceiptDate,
  formatReceiptTime,
  adToBs,
  detectProductType,
  formatVariantDetails,
  normalizeOrderForReceipt,
  normalizeCreditNoteForReceipt,
  generateThermalReceiptHtml,
  printThermalReceipt,
  downloadReceiptPdf,
  printCreditNote
};
