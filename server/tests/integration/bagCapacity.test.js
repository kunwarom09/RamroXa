import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { Category, Product, Variant, Warehouse } from '../../src/models/index.js';
import { createAdminUser } from '../../src/scripts/createAdmin.js';
import { defaultWarehouses } from '../../src/scripts/seedData.js';
import {
  BAG_CAPACITY_CONFIG,
  BAG_SIZE_KEYS,
  getBagCapacityRange,
  getBagCapacityOptions,
  isValidBagCapacity,
  formatBagCapacity
} from '../../src/config/bagCapacityConfig.js';

describe('Bags Capacity Feature (Selectable 1 L Buttons & Range Enforcement)', () => {
  let app;
  let mongoServer;
  let adminToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();

    await Warehouse.insertMany(defaultWarehouses);

    // Create Category: Bags
    await Category.create({
      id: 'c_bags',
      slug: 'bags',
      name: 'Bags',
      description: 'Backpacks and expedition bags',
      status: 'active',
      visible: true
    });

    // Create Category: Apparel (Non-bags)
    await Category.create({
      id: 'c_app',
      slug: 'apparel',
      name: 'Apparel',
      description: 'Clothing',
      status: 'active',
      visible: true
    });

    // Create Admin User
    await createAdminUser('admin_bags_v2@zylo.com.np', 'AdminPass123!', 'Admin');
    const adminLoginRes = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'admin_bags_v2@zylo.com.np', password: 'AdminPass123!' });

    adminToken = adminLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  describe('Config Single Source of Truth & 1 L Step Generator', () => {
    it('should have exact required min and max capacity limits for S, M, L, XL', () => {
      expect(BAG_CAPACITY_CONFIG.S.min).toBe(20);
      expect(BAG_CAPACITY_CONFIG.S.max).toBe(30);

      expect(BAG_CAPACITY_CONFIG.M.min).toBe(30);
      expect(BAG_CAPACITY_CONFIG.M.max).toBe(50);

      expect(BAG_CAPACITY_CONFIG.L.min).toBe(50);
      expect(BAG_CAPACITY_CONFIG.L.max).toBe(70);

      expect(BAG_CAPACITY_CONFIG.XL.min).toBe(70);
      expect(BAG_CAPACITY_CONFIG.XL.max).toBe(90);
    });

    it('should dynamically generate 1 L steps for each size without hardcoded markup', () => {
      const sOptions = getBagCapacityOptions('S');
      expect(sOptions[0]).toBe('20 L');
      expect(sOptions[sOptions.length - 1]).toBe('30 L');
      expect(sOptions.length).toBe(11); // 20 to 30 inclusive

      const mOptions = getBagCapacityOptions('M');
      expect(mOptions[0]).toBe('30 L');
      expect(mOptions[mOptions.length - 1]).toBe('50 L');
      expect(mOptions.length).toBe(21); // 30 to 50 inclusive

      const lOptions = getBagCapacityOptions('L');
      expect(lOptions[0]).toBe('50 L');
      expect(lOptions[lOptions.length - 1]).toBe('70 L');
      expect(lOptions.length).toBe(21); // 50 to 70 inclusive

      const xlOptions = getBagCapacityOptions('XL');
      expect(xlOptions[0]).toBe('70 L');
      expect(xlOptions[xlOptions.length - 1]).toBe('90 L');
      expect(xlOptions.length).toBe(21); // 70 to 90 inclusive
    });

    it('should correctly validate in-range and out-of-range capacity values', () => {
      expect(isValidBagCapacity('S', '20 L')).toBe(true);
      expect(isValidBagCapacity('S', '30 L')).toBe(true);
      expect(isValidBagCapacity('S', '25 L')).toBe(true);
      expect(isValidBagCapacity('S', '19 L')).toBe(false);
      expect(isValidBagCapacity('S', '31 L')).toBe(false);

      expect(isValidBagCapacity('M', '35 L')).toBe(true);
      expect(isValidBagCapacity('M', '25 L')).toBe(false);
      expect(isValidBagCapacity('M', '55 L')).toBe(false);
    });
  });

  describe('Server-side Validation & Persistence for Bags', () => {
    it('should require capacity for Bags size variants and save single selected capacity within range', async () => {
      const payload = {
        name: 'Trekker Backpack 35L',
        slug: 'trekker-backpack-35l',
        categoryId: 'c_bags',
        basePrice: 850000,
        status: 'published',
        variants: [
          {
            name: 'M',
            sku: 'BAG-TRK-M',
            options: { Size: 'M' },
            capacity: '35 L',
            price: 850000,
            stock: 20
          },
          {
            name: 'XL',
            sku: 'BAG-TRK-XL',
            options: { Size: 'XL' },
            capacity: '75 L',
            price: 950000,
            stock: 10
          }
        ]
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const product = res.body.data.product;

      const variants = await Variant.find({ productId: product.id });
      expect(variants.length).toBe(2);

      const mVar = variants.find(v => (v.name || '').includes('M') || v.options?.get?.('Size') === 'M' || v.options?.Size === 'M');
      expect(mVar.capacity).toBe('35 L');
      expect(mVar.suitable_for).toBeUndefined();

      const xlVar = variants.find(v => (v.name || '').includes('XL') || v.options?.get?.('Size') === 'XL' || v.options?.Size === 'XL');
      expect(xlVar.capacity).toBe('75 L');
      expect(xlVar.suitable_for).toBeUndefined();
    });

    it('should reject when capacity is missing on Bags size variant', async () => {
      const payload = {
        name: 'Backpack Missing Capacity',
        slug: 'backpack-missing-capacity',
        categoryId: 'c_bags',
        basePrice: 500000,
        status: 'published',
        variants: [
          {
            name: 'M',
            sku: 'BAG-MIS-M',
            options: { Size: 'M' },
            capacity: '', // Missing
            price: 500000,
            stock: 10
          }
        ]
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Capacity is required/i);
    });

    it('should reject when capacity falls outside the size min-max range', async () => {
      const payload = {
        name: 'Backpack Out Of Range',
        slug: 'backpack-out-of-range',
        categoryId: 'c_bags',
        basePrice: 500000,
        status: 'published',
        variants: [
          {
            name: 'M', // M range is 30..50
            sku: 'BAG-OOR-M',
            options: { Size: 'M' },
            capacity: '25 L', // Invalid: 25 < 30
            price: 500000,
            stock: 10
          }
        ]
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/out of range/i);
    });

    it('should NOT require capacity for non-bag categories (e.g. Apparel)', async () => {
      const payload = {
        name: 'Apparel Shirt',
        slug: 'apparel-shirt',
        categoryId: 'c_app',
        basePrice: 200000,
        status: 'published',
        variants: [
          {
            name: 'M',
            sku: 'APP-SHT-M',
            options: { Size: 'M' },
            price: 200000,
            stock: 50
          }
        ]
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const product = res.body.data.product;
      const v = await Variant.findOne({ productId: product.id });
      expect(v.capacity).toBeNull();
    });

    it('should persist selected capacity on subvariants', async () => {
      const payload = {
        name: 'Modular Pack With Coloured Subs',
        slug: 'modular-pack-coloured-subs',
        categoryId: 'c_bags',
        basePrice: 750000,
        status: 'published',
        variants: [
          {
            name: 'S',
            sku: 'BAG-MOD2-S',
            options: { Size: 'S' },
            capacity: '24 L', // Valid for S (20..30)
            price: 750000,
            stock: 10,
            subvariants: [
              {
                name: 'Olive',
                sku: 'BAG-MOD2-S-OLV',
                options: { Size: 'S', Colour: 'Olive' },
                price: 750000,
                stock: 5
              }
            ]
          }
        ]
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const product = res.body.data.product;
      const subvariants = await Variant.find({ productId: product.id, parentVariantId: { $ne: null } });
      expect(subvariants.length).toBe(1);
      expect(subvariants[0].capacity).toBe('24 L');
      expect(subvariants[0].suitable_for).toBeUndefined();
    });

    it('should allow updating capacity via PUT /api/admin/products/:id within valid range', async () => {
      const createRes = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updatable Bag 2',
          slug: 'updatable-bag-2',
          categoryId: 'c_bags',
          basePrice: 600000,
          status: 'draft',
          variants: [
            {
              id: 'v_bag_s_upd',
              name: 'S',
              sku: 'BAG-UPD2-S',
              options: { Size: 'S' },
              capacity: '22 L',
              price: 600000,
              stock: 10
            }
          ]
        });

      const prodId = createRes.body.data.product.id;

      const updateRes = await request(app)
        .put(`/api/admin/products/${prodId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'published',
          variants: [
            {
              id: 'v_bag_s_upd',
              name: 'S',
              sku: 'BAG-UPD2-S',
              options: { Size: 'S' },
              capacity: '28 L', // Updated to 28 L
              price: 650000,
              stock: 15
            }
          ]
        });

      expect(updateRes.status).toBe(200);
      const updatedVar = await Variant.findOne({ productId: prodId, sku: 'BAG-UPD2-S' });
      expect(updatedVar.capacity).toBe('28 L');
    });

    it('should expose capacity on storefront public product detail endpoint without suitable_for', async () => {
      const publicRes = await request(app).get('/api/products/updatable-bag-2');
      expect(publicRes.status).toBe(200);
      const variants = publicRes.body.data.variants;
      expect(variants.length).toBeGreaterThan(0);
      expect(variants[0].capacity).toBe('28 L');
      expect(variants[0].suitable_for).toBeUndefined();
    });
  });
});
