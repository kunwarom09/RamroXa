import { Coupon } from '../models/Coupon.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/regex.js';

export function calculateCouponDiscount(coupon, subtotal) {
  let discount = 0;
  if (coupon.discountType === 'fixed') {
    discount = Math.min(coupon.discountValue, subtotal);
  } else if (coupon.discountType === 'percentage') {
    discount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscount != null && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
    discount = Math.min(discount, subtotal);
  }
  return Math.max(0, discount);
}

export async function validateCoupon({ code, subtotal = 0, user = null }) {
  if (!code || !code.trim()) {
    throw ApiError.badRequest('Coupon code is required.');
  }

  const normalizedCode = code.toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: normalizedCode });

  if (!coupon || !coupon.active) {
    throw ApiError.badRequest(`Coupon '${normalizedCode}' is invalid or inactive.`);
  }

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    throw ApiError.badRequest(`Coupon '${normalizedCode}' is not active yet.`);
  }

  if (coupon.validUntil && now > coupon.validUntil) {
    throw ApiError.badRequest(`Coupon '${normalizedCode}' has expired.`);
  }

  if (subtotal < coupon.minOrderValue) {
    throw ApiError.badRequest(
      `Minimum order value of Rs ${(coupon.minOrderValue / 100).toFixed(2)} required for coupon '${normalizedCode}'.`
    );
  }

  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    throw ApiError.conflict(`Coupon '${normalizedCode}' has reached its maximum total usage limit.`);
  }

  if (user && coupon.userLimit != null) {
    const userUses = (coupon.usedBy || []).filter(
      (u) => u.user && u.user.toString() === (user._id || user.id).toString()
    ).length;
    if (userUses >= coupon.userLimit) {
      throw ApiError.badRequest(`You have already reached the maximum uses for coupon '${normalizedCode}'.`);
    }
  }

  const discountAmount = calculateCouponDiscount(coupon, subtotal);

  return {
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    coupon
  };
}

export async function applyCouponAtomic({ code, subtotal = 0, user = null, orderNo }) {
  if (!code || !code.trim()) return null;

  const normalizedCode = code.toUpperCase().trim();
  const now = new Date();

  // Optimistic concurrency query: check active, dates, min subtotal, and usageLimit atomically
  const query = {
    code: normalizedCode,
    active: true,
    validFrom: { $lte: now },
    minOrderValue: { $lte: subtotal },
    $and: [
      {
        $or: [{ validUntil: null }, { validUntil: { $gte: now } }]
      },
      {
        $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }]
      }
    ]
  };

  const update = {
    $inc: { usageCount: 1 },
    $push: {
      usedBy: {
        user: user ? (user._id || user.id) : null,
        orderNo,
        usedAt: now
      }
    }
  };

  const coupon = await Coupon.findOneAndUpdate(query, update, { new: true });

  if (!coupon) {
    throw ApiError.conflict(
      `Coupon '${normalizedCode}' could not be applied. It may have expired or reached its usage limit.`
    );
  }

  // Check per-user limit
  if (user && coupon.userLimit != null) {
    const userUses = (coupon.usedBy || []).filter(
      (u) => u.user && u.user.toString() === (user._id || user.id).toString()
    ).length;
    if (userUses > coupon.userLimit) {
      // Rollback usage increment
      await Coupon.findByIdAndUpdate(coupon._id, {
        $inc: { usageCount: -1 },
        $pop: { usedBy: 1 }
      });
      throw ApiError.badRequest(`You have already reached the maximum uses for coupon '${normalizedCode}'.`);
    }
  }

  const discountAmount = calculateCouponDiscount(coupon, subtotal);

  return {
    code: coupon.code,
    discountAmount,
    coupon
  };
}

// Admin Operations
export async function listAdminCoupons(query = {}) {
  const { q, active, page = 1, limit = 50 } = query;
  const filter = {};

  if (active !== undefined && active !== 'all') {
    filter.active = active === 'true' || active === true;
  }

  if (q && q.trim()) {
    const escaped = escapeRegex(q.trim());
    filter.$or = [
      { code: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    Coupon.countDocuments(filter)
  ]);

  return {
    coupons,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
}

export async function getAdminCouponById(id) {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw ApiError.notFound('Coupon not found.');
  }
  return coupon;
}

export async function createAdminCoupon(data) {
  const {
    code,
    description = '',
    discountType = 'fixed',
    discountValue,
    minOrderValue = 0,
    maxDiscount = null,
    validFrom = new Date(),
    validUntil = null,
    usageLimit = null,
    userLimit = 1,
    active = true
  } = data;

  if (!code || discountValue === undefined) {
    throw ApiError.badRequest('Coupon code and discountValue are required.');
  }

  const normalizedCode = code.toUpperCase().trim();
  const existing = await Coupon.findOne({ code: normalizedCode });
  if (existing) {
    throw ApiError.conflict(`Coupon with code '${normalizedCode}' already exists.`);
  }

  const coupon = await Coupon.create({
    code: normalizedCode,
    description,
    discountType,
    discountValue: Number(discountValue),
    minOrderValue: Number(minOrderValue || 0),
    maxDiscount: maxDiscount ? Number(maxDiscount) : null,
    validFrom: validFrom ? new Date(validFrom) : new Date(),
    validUntil: validUntil ? new Date(validUntil) : null,
    usageLimit: usageLimit ? Number(usageLimit) : null,
    userLimit: Number(userLimit || 1),
    active: active !== false
  });

  return coupon;
}

export async function updateAdminCoupon(id, updates) {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw ApiError.notFound('Coupon not found.');
  }

  if (updates.code && updates.code.toUpperCase().trim() !== coupon.code) {
    const newCode = updates.code.toUpperCase().trim();
    const existing = await Coupon.findOne({ code: newCode, _id: { $ne: id } });
    if (existing) {
      throw ApiError.conflict(`Coupon code '${newCode}' already in use.`);
    }
    coupon.code = newCode;
  }

  const allowed = [
    'description',
    'discountType',
    'discountValue',
    'minOrderValue',
    'maxDiscount',
    'validFrom',
    'validUntil',
    'usageLimit',
    'userLimit',
    'active'
  ];

  for (const field of allowed) {
    if (updates[field] !== undefined) {
      coupon[field] = updates[field];
    }
  }

  await coupon.save();
  return coupon;
}

export async function deleteAdminCoupon(id) {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw ApiError.notFound('Coupon not found.');
  }

  await Coupon.deleteOne({ _id: id });
  return { message: `Coupon '${coupon.code}' deleted successfully.` };
}

export default {
  calculateCouponDiscount,
  validateCoupon,
  applyCouponAtomic,
  listAdminCoupons,
  getAdminCouponById,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon
};
