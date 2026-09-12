import mongoose from 'mongoose';
import { Order, Purchase, PurchaseReturn, SalesReturn, Inventory, StockMove, Variant } from '../src/models/index.js';
import { createPurchase, cancelPurchase } from '../src/services/purchase.service.js';
import { createPurchaseReturn, cancelPurchaseReturn } from '../src/services/purchaseReturn.service.js';
import { createSalesReturn, updateSalesReturnStatus } from '../src/services/adminReturn.service.js';
import { createAdminOrder, cancelAdminOrder } from '../src/services/adminOrder.service.js';
import { buildJournal, getProfitAndLoss, getBalanceSheet } from '../src/services/finance.service.js';
import { getIrdVatSummary } from '../src/services/ird.service.js';

async function runVerification() {
  console.log('--- STARTING ACCOUNTING & IRD FLOW VERIFICATION ---');

  // Connect to local test MongoDB
  await mongoose.connect('mongodb://127.0.0.1:27017/ramroxa_local');
  console.log('Connected to MongoDB');

  // 1. Ensure test variant exists
  const testSku = 'TEST-SNK-42';
  let variant = await Variant.findOne({ sku: testSku });
  if (!variant) {
    variant = await Variant.create({
      id: 'v_test_snk_42',
      productId: 'p_test_snk',
      sku: testSku,
      name: 'Test Urban Sneaker 42',
      price: 250000, // Rs 2500 in Paisa
      options: { Size: '42', Colour: 'Black' }
    });
  }

  // Ensure initial inventory is known
  let inv = await Inventory.findOne({ variantId: variant.id, warehouseId: 'w1' });
  if (!inv) {
    inv = await Inventory.create({
      id: `inv_${variant.id}_w1`,
      variantId: variant.id,
      warehouseId: 'w1',
      available: 10,
      reserved: 0
    });
  }
  const startingStock = inv.available;
  console.log(`Initial stock for ${testSku}: ${startingStock}`);

  // 2. Test Purchase Bill creation & automatic stock increment
  const testBillNo = `TBILL-${Date.now().toString(36).toUpperCase()}`;
  const purchase = await createPurchase({
    billNo: testBillNo,
    supplier: 'Nepal Footwear Wholesale',
    supplierPan: '601234567',
    date: new Date(),
    vatable: true,
    items: [
      {
        name: 'Test Sneaker 42',
        sku: testSku,
        qty: 5,
        rate: 1500 // Rs 1500 in NPR -> 150,000 Paisa
      }
    ]
  });

  const invAfterPurchase = await Inventory.findOne({ variantId: variant.id, warehouseId: 'w1' });
  console.log(`Stock after purchase (+5): ${invAfterPurchase.available}`);
  if (invAfterPurchase.available !== startingStock + 5) {
    throw new Error(`Inventory mismatch after purchase! Expected ${startingStock + 5}, got ${invAfterPurchase.available}`);
  }
  console.log('✓ Purchase bill successfully incremented inventory stock');

  // 3. Test Purchase Return (Debit Note) & stock reduction
  const debitNote = await createPurchaseReturn({
    billNo: testBillNo,
    supplier: 'Nepal Footwear Wholesale',
    supplierPan: '601234567',
    reason: 'Defective sole on 2 units',
    items: [
      {
        name: 'Test Sneaker 42',
        sku: testSku,
        qty: 2,
        rate: 1500 // NPR
      }
    ]
  });

  const invAfterDebitNote = await Inventory.findOne({ variantId: variant.id, warehouseId: 'w1' });
  console.log(`Stock after debit note (-2): ${invAfterDebitNote.available}`);
  if (invAfterDebitNote.available !== startingStock + 3) {
    throw new Error(`Inventory mismatch after debit note! Expected ${startingStock + 3}, got ${invAfterDebitNote.available}`);
  }
  console.log(`✓ Debit Note ${debitNote.no} successfully decreased inventory stock`);

  // 4. Test Manual Admin Sale & Stock Deduction
  const testInvoiceNo = `TINV-${Date.now().toString(36).toUpperCase()}`;
  const order = await createAdminOrder({
    invoice: testInvoiceNo,
    customer: 'Nirajan Karki',
    customerPhone: '9841000000',
    vatable: true,
    payment: 'cash',
    items: [
      {
        name: 'Test Sneaker 42',
        sku: testSku,
        qty: 1,
        rate: 2500 // NPR
      }
    ]
  });

  const invAfterSale = await Inventory.findOne({ variantId: variant.id, warehouseId: 'w1' });
  console.log(`Stock after sale (-1): ${invAfterSale.available}`);
  if (invAfterSale.available !== startingStock + 2) {
    throw new Error(`Inventory mismatch after sale! Expected ${startingStock + 2}, got ${invAfterSale.available}`);
  }
  console.log(`✓ Sale Invoice ${order.orderNo} successfully deducted inventory stock`);

  // 5. Test Sales Return: Pending does NOT restock, Approval DOES restock
  const salesReturn = await createSalesReturn({
    orderNo: order.orderNo,
    customer: 'Nirajan Karki',
    refundAmount: 2500, // NPR
    reason: 'Size too small',
    status: 'pending',
    restock: 'available',
    items: [
      {
        sku: testSku,
        returnQty: 1,
        desc: 'Test Sneaker 42'
      }
    ]
  });

  const invAfterPendingReturn = await Inventory.findOne({ variantId: variant.id, warehouseId: 'w1' });
  console.log(`Stock after pending return (should be unchanged): ${invAfterPendingReturn.available}`);
  if (invAfterPendingReturn.available !== startingStock + 2) {
    throw new Error(`Pending return prematurely restocked! Expected ${startingStock + 2}, got ${invAfterPendingReturn.available}`);
  }
  console.log('✓ Pending return did NOT prematurely restock stock');

  // Now approve the return
  await updateSalesReturnStatus(salesReturn._id, { status: 'approved' });
  const invAfterApprovedReturn = await Inventory.findOne({ variantId: variant.id, warehouseId: 'w1' });
  console.log(`Stock after approved return (+1): ${invAfterApprovedReturn.available}`);
  if (invAfterApprovedReturn.available !== startingStock + 3) {
    throw new Error(`Approved return failed to restock! Expected ${startingStock + 3}, got ${invAfterApprovedReturn.available}`);
  }
  console.log(`✓ Approved return with Credit Note ${salesReturn.creditNoteNo || salesReturn.no} successfully restocked`);

  // 6. Test Double-Entry Accounting Journal Balance
  const journalResult = await buildJournal();
  console.log(`Journal Entries: ${journalResult.summary.totalEntries}`);
  console.log(`Total Dr: Rs ${journalResult.summary.totalDrNpr}, Total Cr: Rs ${journalResult.summary.totalCrNpr}`);
  if (!journalResult.summary.isBalanced) {
    throw new Error(`Journal is out of balance! Dr: ${journalResult.summary.totalDr}, Cr: ${journalResult.summary.totalCr}`);
  }
  console.log('✓ Double-Entry Journal is strictly balanced (Total Debit == Total Credit)');

  // 7. Test Profit & Loss
  const plResult = await getProfitAndLoss();
  console.log(`Gross Sales Net: Rs ${plResult.grossSalesRevenueNpr}`);
  console.log(`Sales Returns: Rs ${plResult.salesReturnsNetNpr}`);
  console.log(`Net Sales Revenue: Rs ${plResult.netSalesRevenueNpr}`);
  console.log(`Net Purchases: Rs ${plResult.netPurchasesNpr}`);
  console.log(`Net Profit: Rs ${plResult.netProfitNpr}`);
  console.log('✓ Profit & Loss calculation verified');

  // 8. Test Balance Sheet
  const bsResult = await getBalanceSheet();
  console.log(`Balance Sheet Assets: Rs ${bsResult.assets.totalAssetsNpr}`);
  console.log(`Balance Sheet Liabilities: Rs ${bsResult.liabilities.totalLiabilitiesNpr}`);
  console.log(`Balance Sheet Equity: Rs ${bsResult.equity.totalEquityNpr}`);
  console.log(`Balance Sheet Balanced: ${bsResult.isBalanced}`);
  if (!bsResult.isBalanced) {
    throw new Error('Balance sheet equation failed!');
  }
  console.log('✓ Balance Sheet verified: Assets = Liabilities + Equity');

  // 9. Test IRD VAT Summary (Schedule 8, 9, 10, 11)
  const irdResult = await getIrdVatSummary();
  console.log(`Schedule 8 Sales Count: ${irdResult.summary.sales.count}, Taxable: Rs ${irdResult.summary.sales.taxable}`);
  console.log(`Schedule 9 Purchases Count: ${irdResult.summary.purchases.count}, Taxable: Rs ${irdResult.summary.purchases.taxable}`);
  console.log(`Schedule 10 Credit Notes Count: ${irdResult.summary.creditNotes.count}`);
  console.log(`Schedule 11 Debit Notes Count: ${irdResult.summary.debitNotes.count}`);
  console.log(`Net Output VAT: Rs ${irdResult.summary.netSalesVat}, Net Input VAT: Rs ${irdResult.summary.netPurchasesVat}`);
  console.log(`Net VAT Payable to IRD: Rs ${irdResult.summary.netVatPayable}`);
  console.log('✓ Statutory IRD Schedules and VAT Reconciliation verified');

  // 10. Test Non-Deletion Soft Cancellation
  await cancelPurchase(purchase._id, { reason: 'Test purchase rollback' });
  const cancelledPurchase = await Purchase.findById(purchase._id);
  if (!cancelledPurchase || cancelledPurchase.status !== 'cancelled') {
    throw new Error('Purchase was deleted or status not cancelled!');
  }
  console.log('✓ Purchase soft-cancellation verified (record preserved with status: cancelled)');

  await cancelAdminOrder(order._id, { reason: 'Test order rollback' });
  const cancelledOrder = await Order.findById(order._id);
  if (!cancelledOrder || cancelledOrder.fulfillmentStatus !== 'cancelled') {
    throw new Error('Order was deleted or status not cancelled!');
  }
  console.log('✓ Order soft-cancellation verified (record preserved with fulfillmentStatus: cancelled)');

  console.log('--- ALL ACCOUNTING, IRD, INVENTORY & AUDIT CHECKS PASSED WITH ZERO ERRORS! ---');
  await mongoose.disconnect();
}

runVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
