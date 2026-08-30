import { SalesReturn, Order, Inventory, StockMove, Variant } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

export async function listSalesReturns(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q || query.search) {
    const term = query.q || query.search;
    filter.$or = [
      { no: { $regex: term, $options: 'i' } },
      { invoice: { $regex: term, $options: 'i' } },
      { orderNo: { $regex: term, $options: 'i' } },
      { customer: { $regex: term, $options: 'i' } }
    ];
  }
  const returns = await SalesReturn.find(filter).sort({ createdAt: -1 }).lean();
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
      return existing; // Return the already-created record — safe to call twice
    }
  }

  // --- Calculate already-refunded total for this order ---
  const orderFilter = [
    data.orderNo ? { orderNo: data.orderNo } : null,
    data.invoice && data.invoice !== data.orderNo ? { invoice: data.invoice } : null
  ].filter(Boolean);

  const previousReturns = await SalesReturn.find({
    $or: orderFilter.length ? orderFilter : [{ saleId: data.saleId }],
    status: { $nin: ['rejected'] }
  }).lean();

  const alreadyRefunded = previousReturns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);

  // --- Validate refund amount does not exceed refundable balance ---
  const originalTotal = Number(data.originalTotal) || 0;
  const refundAmount = Number(data.refundAmount) || 0;

  if (originalTotal > 0 && (alreadyRefunded + refundAmount) > originalTotal + 1) {
    throw ApiError.badRequest(
      `Refund amount (Rs ${refundAmount}) exceeds refundable balance (Rs ${originalTotal - alreadyRefunded}).`
    );
  }

  const count = await SalesReturn.countDocuments();
  const nextNo = `RET-${1000 + count + 1}`;
  const retId = 'ret_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const vatRate = 13;
  const refundNet = data.refundNet !== undefined ? Number(data.refundNet) : Math.round(refundAmount / (1 + vatRate / 100));
  const refundVat = data.refundVat !== undefined ? Number(data.refundVat) : (refundAmount - refundNet);

  const items = Array.isArray(data.items) ? data.items : [];
  const warehouseId = data.warehouseId || 'w1';
  const restock = data.restock || 'available';

  const newReturn = await SalesReturn.create({
    id: retId,
    no: data.no || nextNo,
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
    refundNet,
    refundVat,
    refundAmount,
    alreadyRefunded,
    status: data.status || 'pending',
    notes: data.notes || '',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    idempotencyKey: data.idempotencyKey || null
  });

  // --- Restock inventory (only for 'available' destination) ---
  if (restock === 'available' && items.length > 0) {
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
        // Atomic increment — prevents race conditions
        const inv = await Inventory.findOneAndUpdate(
          { variantId: vId, warehouseId },
          { $inc: { available: returnQty } },
          { new: true, upsert: false }
        );

        if (!inv) {
          // No inventory record found — create one
          await Inventory.create({
            id: `inv_${vId}_${warehouseId}`,
            variantId: vId,
            warehouseId,
            available: returnQty,
            reserved: 0
          });
        }

        const before = inv ? (inv.available - returnQty) : 0;
        const after = inv ? inv.available : returnQty;

        await StockMove.create({
          id: 'sm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          variantId: vId,
          warehouseId,
          type: 'customer_return',
          change: returnQty,
          before,
          after,
          reason: `Customer return: ${newReturn.no} (${data.reason || 'Restocked'})`,
          reference: newReturn.no
        });
      }
    }
  }

  // --- Update order status based on refund totals ---
  if (data.orderNo || data.saleId || data.invoice) {
    const orderOrFilter = [
      data.orderNo ? { orderNo: data.orderNo } : null,
      data.saleId ? { id: data.saleId } : null,
      data.invoice ? { orderNo: data.invoice } : null
    ].filter(Boolean);

    const order = await Order.findOne({ $or: orderOrFilter });

    if (order) {
      const newAlreadyRefunded = alreadyRefunded + refundAmount;
      const orderTotal = Math.round((order.grandTotal || 0) / 100);

      if (data.type === 'full' || newAlreadyRefunded >= orderTotal) {
        order.fulfillmentStatus = 'returned';
        order.paymentStatus = 'refunded';
      } else if (newAlreadyRefunded > 0) {
        // Partial return
        order.fulfillmentStatus = order.fulfillmentStatus === 'returned' ? 'returned' : order.fulfillmentStatus;
        if (order.paymentStatus !== 'refunded') {
          order.paymentStatus = 'paid'; // Partial — still has remaining balance
        }
      }

      order.statusHistory.push({
        status: `Return requested: ${newReturn.no}`,
        by: user?.email || 'admin',
        note: `Reason: ${data.reason || 'Customer return'}, Amount: Rs ${refundAmount}, Previously refunded: Rs ${alreadyRefunded}`
      });
      await order.save();
    }
  }

  return newReturn;
}

export async function updateSalesReturnStatus(id, { status, notes }) {
  const ret = await SalesReturn.findOne({ $or: [{ id }, { _id: id }] });
  if (!ret) throw ApiError.notFound('Sales return record not found.');
  if (status) ret.status = status;
  if (notes !== undefined) ret.notes = notes;
  await ret.save();
  return ret;
}

export async function deleteSalesReturn(id) {
  const ret = await SalesReturn.findOneAndDelete({ $or: [{ id }, { _id: id }] });
  if (!ret) throw ApiError.notFound('Sales return record not found.');
  return { message: 'Sales return record deleted successfully.' };
}

export default {
  listSalesReturns,
  createSalesReturn,
  updateSalesReturnStatus,
  deleteSalesReturn
};