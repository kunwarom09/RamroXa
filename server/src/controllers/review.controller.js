import { asyncHandler } from '../utils/asyncHandler.js';
import reviewService from '../services/review.service.js';

export const listProductReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.listProductReviews(req.params.id, req.query);
  res.status(200).json({
    data: result.reviews,
    summary: result.summary,
    pagination: result.pagination
  });
});

export const createProductReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createProductReview(req.params.id, req.user, req.body);
  res.status(201).json({
    message: 'Review submitted successfully.',
    data: { review }
  });
});

export const deleteMyReview = asyncHandler(async (req, res) => {
  const result = await reviewService.deleteMyReview(req.params.id, req.user);
  res.status(200).json(result);
});

export const listAdminReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.listAdminReviews(req.query);
  res.status(200).json({
    data: result.reviews,
    pagination: result.pagination
  });
});

export const updateAdminReviewStatus = asyncHandler(async (req, res) => {
  const review = await reviewService.updateAdminReviewStatus(req.params.id, req.body.status);
  res.status(200).json({
    message: 'Review status updated successfully.',
    data: { review }
  });
});

export const deleteAdminReview = asyncHandler(async (req, res) => {
  const result = await reviewService.deleteAdminReview(req.params.id);
  res.status(200).json(result);
});

export default {
  listProductReviews,
  createProductReview,
  deleteMyReview,
  listAdminReviews,
  updateAdminReviewStatus,
  deleteAdminReview
};
