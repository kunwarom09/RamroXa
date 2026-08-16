import express from 'express';
import { createOrder, getOrderById, listMyOrders } from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const router = express.Router();

router.post('/', createOrder);
router.get('/', requireAuth, listMyOrders);
router.get('/:id', getOrderById);

export default router;
