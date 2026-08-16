import { asyncHandler } from '../utils/asyncHandler.js';
import couponService from '../services/coupon.service.js';

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const result = await couponService.validateCoupon({
    code,
    subtotal: Number(subtotal) || 0,
    user: req.user
  });

  res.status(200).json({
    message: 'Coupon is valid.',
    data: result
  });
});

export const listAdminCoupons = asyncHandler(async (req, res) => {
  const result = await couponService.listAdminCoupons(req.query);
  res.status(200).json({ data: result.coupons, pagination: result.pagination });
});

export const getAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.getAdminCouponById(req.params.id);
  res.status(200).json({ data: { coupon } });
});

export const createAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createAdminCoupon(req.body);
  res.status(201).json({
    message: 'Coupon created successfully.',
    data: { coupon }
  });
});

export const updateAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.updateAdminCoupon(req.params.id, req.body);
  res.status(200).json({
    message: 'Coupon updated successfully.',
    data: { coupon }
  });
});

export const deleteAdminCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.deleteAdminCoupon(req.params.id);
  res.status(200).json(result);
});

export default {
  validateCoupon,
  listAdminCoupons,
  getAdminCoupon,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon
};
