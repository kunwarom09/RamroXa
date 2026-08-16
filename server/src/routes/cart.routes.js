import express from 'express';
import { getCart, addItem, updateItem, removeItem, clearCart } from '../controllers/cart.controller.js';

export const router = express.Router();

router.get('/', getCart);
router.post('/items', addItem);
router.patch('/items/:variantId', updateItem);
router.delete('/items/:variantId', removeItem);
router.delete('/', clearCart);

export default router;
