import { Order, Payment, Inventory, StockMove } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { findOrder, updateFulfillmentStatus } from './order.service.js';

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
    const search = q.trim();
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

export default {
  listAdminOrders,
  getAdminOrderById,
  updateFulfillmentStatus,
  processOrderRefund
};
