import express from 'express';
import { validateCoupon } from '../controllers/coupon.controller.js';

export const router = express.Router();

// Public coupon validation (supports guest or authenticated)
router.post('/validate', validateCoupon);

export default router;
