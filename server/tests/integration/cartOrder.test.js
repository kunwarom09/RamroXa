import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { Product, Variant, Inventory, Warehouse, Order, StockMove, User } from '../../src/models/index.js';
import { defaultProducts, defaultWarehouses } from '../../src/scripts/seedData.js';

describe('Phase 3 - Cart, Checkout & Inventory Reservation API', () => {
  let app;
  let mongoServer;
  let testUserToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();

    await Warehouse.insertMany(defaultWarehouses);
    await Product.insertMany(defaultProducts);

    // Create test variants and initial inventory
    await Variant.create({
      id: 'v_m1_s',
      productId: 'm1',
      sku: 'ZYL-APP-00001-BLAC-S',
      options: { Colour: 'Black', Size: 'S' },
      price: 180000, // 1800 NPR
      published: true
    });

    await Variant.create({
      id: 'v_m1_m',
      productId: 'm1',
      sku: 'ZYL-APP-00001-BLAC-M',
      options: { Colour: 'Black', Size: 'M' },
      price: 180000,
      published: true
    });

    // Limited inventory item for concurrency testing: only 1 unit available!
    await Variant.create({
      id: 'v_m2_s',
      productId: 'm2',
      sku: 'ZYL-APP-00002-BLAC-S',
      options: { Colour: 'Black', Size: 'S' },
      price: 380000, // 3800 NPR
      published: true
    });

    await Inventory.create({
      id: 'inv_v_m1_s_w1',
      variantId: 'v_m1_s',
      warehouseId: 'w1',
      available: 50,
      reserved: 0
    });

    await Inventory.create({
      id: 'inv_v_m2_s_w1',
      variantId: 'v_m2_s',
      warehouseId: 'w1',
      available: 1, // Only 1 available for race test!
      reserved: 0
    });

    // Register and authenticate customer
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'cart.customer@example.com',
        password: 'Password123!',
        name: 'Cart Customer',
        phone: '+977 9801234567'
      });

    await User.updateOne({ email: 'cart.customer@example.com' }, { isEmailVerified: true, isVerified: true, emailVerifiedAt: new Date() });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'cart.customer@example.com',
        password: 'Password123!'
      });

    testUserToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  describe('Cart API Endpoints', () => {
    let guestToken;

    it('GET /api/cart should initialize empty cart and issue guest token', async () => {
      const res = await request(app).get('/api/cart');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.totals.subtotal).toBe(0);

      const cookies = res.headers['set-cookie'] || [];
      const hasGuestCookie = cookies.some((c) => c.includes('zylo_guest_token='));
      expect(hasGuestCookie).toBe(true);

      const cookie = cookies.find((c) => c.startsWith('zylo_guest_token='));
      guestToken = cookie.split(';')[0].split('=')[1];
    });

    it('POST /api/cart/items should add variant and calculate server pricing', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('X-Guest-Token', guestToken)
        .send({
          variantId: 'v_m1_s',
          qty: 2
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].sku).toBe('ZYL-APP-00001-BLAC-S');
      expect(res.body.data.items[0].qty).toBe(2);
      expect(res.body.data.totals.subtotal).toBe(360000); // 1800 * 2 = 3600 NPR (in paisa)
      expect(res.body.data.totals.shippingTotal).toBe(15000); // Subtotal < 5000 NPR threshold
    });

    it('PATCH /api/cart/items/:variantId should update item quantity', async () => {
      const res = await request(app)
        .patch('/api/cart/items/v_m1_s')
        .set('X-Guest-Token', guestToken)
        .send({
          qty: 3
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].qty).toBe(3);
      expect(res.body.data.totals.subtotal).toBe(540000); // 1800 * 3 = 5400 NPR
      expect(res.body.data.totals.shippingTotal).toBe(0); // Subtotal >= 5000 NPR threshold -> Free Shipping!
    });

    it('DELETE /api/cart/items/:variantId should remove item', async () => {
      const res = await request(app)
        .delete('/api/cart/items/v_m1_s')
        .set('X-Guest-Token', guestToken);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(0);
      expect(res.body.data.totals.subtotal).toBe(0);
    });
  });

  describe('Order Checkout & Atomic Inventory Reservation', () => {
    it('POST /api/orders should create order, calculate VAT, and atomically reserve inventory', async () => {
      const initialInv = await Inventory.findOne({ variantId: 'v_m1_s' });
      const initialAvailable = initialInv.available;
      const initialReserved = initialInv.reserved;

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          items: [
            {
              variantId: 'v_m1_s',
              qty: 2
            }
          ],
          shippingAddress: {
            fullName: 'Anjali Shrestha',
            phone: '+977 9809112233',
            line1: 'Jhamsikhel',
            city: 'Lalitpur'
          },
          paymentMethod: 'cod'
        });

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      expect(order.orderNo).toBeDefined();
      expect(order.subtotal).toBe(360000);
      expect(order.vatTotal).toBe(Math.round((360000 * 13) / 113));
      expect(order.paymentStatus).toBe('pending');
      expect(order.fulfillmentStatus).toBe('pending');

      // Verify inventory reservation
      const updatedInv = await Inventory.findOne({ variantId: 'v_m1_s' });
      expect(updatedInv.available).toBe(initialAvailable - 2);
      expect(updatedInv.reserved).toBe(initialReserved + 2);

      // Verify stock movement log
      const move = await StockMove.findOne({ reference: order.orderNo });
      expect(move).toBeDefined();
      expect(move.change).toBe(-2);
    });

    it('POST /api/orders with duplicate Idempotency-Key should return existing order without double reservation', async () => {
      const idempotencyKey = 'unique_idemp_key_123';
      const initialInv = await Inventory.findOne({ variantId: 'v_m1_s' });
      const initialAvailable = initialInv.available;

      // 1. First call
      const res1 = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          items: [{ variantId: 'v_m1_s', qty: 1 }],
          shippingAddress: { fullName: 'Bikash Thapa', phone: '+977 9804556677' },
          paymentMethod: 'cod'
        });

      expect(res1.status).toBe(201);
      const order1 = res1.body.data.order;

      // 2. Replay with identical Idempotency-Key
      const res2 = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          items: [{ variantId: 'v_m1_s', qty: 1 }],
          shippingAddress: { fullName: 'Bikash Thapa', phone: '+977 9804556677' },
          paymentMethod: 'cod'
        });

      // Returns the original order
      const order2 = res2.body.data.order;
      expect(order2.orderNo).toBe(order1.orderNo);

      // Verify inventory was only decremented ONCE
      const afterInv = await Inventory.findOne({ variantId: 'v_m1_s' });
      expect(afterInv.available).toBe(initialAvailable - 1);
    });
  });

  describe('Concurrency & Oversell Prevention', () => {
    it('Concurrent requests for the last remaining stock should succeed exactly once and reject the loser with 409', async () => {
      const targetVariantId = 'v_m2_s'; // Has only 1 available unit in DB!

      const orderPayload = {
        items: [{ variantId: targetVariantId, qty: 1 }],
        shippingAddress: { fullName: 'Racer User', phone: '+977 9800000000' },
        paymentMethod: 'cod'
      };

      // Fire two checkout requests simultaneously
      const [req1, req2] = await Promise.all([
        request(app).post('/api/orders').set('Authorization', `Bearer ${testUserToken}`).send(orderPayload),
        request(app).post('/api/orders').set('Authorization', `Bearer ${testUserToken}`).send(orderPayload)
      ]);

      const statuses = [req1.status, req2.status].sort();

      // One must succeed (201) and one must be rejected (409 Conflict)
      expect(statuses).toEqual([201, 409]);

      // Stock must be exactly 0 (no negative inventory!)
      const finalInv = await Inventory.findOne({ variantId: targetVariantId });
      expect(finalInv.available).toBe(0);
      expect(finalInv.reserved).toBe(1);
    });
  });
});
