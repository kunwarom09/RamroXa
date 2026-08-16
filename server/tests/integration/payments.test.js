import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { Product, Variant, Inventory, Order, Payment, Warehouse } from '../../src/models/index.js';
import { defaultProducts, defaultWarehouses } from '../../src/scripts/seedData.js';
import { generateEsewaSignature, generateFonepayHash } from '../../src/utils/paymentSignatures.js';
import env from '../../src/config/env.js';

describe('Phase 4 - Payment Gateway Integrations (eSewa & Fonepay)', () => {
  let app;
  let mongoServer;
  let testOrder;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();

    await Warehouse.insertMany(defaultWarehouses);
    await Product.insertMany(defaultProducts);

    await Variant.create({
      id: 'v_m1_s',
      productId: 'm1',
      sku: 'ZYL-APP-00001-BLAC-S',
      options: { Colour: 'Black', Size: 'S' },
      price: 180000,
      published: true
    });

    await Inventory.create({
      id: 'inv_v_m1_s_w1',
      variantId: 'v_m1_s',
      warehouseId: 'w1',
      available: 50,
      reserved: 0
    });

    // Create a test order
    testOrder = await Order.create({
      orderNo: 'ZY-1050',
      items: [
        {
          productId: 'm1',
          variantId: 'v_m1_s',
          name: 'Monolith Tee',
          sku: 'ZYL-APP-00001-BLAC-S',
          qty: 1,
          unitPrice: 180000,
          lineTotal: 180000
        }
      ],
      subtotal: 180000,
      discountTotal: 0,
      shippingTotal: 15000,
      vatTotal: Math.round((180000 * 13) / 113),
      grandTotal: 195000, // Rs 1,950
      paymentMethod: 'esewa',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      shippingAddress: {
        fullName: 'Sita Rai',
        phone: '+977 9801234567'
      }
    });

    await Payment.create({
      order: testOrder._id,
      orderNo: testOrder.orderNo,
      provider: 'esewa',
      amount: testOrder.grandTotal,
      status: 'pending'
    });
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  describe('eSewa Payment Flow', () => {
    let transactionUuid;

    it('POST /api/payments/esewa/initiate should generate signed payment parameters', async () => {
      const res = await request(app)
        .post('/api/payments/esewa/initiate')
        .send({
          orderId: testOrder.orderNo
        });

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.gatewayUrl).toBeDefined();
      expect(data.params.product_code).toBe('EPAYTEST');
      expect(data.params.amount).toBe('1950.00');
      expect(data.params.signature).toBeDefined();
      expect(data.params.transaction_uuid).toContain('ZY-1050');

      transactionUuid = data.params.transaction_uuid;
    });

    it('POST /api/payments/esewa/webhook should verify signature and confirm order payment', async () => {
      const transactionCode = 'TXN_ESEWA_998811';
      const amountStr = '1950.00';
      const productCode = 'EPAYTEST';

      // Construct authentic eSewa callback payload
      const signature = generateEsewaSignature({
        total_amount: amountStr,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        secret: env.ESEWA_SECRET
      });

      const rawCallbackObj = {
        transaction_code: transactionCode,
        status: 'COMPLETE',
        total_amount: amountStr,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature
      };

      const encodedData = Buffer.from(JSON.stringify(rawCallbackObj)).toString('base64');

      const res = await request(app)
        .post('/api/payments/esewa/webhook')
        .send({
          data: encodedData
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify order and payment updated in database
      const updatedOrder = await Order.findOne({ orderNo: testOrder.orderNo });
      expect(updatedOrder.paymentStatus).toBe('paid');
      expect(updatedOrder.fulfillmentStatus).toBe('confirmed');

      const updatedPayment = await Payment.findOne({ order: testOrder._id });
      expect(updatedPayment.status).toBe('paid');
      expect(updatedPayment.providerRef).toBe(transactionCode);
    });

    it('POST /api/payments/esewa/webhook with tampered signature should be rejected with 400 Bad Request', async () => {
      const forgedPayload = {
        transaction_code: 'FORGED_TXN',
        status: 'COMPLETE',
        total_amount: '1950.00',
        transaction_uuid: transactionUuid,
        product_code: 'EPAYTEST',
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature: 'invalid_forged_base64_signature=='
      };

      const encodedData = Buffer.from(JSON.stringify(forgedPayload)).toString('base64');

      const res = await request(app)
        .post('/api/payments/esewa/webhook')
        .send({
          data: encodedData
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('Duplicate eSewa webhook delivery should acknowledge without duplicate processing', async () => {
      const transactionCode = 'TXN_ESEWA_998811';
      const amountStr = '1950.00';
      const productCode = 'EPAYTEST';

      const signature = generateEsewaSignature({
        total_amount: amountStr,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        secret: env.ESEWA_SECRET
      });

      const rawCallbackObj = {
        transaction_code: transactionCode,
        status: 'COMPLETE',
        total_amount: amountStr,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature
      };

      const encodedData = Buffer.from(JSON.stringify(rawCallbackObj)).toString('base64');

      const res = await request(app)
        .post('/api/payments/esewa/webhook')
        .send({
          data: encodedData
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('already recorded');
    });
  });

  describe('Fonepay Payment Flow', () => {
    let fonepayOrder;
    let prn;

    beforeAll(async () => {
      fonepayOrder = await Order.create({
        orderNo: 'ZY-1060',
        items: [
          {
            productId: 'm1',
            variantId: 'v_m1_s',
            name: 'Monolith Tee',
            sku: 'ZYL-APP-00001-BLAC-S',
            qty: 1,
            unitPrice: 180000,
            lineTotal: 180000
          }
        ],
        subtotal: 180000,
        grandTotal: 195000,
        paymentMethod: 'fonepay',
        paymentStatus: 'pending',
        fulfillmentStatus: 'pending',
        shippingAddress: { fullName: 'Bikash Thapa', phone: '+977 9804556677' }
      });
    });

    it('POST /api/payments/fonepay/initiate should return merchant parameters and hash', async () => {
      const res = await request(app)
        .post('/api/payments/fonepay/initiate')
        .send({
          orderId: fonepayOrder.orderNo
        });

      expect(res.status).toBe(200);
      expect(res.body.data.params.merchantCode).toBe('FPAYTEST');
      expect(res.body.data.params.hash).toBeDefined();
      expect(res.body.data.params.prn).toContain('ZY-1060');

      prn = res.body.data.params.prn;
    });

    it('POST /api/payments/fonepay/webhook with valid hash should confirm payment', async () => {
      const amountStr = '1950.00';
      const merchantCode = 'FPAYTEST';

      const hash = generateFonepayHash({
        prn,
        amount: amountStr,
        merchantCode,
        secret: env.FONEPAY_SECRET
      });

      const res = await request(app)
        .post('/api/payments/fonepay/webhook')
        .send({
          prn,
          amount: amountStr,
          hash
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await Order.findOne({ orderNo: fonepayOrder.orderNo });
      expect(updated.paymentStatus).toBe('paid');
    });
  });
});
