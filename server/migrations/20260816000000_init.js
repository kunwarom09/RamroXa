export const up = async (db, client) => {
  const safeCol = async (name) => {
    try { await db.createCollection(name); } catch (e) {}
  };
  const safeIdx = async (coll, spec, opts) => {
    try { await db.collection(coll).createIndex(spec, opts); } catch (e) {}
  };

  await safeCol('users');
  await safeIdx('users', { email: 1 }, { unique: true });

  await safeCol('categories');
  await safeIdx('categories', { slug: 1 }, { unique: true });
  await safeIdx('categories', { parentId: 1 });

  await safeCol('products');
  await safeIdx('products', { slug: 1 }, { unique: true });
  await safeIdx('products', { sku: 1 }, { unique: true });
  await safeIdx('products', { status: 1, categoryId: 1, createdAt: -1 });

  await safeCol('variants');
  await safeIdx('variants', { sku: 1 }, { unique: true });
  await safeIdx('variants', { product: 1 });

  await safeCol('inventories');
  await safeIdx('inventories', { variantId: 1, warehouseId: 1 }, { unique: true });

  await safeCol('stockmoves');
  await safeIdx('stockmoves', { inventory: 1, createdAt: -1 });

  await safeCol('orders');
  await safeIdx('orders', { orderNo: 1 }, { unique: true });
  await safeIdx('orders', { idempotencyKey: 1 }, { unique: true, sparse: true });
  await safeIdx('orders', { paymentStatus: 1, fulfillmentStatus: 1 });

  await safeCol('payments');
  await safeIdx('payments', { order: 1 });
  await safeIdx('payments', { providerRef: 1 }, { unique: true, sparse: true });

  await safeCol('carts');
  await safeIdx('carts', { user: 1 }, { sparse: true });
  await safeIdx('carts', { guestToken: 1 }, { sparse: true });
  await safeIdx('carts', { updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
};

export const down = async (db, client) => {
  // Rollback logic
  const collections = ['users', 'categories', 'products', 'variants', 'inventories', 'stockmoves', 'orders', 'payments', 'carts'];
  for (const coll of collections) {
    try {
      await db.collection(coll).drop();
    } catch (e) {}
  }
};
