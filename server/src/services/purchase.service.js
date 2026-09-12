import mongoose from 'mongoose';
import { Purchase } from '../models/Purchase.js';
import { Variant } from '../models/Variant.js';
import { Inventory } from '../models/Inventory.js';
import { StockMove } from '../models/StockMove.js';
import { ApiError } from '../utils/ApiError.js';
import { VAT_RATE } from '../utils/money.js';
import { escapeRegex } from '../utils/regex.js';

export async function listPurchases(query = {}) {
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
      { billNo: { $regex: escaped, $options: 'i' } },
      { supplier: { $regex: escaped, $options: 'i' } },
      { head: { $regex: escaped, $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [purchasesRaw, total] = await Promise.all([
    Purchase.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(take).lean(),
    Purchase.countDocuments(filter)
  ]);

  const purchases = purchasesRaw.map((p) => {
    // Standardize amounts: Ensure both integer Paisa and display NPR are available
    const subtotalPaisa = Number(p.subtotal) || 0;
    const vatAmountPaisa = Number(p.vatAmount) || 0;
    const totalAmountPaisa = Number(p.totalAmount) || (subtotalPaisa + vatAmountPaisa);

    return {
      ...p,
      subtotal: subtotalPaisa,
      vatAmount: vatAmountPaisa,
      totalAmount: totalAmountPaisa,
      subtotalNpr: Math.round(subtotalPaisa / 100),
      vatAmountNpr: Math.round(vatAmountPaisa / 100),
      totalAmountNpr: Math.round(totalAmountPaisa / 100),
      items: (p.items || []).map((it) => {
        const itemAmtPaisa = Number(it.amount) || 0;
        const itemRatePaisa = Number(it.rate) || 0;
        return {
          ...it,
          rate: itemRatePaisa,
          amount: itemAmtPaisa,
          rateNpr: Math.round(itemRatePaisa / 100),
          amountNpr: Math.round(itemAmtPaisa / 100)
        };
      })
    };
  });

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
  const purchase = await Purchase.findOne({
    $or: [
      mongoose.isValidObjectId(id) ? { _id: id } : null,
      { billNo: id }
    ].filter(Boolean)
  }).lean();

  if (!purchase) {
    throw ApiError.notFound('Purchase bill not found.');
  }

  return {
    ...purchase,
    subtotalNpr: Math.round((purchase.subtotal || 0) / 100),
    vatAmountNpr: Math.round((purchase.vatAmount || 0) / 100),
    totalAmountNpr: Math.round((purchase.totalAmount || 0) / 100),
    items: (purchase.items || []).map((it) => ({
      ...it,
      rateNpr: Math.round((it.rate || 0) / 100),
      amountNpr: Math.round((it.amount || 0) / 100)
    }))
  };
}

export async function createPurchase(data, user = null) {
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

  // Calculate items amount and subtotal in Paisa
  const processedItems = items.map((item) => {
    const qty = Number(item.qty || 1);
    // If rate is explicitly in Paisa, use it; otherwise convert user NPR input to Paisa
    let ratePaisa = 0;
    if (item.ratePaisa != null) {
      ratePaisa = Math.round(Number(item.ratePaisa));
    } else if (item.rate != null) {
      ratePaisa = Math.round(Number(item.rate) * 100);
    }

    const amountPaisa = item.amountPaisa != null ? Math.round(Number(item.amountPaisa)) : qty * ratePaisa;

    return {
      name: item.name || item.desc || 'Stock Item',
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
      existing.subtotal = subtotalPaisa;
      existing.vatable = vatable;
      existing.vatAmount = vatAmountPaisa;
      existing.totalAmount = totalAmountPaisa;
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
    subtotal: subtotalPaisa,
    vatable,
    vatAmount: vatAmountPaisa,
    totalAmount: totalAmountPaisa,
    paymentMethod: validPaymentMethod,
    paymentStatus,
    status: 'posted',
    notes
  });

  // --- Automatically increment Inventory for matching variant SKUs ---
  const warehouseId = data.warehouseId || 'w1';
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
        { $inc: { available: qty } },
        { new: true, upsert: false }
      );

      if (!inv) {
        await Inventory.create({
          id: `inv_${vId}_${warehouseId}`,
          variantId: vId,
          warehouseId,
          available: qty,
          reserved: 0,
          reorderLevel: 5
        });
      }

      const before = inv ? inv.available - qty : 0;
      const after = inv ? inv.available : qty;

      await StockMove.create({
        id: 'sm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        variantId: vId,
        warehouseId,
        type: 'purchase',
        change: qty,
        before,
        after,
        reason: `Supplier purchase: ${purchase.billNo} (${purchase.supplier})`,
        reference: purchase.billNo,
        user: user?.name || user?.email || 'Admin',
        at: new Date()
      });
    }
  }

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

  if (purchase.status === 'cancelled') {
    throw ApiError.badRequest('Cancelled purchase bill cannot be edited.');
  }

  if (data.billNo || data.bill) purchase.billNo = (data.billNo || data.bill).trim();
  if (data.supplier) purchase.supplier = data.supplier.trim();
  if (data.supplierPan !== undefined) purchase.supplierPan = data.supplierPan.trim();
  if (data.date) purchase.date = new Date(data.date);
  if (data.head) purchase.head = data.head.trim();
  if (data.vatable !== undefined) purchase.vatable = data.vatable;
  if (data.notes !== undefined) purchase.notes = data.notes;

  if (Array.isArray(data.items)) {
    purchase.items = data.items.map((item) => {
      const qty = Number(item.qty || 1);
      let ratePaisa = 0;
      if (item.ratePaisa != null) {
        ratePaisa = Math.round(Number(item.ratePaisa));
      } else if (item.rate != null) {
        ratePaisa = Math.round(Number(item.rate) * 100);
      }
      const amountPaisa = item.amountPaisa != null ? Math.round(Number(item.amountPaisa)) : qty * ratePaisa;

      return {
        name: item.name || item.desc || 'Stock Item',
        productId: item.productId || '',
        variantId: item.variantId || '',
        sku: item.sku || '',
        qty,
        rate: ratePaisa,
        amount: amountPaisa
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

/**
 * Compliant Cancellation (Audit Trail Preserved)
 * Replaces hard deletion.
 */
export async function cancelPurchase(id, { reason = 'Cancelled by administrator', user = null } = {}) {
  const purchase = await Purchase.findOne({
    $or: [
      mongoose.isValidObjectId(id) ? { _id: id } : null,
      { billNo: id }
    ].filter(Boolean)
  });
  if (!purchase) {
    throw ApiError.notFound('Purchase bill not found.');
  }

  if (purchase.status === 'cancelled') {
    throw ApiError.badRequest('Purchase bill is already cancelled.');
  }

  purchase.status = 'cancelled';
  purchase.cancelReason = reason;
  purchase.cancelledAt = new Date();
  purchase.cancelledBy = user?.email || user?.name || 'admin';
  await purchase.save();

  // Reverse inventory increase for any tracked items
  const warehouseId = 'w1';
  for (const item of purchase.items || []) {
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
        reason: `Purchase cancelled: ${purchase.billNo} (${reason})`,
        reference: purchase.billNo,
        user: user?.name || user?.email || 'Admin',
        at: new Date()
      });
    }
  }

  return purchase;
}

// Retain deletePurchase endpoint alias for backward-compatibility, redirecting to cancellation
export async function deletePurchase(id, user = null) {
  return cancelPurchase(id, { reason: 'Cancelled via Admin Portal', user });
}

export default {
  listPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  cancelPurchase,
  deletePurchase
};
