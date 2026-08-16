import mongoose from 'mongoose';
import { Wishlist } from '../models/Wishlist.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

async function findProduct(productIdOrSlug) {
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

export async function getWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId }).populate('items.product', 'id name slug sku brand basePrice price mrp images status');

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, items: [] });
  }

  // Filter out any deleted products
  const activeItems = (wishlist.items || []).filter((item) => item.product && item.product.status !== 'archived');

  return {
    items: activeItems,
    count: activeItems.length
  };
}

export async function toggleWishlistItem(userId, productIdOrSlug) {
  const product = await findProduct(productIdOrSlug);
  if (!product) {
    throw ApiError.notFound('Product not found.');
  }

  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, items: [] });
  }

  const existingIdx = wishlist.items.findIndex(
    (i) => i.productId === product.id || (i.product && i.product.toString() === product._id.toString())
  );

  let inWishlist = false;

  if (existingIdx >= 0) {
    wishlist.items.splice(existingIdx, 1);
    inWishlist = false;
  } else {
    wishlist.items.unshift({
      product: product._id,
      productId: product.id,
      addedAt: new Date()
    });
    inWishlist = true;
  }

  await wishlist.save();
  const populated = await Wishlist.findById(wishlist._id).populate('items.product', 'id name slug sku brand basePrice price mrp images status');

  return {
    inWishlist,
    items: populated.items,
    count: populated.items.length
  };
}

export async function removeWishlistItem(userId, productIdOrSlug) {
  const product = await findProduct(productIdOrSlug);
  const targetId = product ? product.id : productIdOrSlug;

  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    return { items: [], count: 0 };
  }

  wishlist.items = wishlist.items.filter(
    (i) => i.productId !== targetId && (!product || i.product.toString() !== product._id.toString())
  );

  await wishlist.save();
  const populated = await Wishlist.findById(wishlist._id).populate('items.product', 'id name slug sku brand basePrice price mrp images status');

  return {
    items: populated.items,
    count: populated.items.length
  };
}

export async function clearWishlist(userId) {
  await Wishlist.findOneAndUpdate({ user: userId }, { items: [] }, { upsert: true });
  return { items: [], count: 0, message: 'Wishlist cleared.' };
}

export default {
  getWishlist,
  toggleWishlistItem,
  removeWishlistItem,
  clearWishlist
};
