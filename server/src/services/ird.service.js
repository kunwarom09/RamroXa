import { Order } from '../models/Order.js';
import { Purchase } from '../models/Purchase.js';
import { SalesReturn } from '../models/SalesReturn.js';
import { VAT_RATE } from '../utils/money.js';

export async function getIrdVatSummary(monthStr) {
  const currentMonth = monthStr || new Date().toISOString().slice(0, 7);

  const [yearStr, mStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10);

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [orders, purchases, returns] = await Promise.all([
    Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      fulfillmentStatus: { $ne: 'cancelled' }
    }).sort({ createdAt: 1 }).lean(),
    Purchase.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 }).lean(),
    SalesReturn.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'refunded', 'completed', 'refund_processed'] }
    }).sort({ createdAt: 1 }).lean()
  ]);

  // Sales Register (Bikri Khata)
  const salesRegister = orders.map((o) => {
    const gross = o.grandTotal || 0;
    const vat = o.vatTotal || 0;
    const taxable = gross - vat;

    return {
      date: o.createdAt ? o.createdAt.toISOString().slice(0, 10) : '',
      invoice: o.orderNo,
      customer: o.shippingAddress?.fullName || o.guestEmail || 'Customer',
      taxable,
      vat,
      total: gross
    };
  });

  const salesTaxable = salesRegister.reduce((sum, s) => sum + s.taxable, 0);
  const salesVat = salesRegister.reduce((sum, s) => sum + s.vat, 0);
  const salesGross = salesRegister.reduce((sum, s) => sum + s.total, 0);

  // Credit Notes / Sales Returns Register (Anusuchi 10)
  const returnsRegister = (returns || []).map((r) => {
    const gross = r.refundAmount || 0;
    const vat = r.refundVat || 0;
    const taxable = r.refundNet || (gross - vat);

    return {
      date: r.date || (r.createdAt ? r.createdAt.toISOString().slice(0, 10) : ''),
      creditNoteNo: r.no,
      orderNo: r.orderNo || '',
      customer: r.customer || 'Customer',
      taxable,
      vat,
      total: gross,
      reason: r.reason || ''
    };
  });

  const returnsTaxable = returnsRegister.reduce((sum, r) => sum + r.taxable, 0);
  const returnsVat = returnsRegister.reduce((sum, r) => sum + r.vat, 0);
  const returnsGross = returnsRegister.reduce((sum, r) => sum + r.total, 0);

  // Purchase Register (Kharid Khata)
  const purchaseRegister = purchases.map((p) => {
    return {
      date: p.date ? p.date.toISOString().slice(0, 10) : '',
      bill: p.billNo,
      supplier: p.supplier,
      supplierPan: p.supplierPan || '',
      vatable: p.vatable !== false,
      taxable: p.subtotal || 0,
      vat: p.vatAmount || 0,
      total: p.totalAmount || ((p.subtotal || 0) + (p.vatAmount || 0))
    };
  });

  const purchasesTaxable = purchaseRegister.filter((p) => p.vatable).reduce((sum, p) => sum + p.taxable, 0);
  const purchasesExempt = purchaseRegister.filter((p) => !p.vatable).reduce((sum, p) => sum + p.taxable, 0);
  const purchasesVat = purchaseRegister.reduce((sum, p) => sum + p.vat, 0);
  const purchasesGross = purchaseRegister.reduce((sum, p) => sum + p.total, 0);

  const netSalesVat = salesVat - returnsVat;
  const netVatPayable = netSalesVat - purchasesVat;

  return {
    month: currentMonth,
    vatRate: VAT_RATE,
    summary: {
      sales: {
        taxable: salesTaxable,
        vat: salesVat,
        gross: salesGross,
        count: salesRegister.length
      },
      returns: {
        taxable: returnsTaxable,
        vat: returnsVat,
        gross: returnsGross,
        count: returnsRegister.length
      },
      purchases: {
        taxable: purchasesTaxable,
        exempt: purchasesExempt,
        vat: purchasesVat,
        gross: purchasesGross,
        count: purchaseRegister.length
      },
      netVatPayable
    },
    salesRegister,
    returnsRegister,
    purchaseRegister
  };
}

export default {
  getIrdVatSummary
};
