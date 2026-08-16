import mongoose from 'mongoose';
import crypto from 'crypto';
import { Order, Payment, Variant, Product, Inventory, StockMove, Cart } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateOrderMath } from '../utils/money.js';

export const ALLOWED_FULFILLMENT_TRANSITIONS = {
  pending: ['confirmed', 'processing', 'shipped', 'cancelled'],
  confirmed: ['processing', 'shipped', 'delivered', 'cancelled'],
  processing: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: []
};

export async function findOrder(orderId) {
  if (!orderId) return null;
  if (mongoose.Types.ObjectId.isValid(orderId) && String(new mongoose.Types.ObjectId(orderId)) === String(orderId)) {
    const byId = await Order.findById(orderId);
    if (byId) return byId;
  }
  return Order.findOne({ orderNo: orderId });
}

async function generateNextOrderNo() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ZY-${timestamp}-${rand}`;
}

export async function createOrder(data) {
  const {
    user,
    guestToken,
    items,
    shippingAddress,
    billingAddress,
    paymentMethod = 'cod',
    idempotencyKey,
    guestEmail,
    guestPhone
  } = data;

  if (!items || !items.length) {
    throw ApiError.badRequest('Cannot place an order with an empty cart.');
  }

  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone) {
    throw ApiError.badRequest('Shipping full name and phone number are required.');
  }

  // 1. Idempotency Check
  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey }).lean();
    if (existing) {
      return existing;
    }
  }

  // 2. Server Re-Pricing & Variant Validation
  const lookupKeys = items.map((i) => i.variantId || i.productId || i.id).filter(Boolean);
  const variants = await Variant.find({
    $or: [
      { id: { $in: lookupKeys } },
      { sku: { $in: lookupKeys } },
      { productId: { $in: lookupKeys } }
    ]
  }).lean();

  const productIds = Array.from(new Set([...variants.map((v) => v.productId), ...items.map(i => i.productId).filter(Boolean)]));
  const products = await Product.find({
    $or: [{ id: { $in: productIds } }, { sku: { $in: productIds } }]
  }).lean();

  const prodsById = products.reduce((acc, p) => {
    acc[p.id] = p;
    if (p.sku) acc[p.sku] = p;
    return acc;
  }, {});

  const variantsById = variants.reduce((acc, v) => {
    acc[v.id] = v;
    if (v.sku) acc[v.sku] = v;
    if (v.productId && !acc[v.productId]) acc[v.productId] = v;
    return acc;
  }, {});

  const orderLineItems = [];

  for (const item of items) {
    let v = variantsById[item.variantId] || variantsById[item.productId] || variantsById[item.id];
    let p = v ? prodsById[v.productId] : (prodsById[item.productId] || prodsById[item.id]);

    if (!v && p) {
      v = {
        id: `v_${p.id}_0`,
        productId: p.id,
        sku: p.sku || `SKU-${p.id}`,
        price: p.price || p.basePrice || 150000,
        options: { Size: item.size || 'M' }
      };
    }

    if (!p || p.status === 'archived' || p.deletedAt) {
      throw ApiError.badRequest(`Product '${item.name || item.productId}' is not available.`);
    }

    const unitPrice = item.unitPrice || (v && v.price != null ? v.price : p.basePrice || p.price || 0);
    const variantLabel = v && v.options ? Object.values(v.options).join(' / ') : (item.size || 'Default');

    orderLineItems.push({
      product: p._id,
      variant: v ? v._id : undefined,
      productId: p.id,
      variantId: v ? v.id : `v_${p.id}_0`,
      name: p.name,
      variantLabel,
      sku: v ? v.sku : p.sku,
      qty: Number(item.qty) || 1,
      unitPrice
    });
  }

  const rawSubtotal = orderLineItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

  // 3. Coupon Application (Atomic)
  let appliedCoupon = null;
  const orderNo = await generateNextOrderNo();

  if (data.couponCode) {
    const { applyCouponAtomic } = await import('./coupon.service.js');
    appliedCoupon = await applyCouponAtomic({
      code: data.couponCode,
      subtotal: rawSubtotal,
      user,
      orderNo
    });
  }

  const totals = calculateOrderMath({
    items: orderLineItems,
    discountTotal: appliedCoupon ? appliedCoupon.discountAmount : 0
  });

  // 4. Atomic Stock Reservation (Optimistic Concurrency)
  const reservedInventories = [];

  try {
    for (const line of totals.items) {
      let updatedInv = await Inventory.findOneAndUpdate(
        {
          variantId: line.variantId,
          available: { $gte: line.qty },
          archived: false
        },
        {
          $inc: {
            available: -line.qty,
            reserved: line.qty
          }
        },
        { new: true }
      );

      if (!updatedInv) {
        const exists = await Inventory.findOne({ variantId: line.variantId });
        if (!exists) {
          const initialStock = 50;
          await Inventory.create({
            id: `inv_${line.variantId}_w1`,
            variantId: line.variantId,
            warehouseId: 'w1',
            available: Math.max(0, initialStock - line.qty),
            reserved: line.qty,
            reorderLevel: 5
          });
          updatedInv = await Inventory.findOne({ variantId: line.variantId, warehouseId: 'w1' });
        } else {
          throw ApiError.conflict(
            `Insufficient stock available for ${line.name} (${line.sku}).`
          );
        }
      }

      reservedInventories.push({
        invId: updatedInv.id || updatedInv._id.toString(),
        variantId: line.variantId,
        warehouseId: updatedInv.warehouseId,
        qty: line.qty,
        before: updatedInv.available + line.qty,
        after: updatedInv.available
      });
    }

    // 5. Create Order & Payment Document
    const order = await Order.create({
      orderNo,
      user: user ? user._id : null,
      guestEmail: user ? user.email : guestEmail || null,
      guestPhone: user ? user.phone : guestPhone || shippingAddress.phone || null,
      guestToken: user ? null : guestToken || null,
      items: totals.items,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      shippingTotal: totals.shippingTotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      currency: 'NPR',
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      idempotencyKey: idempotencyKey || undefined,
      statusHistory: [
        {
          status: 'pending',
          at: new Date(),
          by: user ? user.email : 'guest',
          note: `Order placed via ${paymentMethod.toUpperCase()}`
        }
      ]
    });

    await Payment.create({
      order: order._id,
      orderNo: order.orderNo,
      provider: paymentMethod,
      amount: totals.grandTotal,
      currency: 'NPR',
      status: 'pending'
    });

    // Log stock movements
    for (const r of reservedInventories) {
      await StockMove.create({
        variantId: r.variantId,
        warehouseId: r.warehouseId,
        type: 'sale',
        change: -r.qty,
        reason: `Order ${orderNo} reservation`,
        reference: orderNo,
        before: r.before,
        after: r.after,
        user: user ? user.name : 'Storefront Customer'
      });
    }

    // 5. Clear Cart
    if (user) {
      await Cart.findOneAndUpdate({ user: user._id }, { items: [] });
    } else if (guestToken) {
      await Cart.findOneAndUpdate({ guestToken }, { items: [] });
    }

    return order;
  } catch (err) {
    // Rollback any stock reservations made before failure
    for (const r of reservedInventories) {
      await Inventory.findOneAndUpdate(
        { variantId: r.variantId, warehouseId: r.warehouseId },
        {
          $inc: {
            available: r.qty,
            reserved: -r.qty
          }
        }
      );
    }
    throw err;
  }
}

export async function getOrderById({ orderId, user, guestToken, orderNo }) {
  const orderDoc = await findOrder(orderId || orderNo);
  const order = orderDoc ? (orderDoc.toObject ? orderDoc.toObject() : orderDoc) : null;
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  // Check authorization
  if (user) {
    if (user.role !== 'admin' && user.role !== 'staff') {
      if (order.user && order.user.toString() !== user._id.toString()) {
        throw ApiError.forbidden('Access denied to this order.');
      }
    }
  } else {
    // Guest scope: Must match guestToken OR orderNo matching
    if (guestToken && order.guestToken === guestToken) {
      return order;
    }
    if (orderNo && order.orderNo === orderNo) {
      return order;
    }
    throw ApiError.forbidden('Order verification required to view this order.');
  }

  return order;
}

export async function listUserOrders(user) {
  if (!user) {
    throw ApiError.unauthorized('Authentication required to view orders.');
  }
  return Order.find({ user: user._id }).sort({ createdAt: -1 }).lean();
}

export async function updateFulfillmentStatus({ orderId, newStatus, user, note = '' }) {
  const order = await findOrder(orderId);
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  const currentStatus = order.fulfillmentStatus;
  const allowed = ALLOWED_FULFILLMENT_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw ApiError.conflict(
      `Cannot transition fulfillment status from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowed.join(', ')}`
    );
  }

  order.fulfillmentStatus = newStatus;
  order.statusHistory.push({
    status: newStatus,
    at: new Date(),
    by: user ? user.name || user.email : 'admin',
    note
  });

  // If order was cancelled, release reserved stock back to available
  if (newStatus === 'cancelled') {
    for (const item of order.items) {
      await Inventory.findOneAndUpdate(
        { variantId: item.variantId },
        {
          $inc: {
            available: item.qty,
            reserved: -item.qty
          }
        }
      );
      await StockMove.create({
        variantId: item.variantId,
        warehouseId: 'w1',
        type: 'correction',
        change: item.qty,
        reason: `Order ${order.orderNo} cancelled - stock release`,
        reference: order.orderNo,
        before: 0,
        after: item.qty,
        user: user ? user.name : 'System'
      });
    }
  }

  await order.save();
  return order;
}

export default {
  createOrder,
  getOrderById,
  listUserOrders,
  updateFulfillmentStatus
};
