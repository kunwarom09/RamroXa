import { Cart, Variant, Product, Inventory } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateOrderMath } from '../utils/money.js';

export async function getOrCreateCart({ user, guestToken }) {
  let cart = null;

  if (user) {
    cart = await Cart.findOne({ user: user._id });
  } else if (guestToken) {
    cart = await Cart.findOne({ guestToken });
  }

  if (!cart) {
    cart = await Cart.create({
      user: user ? user._id : null,
      guestToken: user ? null : guestToken || null,
      items: []
    });
  }

  return cart;
}

export async function getCartDetails({ user, guestToken }) {
  const cart = await getOrCreateCart({ user, guestToken });
  const rawItems = cart.items || [];

  if (!rawItems.length) {
    return {
      id: cart.id || cart._id.toString(),
      items: [],
      totals: calculateOrderMath({ items: [] })
    };
  }

  const variantIds = rawItems.map((i) => i.variantId);
  const variants = await Variant.find({
    $or: [{ id: { $in: variantIds } }, { sku: { $in: variantIds } }]
  }).lean();

  const productIds = variants.map((v) => v.productId);
  const [products, inventories] = await Promise.all([
    Product.find({ id: { $in: productIds } }).lean(),
    Inventory.find({ archived: false }).lean()
  ]);

  const prodsById = products.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const variantsById = variants.reduce((acc, v) => {
    acc[v.id] = v;
    if (v.sku) acc[v.sku] = v;
    return acc;
  }, {});

  const invByVariantId = inventories.reduce((acc, inv) => {
    acc[inv.variantId] = (acc[inv.variantId] || 0) + (inv.available || 0);
    return acc;
  }, {});

  const pricedItems = [];

  for (const item of rawItems) {
    const v = variantsById[item.variantId];
    if (!v) continue;

    const p = prodsById[v.productId];
    if (!p || p.status === 'archived' || p.deletedAt) continue;

    const unitPrice = v.price != null ? v.price : p.basePrice;
    const availableStock = invByVariantId[v.id] || 0;

    const variantLabel = Object.values(v.options || {}).join(' / ') || 'Default';

    pricedItems.push({
      variantId: v.id,
      productId: p.id,
      name: p.name,
      variantLabel,
      sku: v.sku,
      image: p.images?.[0]?.url || null,
      unitPrice,
      qty: item.qty,
      availableStock
    });
  }

  const totals = calculateOrderMath({ items: pricedItems });

  return {
    id: cart.id || cart._id.toString(),
    items: totals.items,
    totals: {
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      shippingTotal: totals.shippingTotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal
    }
  };
}

export async function addItem({ user, guestToken, variantId, qty = 1 }) {
  const quantity = Math.max(1, parseInt(qty, 10) || 1);

  // Validate variant exists
  const variant = await Variant.findOne({
    $or: [{ id: variantId }, { sku: variantId }],
    published: true
  }).lean();

  if (!variant) {
    throw ApiError.notFound('Requested product variant not found.');
  }

  const cart = await getOrCreateCart({ user, guestToken });
  const existingIdx = cart.items.findIndex(
    (i) => i.variantId === variant.id || i.variantId === variant.sku
  );

  if (existingIdx >= 0) {
    cart.items[existingIdx].qty += quantity;
  } else {
    cart.items.push({
      variant: variant._id,
      variantId: variant.id,
      qty: quantity
    });
  }

  await cart.save();
  return getCartDetails({ user, guestToken });
}

export async function updateItem({ user, guestToken, variantId, qty }) {
  const quantity = parseInt(qty, 10);
  const cart = await getOrCreateCart({ user, guestToken });

  if (quantity <= 0) {
    cart.items = cart.items.filter(
      (i) => i.variantId !== variantId && i.variantId !== variantId
    );
  } else {
    const item = cart.items.find(
      (i) => i.variantId === variantId || i.variantId === variantId
    );
    if (item) {
      item.qty = quantity;
    }
  }

  await cart.save();
  return getCartDetails({ user, guestToken });
}

export async function removeItem({ user, guestToken, variantId }) {
  const cart = await getOrCreateCart({ user, guestToken });
  cart.items = cart.items.filter(
    (i) => i.variantId !== variantId && i.variantId !== variantId
  );
  await cart.save();
  return getCartDetails({ user, guestToken });
}

export async function clearCart({ user, guestToken }) {
  const cart = await getOrCreateCart({ user, guestToken });
  cart.items = [];
  await cart.save();
  return { message: 'Cart cleared.' };
}

export async function mergeGuestCartIntoUserCart({ userId, guestToken }) {
  if (!guestToken) return;

  const guestCart = await Cart.findOne({ guestToken });
  if (!guestCart || !guestCart.items.length) return;

  const userCart = await Cart.findOne({ user: userId });

  if (!userCart) {
    guestCart.user = userId;
    guestCart.guestToken = null;
    await guestCart.save();
  } else {
    guestCart.items.forEach((gItem) => {
      const existing = userCart.items.find((uItem) => uItem.variantId === gItem.variantId);
      if (existing) {
        existing.qty += gItem.qty;
      } else {
        userCart.items.push(gItem);
      }
    });
    await userCart.save();
    await Cart.deleteOne({ _id: guestCart._id });
  }
}

export default {
  getOrCreateCart,
  getCartDetails,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeGuestCartIntoUserCart
};
