import mongoose from 'mongoose';
import { PurchaseReturn } from '../models/PurchaseReturn.js';
import { Purchase } from '../models/Purchase.js';
import { Variant } from '../models/Variant.js';
import { Inventory } from '../models/Inventory.js';
import { StockMove } from '../models/StockMove.js';
import { ApiError } from '../utils/ApiError.js';
import { VAT_RATE } from '../utils/money.js';
import { escapeRegex } from '../utils/regex.js';

export async function listPurchaseReturns(query = {}) {
  const { fromDate, toDate, supplier, q, status, page = 1, limit = 50 } = query;
  const filter = {};

  if (status && status !== 'all') {
    filter.status = status;
  }

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
      { no: { $regex: escaped, $options: 'i' } },
      { billNo: { $regex: escaped, $options: 'i' } },
      { supplier: { $regex: escaped, $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [returnsRaw, total] = await Promise.all([
    PurchaseReturn.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(take).lean(),
    PurchaseReturn.countDocuments(filter)
  ]);

  const returns = returnsRaw.map((r) => ({
    ...r,
    subtotalNpr: Math.round((r.subtotal || 0) / 100),
    vatAmountNpr: Math.round((r.vatAmount || 0) / 100),
    totalAmountNpr: Math.round((r.totalAmount || 0) / 100),
    items: (r.items || []).map((it) => ({
      ...it,
      rateNpr: Math.round((it.rate || 0) / 100),
      amountNpr: Math.round((it.amount || 0) / 100)
    }))
  }));

  return {
    returns,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
}

export async function getPurchaseReturnById(id) {
  const record = await PurchaseReturn.findOne({
    $or: [
      mongoose.isValidObjectId(id) ? { _id: id } : null,
      { no: id }
    ].filter(Boolean)
  }).lean();

  if (!record) {
    throw ApiError.notFound('Purchase return record not found.');
  }

  return {
    ...record,
    subtotalNpr: Math.round((record.subtotal || 0) / 100),
    vatAmountNpr: Math.round((record.vatAmount || 0) / 100),
    totalAmountNpr: Math.round((record.totalAmount || 0) / 100),
    items: (record.items || []).map((it) => ({
      ...it,
      rateNpr: Math.round((it.rate || 0) / 100),
      amountNpr: Math.round((it.amount || 0) / 100)
    }))
  };
}

export async function createPurchaseReturn(data, user = null) {
  const billNo = data.billNo || data.bill;
  const supplier = data.supplier;
  const supplierPan = data.supplierPan || '';
  const reason = data.reason || 'Damaged / Defective goods returned to supplier';
  const date = data.date ? new Date(data.date) : new Date();
  const items = Array.isArray(data.items) ? data.items : [];
  const vatable = data.vatable !== false;
  const warehouseId = data.warehouseId || 'w1';

  if (!billNo || !supplier) {
    throw ApiError.badRequest('Original bill number and supplier name are required.');
  }

  if (!items.length) {
    throw ApiError.badRequest('At least one return item is required.');
  }

  // Count for next Debit Note sequence (DN-1001, DN-1002...)
  const count = await PurchaseReturn.countDocuments();
  const nextNo = data.no || `DN-${1000 + count + 1}`;

  // Process items into Paisa
  const processedItems = items.map((item) => {
    const qty = Number(item.qty || 1);
    let ratePaisa = 0;
    if (item.ratePaisa != null) {
      ratePaisa = Math.round(Number(item.ratePaisa));
    } else if (item.rate != null) {
      ratePaisa = Math.round(Number(item.rate) * 100);
    }
    const amountPaisa = item.amountPaisa != null ? Math.round(Number(item.amountPaisa)) : qty * ratePaisa;

    return {
      name: item.name || item.desc || 'Returned Item',
      productId: item.productId || '',
      variantId: item.variantId || '',
      sku: item.sku || '',
      qty,
      rate: ratePaisa,
      amount: amountPaisa
    };
  });

  const subtotalPaisa = processedItems.reduce((sum, item) => sum + item.amount, 0);
  const vatAmountPaisa = vatable ? Math.round((subtotalPaisa * VAT_RATE) / 100) : 0;
  const totalAmountPaisa = subtotalPaisa + vatAmountPaisa;

  const purchaseReturn = await PurchaseReturn.create({
    no: nextNo,
    purchaseId: mongoose.isValidObjectId(data.purchaseId) ? data.purchaseId : null,
    billNo: billNo.trim(),
    supplier: supplier.trim(),
    supplierPan: supplierPan.trim(),
    date,
    items: processedItems,
    subtotal: subtotalPaisa,
    vatable,
    vatAmount: vatAmountPaisa,
    totalAmount: totalAmountPaisa,
    reason,
    status: 'completed',
    warehouseId,
    notes: data.notes || ''
  });

  // --- Atomically decrease Inventory stock for returned items ---
  for (const item of processedItems) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;

    let targetVariant = null;
    if (item.sku && item.sku !== 'SKU') {
      targetVariant = await Variant.findOne({ sku: item.sku });
    }
    if (!targetVariant && item.variantId) {
      targetVariant = await Variant.findOne({
        $or: [
          { id: item.variantId },
          mongoose.isValidObjectId(item.variantId) ? { _id: item.variantId } : null
        ].filter(Boolean)
      });
    }

    if (targetVariant) {
      const vId = targetVariant.id || targetVariant._id.toString();
      const inv = await Inventory.findOneAndUpdate(
        { variantId: vId, warehouseId },
        { $inc: { available: -qty } },
        { new: true }
      );

      await StockMove.create({
        id: 'sm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        variantId: vId,
        warehouseId,
        type: 'adjustment',
        change: -qty,
        before: inv ? inv.available + qty : qty,
        after: inv ? inv.available : 0,
        reason: `Purchase return to supplier: ${purchaseReturn.no} (Bill: ${billNo})`,
        reference: purchaseReturn.no,
        user: user?.name || user?.email || 'Admin',
        at: new Date()
      });
    }
  }

  return purchaseReturn;
}

export async function cancelPurchaseReturn(id, { reason = 'Debit note cancelled', user = null } = {}) {
  const pr = await PurchaseReturn.findOne({
    $or: [
      mongoose.isValidObjectId(id) ? { _id: id } : null,
      { no: id }
    ].filter(Boolean)
  });

  if (!pr) {
    throw ApiError.notFound('Purchase return record not found.');
  }

  if (pr.status === 'cancelled') {
    throw ApiError.badRequest('Debit note is already cancelled.');
  }

  pr.status = 'cancelled';
  pr.cancelReason = reason;
  pr.cancelledAt = new Date();
  await pr.save();

  // Reverse inventory reduction
  const warehouseId = pr.warehouseId || 'w1';
  for (const item of pr.items || []) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;

    let targetVariant = null;
    if (item.sku) targetVariant = await Variant.findOne({ sku: item.sku });
    if (!targetVariant && item.variantId) targetVariant = await Variant.findOne({ id: item.variantId });

    if (targetVariant) {
      const vId = targetVariant.id || targetVariant._id.toString();
      const inv = await Inventory.findOneAndUpdate(
        { variantId: vId, warehouseId },
        { $inc: { available: qty } },
        { new: true }
      );

      await StockMove.create({
        id: 'sm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        variantId: vId,
        warehouseId,
        type: 'adjustment',
        change: qty,
        before: inv ? inv.available - qty : 0,
        after: inv ? inv.available : qty,
        reason: `Purchase return cancelled reversal: ${pr.no}`,
        reference: pr.no,
        user: user?.name || user?.email || 'Admin',
        at: new Date()
      });
    }
  }

  return pr;
}

export default {
  listPurchaseReturns,
  getPurchaseReturnById,
  createPurchaseReturn,
  cancelPurchaseReturn
};
