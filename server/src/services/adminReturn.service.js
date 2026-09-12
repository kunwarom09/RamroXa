import mongoose from 'mongoose';
import { SalesReturn, Order, Inventory, StockMove, Variant } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { VAT_RATE } from '../utils/money.js';

function buildReturnIdFilter(id) {
  if (!id) return { _id: null };
  const or = [];
  if (mongoose.isValidObjectId(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
    or.push({ _id: id });
  }
  or.push({ id: String(id) });
  or.push({ no: String(id).toUpperCase() });
  or.push({ no: String(id) });
  or.push({ creditNoteNo: String(id).toUpperCase() });
  return { $or: or };
}

export async function listSalesReturns(query = {}) {
  const filter = {};
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.q || query.search) {
    const term = query.q || query.search;
    filter.$or = [
      { no: { $regex: term, $options: 'i' } },
      { creditNoteNo: { $regex: term, $options: 'i' } },
      { invoice: { $regex: term, $options: 'i' } },
      { orderNo: { $regex: term, $options: 'i' } },
      { customer: { $regex: term, $options: 'i' } }
    ];
  }

  const returnsRaw = await SalesReturn.find(filter).sort({ createdAt: -1 }).lean();

  const returns = returnsRaw.map((r) => {
    const refundPaisa = Number(r.refundAmount) || 0;
    const netPaisa = Number(r.refundNet) || 0;
    const vatPaisa = Number(r.refundVat) || 0;

    return {
      ...r,
      creditNoteNo: r.creditNoteNo || r.no,
      refundAmount: refundPaisa,
      refundNet: netPaisa,
      refundVat: vatPaisa,
      refundAmountNpr: Math.round(refundPaisa / 100),
      refundNetNpr: Math.round(netPaisa / 100),
      refundVatNpr: Math.round(vatPaisa / 100)
    };
  });

  return { returns, count: returns.length };
}

export async function createSalesReturn(data = {}, user = null) {
  if (!data.customer && !data.saleId && !data.invoice) {
    throw ApiError.badRequest('Customer name or order invoice is required.');
  }

  // --- Idempotency check ---
  if (data.idempotencyKey) {
    const existing = await SalesReturn.findOne({ idempotencyKey: data.idempotencyKey });
    if (existing) {
      return existing;
    }
  }

  // Calculate refund amounts in Paisa
  let refundAmountPaisa = 0;
  if (data.refundAmountPaisa != null) {
    refundAmountPaisa = Math.round(Number(data.refundAmountPaisa));
  } else if (data.refundAmount != null) {
    // If input is less than 1,000,000 and comes from UI in NPR
    refundAmountPaisa = Math.round(Number(data.refundAmount) * 100);
  }

  // Calculate already-refunded total for this order (in Paisa)
  const orderFilter = [
    data.orderNo ? { orderNo: data.orderNo } : null,
    data.invoice && data.invoice !== data.orderNo ? { invoice: data.invoice } : null
  ].filter(Boolean);

  const previousReturns = await SalesReturn.find({
    $or: orderFilter.length ? orderFilter : [{ saleId: data.saleId }],
    status: { $nin: ['rejected', 'cancelled'] }
  }).lean();

  const alreadyRefundedPaisa = previousReturns.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);

  const count = await SalesReturn.countDocuments();
  const nextNo = `RET-${1000 + count + 1}`;
  const creditNoteNo = data.creditNoteNo || `CN-${1000 + count + 1}`;
  const retId = 'ret_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Derived VAT breakdown (inclusive of 13% VAT)
  const refundNetPaisa = Math.round((refundAmountPaisa * 100) / (100 + VAT_RATE));
  const refundVatPaisa = refundAmountPaisa - refundNetPaisa;

  const items = Array.isArray(data.items) ? data.items : [];
  const warehouseId = data.warehouseId || 'w1';
  const restock = data.restock || 'available';
  const initialStatus = data.status || 'pending';

  const newReturn = await SalesReturn.create({
    id: retId,
    no: data.no || nextNo,
    creditNoteNo,
    saleId: data.saleId || '',
    orderNo: data.orderNo || data.invoice || '',
    invoice: data.invoice || '',
    customer: data.customer || 'Customer',
    customerPhone: data.customerPhone || '',
    date: data.date || new Date().toISOString().slice(0, 10),
    type: data.type || 'full',
    reason: data.reason || 'Customer return',
    restock,
    warehouseId,
    items,
    refundNet: refundNetPaisa,
    refundVat: refundVatPaisa,
    refundAmount: refundAmountPaisa,
    alreadyRefunded: alreadyRefundedPaisa,
    status: initialStatus,
    notes: data.notes || '',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    idempotencyKey: data.idempotencyKey || null
  });

  // --- Restock inventory ONLY if return is already approved or completed ---
  // (Prevents restocking items still in transit or awaiting inspection)
  if (['approved', 'completed'].includes(initialStatus) && restock === 'available' && items.length > 0) {
    await performReturnRestock(newReturn, items, warehouseId, user);
  }

  // --- Update Order status based on refund totals ---
  if (data.orderNo || data.saleId || data.invoice) {
    const orderOrFilter = [
      data.orderNo ? { orderNo: data.orderNo } : null,
      data.saleId ? { id: data.saleId } : null,
      data.invoice ? { orderNo: data.invoice } : null
    ].filter(Boolean);

    const order = await Order.findOne({ $or: orderOrFilter });
    if (order) {
      const orderTotalPaisa = Number(order.grandTotal) || 0;
      const totalRefundedPaisa = alreadyRefundedPaisa + refundAmountPaisa;

      if (['approved', 'completed', 'refunded'].includes(initialStatus)) {
        if (data.type === 'full' || totalRefundedPaisa >= orderTotalPaisa) {
          order.fulfillmentStatus = 'returned';
          order.paymentStatus = 'refunded';
        }
      }

      order.statusHistory.push({
        status: `Return requested: ${newReturn.no} (${newReturn.creditNoteNo})`,
        by: user?.email || 'admin',
        note: `Reason: ${data.reason || 'Customer return'}, Amount: Rs ${Math.round(refundAmountPaisa / 100)}`
      });
      await order.save();
    }
  }

  return newReturn;
}

export async function updateSalesReturnStatus(id, { status, notes }, user = null) {
  const ret = await SalesReturn.findOne(buildReturnIdFilter(id));
  if (!ret) throw ApiError.notFound('Sales return record not found.');

  const prevStatus = ret.status;
  if (status) ret.status = status;
  if (notes !== undefined) ret.notes = notes;
  await ret.save();

  // If newly transitioning to approved or completed, restock inventory if appropriate
  if (
    ['approved', 'completed'].includes(status) &&
    !['approved', 'completed'].includes(prevStatus) &&
    ret.restock === 'available'
  ) {
    await performReturnRestock(ret, ret.items || [], ret.warehouseId || 'w1', user);
  }

  // If rejected or cancelled after having been restocked, reverse the stock addition
  if (
    ['rejected', 'cancelled'].includes(status) &&
    ['approved', 'completed'].includes(prevStatus) &&
    ret.restock === 'available'
  ) {
    await reverseReturnRestock(ret, ret.items || [], ret.warehouseId || 'w1', user);
  }

  // Update associated Order status
  if (status && status !== prevStatus) {
    const orderOrFilter = [
      ret.orderNo ? { orderNo: ret.orderNo } : null,
      ret.saleId ? (mongoose.isValidObjectId(ret.saleId) && String(new mongoose.Types.ObjectId(ret.saleId)) === String(ret.saleId) ? { _id: ret.saleId } : { id: ret.saleId }) : null,
      ret.invoice ? { orderNo: ret.invoice } : null
    ].filter(Boolean);

    const order = orderOrFilter.length ? await Order.findOne({ $or: orderOrFilter }) : null;
    if (order) {
      if (['approved', 'completed', 'refunded'].includes(status)) {
        order.paymentStatus = 'refunded';
        order.fulfillmentStatus = 'returned';
        order.statusHistory.push({
          status: `Return ${status}: ${ret.no} (${ret.creditNoteNo})`,
          by: user?.email || user?.name || 'admin',
          note: `Credit Note #${ret.creditNoteNo} approved. Refund: Rs ${Math.round((ret.refundAmount || 0) / 100)}.`
        });
        await order.save();
      } else if (status === 'rejected' && prevStatus !== 'rejected') {
        if (order.fulfillmentStatus === 'returned') {
          order.fulfillmentStatus = 'delivered';
        }
        order.statusHistory.push({
          status: `Return Rejected: ${ret.no}`,
          by: user?.email || user?.name || 'admin',
          note: `Sales return #${ret.no} rejected. ${notes || ''}`
        });
        await order.save();
      }
    }
  }

  return ret;
}

/**
 * Helper to restock inventory upon return approval/completion
 */
async function performReturnRestock(returnDoc, items, warehouseId, user) {
  for (const item of items) {
    const returnQty = Number(item.returnQty) || 0;
    if (returnQty <= 0) continue;

    let targetVariant = null;
    if (item.sku && item.sku !== 'SKU') {
      targetVariant = await Variant.findOne({ sku: item.sku });
    }
    if (!targetVariant && item.variantId) {
      targetVariant = await Variant.findOne({ id: item.variantId });
    }

    if (targetVariant) {
      const vId = targetVariant.id;
      const inv = await Inventory.findOneAndUpdate(
        { variantId: vId, warehouseId },
        { $inc: { available: returnQty } },
        { new: true, upsert: false }
      );

      if (!inv) {
        await Inventory.create({
          id: `inv_${vId}_${warehouseId}`,
          variantId: vId,
          warehouseId,
          available: returnQty,
          reserved: 0
        });
      }

      const before = inv ? inv.available - returnQty : 0;
      const after = inv ? inv.available : returnQty;

      await StockMove.create({
        id: 'sm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        variantId: vId,
        warehouseId,
        type: 'customer_return',
        change: returnQty,
        before,
        after,
        reason: `Customer return restock: ${returnDoc.creditNoteNo || returnDoc.no}`,
        reference: returnDoc.creditNoteNo || returnDoc.no,
        user: user?.name || user?.email || 'Admin',
        at: new Date()
      });
    }
  }
}

/**
 * Helper to reverse restock if return is later rejected or cancelled
 */
async function reverseReturnRestock(returnDoc, items, warehouseId, user) {
  for (const item of items) {
    const returnQty = Number(item.returnQty) || 0;
    if (returnQty <= 0) continue;

    let targetVariant = null;
    if (item.sku) targetVariant = await Variant.findOne({ sku: item.sku });
    if (!targetVariant && item.variantId) targetVariant = await Variant.findOne({ id: item.variantId });

    if (targetVariant) {
      const vId = targetVariant.id;
      const inv = await Inventory.findOneAndUpdate(
        { variantId: vId, warehouseId },
        { $inc: { available: -returnQty } },
        { new: true }
      );

      await StockMove.create({
        id: 'sm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        variantId: vId,
        warehouseId,
        type: 'adjustment',
        change: -returnQty,
        before: inv ? inv.available + returnQty : returnQty,
        after: inv ? inv.available : 0,
        reason: `Return cancelled/rejected reversal: ${returnDoc.creditNoteNo || returnDoc.no}`,
        reference: returnDoc.creditNoteNo || returnDoc.no,
        user: user?.name || user?.email || 'Admin',
        at: new Date()
      });
    }
  }
}

/**
 * Compliant cancellation (preserves audit trail)
 */
export async function cancelSalesReturn(id, { reason = 'Cancelled by administrator', user = null } = {}) {
  const ret = await SalesReturn.findOne(buildReturnIdFilter(id));
  if (!ret) throw ApiError.notFound('Sales return record not found.');
  if (ret.status === 'cancelled') throw ApiError.badRequest('Sales return is already cancelled.');

  const prevStatus = ret.status;
  ret.status = 'cancelled';
  ret.cancelReason = reason;
  ret.cancelledAt = new Date();
  await ret.save();

  if (['approved', 'completed'].includes(prevStatus) && ret.restock === 'available') {
    await reverseReturnRestock(ret, ret.items || [], ret.warehouseId || 'w1', user);
  }

  return ret;
}

export async function deleteSalesReturn(id, user = null) {
  return cancelSalesReturn(id, { reason: 'Cancelled via Admin Portal', user });
}

export default {
  listSalesReturns,
  createSalesReturn,
  updateSalesReturnStatus,
  cancelSalesReturn,
  deleteSalesReturn
};