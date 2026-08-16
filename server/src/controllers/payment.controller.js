import { asyncHandler } from '../utils/asyncHandler.js';
import paymentService from '../services/payment.service.js';

export const initiateEsewa = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const guestToken = req.headers['x-guest-token'] || req.cookies?.zylo_guest_token;
  const result = await paymentService.initiateEsewaPayment({
    orderId,
    user: req.user,
    guestToken
  });
  res.status(200).json({ data: result });
});

export const handleEsewaWebhook = asyncHandler(async (req, res) => {
  // eSewa sends encoded data as query string 'data' in GET or body 'data' in POST
  const encodedData = req.body?.data || req.query?.data;
  const result = await paymentService.processEsewaWebhook({ encodedData });
  res.status(200).json(result);
});

export const initiateFonepay = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const guestToken = req.headers['x-guest-token'] || req.cookies?.zylo_guest_token;
  const result = await paymentService.initiateFonepayPayment({
    orderId,
    user: req.user,
    guestToken
  });
  res.status(200).json({ data: result });
});

export const handleFonepayWebhook = asyncHandler(async (req, res) => {
  const { prn, amount, hash } = req.body;
  const result = await paymentService.processFonepayWebhook({
    prn,
    amount,
    hash,
    rawPayload: req.body
  });
  res.status(200).json(result);
});

export default {
  initiateEsewa,
  handleEsewaWebhook,
  initiateFonepay,
  handleFonepayWebhook
};
