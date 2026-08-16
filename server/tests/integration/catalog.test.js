import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { Category, Product, Variant, Inventory, Warehouse } from '../../src/models/index.js';
import { defaultCategories, defaultWarehouses, defaultProducts } from '../../src/scripts/seedData.js';

describe('Phase 1 - Read-only Catalog & Categories API', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();

    // Seed test database
    await Category.insertMany(defaultCategories);
    await Warehouse.insertMany(defaultWarehouses);
    await Product.insertMany(defaultProducts);

    // Create test variants and inventory
    const variant1 = await Variant.create({
      id: 'v_m1_0',
      productId: 'm1',
      sku: 'ZYL-APP-00001-BLAC-S',
      options: { Colour: 'Black', Size: 'S' },
      price: 180000,
      published: true
    });

    const variant2 = await Variant.create({
      id: 'v_m1_1',
      productId: 'm1',
      sku: 'ZYL-APP-00001-BLAC-M',
      options: { Colour: 'Black', Size: 'M' },
      price: 180000,
      published: true
    });

    await Inventory.create({
      id: 'inv_v_m1_0_w1',
      variantId: 'v_m1_0',
      warehouseId: 'w1',
      available: 42,
      reserved: 2,
      reorderLevel: 5
    });

    await Inventory.create({
      id: 'inv_v_m1_1_w1',
      variantId: 'v_m1_1',
      warehouseId: 'w1',
      available: 18,
      reserved: 0,
      reorderLevel: 5
    });
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  describe('Categories API', () => {
    it('GET /api/categories should return all active categories', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(defaultCategories.length);

      const menCat = res.body.data.find((c) => c.slug === 'men');
      expect(menCat).toBeDefined();
      expect(menCat.name).toBe('Men');
    });

    it('GET /api/categories/:slug should return a single category by slug', async () => {
      const res = await request(app).get('/api/categories/apparel');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.slug).toBe('apparel');
      expect(res.body.data.name).toBe('Apparel');
    });

    it('GET /api/categories/:slug with unknown slug should return 404', async () => {
      const res = await request(app).get('/api/categories/non-existent-category');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Products API', () => {
    it('GET /api/products should return paginated list of published products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBe(defaultProducts.length);
      expect(res.body.page).toBe(1);

      // Verify product enrichment with variants and stock
      const monolith = res.body.data.find((p) => p.slug === 'monolith-tee');
      expect(monolith).toBeDefined();
      expect(monolith.variants.length).toBe(2);
      expect(monolith.totalStock).toBe(60); // 42 + 18
    });

    it('GET /api/products?category=c_tops should filter products by category', async () => {
      const res = await request(app).get('/api/products?category=c_tops');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((p) => {
        expect(p.categoryId).toBe('c_tops');
      });
    });

    it('GET /api/products?q=Monolith should search products by name', async () => {
      const res = await request(app).get('/api/products?q=Monolith');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Monolith Tee');
    });

    it('GET /api/products?sort=price_asc should sort products by price ascending', async () => {
      const res = await request(app).get('/api/products?sort=price_asc');
      expect(res.status).toBe(200);
      const prices = res.body.data.map((p) => p.basePrice);
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
      }
    });

    it('GET /api/products/:slug should return product details with enriched variants and inventory', async () => {
      const res = await request(app).get('/api/products/monolith-tee');
      expect(res.status).toBe(200);
      const prod = res.body.data;
      expect(prod.slug).toBe('monolith-tee');
      expect(prod.name).toBe('Monolith Tee');
      expect(prod.category).toBeDefined();
      expect(prod.category.id).toBe('c_tops');
      expect(prod.variants.length).toBe(2);

      const v1 = prod.variants.find((v) => v.sku === 'ZYL-APP-00001-BLAC-S');
      expect(v1.availableStock).toBe(42);
      expect(v1.reservedStock).toBe(2);
      expect(v1.sellableStock).toBe(40);
    });

    it('GET /api/products/:slug for non-existent product should return 404', async () => {
      const res = await request(app).get('/api/products/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
