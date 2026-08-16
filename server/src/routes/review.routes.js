import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listProductReviews,
  createProductReview,
  deleteMyReview
} from '../controllers/review.controller.js';

export const router = express.Router({ mergeParams: true });

// Public: list reviews for a product
router.get('/:id/reviews', listProductReviews);

// Customer: submit a review for a product
router.post('/:id/reviews', requireAuth, createProductReview);

// Customer: delete their own review for a product
router.delete('/:id/reviews/mine', requireAuth, deleteMyReview);

export default router;
