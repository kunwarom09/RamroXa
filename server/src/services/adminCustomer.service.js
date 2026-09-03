import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Address } from '../models/Address.js';
import { Review } from '../models/Review.js';
import { Wishlist } from '../models/Wishlist.js';
import { Session } from '../models/Session.js';
import { VerificationToken } from '../models/VerificationToken.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/regex.js';

export async function listAdminCustomers(query = {}) {
  const { q, page = 1, limit = 50 } = query;
  const filter = { role: 'customer', deletedAt: null };

  if (q && q.trim()) {
    const escaped = escapeRegex(q.trim());
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    User.countDocuments(filter)
  ]);

  const userIds = users.map((u) => u._id);

  // Aggregate order stats for these users
  const orderStats = await Order.aggregate([
    { $match: { user: { $in: userIds } } },
    {
      $group: {
        _id: '$user',
        orderCount: { $sum: 1 },
        totalSpend: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$grandTotal', 0]
          }
        },
        lastOrderAt: { $max: '$createdAt' }
      }
    }
  ]);

  const statsByUser = orderStats.reduce((acc, stat) => {
    acc[stat._id.toString()] = stat;
    return acc;
  }, {});

  const enriched = users.map((u) => {
    const stat = statsByUser[u._id.toString()] || {};
    return {
      _id: u._id,
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone,
      permanentAddress: u.permanentAddress || '',
      temporaryAddress: u.temporaryAddress || '',
      city: u.temporaryAddress || u.permanentAddress || 'Kathmandu',
      role: u.role,
      status: u.isActive ? 'active' : 'inactive',
      orderCount: stat.orderCount || 0,
      totalSpend: stat.totalSpend || 0, // In Paisa
      lastOrderAt: stat.lastOrderAt || null,
      createdAt: u.createdAt
    };
  });

  return {
    customers: enriched,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
}

export async function getAdminCustomerById(customerId) {
  const user = await User.findById(customerId).select('-passwordHash');
  if (!user || user.deletedAt) {
    throw ApiError.notFound('Customer not found.');
  }

  const [addresses, orders, reviewsCount, wishlist] = await Promise.all([
    Address.find({ user: user._id }).sort({ isDefault: -1, createdAt: -1 }).lean(),
    Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    Review.countDocuments({ user: user._id }),
    Wishlist.findOne({ user: user._id }).lean()
  ]);

  const totalSpend = orders.reduce((sum, o) => {
    return o.paymentStatus === 'paid' ? sum + (o.grandTotal || 0) : sum;
  }, 0);

  return {
    customer: {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      permanentAddress: user.permanentAddress || '',
      temporaryAddress: user.temporaryAddress || '',
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    },
    metrics: {
      orderCount: orders.length,
      totalSpend, // In Paisa
      reviewsCount,
      wishlistCount: wishlist?.items?.length || 0
    },
    addresses,
    recentOrders: orders
  };
}

export async function createAdminCustomer(data = {}) {
  const { name, email, phone, permanentAddress, temporaryAddress, notes } = data;
  if (!name || !name.trim()) {
    throw ApiError.badRequest('Customer name is required.');
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) {
    const existing = await User.findOne({ email: cleanEmail, deletedAt: null });
    if (existing) {
      throw ApiError.conflict('A customer with this email already exists.');
    }
  }

  const defaultPassword = await bcrypt.hash('CustomerPass123!', 10);
  const user = await User.create({
    name: name.trim(),
    email: cleanEmail || `customer_${Date.now()}@ramroxa.local`,
    phone: (phone || '').trim(),
    permanentAddress: (permanentAddress || '').trim(),
    temporaryAddress: (temporaryAddress || '').trim(),
    passwordHash: defaultPassword,
    role: 'customer',
    isEmailVerified: true,
    isVerified: true,
    isActive: true
  });

  return {
    _id: user._id,
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    permanentAddress: user.permanentAddress,
    temporaryAddress: user.temporaryAddress,
    role: user.role,
    status: 'active',
    orderCount: 0,
    spend: 0,
    notes: notes || 'Created by Admin'
  };
}

export async function updateAdminCustomer(customerId, data = {}) {
  let user = null;
  if (mongoose.Types.ObjectId.isValid(customerId)) {
    user = await User.findById(customerId);
  }
  if (!user) {
    const decoded = decodeURIComponent(customerId).trim();
    user = await User.findOne({
      $or: [{ email: decoded.toLowerCase() }, { phone: decoded }, { name: decoded }],
      deletedAt: null
    });
  }

  if (!user) {
    throw ApiError.notFound('Customer not found.');
  }

  if (data.name !== undefined && data.name.trim()) user.name = data.name.trim();
  if (data.email !== undefined && data.email.trim()) user.email = data.email.trim().toLowerCase();
  if (data.phone !== undefined) user.phone = data.phone.trim();
  if (data.permanentAddress !== undefined) user.permanentAddress = data.permanentAddress.trim();
  if (data.temporaryAddress !== undefined) user.temporaryAddress = data.temporaryAddress.trim();
  if (data.isActive !== undefined) user.isActive = Boolean(data.isActive);

  await user.save();

  return {
    _id: user._id,
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    permanentAddress: user.permanentAddress,
    temporaryAddress: user.temporaryAddress,
    role: user.role,
    status: user.isActive ? 'active' : 'inactive'
  };
}

export async function deleteAdminCustomer(customerId) {
  if (!customerId) {
    throw ApiError.badRequest('Customer identifier is required.');
  }

  let user = null;
  if (mongoose.Types.ObjectId.isValid(customerId)) {
    user = await User.findById(customerId);
  }

  const decoded = decodeURIComponent(customerId).trim();
  if (!user) {
    user = await User.findOne({
      $or: [
        { email: decoded.toLowerCase() },
        { phone: decoded },
        { name: decoded }
      ]
    });
  }

  if (user) {
    const userId = user._id;
    // Permanently remove user and all associated authentication artifacts
    await Promise.all([
      User.deleteOne({ _id: userId }),
      Session.deleteMany({ user: userId }).catch(() => {}),
      VerificationToken.deleteMany({ user: userId }).catch(() => {}),
      Wishlist.deleteMany({ user: userId }).catch(() => {}),
      Address.deleteMany({ user: userId }).catch(() => {}),
      Order.updateMany(
        { user: userId },
        {
          $set: {
            user: null,
            'shippingAddress.fullName': '[Deleted Customer]',
            guestEmail: null,
            guestPhone: null
          }
        }
      ).catch(() => {})
    ]);

    return { success: true, message: 'Customer deleted successfully.' };
  }

  // Also sanitize any guest order references matching this identifier
  await Order.updateMany(
    {
      $or: [
        { 'shippingAddress.phone': decoded },
        { 'shippingAddress.fullName': decoded },
        { guestEmail: decoded.toLowerCase() },
        { guestPhone: decoded }
      ]
    },
    {
      $set: {
        'shippingAddress.fullName': '[Deleted Customer]',
        guestEmail: null,
        guestPhone: null
      }
    }
  ).catch(() => {});

  return { success: true, message: 'Customer record removed successfully.' };
}

export default {
  listAdminCustomers,
  getAdminCustomerById,
  createAdminCustomer,
  updateAdminCustomer,
  deleteAdminCustomer
};
