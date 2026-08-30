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

  // 2. Server Re-Pricing & Exact Variant/Sub-variant Resolution
  const productLookupKeys = items.map((i) => i.productId || i.id || i.slug).filter(Boolean);
  const variantLookupKeys = items.map((i) => i.variantId || i.sku).filter(Boolean);

  const [products, variants] = await Promise.all([
    Product.find({
      $or: [
        { id: { $in: productLookupKeys } },
        { sku: { $in: productLookupKeys } },
        { slug: { $in: productLookupKeys } }
      ]
    }).lean(),
    Variant.find({
      $or: [
        { id: { $in: variantLookupKeys } },
        { sku: { $in: variantLookupKeys } },
        { productId: { $in: productLookupKeys } }
      ]
    }).lean()
  ]);

  const prodsById = {};
  for (const p of products) {
    if (p.id) prodsById[p.id] = p;
    if (p._id) prodsById[p._id.toString()] = p;
    if (p.sku) prodsById[p.sku] = p;
    if (p.slug) prodsById[p.slug] = p;
  }

  // Group variants by productId
  const variantsByProdId = {};
  for (const v of variants) {
    if (!variantsByProdId[v.productId]) variantsByProdId[v.productId] = [];
    variantsByProdId[v.productId].push(v);
  }

  const orderLineItems = [];

  for (const item of items) {
    // 1. Resolve parent product
    let p = prodsById[item.productId] || prodsById[item.id] || prodsById[item.slug];
    if (!p && item.name) {
      p = products.find((prod) => prod.name && prod.name.toLowerCase() === item.name.toLowerCase());
    }

    if (!p || p.status === 'archived' || p.deletedAt) {
      throw ApiError.badRequest(`Product '${item.name || item.productId}' is not available.`);
    }

    const pVariants = variantsByProdId[p.id] || variantsByProdId[p._id?.toString()] || [];
    const targetSize = (item.size || '').trim().toLowerCase();
    const targetColor = (item.color || item.colour || '').trim().toLowerCase();

    let v = null;

    // Direct ID match if variantId supplied
    if (item.variantId) {
      v = pVariants.find((varDoc) => varDoc.id === item.variantId || varDoc._id?.toString() === item.variantId);
    }

    // Match by Size (top variant) + Colour (sub-variant)
    if (!v && pVariants.length > 0) {
      const topVars = pVariants.filter((varDoc) => !varDoc.parentVariantId);
      const subVars = pVariants.filter((varDoc) => !!varDoc.parentVariantId);

      if (targetSize && targetColor) {
        // Find matching top variant (size)
        const matchedTop = topVars.find((tv) => {
          const optSize = (tv.options?.get ? tv.options.get('Size') : (tv.options?.Size || tv.options?.size || ''))?.toLowerCase();
          const nameMatch = (tv.name || '').toLowerCase();
          return (optSize && (optSize === targetSize || optSize.includes(targetSize))) ||
                 (nameMatch && (nameMatch === targetSize || nameMatch.includes(targetSize)));
        });

        if (matchedTop) {
          // Find matching sub-variant under this top variant
          const matchedSub = subVars.find((sv) => {
            if (sv.parentVariantId !== matchedTop.id) return false;
            const optCol = (sv.options?.get ? (sv.options.get('Colour') || sv.options.get('Color')) : (sv.options?.Colour || sv.options?.Color || sv.options?.color || ''))?.toLowerCase();
            const nameMatch = (sv.name || '').toLowerCase();
            return (optCol && (optCol === targetColor || optCol.includes(targetColor))) ||
                   (nameMatch && (nameMatch === targetColor || nameMatch.includes(targetColor)));
          });
          v = matchedSub || matchedTop;
        } else {
          // Check all subvariants or variants directly
          v = subVars.find((sv) => {
            const optCol = (sv.options?.get ? (sv.options.get('Colour') || sv.options.get('Color')) : (sv.options?.Colour || sv.options?.Color || sv.options?.color || ''))?.toLowerCase();
            const nameMatch = (sv.name || '').toLowerCase();
            return (optCol && (optCol === targetColor || optCol.includes(targetColor))) ||
                   (nameMatch && (nameMatch === targetColor || nameMatch.includes(targetColor)));
          }) || pVariants[0];
        }
      } else if (targetSize) {
        v = topVars.find((tv) => {
          const optSize = (tv.options?.get ? tv.options.get('Size') : (tv.options?.Size || tv.options?.size || ''))?.toLowerCase();
          const nameMatch = (tv.name || '').toLowerCase();
          return (optSize && (optSize === targetSize || optSize.includes(targetSize))) ||
                 (nameMatch && (nameMatch === targetSize || nameMatch.includes(targetSize)));
        }) || pVariants[0];
      } else if (targetColor) {
        v = subVars.find((sv) => {
          const optCol = (sv.options?.get ? (sv.options.get('Colour') || sv.options.get('Color')) : (sv.options?.Colour || sv.options?.Color || sv.options?.color || ''))?.toLowerCase();
          const nameMatch = (sv.name || '').toLowerCase();
          return (optCol && (optCol === targetColor || optCol.includes(targetColor))) ||
                 (nameMatch && (nameMatch === targetColor || nameMatch.includes(targetColor)));
        }) || pVariants[0];
      } else {
        v = pVariants[0];
      }
    }

    // Default variant if no variant document exists
    if (!v) {
      v = {
        id: `v_${p.id}_0`,
        productId: p.id,
        sku: p.sku || `SKU-${p.id}`,
        price: p.price || p.basePrice || 150000,
        options: {
          Size: item.size || 'M',
          ...(item.color || item.colour ? { Colour: item.color || item.colour } : {})
        }
      };
    }

    // Server-enforced pricing: derive price from variant or product
    const unitPrice = v && v.price != null ? v.price : (p.basePrice != null ? p.basePrice : p.price || 0);

    let variantLabel = '';
    if (v && v.options) {
      const optsObj = v.options instanceof Map ? Object.fromEntries(v.options) : v.options;
      const optParts = Object.values(optsObj).filter(Boolean);
      if (optParts.length > 0) {
        variantLabel = optParts.join(' / ');
      }
    }
    if (!variantLabel && v && v.name && v.name !== 'Default') {
      variantLabel = v.name.replace(/^Variant:\s*/i, '');
    }
    if (!variantLabel) {
      const parts = [];
      if (item.size) parts.push(`Size: ${item.size}`);
      if (item.color || item.colour) parts.push(`Colour: ${item.color || item.colour}`);
      variantLabel = parts.join(' / ') || 'Default';
    }

    orderLineItems.push({
      product: p._id,
      variant: v ? (v._id || undefined) : undefined,
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

  // Check authorization (prevent IDOR)
  if (user) {
    if (user.role !== 'admin' && user.role !== 'staff') {
      if (order.user && order.user.toString() !== user._id.toString()) {
        throw ApiError.forbidden('Access denied to this order.');
      }
    }
  } else {
    // Unauthenticated guest scope: Must provide matching guest token
    if (!guestToken || order.guestToken !== guestToken) {
      throw ApiError.forbidden('Valid order verification token required to view this order.');
    }
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
      if (!item.variantId) continue;
      const inv = await Inventory.findOneAndUpdate(
        { variantId: item.variantId },
        {
          $inc: {
            available: item.qty,
            reserved: -item.qty
          }
        },
        { new: true }
      );
      await StockMove.create({
        variantId: item.variantId,
        warehouseId: inv?.warehouseId || 'w1',
        type: 'correction',
        change: item.qty,
        reason: `Order ${order.orderNo} cancelled - stock release`,
        reference: order.orderNo,
        before: inv ? (inv.available - item.qty) : 0,
        after: inv ? inv.available : item.qty,
        user: user ? (user.name || user.email) : 'System'
      });
    }
  }

  // If order was returned, restore available stock
  if (newStatus === 'returned') {
    for (const item of order.items) {
      if (!item.variantId) continue;
      const inv = await Inventory.findOneAndUpdate(
        { variantId: item.variantId },
        {
          $inc: {
            available: item.qty
          }
        },
        { new: true }
      );
      await StockMove.create({
        variantId: item.variantId,
        warehouseId: inv?.warehouseId || 'w1',
        type: 'return',
        change: item.qty,
        reason: `Order ${order.orderNo} returned - restock`,
        reference: order.orderNo,
        before: inv ? (inv.available - item.qty) : 0,
        after: inv ? inv.available : item.qty,
        user: user ? (user.name || user.email) : 'System'
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
