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
  Purchase
} from '../../src/models/index.js';
import { createAdminUser } from '../../src/scripts/createAdmin.js';
import { defaultCategories, defaultWarehouses, defaultProducts } from '../../src/scripts/seedData.js';

describe('Phase 7 - Finance, Double-Entry Accounting, Sales Reports & IRD VAT API', () => {
  let app;
  let mongoServer;
  let adminToken;
  let testOrder1;
  let testOrder2;
  let testPurchase1;
  let testPurchase2;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();

    await Warehouse.insertMany(defaultWarehouses);
    await Category.insertMany(defaultCategories);
    const product = await Product.create(defaultProducts[0]);

    // Create Admin User
    await createAdminUser('admin@zylo.com.np', 'AdminPass123!', 'Super Admin');
    const adminLogin = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'admin@zylo.com.np', password: 'AdminPass123!' });
    adminToken = adminLogin.body.data.accessToken;

    const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"

    // Seed Order 1: Paid online order (Rs 5,000 gross)
    // 13% VAT derived: 500000 * 13 / 113 = 57522 Paisa (Rs 575.22)
    // Taxable: 500000 - 57522 = 442478 Paisa
    testOrder1 = await Order.create({
      orderNo: 'ZYL-20260816-0001',
      items: [{ productId: product.id, variantId: 'v_test_1', name: product.name, sku: 'TEST-1', qty: 2, unitPrice: 250000, lineTotal: 500000 }],
      subtotal: 500000,
      discountTotal: 0,
      shippingTotal: 0,
      vatTotal: 57522,
      grandTotal: 500000,
      paymentMethod: 'esewa',
      paymentStatus: 'paid',
      fulfillmentStatus: 'delivered',
      shippingAddress: { fullName: 'Ram Sharma', phone: '+977 9841234567' },
      createdAt: new Date(`${currentYearMonth}-10T10:00:00.000Z`)
    });

    // Seed Order 2: Pending COD order (Rs 2,000 gross)
    // 13% VAT derived: 200000 * 13 / 113 = 23009 Paisa
    // Taxable: 200000 - 23009 = 176991 Paisa
    testOrder2 = await Order.create({
      orderNo: 'ZYL-20260816-0002',
      items: [{ productId: product.id, variantId: 'v_test_1', name: product.name, sku: 'TEST-1', qty: 1, unitPrice: 200000, lineTotal: 200000 }],
      subtotal: 200000,
      discountTotal: 0,
      shippingTotal: 0,
      vatTotal: 23009,
      grandTotal: 200000,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      shippingAddress: { fullName: 'Hari Prasad', phone: '+977 9847654321' },
      createdAt: new Date(`${currentYearMonth}-12T14:00:00.000Z`)
    });

    // Seed Purchase 1: Fabric Vendor Bill (Taxable Rs 3,000 + 13% Input VAT Rs 390 = Rs 3,390)
    testPurchase1 = await Purchase.create({
      billNo: 'PUR-2026-001',
      supplier: 'Kathmandu Textiles Pvt. Ltd.',
      supplierPan: '300123456',
      date: new Date(`${currentYearMonth}-05T09:00:00.000Z`),
      head: 'Purchases (stock)',
      items: [{ name: 'Cotton Jersey Fabric (meters)', qty: 50, rate: 6000, amount: 300000 }],
      subtotal: 300000, // Rs 3,000 in Paisa
      vatable: true,
      vatAmount: 39000, // 13% of 300000 = 39000 Paisa (Rs 390)
      totalAmount: 339000,
      paymentMethod: 'bank',
      paymentStatus: 'paid'
    });

    // Seed Purchase 2: Custom Packaging (Taxable Rs 1,000 + 13% Input VAT Rs 130 = Rs 1,130)
    testPurchase2 = await Purchase.create({
      billNo: 'PUR-2026-002',
      supplier: 'EcoPack Nepal',
      supplierPan: '300987654',
      date: new Date(`${currentYearMonth}-08T11:00:00.000Z`),
      head: 'Packaging & Labels',
      items: [{ name: 'Kraft Garment Bags', qty: 200, rate: 500, amount: 100000 }],
      subtotal: 100000, // Rs 1,000 in Paisa
      vatable: true,
      vatAmount: 13000, // 13% of 100000 = 13000 Paisa (Rs 130)
      totalAmount: 113000,
      paymentMethod: 'cash',
      paymentStatus: 'paid'
    });
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  // ==========================================
  // 1. Accounting Journal (Double-Entry)
  // ==========================================
  describe('Double-Entry Accounting Journal', () => {
    it('GET /api/admin/finance/journal should return balanced Dr/Cr journal entries', async () => {
      const res = await request(app)
        .get('/api/admin/finance/journal')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { entries, summary } = res.body.data;
      expect(entries.length).toBeGreaterThanOrEqual(10);
      expect(summary.isBalanced).toBe(true);
      expect(summary.totalDr).toBe(summary.totalCr);

      // Verify each transaction balances
      const byVoucher = {};
      entries.forEach((e) => {
        if (!byVoucher[e.voucher]) byVoucher[e.voucher] = { dr: 0, cr: 0 };
        byVoucher[e.voucher].dr += e.debit || 0;
        byVoucher[e.voucher].cr += e.credit || 0;
      });

      Object.keys(byVoucher).forEach((voucher) => {
        expect(byVoucher[voucher].dr).toBe(byVoucher[voucher].cr);
      });
    });
  });

  // ==========================================
  // 2. General Ledger & Daybook
  // ==========================================
  describe('General Ledger & Daybook', () => {
    it('GET /api/admin/finance/ledger should return entries and running balance for an account', async () => {
      const res = await request(app)
        .get('/api/admin/finance/ledger?account=Sales%20Revenue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.account).toBe('Sales Revenue');
      expect(res.body.data.entries.length).toBe(2);
      expect(res.body.data.closingBalance).toBeLessThan(0); // Sales revenue has credit balance
    });

    it('GET /api/admin/finance/daybook should return day transactions', async () => {
      const currentYearMonth = new Date().toISOString().slice(0, 7);
      const targetDate = `${currentYearMonth}-10`;

      const res = await request(app)
        .get(`/api/admin/finance/daybook?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.date).toBe(targetDate);
      expect(res.body.data.isBalanced).toBe(true);
      expect(res.body.data.totalDr).toBe(500000);
      expect(res.body.data.totalCr).toBe(500000);
    });
  });

  // ==========================================
  // 3. Trial Balance & Profit & Loss
  // ==========================================
  describe('Trial Balance & Profit & Loss Statement', () => {
    it('GET /api/admin/finance/trial-balance should verify zero imbalance', async () => {
      const res = await request(app)
        .get('/api/admin/finance/trial-balance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { trialList, totalDr, totalCr, isBalanced } = res.body.data;
      expect(isBalanced).toBe(true);
      expect(totalDr).toBe(totalCr);
      expect(trialList.length).toBeGreaterThanOrEqual(4);
    });

    it('GET /api/admin/finance/profit-and-loss should compute net revenue, costs, and profit', async () => {
      const res = await request(app)
        .get('/api/admin/finance/profit-and-loss')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { totalSalesNet, totalPurchasesNet, expenseBreakdown, netProfit } = res.body.data;

      // Sales Net = (500000 - 57522) + (200000 - 23009) = 442478 + 176991 = 619469 Paisa
      expect(totalSalesNet).toBe(619469);

      // Purchases Net = 300000 (stock) + 100000 (packaging) = 400000 Paisa
      expect(totalPurchasesNet).toBe(400000);
      expect(expenseBreakdown['Purchases (stock)']).toBe(300000);
      expect(expenseBreakdown['Packaging & Labels']).toBe(100000);

      // Net Profit = 619469 - 400000 = 219469 Paisa (Rs 2,194.69)
      expect(netProfit).toBe(219469);
    });
  });

  // ==========================================
  // 4. Sales Reports
  // ==========================================
  describe('Sales Periodic Reports', () => {
    it('GET /api/admin/reports/sales?mode=monthly should aggregate monthly buckets', async () => {
      const res = await request(app)
        .get('/api/admin/reports/sales?mode=monthly')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { rows, summary } = res.body.data;
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(summary.totalCount).toBe(2);
      expect(summary.totalGross).toBe(700000); // 500000 + 200000 = Rs 7,000
    });
  });

  // ==========================================
  // 5. IRD VAT Return Summaries
  // ==========================================
  describe('Inland Revenue Department (IRD) VAT Summary', () => {
    it('GET /api/admin/ird/vat-summary should compute Bikri Khata, Kharid Khata, and Net VAT Payable', async () => {
      const currentYearMonth = new Date().toISOString().slice(0, 7);

      const res = await request(app)
        .get(`/api/admin/ird/vat-summary?month=${currentYearMonth}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { summary, salesRegister, purchaseRegister } = res.body.data;

      // Sales Register (Bikri Khata)
      expect(salesRegister.length).toBe(2);
      expect(summary.sales.gross).toBe(700000);
      expect(summary.sales.vat).toBe(57522 + 23009); // 80531 Paisa (Output VAT)

      // Purchase Register (Kharid Khata)
      expect(purchaseRegister.length).toBe(2);
      expect(summary.purchases.taxable).toBe(400000);
      expect(summary.purchases.vat).toBe(39000 + 13000); // 52000 Paisa (Input VAT)

      // Net VAT Payable = Output VAT (80531) - Input VAT (52000) = 28531 Paisa (Rs 285.31)
      expect(summary.netVatPayable).toBe(80531 - 52000);
      expect(summary.netVatPayable).toBe(28531);
    });
  });

  // ==========================================
  // 6. Purchases CRUD
  // ==========================================
  describe('Purchases & Vendor Bills Management', () => {
    let createdBillId;

    it('POST /api/admin/purchases should record a new purchase bill and calculate 13% VAT', async () => {
      const res = await request(app)
        .post('/api/admin/purchases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          billNo: 'PUR-NEW-999',
          supplier: 'Himalayan Thread Mills',
          supplierPan: '301112233',
          head: 'Raw Materials',
          items: [{ name: 'Spun Yarn (cones)', qty: 10, rate: 10000, amount: 100000 }],
          vatable: true,
          paymentMethod: 'bank',
          paymentStatus: 'paid'
        });

      expect(res.status).toBe(201);
      const bill = res.body.data.purchase;
      expect(bill.subtotal).toBe(100000);
      expect(bill.vatAmount).toBe(13000); // 13% of 100000
      expect(bill.totalAmount).toBe(113000);
      createdBillId = bill.id || bill._id;
    });

    it('GET /api/admin/purchases/:id should retrieve the created bill', async () => {
      const res = await request(app)
        .get(`/api/admin/purchases/${createdBillId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.purchase.supplier).toBe('Himalayan Thread Mills');
    });

    it('DELETE /api/admin/purchases/:id should delete the bill', async () => {
      const res = await request(app)
        .delete(`/api/admin/purchases/${createdBillId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted successfully');
    });
  });
});
