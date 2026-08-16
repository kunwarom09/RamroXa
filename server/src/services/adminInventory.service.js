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
    acc[v.id] = v;
    return acc;
  }, {});

  const prodsById = products.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const warehouseById = warehouses.reduce((acc, w) => {
    acc[w.id] = w.name;
    return acc;
  }, {});

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

    const variantLabel = Object.values(v.options || {}).join(' / ') || 'Default';

    enriched.push({
      id: inv.id || inv._id.toString(),
      variantId: v.id,
      productId: p.id,
      name: p.name,
      variantLabel,
      sku: v.sku,
      image: p.images?.[0]?.url || null,
      warehouseId: inv.warehouseId,
      warehouseName: warehouseById[inv.warehouseId] || inv.warehouseId,
      available: inv.available,
      reserved: inv.reserved,
      safetyStock: inv.safetyStock,
      total: inv.available + inv.reserved,
      price: v.price != null ? v.price : p.basePrice,
      status: p.status
    });
  }

  return enriched;
}

export async function adjustStock({ variantId, warehouseId = 'w1', change, reason = 'Inventory Adjustment', note = '', user }) {
  const delta = parseInt(change, 10);
  if (isNaN(delta) || delta === 0) {
    throw ApiError.badRequest('A valid non-zero stock change integer is required.');
  }

  let inv = await Inventory.findOne({ variantId, warehouseId });
  if (!inv) {
    inv = await Inventory.create({
      id: `inv_${variantId}_${warehouseId}`,
      variantId,
      warehouseId,
      available: 0,
      reserved: 0
    });
  }

  const before = inv.available;
  const after = before + delta;

  if (after < 0) {
    throw ApiError.badRequest(
      `Cannot decrement stock by ${Math.abs(delta)}. Current available stock is only ${before}.`
    );
  }

  inv.available = after;
  await inv.save();

  const type = delta > 0 ? (reason.toLowerCase().includes('return') ? 'return' : 'purchase') : 'correction';

  const move = await StockMove.create({
    variantId,
    warehouseId,
    type,
    change: delta,
    reason,
    reference: note || 'Admin Adjustment',
    before,
    after,
    user: user ? user.name || user.email : 'Admin'
  });

  return { inventory: inv, move };
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
    type: 'transfer',
    change: -quantity,
    reason: `Transfer to ${toWarehouseId}`,
    reference: `TRF-${fromWarehouseId}-${toWarehouseId}`,
    before: sourceInv.available + quantity,
    after: sourceInv.available,
    user: user ? user.name : 'Admin'
  });

  await StockMove.create({
    variantId,
    warehouseId: toWarehouseId,
    type: 'transfer',
    change: quantity,
    reason: `Transfer from ${fromWarehouseId}`,
    reference: `TRF-${fromWarehouseId}-${toWarehouseId}`,
    before: destInv.available - quantity,
    after: destInv.available,
    user: user ? user.name : 'Admin'
  });

  return { source: sourceInv, destination: destInv };
}

export async function listStockMoves(query = {}) {
  const { variantId, warehouseId, type, page = 1, limit = 50 } = query;
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

export default {
  listAdminInventory,
  adjustStock,
  transferStock,
  listStockMoves
};
