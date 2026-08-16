import { Purchase } from '../models/Purchase.js';
import { ApiError } from '../utils/ApiError.js';
import { VAT_RATE } from '../utils/money.js';

export async function listPurchases(query = {}) {
  const { fromDate, toDate, supplier, q, page = 1, limit = 50 } = query;
  const filter = {};

  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = new Date(fromDate);
    if (toDate) filter.date.$lte = new Date(toDate);
  }

  if (supplier) {
    filter.supplier = { $regex: supplier.trim(), $options: 'i' };
  }

  if (q && q.trim()) {
    filter.$or = [
      { billNo: { $regex: q.trim(), $options: 'i' } },
      { supplier: { $regex: q.trim(), $options: 'i' } },
      { head: { $regex: q.trim(), $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [purchases, total] = await Promise.all([
    Purchase.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(take).lean(),
    Purchase.countDocuments(filter)
  ]);

  return {
    purchases,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
}

export async function getPurchaseById(id) {
  const purchase = await Purchase.findById(id);
  if (!purchase) {
    throw ApiError.notFound('Purchase bill not found.');
  }
  return purchase;
}

export async function createPurchase(data) {
  const {
    billNo,
    supplier,
    supplierPan = '',
    date = new Date(),
    head = 'Purchases (stock)',
    items = [],
    vatable = true,
    paymentMethod = 'bank',
    paymentStatus = 'paid',
    notes = ''
  } = data;

  if (!billNo || !supplier) {
    throw ApiError.badRequest('Bill number and supplier name are required.');
  }

  // Calculate items amount and subtotal
  const processedItems = (items || []).map((item) => {
    const qty = Number(item.qty || 1);
    const rate = Number(item.rate || 0); // In Paisa
    const amount = item.amount != null ? Number(item.amount) : qty * rate;
    return {
      name: item.name || 'Stock Item',
      qty,
      rate,
      amount
    };
  });

  const subtotal = processedItems.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = vatable ? Math.round((subtotal * VAT_RATE) / 100) : 0;
  const totalAmount = subtotal + vatAmount;

  const purchase = await Purchase.create({
    billNo: billNo.trim(),
    supplier: supplier.trim(),
    supplierPan: supplierPan.trim(),
    date: date ? new Date(date) : new Date(),
    head: head.trim(),
    items: processedItems,
    subtotal,
    vatable,
    vatAmount,
    totalAmount,
    paymentMethod,
    paymentStatus,
    notes
  });

  return purchase;
}

export async function deletePurchase(id) {
  const purchase = await Purchase.findById(id);
  if (!purchase) {
    throw ApiError.notFound('Purchase bill not found.');
  }

  await Purchase.deleteOne({ _id: id });
  return { message: 'Purchase bill deleted successfully.' };
}

export default {
  listPurchases,
  getPurchaseById,
  createPurchase,
  deletePurchase
};
