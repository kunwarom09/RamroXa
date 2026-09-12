import mongoose from 'mongoose';
import { Order, Payment, Inventory, StockMove, Variant } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { findOrder, updateFulfillmentStatus } from './order.service.js';
import { escapeRegex } from '../utils/regex.js';

export async function listAdminOrders(query = {}) {
  const { q, paymentStatus, fulfillmentStatus, page = 1, limit = 50 } = query;
  const filter = {};

  if (paymentStatus && paymentStatus !== 'all') {
    filter.paymentStatus = paymentStatus;
  }

  if (fulfillmentStatus && fulfillmentStatus !== 'all') {
    filter.fulfillmentStatus = fulfillmentStatus;
  }

  if (q && q.trim()) {
    const search = escapeRegex(q.trim());
    filter.$or = [
      { orderNo: { $regex: search, $options: 'i' } },
      { guestEmail: { $regex: search, $options: 'i' } },
      { guestPhone: { $regex: search, $options: 'i' } },
      { 'shippingAddress.fullName': { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    Order.countDocuments(filter)
  ]);

  return {
    orders,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
}

export async function getAdminOrderById(orderId) {
  const order = await findOrder(orderId);
  if (!order) {
    throw ApiError.notFound(`Order '${orderId}' not found.`);
  }

  const payments = await Payment.find({ order: order._id }).lean();
  return {
    ...(order.toObject ? order.toObject() : order),
    payments
  };
}

export async function processOrderRefund({ orderId, amount, reason = 'Customer refund', user }) {
  const order = await findOrder(orderId);
  if (!order) {
    throw ApiError.notFound(`Order '${orderId}' not found.`);
  }

  if (order.paymentStatus !== 'paid') {
    throw ApiError.badRequest('Only paid orders can be refunded.');
  }

  const refundAmount = amount ? parseInt(amount, 10) : order.grandTotal;

  await Payment.create({
    order: order._id,
    orderNo: order.orderNo,
    provider: order.paymentMethod,
    amount: -refundAmount,
    currency: order.currency,
    status: 'refunded',
    verifiedAt: new Date()
  });

  order.paymentStatus = 'refunded';
  order.statusHistory.push({
    status: 'refunded',
    at: new Date(),
    by: user ? user.name || user.email : 'Admin',
    note: reason
  });

  await order.save();
  return getAdminOrderById(order.id || order._id.toString());
}

export async function createAdminOrder(data, user) {
  const count = await Order.countDocuments();
  const nextOrderNo = data.invoice || data.orderNo || `INV-${2030 + count + 1}`;

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = [];

  for (let idx = 0; idx < rawItems.length; idx++) {
    const it = rawItems[idx];
    const qty = Number(it.qty) || 1;
    const rateNpr = Number(it.rate) || Number(it.price) || 0;
    const unitPricePaisa = it.unitPrice != null ? Number(it.unitPrice) : rateNpr * 100;
    const lineTotalPaisa = unitPricePaisa * qty;

    // Check if matching SKU/Variant exists in database
    let matchedVariant = null;
    if (it.sku && it.sku !== 'SKU') {
      matchedVariant = await Variant.findOne({ sku: it.sku });
    }
    if (!matchedVariant && it.variantId) {
      matchedVariant = await Variant.findOne({
        $or: [
          { id: it.variantId },
          mongoose.isValidObjectId(it.variantId) ? { _id: it.variantId } : null
        ].filter(Boolean)
      });
    }

    const resolvedVariantId = matchedVariant ? matchedVariant.id : (it.variantId || `v_manual_${idx}`);
    const resolvedProductId = matchedVariant ? matchedVariant.productId : (it.productId || `p_manual_${idx}`);
    const resolvedSku = matchedVariant ? matchedVariant.sku : (it.sku || `SKU-${idx + 1}`);

    items.push({
      product: matchedVariant?.product || undefined,
      variant: matchedVariant?._id || undefined,
      productId: resolvedProductId,
      variantId: resolvedVariantId,
      name: it.desc || it.name || (matchedVariant ? matchedVariant.name : 'Custom item'),
      variantLabel: it.variantLabel || '',
      sku: resolvedSku,
      qty,
      unitPrice: unitPricePaisa,
      lineTotal: lineTotalPaisa
    });

    // Deduct available stock if variant is matched
    if (matchedVariant) {
      const vId = matchedVariant.id || matchedVariant._id.toString();
      const warehouseId = data.warehouseId || 'w1';
      const inv = await Inventory.findOneAndUpdate(
        { variantId: vId, warehouseId, available: { $gte: qty } },
        { $inc: { available: -qty } },
        { new: true }
      );

      if (inv) {
        await StockMove.create({
          id: 'sm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          variantId: vId,
          warehouseId,
          type: 'sale',
          change: -qty,
          before: inv.available + qty,
          after: inv.available,
          reason: `Admin sale invoice: ${nextOrderNo}`,
          reference: nextOrderNo,
          user: user?.name || user?.email || 'Admin',
          at: new Date()
        });
      }
    }
  }

  // Consistent Retail VAT calculation: subtotal is derived from VAT-inclusive price
  const grandTotalPaisa = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const vatTotalPaisa = data.vatable !== false ? Math.round((grandTotalPaisa * 13) / 113) : 0;
  const subtotalPaisa = grandTotalPaisa - vatTotalPaisa;

  const paymentMethod = String(data.payment || data.paymentMethod || 'cod').toLowerCase();
  const validPaymentMethod = ['cod', 'esewa', 'fonepay', 'cash', 'bank', 'credit'].includes(paymentMethod) ? paymentMethod : 'cod';
  const defaultPaymentStatus = validPaymentMethod === 'credit' ? 'unpaid' : (data.paymentStatus || 'paid');

  const newOrder = await Order.create({
    orderNo: nextOrderNo,
    user: user?._id || null,
    guestEmail: data.email || null,
    guestPhone: data.customerPhone || data.phone || null,
    items,
    subtotal: subtotalPaisa,
    vatTotal: vatTotalPaisa,
    grandTotal: grandTotalPaisa,
    shippingAddress: {
      fullName: data.customer || 'Walk-in customer',
      phone: data.customerPhone || data.phone || '9800000000',
      line1: data.address || 'Direct counter sale',
      city: 'Kathmandu'
    },
    paymentMethod: validPaymentMethod,
    paymentStatus: data.paymentStatus || defaultPaymentStatus,
    fulfillmentStatus: data.fulfillmentStatus || 'delivered',
    statusHistory: [
      {
        status: 'created',
        by: user?.email || 'admin',
        note: 'Sale invoice created via Admin Portal'
      }
    ]
  });

  return newOrder;
}

/**
 * Compliant Order Cancellation (Preserves tax record & reverses inventory)
 */
export async function cancelAdminOrder(orderId, { reason = 'Cancelled by administrator', user = null } = {}) {
  const order = await Order.findOne({
    $or: [
      { id: orderId },
      mongoose.isValidObjectId(orderId) ? { _id: orderId } : null,
      { orderNo: orderId }
    ].filter(Boolean)
  });

  if (!order) {
    throw ApiError.notFound(`Order '${orderId}' not found.`);
  }

  if (order.fulfillmentStatus === 'cancelled') {
    throw ApiError.badRequest('Order is already cancelled.');
  }

  const prevStatus = order.fulfillmentStatus;
  order.fulfillmentStatus = 'cancelled';
  order.statusHistory.push({
    status: 'cancelled',
    at: new Date(),
    by: user ? user.name || user.email : 'Admin',
    note: reason
  });

  await order.save();

  // Restore inventory stock if order was fulfilled or delivered
  if (['confirmed', 'processing', 'shipped', 'delivered'].includes(prevStatus)) {
    const warehouseId = 'w1';
    for (const line of order.items || []) {
      if (line.variantId || line.sku) {
        let targetVariant = null;
        if (line.sku) targetVariant = await Variant.findOne({ sku: line.sku });
        if (!targetVariant && line.variantId) targetVariant = await Variant.findOne({ id: line.variantId });

        if (targetVariant) {
          const vId = targetVariant.id || targetVariant._id.toString();
          const inv = await Inventory.findOneAndUpdate(
            { variantId: vId, warehouseId },
            { $inc: { available: line.qty } },
            { new: true }
          );

          await StockMove.create({
            id: 'sm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            variantId: vId,
            warehouseId,
            type: 'adjustment',
            change: line.qty,
            before: inv ? inv.available - line.qty : 0,
            after: inv ? inv.available : line.qty,
            reason: `Order cancelled restoration: ${order.orderNo}`,
            reference: order.orderNo,
            user: user?.name || user?.email || 'Admin',
            at: new Date()
          });
        }
      }
    }
  }

  return order;
}

export async function deleteAdminOrder(orderId, user = null) {
  return cancelAdminOrder(orderId, { reason: 'Cancelled via Admin Portal', user });
}

export default {
  listAdminOrders,
  getAdminOrderById,
  updateFulfillmentStatus,
  processOrderRefund,
  createAdminOrder,
  cancelAdminOrder,
  deleteAdminOrder
};
