import express from 'express';
import {
  initiateEsewa,
  handleEsewaWebhook,
  initiateFonepay,
  handleFonepayWebhook
} from '../controllers/payment.controller.js';

export const router = express.Router();

// eSewa endpoints
router.post('/esewa/initiate', initiateEsewa);
router.post('/esewa/webhook', handleEsewaWebhook);
router.get('/esewa/webhook', handleEsewaWebhook);

// Fonepay endpoints
router.post('/fonepay/initiate', initiateFonepay);
router.post('/fonepay/webhook', handleFonepayWebhook);

export default router;
