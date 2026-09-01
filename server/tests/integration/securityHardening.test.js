import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { Product, Variant, Inventory, Warehouse, Order, Payment, User } from '../../src/models/index.js';
import { defaultProducts, defaultWarehouses } from '../../src/scripts/seedData.js';
import { timingSafeEqualStr, generateEsewaSignature, verifyEsewaPayload, generateFonepayHash, verifyFonepayHash } from '../../src/utils/paymentSignatures.js';
import { escapeRegex } from '../../src/utils/regex.js';

describe('Security Hardening & Vulnerability Remediation Suite', () => {
  let app;
  let mongoServer;
  let testVariant;
  let normalUser;
  let normalUserToken;
  let attackerUser;
  let attackerUserToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();

    await Warehouse.insertMany(defaultWarehouses);
    await Product.insertMany(defaultProducts);

    // Create a product variant with true catalog price = Rs 1800 (180,000 paisa)
    testVariant = await Variant.create({
      id: 'v_sec_test',
      productId: 'm1',
      sku: 'ZYL-SEC-001-BLAC-M',
      options: { Colour: 'Black', Size: 'M' },
      price: 180000,
      published: true
    });

    await Inventory.create({
      id: 'inv_v_sec_test_w1',
      variantId: 'v_sec_test',
      warehouseId: 'w1',
      available: 100,
      reserved: 0
    });

    // Create a legitimate customer
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'legit.customer@example.com',
        password: 'ValidPassword123!',
        name: 'Legit Customer',
        phone: '+977 9801111111'
      });
    normalUser = userRes.body.data.user;

    await User.updateOne({ email: 'legit.customer@example.com' }, { isEmailVerified: true, isVerified: true, emailVerifiedAt: new Date() });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'legit.customer@example.com',
        password: 'ValidPassword123!'
      });
    normalUserToken = loginRes.body.data.accessToken;

    // Create an attacker customer
    const attackerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'attacker@example.com',
        password: 'AttackerPassword123!',
        name: 'Attacker User',
        phone: '+977 9802222222'
      });
    attackerUser = attackerRes.body.data.user;

    await User.updateOne({ email: 'attacker@example.com' }, { isEmailVerified: true, isVerified: true, emailVerifiedAt: new Date() });

    const attackerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'attacker@example.com',
        password: 'AttackerPassword123!'
      });
    attackerUserToken = attackerLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  describe('VULN-01: Server-Side Price Tampering Prevention', () => {
    it('should completely ignore client-injected unitPrice and charge the verified database price', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({
          items: [
            {
              variantId: 'v_sec_test',
              unitPrice: 1, // Attacker tries to inject 1 paisa (Rs 0.01) instead of 180,000 paisa (Rs 1800)
              qty: 2
            }
          ],
          shippingAddress: {
            fullName: 'Security Auditor',
            phone: '+977 9800000000',
            line1: 'Thamel',
            city: 'Kathmandu'
          },
          paymentMethod: 'cod'
        });

      expect(res.status).toBe(201);
      const order = res.body.data.order;

      // Subtotal MUST be 180,000 * 2 = 360,000 paisa, NOT 1 * 2 = 2 paisa
      expect(order.items[0].unitPrice).toBe(180000);
      expect(order.subtotal).toBe(360000);
    });
  });

  describe('VULN-02: IDOR & PII Disclosure Defense on Order Retrieval', () => {
    let legitOrderNo;

    beforeAll(async () => {
      // Create order as legitimate customer
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({
          items: [{ variantId: 'v_sec_test', qty: 1 }],
          shippingAddress: {
            fullName: 'Secret VIP Customer',
            phone: '+977 9841999999',
            line1: 'Confidential Address 42',
            city: 'Kathmandu'
          },
          paymentMethod: 'cod'
        });
      legitOrderNo = res.body.data.order.orderNo;
    });

    it('should reject unauthenticated request without authentication token with 401/403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/orders/${legitOrderNo}`);

      expect([401, 403]).toContain(res.status);
    });

    it('should reject attacker request attempting to read another user order with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/orders/${legitOrderNo}`)
        .set('Authorization', `Bearer ${attackerUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow retrieval when legitimate order owner requests their order', async () => {
      const res = await request(app)
        .get(`/api/orders/${legitOrderNo}`)
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderNo).toBe(legitOrderNo);
      expect(res.body.data.order.shippingAddress.fullName).toBe('Secret VIP Customer');
    });
  });

  describe('VULN-03: Broken Access Control on Payment Initiation', () => {
    let userOrder;

    beforeAll(async () => {
      // Create order belonging to legit customer
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({
          items: [{ variantId: 'v_sec_test', qty: 1 }],
          shippingAddress: {
            fullName: 'Legit Customer',
            phone: '+977 9801111111',
            line1: 'Patan',
            city: 'Lalitpur'
          },
          paymentMethod: 'esewa'
        });
      userOrder = res.body.data.order;
    });

    it('should reject payment initiation when called by a different unauthorized user', async () => {
      const res = await request(app)
        .post('/api/payments/esewa/initiate')
        .set('Authorization', `Bearer ${attackerUserToken}`) // Attacker tries to initiate payment on Legit Customer's order
        .send({
          orderId: userOrder.orderNo
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow payment initiation when called by the legitimate owner', async () => {
      const res = await request(app)
        .post('/api/payments/esewa/initiate')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({
          orderId: userOrder.orderNo
        });

      expect(res.status).toBe(200);
      expect(res.body.data.gatewayUrl).toBeDefined();
      expect(res.body.data.params.signature).toBeDefined();
    });
  });

  describe('VULN-04: Constant-Time Signature & Hash Comparison', () => {
    it('timingSafeEqualStr should correctly compare equal and unequal strings', () => {
      expect(timingSafeEqualStr('hello', 'hello')).toBe(true);
      expect(timingSafeEqualStr('hello', 'world')).toBe(false);
      expect(timingSafeEqualStr('hello', 'hello world')).toBe(false);
      expect(timingSafeEqualStr('', '')).toBe(true);
      expect(timingSafeEqualStr(null, 'test')).toBe(false);
    });

    it('should reject forged eSewa webhook signatures in constant time', () => {
      const validSig = generateEsewaSignature({
        total_amount: '1800.00',
        transaction_uuid: 'ZY-TEST-001',
        product_code: 'EPAYTEST'
      });

      const validPayload = Buffer.from(
        JSON.stringify({
          total_amount: '1800.00',
          transaction_uuid: 'ZY-TEST-001',
          product_code: 'EPAYTEST',
          signature: validSig,
          signed_field_names: 'total_amount,transaction_uuid,product_code'
        })
      ).toString('base64');

      const { isValid: validResult } = verifyEsewaPayload(validPayload);
      expect(validResult).toBe(true);

      const forgedPayload = Buffer.from(
        JSON.stringify({
          total_amount: '1800.00',
          transaction_uuid: 'ZY-TEST-001',
          product_code: 'EPAYTEST',
          signature: 'forged_fake_signature_abc123',
          signed_field_names: 'total_amount,transaction_uuid,product_code'
        })
      ).toString('base64');

      const { isValid: forgedResult } = verifyEsewaPayload(forgedPayload);
      expect(forgedResult).toBe(false);
    });

    it('should verify Fonepay hash correctly with timing safety', () => {
      const hash = generateFonepayHash({
        prn: 'PRN-999',
        amount: '2500.00',
        merchantCode: 'FPAYTEST'
      });

      expect(verifyFonepayHash({ prn: 'PRN-999', amount: '2500.00', merchantCode: 'FPAYTEST', hash })).toBe(true);
      expect(verifyFonepayHash({ prn: 'PRN-999', amount: '2500.00', merchantCode: 'FPAYTEST', hash: 'corrupted_hash' })).toBe(false);
    });
  });

  describe('VULN-05: ReDoS and Query Injection Resilience', () => {
    it('escapeRegex utility should escape special regular expression characters', () => {
      expect(escapeRegex('test.*+?^${}()|[]\\')).toBe('test\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('GET /api/products should safely handle complex regex characters without server error', async () => {
      const maliciousQueries = [
        '((a+)+)+$',
        'test.*.*.*.*.*',
        '[*?+\\',
        '^(a|b|c)*$'
      ];

      for (const q of maliciousQueries) {
        const res = await request(app).get(`/api/products?q=${encodeURIComponent(q)}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });
  });

  describe('VULN-06: Authentication Registration Hardening', () => {
    it('should reject registration with password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weak.pass@example.com',
          password: 'short',
          name: 'Weak Pass User'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Password must be at least 8 characters');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'ValidPassword123!',
          name: 'Invalid Email User'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('valid email');
    });
  });

  describe('VULN-07: Security Headers Inspection', () => {
    it('should include hardened HTTP security headers', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });
});
