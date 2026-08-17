import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Address } from '../models/Address.js';
import { Review } from '../models/Review.js';
import { Wishlist } from '../models/Wishlist.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/regex.js';

export async function listAdminCustomers(query = {}) {
  const { q, page = 1, limit = 50 } = query;
  const filter = { role: 'customer' };

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
  if (!user) {
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

export default {
  listAdminCustomers,
  getAdminCustomerById
};
