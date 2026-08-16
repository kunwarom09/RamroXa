import { asyncHandler } from '../utils/asyncHandler.js';
import orderService from '../services/order.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  const idempotencyKey =
    req.headers['idempotency-key'] ||
    req.headers['x-idempotency-key'] ||
    req.body.idempotencyKey;

  const guestToken = req.headers['x-guest-token'] || req.cookies?.zylo_guest_token;

  const order = await orderService.createOrder({
    user: req.user,
    guestToken,
    items: req.body.items,
    shippingAddress: req.body.shippingAddress,
    billingAddress: req.body.billingAddress,
    paymentMethod: req.body.paymentMethod || 'cod',
    idempotencyKey,
    guestEmail: req.body.guestEmail,
    guestPhone: req.body.guestPhone,
    couponCode: req.body.couponCode
  });

  res.status(201).json({
    message: 'Order created successfully.',
    data: { order }
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const guestToken = req.headers['x-guest-token'] || req.cookies?.zylo_guest_token;
  const orderNo = req.query.orderNo;

  const order = await orderService.getOrderById({
    orderId: req.params.id,
    user: req.user,
    guestToken,
    orderNo
  });

  res.status(200).json({ data: { order } });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.listUserOrders(req.user);
  res.status(200).json({ data: { orders } });
});

export default { createOrder, getOrderById, listMyOrders };
