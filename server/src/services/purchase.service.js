import mongoose from 'mongoose';
import { Purchase } from '../models/Purchase.js';
import { ApiError } from '../utils/ApiError.js';
import { VAT_RATE } from '../utils/money.js';
import { escapeRegex } from '../utils/regex.js';

export async function listPurchases(query = {}) {
  const { fromDate, toDate, supplier, q, page = 1, limit = 50 } = query;
  const filter = {};

  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = new Date(fromDate);
    if (toDate) filter.date.$lte = new Date(toDate);
  }

  if (supplier && supplier.trim()) {
    filter.supplier = { $regex: escapeRegex(supplier.trim()), $options: 'i' };
  }

  if (q && q.trim()) {
    const escaped = escapeRegex(q.trim());
    filter.$or = [
      { billNo: { $regex: escaped, $options: 'i' } },
      { supplier: { $regex: escaped, $options: 'i' } },
      { head: { $regex: escaped, $options: 'i' } }
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
  const billNo = data.billNo || data.bill;
  const supplier = data.supplier;
  const supplierPan = data.supplierPan || '';
  const date = data.date ? new Date(data.date) : new Date();
  const head = data.head || 'Purchases (stock)';
  const items = Array.isArray(data.items) ? data.items : [];
  const vatable = data.vatable !== false;
  const paymentMethod = (data.paymentMethod || data.payment || 'bank').toLowerCase();
  const validPaymentMethod = ['cash', 'bank', 'credit'].includes(paymentMethod) ? paymentMethod : 'bank';
  const paymentStatus = data.paymentStatus || 'paid';
  const notes = data.notes || '';

  if (!billNo || !supplier) {
    throw ApiError.badRequest('Bill number and supplier name are required.');
  }

  // Calculate items amount and subtotal
  const processedItems = items.map((item) => {
    const qty = Number(item.qty || 1);
    const rate = Number(item.rate || 0);
    const amount = item.amount != null ? Number(item.amount) : qty * rate;
    return {
      name: item.name || item.desc || 'Stock Item',
      qty,
      rate,
      amount
    };
  });

  const subtotal = processedItems.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = vatable ? Math.round((subtotal * VAT_RATE) / 100) : 0;
  const totalAmount = subtotal + vatAmount;

  // Check if updating existing by id or editingId
  if (data.editingId || data.id) {
    const editId = data.editingId || data.id;
    const existing = await Purchase.findOne({
      $or: [
        mongoose.isValidObjectId(editId) ? { _id: editId } : null,
        { billNo: editId },
        { billNo }
      ].filter(Boolean)
    });
    if (existing) {
      existing.billNo = billNo.trim();
      existing.supplier = supplier.trim();
      existing.supplierPan = supplierPan.trim();
      existing.date = date;
      existing.head = head.trim();
      existing.items = processedItems;
      existing.subtotal = subtotal;
      existing.vatable = vatable;
      existing.vatAmount = vatAmount;
      existing.totalAmount = totalAmount;
      existing.paymentMethod = validPaymentMethod;
      existing.paymentStatus = paymentStatus;
      existing.notes = notes;
      await existing.save();
      return existing;
    }
  }

  const purchase = await Purchase.create({
    billNo: billNo.trim(),
    supplier: supplier.trim(),
    supplierPan: supplierPan.trim(),
    date,
    head: head.trim(),
    items: processedItems,
    subtotal,
    vatable,
    vatAmount,
    totalAmount,
    paymentMethod: validPaymentMethod,
    paymentStatus,
    notes
  });

  return purchase;
}

export async function updatePurchase(id, data) {
  const purchase = await Purchase.findOne({
    $or: [
      mongoose.isValidObjectId(id) ? { _id: id } : null,
      { billNo: id }
    ].filter(Boolean)
  });
  if (!purchase) {
    throw ApiError.notFound('Purchase bill not found.');
  }

  if (data.billNo || data.bill) purchase.billNo = (data.billNo || data.bill).trim();
  if (data.supplier) purchase.supplier = data.supplier.trim();
  if (data.supplierPan !== undefined) purchase.supplierPan = data.supplierPan.trim();
  if (data.date) purchase.date = new Date(data.date);
  if (data.head) purchase.head = data.head.trim();
  if (data.vatable !== undefined) purchase.vatable = data.vatable;
  if (data.notes !== undefined) purchase.notes = data.notes;

  if (Array.isArray(data.items)) {
    purchase.items = data.items.map(item => {
      const qty = Number(item.qty || 1);
      const rate = Number(item.rate || 0);
      const amount = item.amount != null ? Number(item.amount) : qty * rate;
      return {
        name: item.name || item.desc || 'Stock Item',
        qty,
        rate,
        amount
      };
    });
    const subtotal = purchase.items.reduce((sum, i) => sum + i.amount, 0);
    const vatAmount = purchase.vatable ? Math.round((subtotal * VAT_RATE) / 100) : 0;
    purchase.subtotal = subtotal;
    purchase.vatAmount = vatAmount;
    purchase.totalAmount = subtotal + vatAmount;
  }

  await purchase.save();
  return purchase;
}

export async function deletePurchase(id) {
  const purchase = await Purchase.findOneAndDelete({
    $or: [
      mongoose.isValidObjectId(id) ? { _id: id } : null,
      { billNo: id }
    ].filter(Boolean)
  });
  if (!purchase) {
    throw ApiError.notFound('Purchase bill not found.');
  }

  return { message: 'Purchase bill deleted successfully.' };
}

export default {
  listPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase
};
