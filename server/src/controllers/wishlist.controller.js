import { asyncHandler } from '../utils/asyncHandler.js';
import wishlistService from '../services/wishlist.service.js';

export const getWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.getWishlist(req.user._id);
  res.status(200).json({ data: result });
});

export const toggleWishlistItem = asyncHandler(async (req, res) => {
  const result = await wishlistService.toggleWishlistItem(req.user._id, req.params.productId);
  res.status(200).json({
    message: result.inWishlist ? 'Product added to wishlist.' : 'Product removed from wishlist.',
    data: result
  });
});

export const removeWishlistItem = asyncHandler(async (req, res) => {
  const result = await wishlistService.removeWishlistItem(req.user._id, req.params.productId);
  res.status(200).json({
    message: 'Product removed from wishlist.',
    data: result
  });
});

export const clearWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.clearWishlist(req.user._id);
  res.status(200).json(result);
});

export default {
  getWishlist,
  toggleWishlistItem,
  removeWishlistItem,
  clearWishlist
};
