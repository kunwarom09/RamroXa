import mongoose from 'mongoose';
import { Order, Payment, Inventory, StockMove } from '../models/index.js';
import { findOrder } from './order.service.js';
import { ApiError } from '../utils/ApiError.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import {
  generateEsewaSignature,
  verifyEsewaPayload,
  generateFonepayHash,
  verifyFonepayHash
} from '../utils/paymentSignatures.js';

const ESEWA_GATEWAY_URL =
  env.NODE_ENV === 'production'
    ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
    : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

const FONEPAY_GATEWAY_URL =
  env.NODE_ENV === 'production'
    ? 'https://clientapi.fonepay.com/api/merchantRequest'
    : 'https://dev-clientapi.fonepay.com/api/merchantRequest';

export async function initiateEsewaPayment({ orderId, user, guestToken }) {
  const order = await findOrder(orderId);
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  if (order.paymentStatus === 'paid') {
    throw ApiError.badRequest('This order has already been paid.');
  }

  // Validate authorization
  if (order.user) {
    if (!user || (user.role !== 'admin' && user.role !== 'staff' && order.user.toString() !== user._id.toString())) {
      throw ApiError.forbidden('Access denied to initiate payment for this order.');
    }
  } else if (order.guestToken) {
    if (!guestToken || order.guestToken !== guestToken) {
      throw ApiError.forbidden('Valid guest token required to initiate payment.');
    }
  }

  const merchantCode = env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
  const amountInNpr = (order.grandTotal / 100).toFixed(2);
  const transactionUuid = `${order.orderNo}-${Date.now().toString(36)}`;

  const signature = generateEsewaSignature({
    total_amount: amountInNpr,
    transaction_uuid: transactionUuid,
    product_code: merchantCode
  });

  const successUrl = `${env.FRONTEND_URL}/order-confirmed?orderNo=${order.orderNo}&status=success`;
  const failureUrl = `${env.FRONTEND_URL}/order-confirmed?orderNo=${order.orderNo}&status=failed`;

  // Update payment reference
  await Payment.findOneAndUpdate(
    { order: order._id },
    {
      provider: 'esewa',
      amount: order.grandTotal,
      providerRef: transactionUuid
    },
    { upsert: true }
  );

  return {
    gatewayUrl: ESEWA_GATEWAY_URL,
    params: {
      amount: amountInNpr,
      tax_amount: '0',
      total_amount: amountInNpr,
      transaction_uuid: transactionUuid,
      product_code: merchantCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature
    }
  };
}

export async function processEsewaWebhook({ encodedData }) {
  if (!encodedData) {
    throw ApiError.badRequest('Missing encoded payment data.');
  }

  const { isValid, data, error } = verifyEsewaPayload(encodedData);
  if (!isValid || !data) {
    logger.warn({ error, encodedData }, 'eSewa signature verification failed');
    throw ApiError.badRequest('Invalid signature or corrupted payment data.');
  }

  const { transaction_uuid, transaction_code, total_amount, status } = data;
  const orderCandidate1 = transaction_uuid.substring(0, transaction_uuid.lastIndexOf('-'));
  const orderCandidate2 = transaction_uuid.split('-').slice(0, 2).join('-');

  let order = await Order.findOne({ orderNo: orderCandidate1 });
  if (!order) order = await Order.findOne({ orderNo: orderCandidate2 });
  if (!order) order = await Order.findOne({ orderNo: transaction_uuid });

  if (!order) {
    throw ApiError.notFound(`Order for transaction ${transaction_uuid} not found.`);
  }

  // Idempotency check: Already processed
  const existingPayment = await Payment.findOne({ providerRef: transaction_code, status: 'paid' });
  if (existingPayment) {
    logger.info({ transaction_code, orderNo: order.orderNo }, 'Duplicate eSewa webhook acknowledged without reprocessing');
    return { success: true, message: 'Payment already recorded.' };
  }

  if (status === 'COMPLETE') {
    // Payment Successful
    await Payment.findOneAndUpdate(
      { order: order._id },
      {
        status: 'paid',
        provider: 'esewa',
        providerRef: transaction_code,
        rawWebhookPayload: data,
        verifiedAt: new Date()
      }
    );

    order.paymentStatus = 'paid';
    if (order.fulfillmentStatus === 'pending') {
      order.fulfillmentStatus = 'confirmed';
    }
    order.statusHistory.push({
      status: 'confirmed',
      at: new Date(),
      by: 'esewa_webhook',
      note: `Payment completed via eSewa (Ref: ${transaction_code})`
    });

    await order.save();
    logger.info({ orderNo: order.orderNo, transaction_code }, 'eSewa payment verified and order confirmed');
    return { success: true, orderNo: order.orderNo, status: 'paid' };
  } else {
    // Payment Failed
    await Payment.findOneAndUpdate(
      { order: order._id },
      {
        status: 'failed',
        providerRef: transaction_code,
        rawWebhookPayload: data
      }
    );

    order.paymentStatus = 'failed';
    order.statusHistory.push({
      status: 'payment_failed',
      at: new Date(),
      by: 'esewa_webhook',
      note: `Payment failed on eSewa`
    });
    await order.save();

    return { success: false, orderNo: order.orderNo, status: 'failed' };
  }
}

export async function initiateFonepayPayment({ orderId, user, guestToken }) {
  const order = await findOrder(orderId);
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  if (order.paymentStatus === 'paid') {
    throw ApiError.badRequest('This order has already been paid.');
  }

  // Validate authorization
  if (order.user) {
    if (!user || (user.role !== 'admin' && user.role !== 'staff' && order.user.toString() !== user._id.toString())) {
      throw ApiError.forbidden('Access denied to initiate payment for this order.');
    }
  } else if (order.guestToken) {
    if (!guestToken || order.guestToken !== guestToken) {
      throw ApiError.forbidden('Valid guest token required to initiate payment.');
    }
  }

  const merchantCode = env.FONEPAY_MERCHANT_CODE || 'FPAYTEST';
  const amountInNpr = (order.grandTotal / 100).toFixed(2);
  const prn = `${order.orderNo}-${Date.now().toString(36)}`;

  const hash = generateFonepayHash({
    prn,
    amount: amountInNpr,
    merchantCode
  });

  const returnUrl = `${env.FRONTEND_URL}/order-confirmed?orderNo=${order.orderNo}`;

  await Payment.findOneAndUpdate(
    { order: order._id },
    {
      provider: 'fonepay',
      amount: order.grandTotal,
      providerRef: prn
    },
    { upsert: true }
  );

  return {
    gatewayUrl: FONEPAY_GATEWAY_URL,
    params: {
      merchantCode,
      prn,
      amount: amountInNpr,
      hash,
      returnUrl
    }
  };
}

export async function processFonepayWebhook({ prn, amount, hash, rawPayload = {} }) {
  const merchantCode = env.FONEPAY_MERCHANT_CODE || 'FPAYTEST';

  const isValid = verifyFonepayHash({
    prn,
    amount,
    merchantCode,
    hash
  });

  if (!isValid) {
    throw ApiError.badRequest('Invalid Fonepay signature verification hash.');
  }

  const orderCandidate1 = prn.substring(0, prn.lastIndexOf('-'));
  const orderCandidate2 = prn.split('-').slice(0, 2).join('-');

  let order = await Order.findOne({ orderNo: orderCandidate1 });
  if (!order) order = await Order.findOne({ orderNo: orderCandidate2 });
  if (!order) order = await Order.findOne({ orderNo: prn });

  if (!order) {
    throw ApiError.notFound(`Order for Fonepay PRN ${prn} not found.`);
  }

  // Idempotency check
  const existingPayment = await Payment.findOne({ providerRef: prn, status: 'paid' });
  if (existingPayment) {
    return { success: true, message: 'Payment already processed.' };
  }

  await Payment.findOneAndUpdate(
    { order: order._id },
    {
      status: 'paid',
      provider: 'fonepay',
      providerRef: prn,
      rawWebhookPayload: rawPayload,
      verifiedAt: new Date()
    }
  );

  order.paymentStatus = 'paid';
  if (order.fulfillmentStatus === 'pending') {
    order.fulfillmentStatus = 'confirmed';
  }
  order.statusHistory.push({
    status: 'confirmed',
    at: new Date(),
    by: 'fonepay_webhook',
    note: `Payment completed via Fonepay (PRN: ${prn})`
  });

  await order.save();
  return { success: true, orderNo: order.orderNo, status: 'paid' };
}

export default {
  initiateEsewaPayment,
  processEsewaWebhook,
  initiateFonepayPayment,
  processFonepayWebhook
};
