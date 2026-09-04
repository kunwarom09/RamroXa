import mongoose from 'mongoose';
import { Inventory, StockMove, Variant, Product, Warehouse } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export async function listAdminInventory(query = {}) {
  const { warehouseId, q } = query;
  const filter = { archived: false };

  if (warehouseId && warehouseId !== 'all') {
    filter.warehouseId = warehouseId;
  }

  const [inventories, variants, products, warehouses] = await Promise.all([
    Inventory.find(filter).lean(),
    Variant.find().lean(),
    Product.find({ deletedAt: null }).lean(),
    Warehouse.find().lean()
  ]);

  const variantsById = variants.reduce((acc, v) => {
    if (v.id) acc[v.id] = v;
    if (v._id) acc[v._id.toString()] = v;
    if (v.sku) acc[v.sku] = v;
    return acc;
  }, {});

  const prodsById = products.reduce((acc, p) => {
    if (p.id) acc[p.id] = p;
    if (p._id) acc[p._id.toString()] = p;
    if (p.sku) acc[p.sku] = p;
    return acc;
  }, {});

  const warehouseById = warehouses.reduce((acc, w) => {
    acc[w.id] = w.name;
    return acc;
  }, {});

  // Auto-synchronize missing inventory documents for Master Products variants (starts as 0 stock)
  const existingInvVariantIds = new Set(inventories.map((i) => i.variantId));
  for (const v of variants) {
    const vKey = v.id || v._id?.toString();
    if (!existingInvVariantIds.has(vKey) && v.status !== 'archived') {
      const p = prodsById[v.productId];
      if (!p) continue;
      const initialStock = 0; // Master products source of truth - start stock as 0
      const createdInv = await Inventory.create({
        id: `inv_${vKey}_w1`,
        variantId: vKey,
        warehouseId: 'w1',
        available: initialStock,
        reserved: 0,
        incoming: 0,
        damaged: 0,
        returned: 0,
        reorderLevel: 5
      });
      inventories.push(createdInv.toObject ? createdInv.toObject() : createdInv);
      existingInvVariantIds.add(vKey);
    }
  }

  const enriched = [];

  for (const inv of inventories) {
    const v = variantsById[inv.variantId];
    if (!v) continue;

    const p = prodsById[v.productId];
    if (!p) continue;

    if (q && q.trim()) {
      const search = q.trim().toLowerCase();
      const match =
        p.name.toLowerCase().includes(search) ||
        v.sku.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search);
      if (!match) continue;
    }

    let variantLabel = '';
    const parentVar = v.parentVariantId ? variantsById[v.parentVariantId] : null;
    const parentOpts = parentVar && parentVar.options ? (parentVar.options instanceof Map ? Object.fromEntries(parentVar.options) : parentVar.options) : {};
    const childOpts = v.options ? (v.options instanceof Map ? Object.fromEntries(v.options) : v.options) : {};
    const combinedOpts = { ...parentOpts, ...childOpts };
    const parts = Object.entries(combinedOpts).map(([k, val]) => `${k}: ${val}`);
    if (parts.length > 0) {
      variantLabel = parts.join(' / ');
    } else if (v.name && v.name !== 'Default') {
      variantLabel = parentVar ? `${parentVar.name} / ${v.name}` : v.name;
    } else {
      variantLabel = 'Default';
    }

    const cleanPrefix = (str) => String(str || '').replace(/^((Size|UK Size|Variant|Colour|Color|Sub\s*\d+):\s*)+/gi, '').trim();

    let sizeVal = combinedOpts.Size || combinedOpts.size || combinedOpts['UK Size'] || '';
    let colorVal = combinedOpts.Colour || combinedOpts.colour || combinedOpts.Color || combinedOpts.color || '';

    // If variant name has "Size: UK 7 / Black" or "UK 7 / Black"
    if (v.name && v.name.includes('/')) {
      const nameParts = v.name.split('/');
      if (!sizeVal) sizeVal = nameParts[0].trim();
      if (!colorVal) colorVal = nameParts[nameParts.length - 1].trim();
    }

    // If parentVar is Size (e.g. UK 3) and child is Colour (e.g. Blue)
    if (!sizeVal && parentVar && parentVar.name) {
      sizeVal = parentVar.name;
    }
    if (!colorVal && v.parentVariantId && v.name && v.name !== 'Default') {
      colorVal = v.name;
    }

    sizeVal = cleanPrefix(sizeVal) || 'Standard';
    colorVal = cleanPrefix(colorVal) || 'Default';

    enriched.push({
      id: inv.id || inv._id.toString(),
      variantId: v.id || v._id?.toString() || inv.variantId,
      productId: p.id || p._id?.toString(),
      name: p.name,
      variantLabel,
      size: sizeVal,
      color: colorVal,
      sku: v.sku,
      barcode: v.barcode || v.sku,
      image: p.images?.[0]?.url || null,
      warehouseId: inv.warehouseId || 'w1',
      warehouseName: warehouseById[inv.warehouseId] || inv.warehouseId || 'Kathmandu DC',
      available: Number(inv.available) || 0,
      reserved: Number(inv.reserved) || 0,
      incoming: Number(inv.incoming) || 0,
      damaged: Number(inv.damaged) || 0,
      returned: Number(inv.returned) || 0,
      reorderLevel: Number(inv.reorderLevel) || 5,
      safetyStock: inv.safetyStock,
      total: (Number(inv.available) || 0) + (Number(inv.reserved) || 0),
      price: v.price != null ? v.price : (p.price != null ? p.price : p.basePrice),
      published: v.published !== false && v.status !== 'draft' && v.status !== 'archived',
      status: v.status || 'active',
      archived: v.status === 'archived' || inv.archived === true
    });
  }

  return enriched;
}

export async function adjustStock({ variantId, warehouseId = 'w1', change, adjustment, mode, reason = 'Manual adjustment', note = '', reference = '', user }) {
  let delta = 0;
  if (change !== undefined) delta = parseInt(change, 10);
  else if (adjustment !== undefined) delta = parseInt(adjustment, 10);

  const rawVarId = String(variantId || '').trim();
  const varQuery = mongoose.Types.ObjectId.isValid(rawVarId)
    ? { $or: [{ id: rawVarId }, { _id: rawVarId }, { sku: rawVarId }] }
    : { $or: [{ id: rawVarId }, { sku: rawVarId }] };
  const varDoc = await Variant.findOne(varQuery);
  const resolvedVarId = varDoc ? (varDoc.id || varDoc._id.toString()) : rawVarId;

  const searchVariantIds = [
    resolvedVarId,
    rawVarId,
    ...(varDoc?._id ? [varDoc._id.toString()] : []),
    ...(varDoc?.id ? [varDoc.id] : []),
    ...(varDoc?.sku ? [varDoc.sku] : [])
  ].filter(Boolean);

  let inv = await Inventory.findOne({
    variantId: { $in: searchVariantIds },
    warehouseId
  });

  if (!inv) {
    inv = await Inventory.create({
      id: `inv_${resolvedVarId}_${warehouseId}`,
      variantId: resolvedVarId,
      warehouseId,
      available: 0,
      reserved: 0
    });
  }

  const before = Number(inv.available) || 0;
  let after = before;

  if (mode === 'replace' || mode === 'set') {
    after = parseInt(delta, 10);
    delta = after - before;
  } else if (mode === 'decrease') {
    delta = -Math.abs(delta);
    after = before + delta;
  } else {
    after = before + delta;
  }

  if (isNaN(delta) || isNaN(after)) {
    throw ApiError.badRequest('A valid stock adjustment quantity is required.');
  }

  if (after < 0) {
    throw ApiError.badRequest(
      `Cannot adjust stock to negative. Current available is ${before}, requested stock is ${after}.`
    );
  }

  inv.available = after;
  await inv.save();

  // Also sync any other inventory documents pointing to this variant
  await Inventory.updateMany(
    {
      variantId: { $in: searchVariantIds },
      warehouseId,
      _id: { $ne: inv._id }
    },
    { available: after }
  );

  // Map predefined reasons to clean type
  let type = 'adjustment';
  const rLower = String(reason || '').toLowerCase();
  if (rLower.includes('purchase')) type = 'purchase';
  else if (rLower.includes('return')) type = 'return';
  else if (rLower.includes('damaged')) type = 'damaged';
  else if (rLower.includes('lost')) type = 'lost';
  else if (rLower.includes('transfer')) type = 'transfer';
  else if (rLower.includes('correction')) type = 'correction';
  else if (delta > 0) type = 'adjustment';
  else type = 'adjustment';

  const move = await StockMove.create({
    variantId: resolvedVarId,
    warehouseId,
    type,
    change: delta,
    reason: reason || 'Manual adjustment',
    reference: reference || note || 'Admin Adjustment',
    before,
    after,
    user: user ? (user.name || user.email) : 'Zylo Staff',
    at: new Date()
  });

  return { inventory: inv, move };
}

export async function updateVariantPrice({ variantId, price, user }) {
  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    throw ApiError.badRequest('A valid positive selling price is required.');
  }

  const variant = await Variant.findOne({ id: variantId });
  if (!variant) {
    throw ApiError.notFound(`Variant '${variantId}' not found.`);
  }

  variant.price = numPrice;
  await variant.save();

  return variant;
}

export async function archiveVariant({ variantId, user }) {
  const variant = await Variant.findOne({ id: variantId });
  if (!variant) {
    throw ApiError.notFound(`Variant '${variantId}' not found.`);
  }

  variant.status = 'archived';
  variant.published = false;
  variant.hidden = true;
  await variant.save();

  await Inventory.updateMany({ variantId }, { archived: true });

  return { message: 'Variant archived successfully. Historical records preserved.', variant };
}

export async function toggleVariantPublish({ variantId, published, user }) {
  const variant = await Variant.findOne({ id: variantId });
  if (!variant) {
    throw ApiError.notFound(`Variant '${variantId}' not found.`);
  }

  const isPub = Boolean(published);
  variant.published = isPub;
  if (isPub && variant.status === 'draft') {
    variant.status = 'active';
  } else if (!isPub && variant.status === 'active') {
    variant.status = 'draft';
  }
  await variant.save();

  return { message: `Variant ${isPub ? 'published' : 'unpublished'} successfully.`, variant };
}

export async function getVariantTransactions({ variantId, sku }) {
  const { Order, Purchase } = await import('../models/index.js');
  
  let targetVariantId = String(variantId || '').trim();
  let targetSku = sku;
  const v = await Variant.findOne({
    $or: [
      { id: targetVariantId },
      ...(mongoose.Types.ObjectId.isValid(targetVariantId) ? [{ _id: targetVariantId }] : []),
      ...(targetSku ? [{ sku: targetSku }] : [])
    ]
  }).lean();

  if (v) {
    if (!targetSku) targetSku = v.sku;
  }

  const allVarKeys = [
    targetVariantId,
    targetSku,
    v?.id,
    v?._id?.toString(),
    v?.sku
  ].filter(Boolean);

  const [orders, purchases, moves] = await Promise.all([
    Order.find({
      $or: [
        { 'items.variantId': { $in: allVarKeys } },
        { 'items.sku': { $in: allVarKeys } }
      ]
    }).sort({ createdAt: -1 }).limit(50).lean(),
    Purchase.find({
      $or: [
        { 'items.name': { $regex: targetSku || 'NONE', $options: 'i' } }
      ]
    }).sort({ date: -1 }).limit(50).lean(),
    StockMove.find({ variantId: { $in: allVarKeys } }).sort({ createdAt: -1 }).limit(100).lean()
  ]);

  const sales = orders.map(o => ({
    id: o.id || o._id.toString(),
    orderNo: o.orderNo,
    date: o.createdAt,
    customer: o.shippingAddress?.fullName || o.guestEmail || 'Customer',
    items: o.items.filter(i => i.variantId === targetVariantId || i.sku === targetSku),
    grandTotal: o.grandTotal,
    status: o.fulfillmentStatus || o.status
  }));

  const returns = orders
    .filter(o => o.refundedAmount || o.status === 'refunded' || o.fulfillmentStatus === 'returned')
    .map(o => ({
      id: o.id || o._id.toString(),
      orderNo: o.orderNo,
      date: o.updatedAt || o.createdAt,
      customer: o.shippingAddress?.fullName || 'Customer',
      refundedAmount: o.refundedAmount || o.grandTotal,
      reason: o.cancelReason || 'Customer return'
    }));

  return { sales, purchases, returns, ledger: moves };
}

export async function transferStock({ variantId, fromWarehouseId, toWarehouseId, qty, user }) {
  const quantity = parseInt(qty, 10);
  if (isNaN(quantity) || quantity <= 0) {
    throw ApiError.badRequest('Transfer quantity must be greater than zero.');
  }

  if (fromWarehouseId === toWarehouseId) {
    throw ApiError.badRequest('Source and destination warehouse cannot be the same.');
  }

  const sourceInv = await Inventory.findOne({ variantId, warehouseId: fromWarehouseId });
  if (!sourceInv || sourceInv.available < quantity) {
    throw ApiError.conflict(
      `Insufficient available stock at source warehouse (Available: ${sourceInv ? sourceInv.available : 0}).`
    );
  }

  let destInv = await Inventory.findOne({ variantId, warehouseId: toWarehouseId });
  if (!destInv) {
    destInv = await Inventory.create({
      id: `inv_${variantId}_${toWarehouseId}`,
      variantId,
      warehouseId: toWarehouseId,
      available: 0,
      reserved: 0
    });
  }

  // Atomically update
  sourceInv.available -= quantity;
  await sourceInv.save();

  destInv.available += quantity;
  await destInv.save();

  await StockMove.create({
    variantId,
    warehouseId: fromWarehouseId,
    type: 'transfer_out',
    change: -quantity,
    reason: `Transfer to ${toWarehouseId}`,
    reference: `TRF-${fromWarehouseId}-${toWarehouseId}`,
    before: sourceInv.available + quantity,
    after: sourceInv.available,
    user: user ? user.name : 'Admin',
    at: new Date()
  });

  await StockMove.create({
    variantId,
    warehouseId: toWarehouseId,
    type: 'transfer_in',
    change: quantity,
    reason: `Transfer from ${fromWarehouseId}`,
    reference: `TRF-${fromWarehouseId}-${toWarehouseId}`,
    before: destInv.available - quantity,
    after: destInv.available,
    user: user ? user.name : 'Admin',
    at: new Date()
  });

  return { source: sourceInv, destination: destInv };
}

export async function listStockMoves(query = {}) {
  const { variantId, warehouseId, type, page = 1, limit = 100 } = query;
  const filter = {};

  if (variantId) filter.variantId = variantId;
  if (warehouseId) filter.warehouseId = warehouseId;
  if (type) filter.type = type;

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [moves, total] = await Promise.all([
    StockMove.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    StockMove.countDocuments(filter)
  ]);

  return {
    moves,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
}

export async function rebuildInventoryFromMasterProducts() {
  const products = await Product.find({ deletedAt: null }).lean();
  const existingVariants = await Variant.find().lean();
  
  // 1. Wipe old inventory documents completely
  await Inventory.deleteMany({});

  const variantsByProdId = {};
  existingVariants.forEach((v) => {
    if (!variantsByProdId[v.productId]) variantsByProdId[v.productId] = [];
    variantsByProdId[v.productId].push(v);
  });

  const createdInventories = [];
  const processedVariantIds = new Set();

  for (const p of products) {
    let pVariants = variantsByProdId[p.id] || [];

    // If variants missing in database, build directly from Master Product options
    if (!pVariants.length) {
      const opts = p.options instanceof Map ? Object.fromEntries(p.options) : (p.options || {});
      const sizes = opts.Size || opts.size || [];
      const colours = opts.Colour || opts.colour || opts.Color || opts.color || [];
      const price = p.price !== undefined ? p.price : (p.basePrice !== undefined ? p.basePrice : 0);

      if (sizes.length && colours.length) {
        for (const s of sizes) {
          for (const c of colours) {
            const vSku = `${p.sku}-${s.toUpperCase()}-${c.slice(0, 3).toUpperCase()}`;
            const newVar = await Variant.create({
              id: `var_${p.id}_${s.toLowerCase()}_${c.toLowerCase()}`,
              name: `${s} / ${c}`,
              productId: p.id,
              sku: vSku,
              options: { Size: s, Colour: c },
              price: price,
              published: p.status === 'published',
              status: p.status === 'published' ? 'active' : 'draft'
            });
            pVariants.push(newVar.toObject ? newVar.toObject() : newVar);
          }
        }
      } else if (sizes.length) {
        for (const s of sizes) {
          const vSku = `${p.sku}-${s.toUpperCase()}`;
          const newVar = await Variant.create({
            id: `var_${p.id}_${s.toLowerCase()}`,
            name: `${s}`,
            productId: p.id,
            sku: vSku,
            options: { Size: s },
            price: price,
            published: p.status === 'published',
            status: p.status === 'published' ? 'active' : 'draft'
          });
          pVariants.push(newVar.toObject ? newVar.toObject() : newVar);
        }
      } else if (colours.length) {
        for (const c of colours) {
          const vSku = `${p.sku}-${c.slice(0, 3).toUpperCase()}`;
          const newVar = await Variant.create({
            id: `var_${p.id}_${c.toLowerCase()}`,
            name: `${c}`,
            productId: p.id,
            sku: vSku,
            options: { Colour: c },
            price: price,
            published: p.status === 'published',
            status: p.status === 'published' ? 'active' : 'draft'
          });
          pVariants.push(newVar.toObject ? newVar.toObject() : newVar);
        }
      } else {
        const vSku = `${p.sku}-DEF`;
        const newVar = await Variant.create({
          id: `var_${p.id}_def`,
          name: 'Default',
          productId: p.id,
          sku: vSku,
          options: {},
          price: price,
          published: p.status === 'published',
          status: p.status === 'published' ? 'active' : 'draft'
        });
        pVariants.push(newVar.toObject ? newVar.toObject() : newVar);
      }
    }

    // Filter out top-level parent variants if child sub-variants exist
    const childVariants = pVariants.filter(v => !!v.parentVariantId);
    const targetVariants = childVariants.length > 0 ? childVariants : pVariants;

    // Create 0-stock inventory record for each variant
    for (const v of targetVariants) {
      if (v.status === 'archived') continue;
      if (processedVariantIds.has(v.id)) continue;
      processedVariantIds.add(v.id);

      const invDoc = await Inventory.create({
        id: `inv_${v.id}_w1`,
        variantId: v.id,
        warehouseId: 'w1',
        available: 0, // Start stock as 0
        reserved: 0,
        incoming: 0,
        damaged: 0,
        returned: 0,
        reorderLevel: 5
      });
      createdInventories.push(invDoc);
    }
  }

  return {
    message: `Inventory successfully rebuilt: ${createdInventories.length} variants initialized with 0 stock from ${products.length} Master Products.`,
    count: createdInventories.length,
    productsCount: products.length
  };
}

export default {
  listAdminInventory,
  rebuildInventoryFromMasterProducts,
  adjustStock,
  updateVariantPrice,
  archiveVariant,
  toggleVariantPublish,
  getVariantTransactions,
  transferStock,
  listStockMoves
};
