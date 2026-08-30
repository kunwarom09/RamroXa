import { Order, Payment, Inventory, StockMove } from '../models/index.js';
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
  const items = rawItems.map((it, idx) => {
    const qty = Number(it.qty) || 1;
    const rateNpr = Number(it.rate) || Number(it.price) || 0;
    const unitPricePaisa = it.unitPrice != null ? Number(it.unitPrice) : rateNpr * 100;
    const lineTotalPaisa = unitPricePaisa * qty;

    return {
      productId: it.productId || `p_manual_${idx}`,
      variantId: it.variantId || `v_manual_${idx}`,
      name: it.desc || it.name || 'Custom item',
      variantLabel: it.variantLabel || '',
      sku: it.sku || `SKU-${idx + 1}`,
      qty,
      unitPrice: unitPricePaisa,
      lineTotal: lineTotalPaisa
    };
  });

  const subtotalPaisa = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const vatTotalPaisa = data.vatable !== false ? Math.round(subtotalPaisa * 0.13) : 0;
  const grandTotalPaisa = subtotalPaisa + vatTotalPaisa;

  const paymentMethod = String(data.payment || data.paymentMethod || 'cod').toLowerCase();
  const validPaymentMethod = ['cod', 'esewa', 'fonepay'].includes(paymentMethod) ? paymentMethod : 'cod';

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
    paymentStatus: data.paymentStatus || 'paid',
    fulfillmentStatus: data.fulfillmentStatus || 'delivered',
    statusHistory: [
      {
        status: 'created',
        by: user?.email || 'admin',
        note: 'Manual sale invoice created via Admin Portal'
      }
    ]
  });

  return newOrder;
}

export async function deleteAdminOrder(orderId) {
  const order = await Order.findOneAndDelete({
    $or: [
      { id: orderId },
      { _id: orderId },
      { orderNo: orderId }
    ]
  });
  if (!order) {
    throw ApiError.notFound(`Order '${orderId}' not found.`);
  }
  return { message: 'Order deleted successfully.' };
}

export default {
  listAdminOrders,
  getAdminOrderById,
  updateFulfillmentStatus,
  processOrderRefund,
  createAdminOrder,
  deleteAdminOrder
};
