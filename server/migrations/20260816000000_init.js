export const up = async (db, client) => {
  // Create foundational collections and indexes
  await db.createCollection('users');
  await db.collection('users').createIndex({ email: 1 }, { unique: true });

  await db.createCollection('categories');
  await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
  await db.collection('categories').createIndex({ parentId: 1 });

  await db.createCollection('products');
  await db.collection('products').createIndex({ slug: 1 }, { unique: true });
  await db.collection('products').createIndex({ sku: 1 }, { unique: true });
  await db.collection('products').createIndex({ status: 1, categoryId: 1, createdAt: -1 });

  await db.createCollection('variants');
  await db.collection('variants').createIndex({ sku: 1 }, { unique: true });
  await db.collection('variants').createIndex({ product: 1 });

  await db.createCollection('inventories');
  await db.collection('inventories').createIndex({ variant: 1, warehouse: 1 }, { unique: true });

  await db.createCollection('stockmoves');
  await db.collection('stockmoves').createIndex({ inventory: 1, createdAt: -1 });

  await db.createCollection('orders');
  await db.collection('orders').createIndex({ orderNo: 1 }, { unique: true });
  await db.collection('orders').createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
  await db.collection('orders').createIndex({ paymentStatus: 1, fulfillmentStatus: 1 });

  await db.createCollection('payments');
  await db.collection('payments').createIndex({ order: 1 });
  await db.collection('payments').createIndex({ providerRef: 1 }, { unique: true, sparse: true });

  await db.createCollection('carts');
  await db.collection('carts').createIndex({ user: 1 }, { sparse: true });
  await db.createCollection('carts').createIndex({ guestToken: 1 }, { sparse: true });
  await db.collection('carts').createIndex({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
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
