import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { Category, Product, Variant, Inventory, Warehouse, Order, Payment, User } from '../../src/models/index.js';
import { createAdminUser } from '../../src/scripts/createAdmin.js';
import { defaultWarehouses } from '../../src/scripts/seedData.js';

describe('Phase 5 - Admin CRUD & Management API', () => {
  let app;
  let mongoServer;
  let adminToken;
  let customerToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();

    await Warehouse.insertMany(defaultWarehouses);

    // 1. Create Admin User
    await createAdminUser('admin@zylo.com.np', 'AdminPass123!', 'Super Admin');

    const adminLoginRes = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'admin@zylo.com.np', password: 'AdminPass123!' });

    adminToken = adminLoginRes.body.data.accessToken;

    // 2. Create Customer User
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'customer@example.com', password: 'CustPassword123!', name: 'Regular Customer' });

    await User.updateOne({ email: 'customer@example.com' }, { isEmailVerified: true, isVerified: true, emailVerifiedAt: new Date() });

    const custLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@example.com', password: 'CustPassword123!' });

    customerToken = custLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  describe('RBAC Route Protection', () => {
    it('GET /api/admin/products without token should return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/products');
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/products with customer token should return 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/admin/products with admin token should return 200 OK', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.products).toBeDefined();
    });
  });

  describe('Admin Categories Management', () => {
    let createdCatId;

    it('POST /api/admin/categories should create category and make it visible on public /api/categories', async () => {
      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Outerwear',
          slug: 'outerwear',
          description: 'Technical shells and winter outerwear',
          displayOrder: 2
        });

      expect(res.status).toBe(201);
      const cat = res.body.data.category;
      expect(cat.name).toBe('Outerwear');
      expect(cat.slug).toBe('outerwear');
      createdCatId = cat.id;

      // Verify immediate visibility on public storefront catalog API!
      const publicRes = await request(app).get('/api/categories');
      expect(publicRes.status).toBe(200);
      const found = publicRes.body.data.find((c) => c.slug === 'outerwear');
      expect(found).toBeDefined();
      expect(found.name).toBe('Outerwear');
    });

    it('PATCH /api/admin/categories/:id should update category', async () => {
      const res = await request(app)
        .patch(`/api/admin/categories/${createdCatId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated description for outerwear collection'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.category.description).toBe('Updated description for outerwear collection');
    });
  });

  describe('Admin Products CRUD & Storefront Instant Visibility', () => {
    let createdProductId;
    let createdProductSlug;

    it('POST /api/admin/products should create product with variants & inventory, instantly visible in storefront', async () => {
      const newProductPayload = {
        name: 'Technical Parka',
        slug: 'technical-parka',
        categoryId: 'outerwear',
        brand: 'Zylo Lab',
        basePrice: 650000, // Rs 6,500
        mrp: 750000,
        status: 'published',
        tags: ['jacket', 'waterproof'],
        description: '3-layer waterproof technical shell parka.',
        options: { Colour: ['Charcoal', 'Olive'], Size: ['M', 'L'] },
        variants: [
          {
            id: 'v_parka_charcoal_m',
            sku: 'ZYL-OUT-PARK-CHAR-M',
            options: { Colour: 'Charcoal', Size: 'M' },
            price: 650000,
            stock: 15
          },
          {
            id: 'v_parka_olive_l',
            sku: 'ZYL-OUT-PARK-OLIV-L',
            options: { Colour: 'Olive', Size: 'L' },
            price: 650000,
            stock: 20
          }
        ]
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProductPayload);

      expect(res.status).toBe(201);
      const prod = res.body.data.product;
      expect(prod.name).toBe('Technical Parka');
      expect(prod.variants.length).toBe(2);
      expect(prod.variants[0].availableStock).toBe(15);
      expect(prod.variants[1].availableStock).toBe(20);

      createdProductId = prod.id;
      createdProductSlug = prod.slug;

      // 🌟 VERIFY DIRECT STOREFRONT VISIBILITY: Public GET /api/products lists this new product!
      const storefrontListRes = await request(app).get('/api/products');
      expect(storefrontListRes.status).toBe(200);
      const publicProd = storefrontListRes.body.data.find((p) => p.slug === 'technical-parka');
      expect(publicProd).toBeDefined();
      expect(publicProd.name).toBe('Technical Parka');
      expect(publicProd.basePrice).toBe(650000);
      expect(publicProd.totalStock).toBe(35); // 15 + 20

      // 🌟 VERIFY DIRECT STOREFRONT DETAIL: Public GET /api/products/:slug returns variants and stock!
      const storefrontDetailRes = await request(app).get(`/api/products/${createdProductSlug}`);
      expect(storefrontDetailRes.status).toBe(200);
      expect(storefrontDetailRes.body.data.name).toBe('Technical Parka');
      expect(storefrontDetailRes.body.data.variants.length).toBe(2);
    });

    it('GET /api/admin/products/tags should list distinct tags across products', async () => {
      const res = await request(app)
        .get('/api/admin/products/tags')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.tags)).toBe(true);
      expect(res.body.data.tags).toContain('jacket');
      expect(res.body.data.tags).toContain('waterproof');
    });

    it('PATCH /api/admin/products/:id should update product attributes', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          basePrice: 620000,
          labels: { featured: true, newArrival: true }
        });

      expect(res.status).toBe(200);
      expect(res.body.data.product.basePrice).toBe(620000);
      expect(res.body.data.product.labels.featured).toBe(true);

      // Verify updated price in public storefront
      const publicDetail = await request(app).get(`/api/products/${createdProductSlug}`);
      expect(publicDetail.body.data.basePrice).toBe(620000);
    });

    it('POST /api/admin/products with nested Variants and SubVariants (amount inheritance and hide flag)', async () => {
      const nestedPayload = {
        name: 'Heritage Trench Coat',
        slug: 'heritage-trench-coat',
        categoryId: 'outerwear',
        brand: 'Zylo Heritage',
        basePrice: 850000, // Rs 8,500
        variants: [
          {
            name: 'Beige Heritage',
            sku: 'ZYL-OUT-TRN-BEI',
            amount: 850000,
            stock: 12,
            subVariants: [
              {
                name: 'Beige / Small',
                sku: 'ZYL-OUT-TRN-BEI-S',
                hidden: false
              },
              {
                name: 'Beige / Extra Small (Prototype)',
                sku: 'ZYL-OUT-TRN-BEI-XS',
                amount: 900000,
                hidden: true // Hidden from storefront!
              }
            ]
          }
        ]
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(nestedPayload);

      expect(res.status).toBe(201);
      const prod = res.body.data.product;
      expect(prod.name).toBe('Heritage Trench Coat');
      expect(prod.variants.length).toBe(1);
      expect(prod.variants[0].name).toBe('Beige Heritage');
      expect(prod.variants[0].subVariants.length).toBe(2);

      const visibleSub = prod.variants[0].subVariants.find((s) => s.sku === 'ZYL-OUT-TRN-BEI-S');
      const hiddenSub = prod.variants[0].subVariants.find((s) => s.sku === 'ZYL-OUT-TRN-BEI-XS');
      expect(visibleSub.price).toBe(850000);
      expect(visibleSub.hidden).toBe(false);
      expect(hiddenSub.price).toBe(900000);
      expect(hiddenSub.hidden).toBe(true);

      // Verify storefront detail hides the hidden subvariant
      const storefrontRes = await request(app).get('/api/products/heritage-trench-coat');
      expect(storefrontRes.status).toBe(200);
      const publicVariants = storefrontRes.body.data.variants;
      const foundHiddenInStore = publicVariants.some((v) => v.sku === 'ZYL-OUT-TRN-BEI-XS');
      expect(foundHiddenInStore).toBe(false);
      const foundVisibleInStore = publicVariants.some((v) => v.sku === 'ZYL-OUT-TRN-BEI-S');
      expect(foundVisibleInStore).toBe(true);
    });
  });

  describe('Admin Inventory Adjustments & Stock Movement Ledger', () => {
    it('POST /api/admin/inventory/adjust should update available stock and record audit ledger', async () => {
      const res = await request(app)
        .post('/api/admin/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantId: 'v_parka_charcoal_m',
          warehouseId: 'w1',
          change: 10,
          reason: 'Restock Shipment SS26',
          note: 'PO-2026-99'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.inventory.available).toBe(25); // 15 + 10 = 25

      // Check stock movement log
      const movesRes = await request(app)
        .get('/api/admin/inventory/moves?variantId=v_parka_charcoal_m')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(movesRes.status).toBe(200);
      expect(movesRes.body.data.moves.length).toBeGreaterThanOrEqual(1);
      expect(movesRes.body.data.moves[0].change).toBe(10);
      expect(movesRes.body.data.moves[0].reason).toBe('Restock Shipment SS26');

      // Verify updated stock immediately in public storefront detail!
      const publicProd = await request(app).get('/api/products/technical-parka');
      const charcoalVariant = publicProd.body.data.variants.find((v) => v.id === 'v_parka_charcoal_m');
      expect(charcoalVariant.availableStock).toBe(25);
    });
  });

  describe('Admin Orders & Fulfillment Management', () => {
    let orderToManage;

    beforeAll(async () => {
      orderToManage = await Order.create({
        orderNo: 'ZY-ADMIN-9001',
        items: [
          {
            productId: 'p_test',
            variantId: 'v_parka_charcoal_m',
            name: 'Technical Parka',
            sku: 'ZYL-OUT-PARK-CHAR-M',
            qty: 1,
            unitPrice: 620000,
            lineTotal: 620000
          }
        ],
        subtotal: 620000,
        grandTotal: 620000,
        paymentMethod: 'esewa',
        paymentStatus: 'paid',
        fulfillmentStatus: 'pending',
        shippingAddress: { fullName: 'Test Buyer', phone: '+977 9801112233' }
      });
    });

    it('GET /api/admin/orders should list orders with filters', async () => {
      const res = await request(app)
        .get('/api/admin/orders?q=ZY-ADMIN-9001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBe(1);
      expect(res.body.data.orders[0].orderNo).toBe('ZY-ADMIN-9001');
    });

    it('PATCH /api/admin/orders/:id/status should update valid state transitions', async () => {
      // 1. pending -> confirmed
      const res1 = await request(app)
        .patch(`/api/admin/orders/${orderToManage.orderNo}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fulfillmentStatus: 'confirmed',
          note: 'Verified payment on bank portal'
        });

      expect(res1.status).toBe(200);
      expect(res1.body.data.order.fulfillmentStatus).toBe('confirmed');

      // 2. confirmed -> processing
      const res2 = await request(app)
        .patch(`/api/admin/orders/${orderToManage.orderNo}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fulfillmentStatus: 'processing',
          note: 'Packing order at Kathmandu warehouse'
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.order.fulfillmentStatus).toBe('processing');
    });

    it('PATCH /api/admin/orders/:id/status with illegal transition should return 409 Conflict', async () => {
      // Current is processing -> cannot directly jump to returned!
      const res = await request(app)
        .patch(`/api/admin/orders/${orderToManage.orderNo}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fulfillmentStatus: 'returned'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });
});
