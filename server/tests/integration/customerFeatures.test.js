import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import {
  Category,
  Product,
  Variant,
  Inventory,
  Warehouse,
  Order,
  Payment,
  Coupon,
  Review,
  Address,
  Wishlist,
  User
} from '../../src/models/index.js';
import { createAdminUser } from '../../src/scripts/createAdmin.js';
import { defaultCategories, defaultWarehouses, defaultProducts } from '../../src/scripts/seedData.js';

describe('Phase 6 - Customer Profiles, Addresses, Coupons, Reviews & Wishlist API', () => {
  let app;
  let mongoServer;
  let adminToken;
  let customer1Token;
  let customer1Id;
  let customer2Token;
  let customer2Id;
  let testProduct;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();

    await Warehouse.insertMany(defaultWarehouses);
    await Category.insertMany(defaultCategories);

    // Seed test product + variants + inventory
    testProduct = await Product.create(defaultProducts[0]);
    const variant1 = await Variant.create({
      id: 'v_cust_1',
      productId: testProduct.id,
      sku: 'ZYL-TEST-001',
      price: 180000,
      options: { Colour: 'Black', Size: 'M' },
      published: true
    });

    await Inventory.create({
      id: 'inv_cust_1_w1',
      variantId: variant1.id,
      warehouseId: 'w1',
      available: 50,
      reserved: 0
    });

    // 1. Create Admin
    await createAdminUser('admin@zylo.com.np', 'AdminPass123!', 'Super Admin');
    const adminLogin = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'admin@zylo.com.np', password: 'AdminPass123!' });
    adminToken = adminLogin.body.data.accessToken;

    // 2. Create Customer 1
    const cust1Reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bikash@example.com', password: 'Password123!', name: 'Bikash Thapa', phone: '+977 9804556677' });
    customer1Id = cust1Reg.body.data.user.id;

    await User.updateOne({ email: 'bikash@example.com' }, { isEmailVerified: true, isVerified: true, emailVerifiedAt: new Date() });

    const cust1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bikash@example.com', password: 'Password123!' });
    customer1Token = cust1Login.body.data.accessToken;

    // 3. Create Customer 2
    const cust2Reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'sita@example.com', password: 'Password123!', name: 'Sita Rai', phone: '+977 9801234567' });
    customer2Id = cust2Reg.body.data.user.id;

    await User.updateOne({ email: 'sita@example.com' }, { isEmailVerified: true, isVerified: true, emailVerifiedAt: new Date() });

    const cust2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sita@example.com', password: 'Password123!' });
    customer2Token = cust2Login.body.data.accessToken;
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  // ==========================================
  // 1. Address Book Management
  // ==========================================
  describe('Address Book Management', () => {
    let createdAddressId;

    it('POST /api/addresses should create a new address and set as default', async () => {
      const res = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          fullName: 'Bikash Thapa',
          phone: '+977 9804556677',
          line1: 'Lakeside Ward 6',
          city: 'Pokhara',
          district: 'Kaski',
          province: 'Gandaki',
          postalCode: '33700',
          label: 'home',
          isDefault: true
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.fullName).toBe('Bikash Thapa');
      expect(res.body.data.address.isDefault).toBe(true);
      createdAddressId = res.body.data.address.id || res.body.data.address._id;
    });

    it('POST /api/addresses second address should not overwrite default unless specified', async () => {
      const res = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          fullName: 'Bikash Office',
          phone: '+977 9804556677',
          line1: 'Trade Center Floor 4',
          city: 'Pokhara',
          label: 'work',
          isDefault: false
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.isDefault).toBe(false);
    });

    it('GET /api/addresses should list all user addresses with default first', async () => {
      const res = await request(app)
        .get('/api/addresses')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.addresses.length).toBe(2);
      expect(res.body.data.addresses[0].isDefault).toBe(true);
    });

    it('PATCH /api/addresses/:id/default should change default address', async () => {
      const listRes = await request(app)
        .get('/api/addresses')
        .set('Authorization', `Bearer ${customer1Token}`);

      const nonDefault = listRes.body.data.addresses.find((a) => !a.isDefault);

      const res = await request(app)
        .patch(`/api/addresses/${nonDefault.id || nonDefault._id}/default`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.address.isDefault).toBe(true);
    });

    it('User 2 cannot access or delete User 1 address (isolation)', async () => {
      const res = await request(app)
        .delete(`/api/addresses/${createdAddressId}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 2. Coupons Engine & Concurrency
  // ==========================================
  describe('Coupons Engine & Promotional Rules', () => {
    it('Admin can create fixed and percentage coupons', async () => {
      // 1. 10% Off Coupon with Min Order
      const res1 = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'ZYLO10',
          description: '10% off on orders above Rs 1000',
          discountType: 'percentage',
          discountValue: 10,
          minOrderValue: 100000, // Rs 1,000 in Paisa
          maxDiscount: 50000, // Max Rs 500
          active: true
        });

      expect(res1.status).toBe(201);
      expect(res1.body.data.coupon.code).toBe('ZYLO10');

      // 2. Fixed Rs 300 Off Coupon
      const res2 = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'FLAT300',
          description: 'Rs 300 flat discount',
          discountType: 'fixed',
          discountValue: 30000,
          minOrderValue: 50000,
          active: true
        });

      expect(res2.status).toBe(201);
      expect(res2.body.data.coupon.code).toBe('FLAT300');
    });

    it('POST /api/coupons/validate should validate coupon and compute discount', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'ZYLO10',
          subtotal: 180000 // Rs 1,800
        });

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.discountAmount).toBe(18000); // 10% of 180000 = 18000 Paisa (Rs 180)
    });

    it('POST /api/coupons/validate should reject order below minimum order value', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'ZYLO10',
          subtotal: 50000 // Below minOrderValue of 100000
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Minimum order value');
    });

    it('Order checkout with valid coupon should apply discount and increment usage', async () => {
      const orderPayload = {
        items: [{ variantId: 'v_cust_1', qty: 1 }],
        shippingAddress: { fullName: 'Bikash Thapa', phone: '+977 9804556677' },
        paymentMethod: 'cod',
        couponCode: 'FLAT300'
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send(orderPayload);

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      expect(order.subtotal).toBe(180000);
      expect(order.discountTotal).toBe(30000);
      expect(order.couponCode).toBe('FLAT300');

      // Verify coupon usageCount incremented
      const couponDoc = await Coupon.findOne({ code: 'FLAT300' });
      expect(couponDoc.usageCount).toBe(1);
    });

    it('Concurrent requests for a single-use coupon should succeed exactly once and reject the loser with 409', async () => {
      // Create a single-use limited coupon
      await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'FLASH50',
          description: 'Single use flash coupon',
          discountType: 'fixed',
          discountValue: 50000,
          usageLimit: 1,
          active: true
        });

      const orderPayload1 = {
        items: [{ variantId: 'v_cust_1', qty: 1 }],
        shippingAddress: { fullName: 'Racer 1', phone: '+977 9800000001' },
        paymentMethod: 'cod',
        couponCode: 'FLASH50'
      };

      const orderPayload2 = {
        items: [{ variantId: 'v_cust_1', qty: 1 }],
        shippingAddress: { fullName: 'Racer 2', phone: '+977 9800000002' },
        paymentMethod: 'cod',
        couponCode: 'FLASH50'
      };

      // Two users checkout simultaneously using the same single-use coupon
      const [req1, req2] = await Promise.all([
        request(app).post('/api/orders').set('Authorization', `Bearer ${customer1Token}`).send(orderPayload1),
        request(app).post('/api/orders').set('Authorization', `Bearer ${customer2Token}`).send(orderPayload2)
      ]);

      const statuses = [req1.status, req2.status].sort();
      expect(statuses).toEqual([201, 409]);

      // Verify usageCount is exactly 1 (no over-redemption)
      const flashCoupon = await Coupon.findOne({ code: 'FLASH50' });
      expect(flashCoupon.usageCount).toBe(1);
    });
  });

  // ==========================================
  // 3. Product Reviews & Ratings
  // ==========================================
  describe('Product Reviews & Automated Rating Calculations', () => {
    it('Customer can submit a 5-star review for a product', async () => {
      const res = await request(app)
        .post(`/api/products/${testProduct.slug}/reviews`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          rating: 5,
          title: 'Exceptional Quality',
          comment: 'The heavy jersey fabric feels premium and the fit is perfect.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.review.rating).toBe(5);
      expect(res.body.data.review.userName).toBe('Bikash Thapa');

      // Check product rating calculation
      const updatedProduct = await Product.findOne({ id: testProduct.id });
      expect(updatedProduct.ratingAvg).toBe(5);
      expect(updatedProduct.ratingCount).toBe(1);
    });

    it('Duplicate review by same user on same product should be rejected with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/products/${testProduct.slug}/reviews`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          rating: 4,
          comment: 'Another review attempt'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('already submitted a review');
    });

    it('Invalid rating outside 1..5 should be rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/products/${testProduct.slug}/reviews`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          rating: 6, // Invalid
          comment: 'Out of bounds'
        });

      expect(res.status).toBe(400);
    });

    it('Second customer review updates average rating and distribution', async () => {
      const res = await request(app)
        .post(`/api/products/${testProduct.slug}/reviews`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          rating: 3,
          title: 'Decent hoodie',
          comment: 'Good material, slightly long sleeves.'
        });

      expect(res.status).toBe(201);

      // (5 + 3) / 2 = 4.0
      const updatedProduct = await Product.findOne({ id: testProduct.id });
      expect(updatedProduct.ratingAvg).toBe(4);
      expect(updatedProduct.ratingCount).toBe(2);

      // Public reviews listing
      const listRes = await request(app).get(`/api/products/${testProduct.slug}/reviews`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(2);
      expect(listRes.body.summary.distribution['5']).toBe(1);
      expect(listRes.body.summary.distribution['3']).toBe(1);
    });

    it('Admin can moderate reviews and change visibility status', async () => {
      const listRes = await request(app)
        .get('/api/admin/reviews')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(2);

      const reviewToHide = listRes.body.data[0];
      const hideRes = await request(app)
        .patch(`/api/admin/reviews/${reviewToHide._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'hidden' });

      expect(hideRes.status).toBe(200);
      expect(hideRes.body.data.review.status).toBe('hidden');
    });
  });

  // ==========================================
  // 4. Wishlist API
  // ==========================================
  describe('Wishlist API', () => {
    it('POST /api/wishlist/toggle/:productId should add product to wishlist', async () => {
      const res = await request(app)
        .post(`/api/wishlist/toggle/${testProduct.id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.inWishlist).toBe(true);
      expect(res.body.data.count).toBe(1);
    });

    it('GET /api/wishlist should return populated saved items', async () => {
      const res = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.items[0].product.name).toBe(testProduct.name);
    });

    it('POST /api/wishlist/toggle/:productId again should toggle off (remove)', async () => {
      const res = await request(app)
        .post(`/api/wishlist/toggle/${testProduct.id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.inWishlist).toBe(false);
      expect(res.body.data.count).toBe(0);
    });
  });

  // ==========================================
  // 5. Admin Customer Analytics & Management
  // ==========================================
  describe('Admin Customer Analytics & Management', () => {
    it('GET /api/admin/customers should list customers with aggregated spend and order metrics', async () => {
      const res = await request(app)
        .get('/api/admin/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const bikash = res.body.data.find((c) => c.email === 'bikash@example.com');
      expect(bikash).toBeDefined();
      expect(bikash.orderCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/admin/customers/:id should return complete customer 360 profile', async () => {
      const res = await request(app)
        .get(`/api/admin/customers/${customer1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customer.email).toBe('bikash@example.com');
      expect(res.body.data.addresses.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.recentOrders.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.metrics.reviewsCount).toBe(1);
    });
  });
});
