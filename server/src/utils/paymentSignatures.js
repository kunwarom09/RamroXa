import crypto from 'crypto';
import env from '../config/env.js';

/**
 * eSewa v2.0 Signature Generator
 * Message format: "total_amount=100,transaction_uuid=11-201-13,product_code=EPAYTEST"
 */
export function generateEsewaSignature({ total_amount, transaction_uuid, product_code, secret = env.ESEWA_SECRET }) {
  const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message);
  return hmac.digest('base64');
}

/**
 * eSewa v2.0 Signature Verifier
 * Validates base64 encoded response string from eSewa
 */
export function verifyEsewaPayload(encodedResponse, secret = env.ESEWA_SECRET) {
  try {
    const decodedStr = Buffer.from(encodedResponse, 'base64').toString('utf-8');
    const data = JSON.parse(decodedStr);

    const { total_amount, transaction_uuid, product_code, signature, signed_field_names } = data;

    if (!signature || !signed_field_names) {
      return { isValid: false, data: null };
    }

    // Recreate signed message from signed_field_names
    const fields = signed_field_names.split(',');
    const messageParts = fields.map((f) => `${f}=${data[f]}`);
    const message = messageParts.join(',');

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    const expectedSignature = hmac.digest('base64');

    const isValid = signature === expectedSignature;
    return { isValid, data };
  } catch (err) {
    return { isValid: false, data: null, error: err.message };
  }
}

/**
 * Fonepay Verification Hash Generator (HMAC-SHA512)
 */
export function generateFonepayHash({ prn, amount, merchantCode, secret = env.FONEPAY_SECRET }) {
  const message = `${merchantCode},${prn},${amount}`;
  const hmac = crypto.createHmac('sha512', secret);
  hmac.update(message);
  return hmac.digest('hex');
}

export function verifyFonepayHash({ prn, amount, merchantCode, hash, secret = env.FONEPAY_SECRET }) {
  const expected = generateFonepayHash({ prn, amount, merchantCode, secret });
  return expected.toLowerCase() === (hash || '').toLowerCase();
}

export default {
  generateEsewaSignature,
  verifyEsewaPayload,
  generateFonepayHash,
  verifyFonepayHash
};
