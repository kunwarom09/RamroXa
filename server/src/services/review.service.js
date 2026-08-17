import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/regex.js';

export async function findProductDoc(productIdOrSlug) {
  if (!productIdOrSlug) return null;
  if (mongoose.Types.ObjectId.isValid(productIdOrSlug) && String(new mongoose.Types.ObjectId(productIdOrSlug)) === String(productIdOrSlug)) {
    const byId = await Product.findById(productIdOrSlug);
    if (byId && !byId.deletedAt) return byId;
  }
  return Product.findOne({
    $or: [{ id: productIdOrSlug }, { slug: productIdOrSlug.toLowerCase() }],
    deletedAt: null
  });
}

export async function recalculateProductRating(productId) {
  const pId = String(productId);
  const matchOr = [{ productId: pId }];
  if (mongoose.Types.ObjectId.isValid(pId) && String(new mongoose.Types.ObjectId(pId)) === pId) {
    matchOr.push({ product: new mongoose.Types.ObjectId(pId) });
  }

  const stats = await Review.aggregate([
    {
      $match: {
        $or: matchOr,
        status: 'published'
      }
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const ratingAvg = stats.length && stats[0].avgRating ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const ratingCount = stats.length ? stats[0].count : 0;

  const productMatch = [{ id: pId }, { slug: pId.toLowerCase() }];
  if (mongoose.Types.ObjectId.isValid(pId) && String(new mongoose.Types.ObjectId(pId)) === pId) {
    productMatch.push({ _id: new mongoose.Types.ObjectId(pId) });
  }

  await Product.updateMany(
    { $or: productMatch },
    { ratingAvg, ratingCount }
  );

  return { ratingAvg, ratingCount };
}

export async function listProductReviews(productIdOrSlug, query = {}) {
  const product = await findProductDoc(productIdOrSlug);
  if (!product) {
    throw ApiError.notFound('Product not found.');
  }

  const { page = 1, limit = 20, sort = 'newest' } = query;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const filter = {
    $or: [{ product: product._id }, { productId: product.id }],
    status: 'published'
  };

  const sortOptions = {};
  if (sort === 'highest') sortOptions.rating = -1;
  else if (sort === 'lowest') sortOptions.rating = 1;
  else sortOptions.createdAt = -1;

  const [reviews, total, breakdown] = await Promise.all([
    Review.find(filter).sort(sortOptions).skip(skip).limit(take).lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: filter },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ])
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  breakdown.forEach((b) => {
    if (b._id >= 1 && b._id <= 5) {
      distribution[b._id] = b.count;
    }
  });

  return {
    reviews,
    summary: {
      ratingAvg: product.ratingAvg || 0,
      ratingCount: product.ratingCount || total,
      distribution
    },
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
}

export async function createProductReview(productIdOrSlug, user, data) {
  const product = await findProductDoc(productIdOrSlug);
  if (!product) {
    throw ApiError.notFound('Product not found.');
  }

  const { rating, title = '', comment } = data;
  const numRating = Number(rating);

  if (!numRating || numRating < 1 || numRating > 5) {
    throw ApiError.badRequest('Rating must be an integer between 1 and 5.');
  }

  if (!comment || !comment.trim()) {
    throw ApiError.badRequest('Review comment is required.');
  }

  // Check if user already reviewed this product
  const existing = await Review.findOne({
    productId: product.id,
    user: user._id || user.id
  });

  if (existing) {
    throw ApiError.conflict('You have already submitted a review for this product.');
  }

  // Check verified purchase (user has an order with this product that is paid/delivered)
  const verifiedOrder = await Order.findOne({
    user: user._id || user.id,
    $or: [{ 'items.productId': product.id }, { 'items.product': product._id }],
    paymentStatus: 'paid'
  });

  const review = await Review.create({
    product: product._id,
    productId: product.id,
    user: user._id || user.id,
    userName: user.name || 'Anonymous Customer',
    userEmail: user.email || '',
    rating: numRating,
    title: title.trim(),
    comment: comment.trim(),
    status: 'published',
    verifiedPurchase: !!verifiedOrder
  });

  // Recalculate product rating stats
  await recalculateProductRating(product.id);

  return review;
}

export async function deleteMyReview(productIdOrSlug, user) {
  const product = await findProductDoc(productIdOrSlug);
  if (!product) {
    throw ApiError.notFound('Product not found.');
  }

  const review = await Review.findOne({
    productId: product.id,
    user: user._id || user.id
  });

  if (!review) {
    throw ApiError.notFound('Review not found.');
  }

  await Review.deleteOne({ _id: review._id });
  await recalculateProductRating(product.id);

  return { message: 'Review removed successfully.' };
}

// Admin Moderation
export async function listAdminReviews(query = {}) {
  const { q, status, rating, productId, page = 1, limit = 50 } = query;
  const filter = {};

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (rating) {
    filter.rating = Number(rating);
  }

  if (productId) {
    filter.$or = [{ productId }, { product: productId }];
  }

  if (q && q.trim()) {
    const escaped = escapeRegex(q.trim());
    filter.$or = [
      { userName: { $regex: escaped, $options: 'i' } },
      { comment: { $regex: escaped, $options: 'i' } },
      { title: { $regex: escaped, $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [reviews, total] = await Promise.all([
    Review.find(filter).populate('product', 'name slug images').sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    Review.countDocuments(filter)
  ]);

  return {
    reviews,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
}

export async function updateAdminReviewStatus(reviewId, status) {
  if (!['published', 'hidden'].includes(status)) {
    throw ApiError.badRequest("Status must be 'published' or 'hidden'.");
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw ApiError.notFound('Review not found.');
  }

  review.status = status;
  await review.save();

  await recalculateProductRating(review.productId);
  return review;
}

export async function deleteAdminReview(reviewId) {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw ApiError.notFound('Review not found.');
  }

  const prodId = review.productId;
  await Review.deleteOne({ _id: reviewId });
  await recalculateProductRating(prodId);

  return { message: 'Review deleted successfully.' };
}

export default {
  listProductReviews,
  createProductReview,
  deleteMyReview,
  listAdminReviews,
  updateAdminReviewStatus,
  deleteAdminReview,
  recalculateProductRating
};
