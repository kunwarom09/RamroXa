import { Order } from '../models/Order.js';
import { Purchase } from '../models/Purchase.js';
import { SalesReturn } from '../models/SalesReturn.js';
import { PurchaseReturn } from '../models/PurchaseReturn.js';
import { VAT_RATE } from '../utils/money.js';

export async function getIrdVatSummary(monthStr) {
  const currentMonth = monthStr || new Date().toISOString().slice(0, 7);

  const [yearStr, mStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10);

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [orders, purchases, salesReturns, purchaseReturns] = await Promise.all([
    Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      fulfillmentStatus: { $ne: 'cancelled' }
    }).sort({ createdAt: 1 }).lean(),
    Purchase.find({
      date: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    }).sort({ date: 1 }).lean(),
    SalesReturn.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $nin: ['rejected', 'cancelled'] }
    }).sort({ createdAt: 1 }).lean(),
    PurchaseReturn.find({
      date: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    }).sort({ date: 1 }).lean()
  ]);

  // --- 1. Schedule 8: Sales Register (बिक्री खाता) ---
  const salesRegister = orders.map((o, idx) => {
    const grossPaisa = Number(o.grandTotal) || 0;
    const vatPaisa = Number(o.vatTotal) || 0;
    const taxablePaisa = grossPaisa - vatPaisa;
    const exemptPaisa = 0; // Standard apparel/footwear is taxable at 13%

    return {
      sn: idx + 1,
      date: o.createdAt ? o.createdAt.toISOString().slice(0, 10) : '',
      invoice: o.orderNo,
      buyerName: o.shippingAddress?.fullName || o.guestEmail || 'Walk-in Customer',
      buyerPan: o.shippingAddress?.pan || o.billingAddress?.pan || '',
      totalAmount: Math.round(grossPaisa / 100),
      exemptAmount: Math.round(exemptPaisa / 100),
      taxableAmount: Math.round(taxablePaisa / 100),
      vatAmount: Math.round(vatPaisa / 100),
      exportAmount: 0,
      // Raw Paisa for exact math
      totalPaisa: grossPaisa,
      taxablePaisa,
      vatPaisa
    };
  });

  const salesTaxablePaisa = salesRegister.reduce((sum, s) => sum + s.taxablePaisa, 0);
  const salesVatPaisa = salesRegister.reduce((sum, s) => sum + s.vatPaisa, 0);
  const salesGrossPaisa = salesRegister.reduce((sum, s) => sum + s.totalPaisa, 0);

  // --- 2. Schedule 10: Credit Note Register / Sales Returns (अनुसूची १०) ---
  const creditNotesRegister = salesReturns.map((r, idx) => {
    const grossPaisa = Number(r.refundAmount) || 0;
    const vatPaisa = Number(r.refundVat) || 0;
    const taxablePaisa = Number(r.refundNet) || (grossPaisa - vatPaisa);

    return {
      sn: idx + 1,
      creditNoteNo: r.creditNoteNo || r.no,
      date: r.date || (r.createdAt ? r.createdAt.toISOString().slice(0, 10) : ''),
      originalInvoice: r.orderNo || r.invoice || '',
      buyerName: r.customer || 'Customer',
      buyerPan: r.customerPan || '',
      reason: r.reason || 'Customer return',
      totalAmount: Math.round(grossPaisa / 100),
      taxableAmount: Math.round(taxablePaisa / 100),
      vatAmount: Math.round(vatPaisa / 100),
      totalPaisa: grossPaisa,
      taxablePaisa,
      vatPaisa
    };
  });

  const creditNotesTaxablePaisa = creditNotesRegister.reduce((sum, r) => sum + r.taxablePaisa, 0);
  const creditNotesVatPaisa = creditNotesRegister.reduce((sum, r) => sum + r.vatPaisa, 0);
  const creditNotesGrossPaisa = creditNotesRegister.reduce((sum, r) => sum + r.totalPaisa, 0);

  // --- 3. Schedule 9: Purchase Register (खरिद खाता) ---
  const purchaseRegister = purchases.map((p, idx) => {
    const subtotalPaisa = Number(p.subtotal) || 0;
    const vatPaisa = Number(p.vatAmount) || 0;
    const totalPaisa = Number(p.totalAmount) || (subtotalPaisa + vatPaisa);
    const isVatable = p.vatable !== false;

    return {
      sn: idx + 1,
      date: p.date ? p.date.toISOString().slice(0, 10) : '',
      billNo: p.billNo,
      supplierName: p.supplier,
      supplierPan: p.supplierPan || '',
      totalAmount: Math.round(totalPaisa / 100),
      exemptAmount: isVatable ? 0 : Math.round(subtotalPaisa / 100),
      taxableLocal: isVatable ? Math.round(subtotalPaisa / 100) : 0,
      taxableImport: 0,
      capitalGoods: 0,
      vatAmount: Math.round(vatPaisa / 100),
      totalPaisa,
      taxablePaisa: isVatable ? subtotalPaisa : 0,
      exemptPaisa: isVatable ? 0 : subtotalPaisa,
      vatPaisa
    };
  });

  const purchasesTaxablePaisa = purchaseRegister.reduce((sum, p) => sum + p.taxablePaisa, 0);
  const purchasesExemptPaisa = purchaseRegister.reduce((sum, p) => sum + p.exemptPaisa, 0);
  const purchasesVatPaisa = purchaseRegister.reduce((sum, p) => sum + p.vatPaisa, 0);
  const purchasesGrossPaisa = purchaseRegister.reduce((sum, p) => sum + p.totalPaisa, 0);

  // --- 4. Schedule 11: Debit Note Register / Purchase Returns (अनुसूची ११) ---
  const debitNotesRegister = purchaseReturns.map((pr, idx) => {
    const subtotalPaisa = Number(pr.subtotal) || 0;
    const vatPaisa = Number(pr.vatAmount) || 0;
    const totalPaisa = Number(pr.totalAmount) || (subtotalPaisa + vatPaisa);

    return {
      sn: idx + 1,
      debitNoteNo: pr.no,
      date: pr.date ? pr.date.toISOString().slice(0, 10) : '',
      originalBillNo: pr.billNo,
      supplierName: pr.supplier,
      supplierPan: pr.supplierPan || '',
      reason: pr.reason || 'Purchase return to vendor',
      totalAmount: Math.round(totalPaisa / 100),
      taxableAmount: Math.round(subtotalPaisa / 100),
      vatAmount: Math.round(vatPaisa / 100),
      totalPaisa,
      taxablePaisa: subtotalPaisa,
      vatPaisa
    };
  });

  const debitNotesTaxablePaisa = debitNotesRegister.reduce((sum, pr) => sum + pr.taxablePaisa, 0);
  const debitNotesVatPaisa = debitNotesRegister.reduce((sum, pr) => sum + pr.vatPaisa, 0);
  const debitNotesGrossPaisa = debitNotesRegister.reduce((sum, pr) => sum + pr.totalPaisa, 0);

  // --- 5. Statutory VAT Reconciliation (Schedule 10 Return) ---
  const netOutputVatPaisa = salesVatPaisa - creditNotesVatPaisa;
  const netInputVatPaisa = purchasesVatPaisa - debitNotesVatPaisa;
  const netVatPayablePaisa = netOutputVatPaisa - netInputVatPaisa;

  return {
    month: currentMonth,
    vatRate: VAT_RATE,
    summary: {
      sales: {
        taxable: Math.round(salesTaxablePaisa / 100),
        vat: Math.round(salesVatPaisa / 100),
        gross: Math.round(salesGrossPaisa / 100),
        count: salesRegister.length
      },
      creditNotes: {
        taxable: Math.round(creditNotesTaxablePaisa / 100),
        vat: Math.round(creditNotesVatPaisa / 100),
        gross: Math.round(creditNotesGrossPaisa / 100),
        count: creditNotesRegister.length
      },
      purchases: {
        taxable: Math.round(purchasesTaxablePaisa / 100),
        exempt: Math.round(purchasesExemptPaisa / 100),
        vat: Math.round(purchasesVatPaisa / 100),
        gross: Math.round(purchasesGrossPaisa / 100),
        count: purchaseRegister.length
      },
      debitNotes: {
        taxable: Math.round(debitNotesTaxablePaisa / 100),
        vat: Math.round(debitNotesVatPaisa / 100),
        gross: Math.round(debitNotesGrossPaisa / 100),
        count: debitNotesRegister.length
      },
      netSalesVat: Math.round(netOutputVatPaisa / 100),
      netPurchasesVat: Math.round(netInputVatPaisa / 100),
      netVatPayable: Math.round(netVatPayablePaisa / 100),
      netVatPayablePaisa
    },
    // Statutory Registers
    salesRegister,
    creditNotesRegister,
    returnsRegister: creditNotesRegister, // Backward-compat key
    purchaseRegister,
    debitNotesRegister
  };
}

export default {
  getIrdVatSummary
};
