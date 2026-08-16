import { asyncHandler } from '../utils/asyncHandler.js';
import cartService from '../services/cart.service.js';
import crypto from 'crypto';

function getGuestToken(req, res) {
  let guestToken = req.headers['x-guest-token'] || req.cookies?.zylo_guest_token;
  if (!req.user && !guestToken) {
    guestToken = 'g_' + crypto.randomUUID();
    res.cookie('zylo_guest_token', guestToken, {
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });
  }
  return guestToken;
}

export const getCart = asyncHandler(async (req, res) => {
  const guestToken = getGuestToken(req, res);
  const cart = await cartService.getCartDetails({ user: req.user, guestToken });
  res.status(200).json({ data: cart });
});

export const addItem = asyncHandler(async (req, res) => {
  const guestToken = getGuestToken(req, res);
  const { variantId, qty } = req.body;
  const cart = await cartService.addItem({ user: req.user, guestToken, variantId, qty });
  res.status(200).json({ data: cart });
});

export const updateItem = asyncHandler(async (req, res) => {
  const guestToken = getGuestToken(req, res);
  const { variantId } = req.params;
  const { qty } = req.body;
  const cart = await cartService.updateItem({ user: req.user, guestToken, variantId, qty });
  res.status(200).json({ data: cart });
});

export const removeItem = asyncHandler(async (req, res) => {
  const guestToken = getGuestToken(req, res);
  const { variantId } = req.params;
  const cart = await cartService.removeItem({ user: req.user, guestToken, variantId });
  res.status(200).json({ data: cart });
});

export const clearCart = asyncHandler(async (req, res) => {
  const guestToken = getGuestToken(req, res);
  const result = await cartService.clearCart({ user: req.user, guestToken });
  res.status(200).json(result);
});

export default { getCart, addItem, updateItem, removeItem, clearCart };
