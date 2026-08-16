import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getWishlist,
  toggleWishlistItem,
  removeWishlistItem,
  clearWishlist
} from '../controllers/wishlist.controller.js';

export const router = express.Router();

// Wishlist requires authenticated customer
router.use(requireAuth);

router.get('/', getWishlist);
router.post('/toggle/:productId', toggleWishlistItem);
router.delete('/items/:productId', removeWishlistItem);
router.delete('/', clearWishlist);

export default router;
