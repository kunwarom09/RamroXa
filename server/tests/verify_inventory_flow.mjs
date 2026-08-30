import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Variant, Product, Inventory, StockMove } from '../src/models/index.js';
import { adjustStock, listAdminInventory, getVariantTransactions } from '../src/services/adminInventory.service.js';
import { listProducts, getProductBySlug } from '../src/services/product.service.js';

async function run() {
  console.log('--- 1. Connecting to Database ---');
  await connectDB();

  // Find or create UK 8 / Black variant
  let targetVariant = await Variant.findOne({ sku: { $regex: 'UK.*8.*BLK|UK-8-BLACK', $options: 'i' } });
  if (!targetVariant) {
    targetVariant = await Variant.findOne({ name: { $regex: 'UK 8', $options: 'i' } });
  }

  if (!targetVariant) {
    // Find a shoe or product with sizes to check
    const shoeProduct = await Product.findOne({ $or: [{ name: { $regex: 'shoe|boot|sneaker|leather|low-top', $options: 'i' } }, { categoryId: 'c_shoes' }] });
    if (shoeProduct) {
      targetVariant = await Variant.findOne({ productId: shoeProduct.id });
    }
  }

  if (!targetVariant) {
    targetVariant = await Variant.findOne();
  }

  console.log('Target Variant:', {
    id: targetVariant.id,
    sku: targetVariant.sku,
    name: targetVariant.name,
    productId: targetVariant.productId
  });

  const vId = targetVariant.id;

  // Step 1: Initial Stock = 10
  console.log('\n--- Step 1: Setting initial stock to 10 ---');
  await adjustStock({
    variantId: vId,
    warehouseId: 'w1',
    mode: 'set',
    change: 10,
    reason: 'Initial test setup'
  });

  // Verify in Database
  let dbInv = await Inventory.findOne({ variantId: vId, warehouseId: 'w1' });
  console.log(`DB Stock: ${dbInv.available} (Expected: 10)`);
  if (dbInv.available !== 10) throw new Error('Initial stock mismatch in DB');

  // Step 2: Change stock 10 -> 7
  console.log('\n--- Step 2: Adjusting stock 10 -> 7 ---');
  await adjustStock({
    variantId: vId,
    warehouseId: 'w1',
    mode: 'set',
    change: 7,
    reason: 'Stock correction: 10 -> 7'
  });

  dbInv = await Inventory.findOne({ variantId: vId, warehouseId: 'w1' });
  console.log(`DB Stock after change: ${dbInv.available} (Expected: 7)`);
  if (dbInv.available !== 7) throw new Error('Stock 7 mismatch in DB');

  // Check Admin Inventory API
  const adminInvList = await listAdminInventory();
  const adminItem = adminInvList.find(item => item.variantId === vId || item.sku === targetVariant.sku);
  console.log(`Admin Inventory API Available Stock: ${adminItem?.available} (Expected: 7)`);
  if (adminItem?.available !== 7) throw new Error('Admin Inventory API mismatch for stock 7');

  // Check Public Storefront API
  const publicProds = await listProducts();
  const publicProd = publicProds.data.find(p => p.id === targetVariant.productId);
  const publicVar = publicProd?.allVariants?.find(v => v.id === vId || v.sku === targetVariant.sku);
  console.log(`Client Storefront API Available Stock: ${publicVar?.availableStock} (Expected: 7)`);
  if (publicVar?.availableStock !== 7) throw new Error('Client Storefront API mismatch for stock 7');

  // Check Stock Ledger
  const transactions = await getVariantTransactions({ variantId: vId, sku: targetVariant.sku });
  console.log(`Stock Ledger entries count: ${transactions.ledger.length}`);
  const latestMove = transactions.ledger[0];
  console.log(`Latest Move in Ledger: change=${latestMove.change}, before=${latestMove.before}, after=${latestMove.after}`);
  if (latestMove.after !== 7) throw new Error('Stock Ledger after mismatch for 7');

  // Step 3: Change stock 7 -> 12
  console.log('\n--- Step 3: Adjusting stock 7 -> 12 ---');
  await adjustStock({
    variantId: vId,
    warehouseId: 'w1',
    mode: 'set',
    change: 12,
    reason: 'Stock increase: 7 -> 12'
  });

  dbInv = await Inventory.findOne({ variantId: vId, warehouseId: 'w1' });
  console.log(`DB Stock after change: ${dbInv.available} (Expected: 12)`);
  if (dbInv.available !== 12) throw new Error('Stock 12 mismatch in DB');

  const adminInvList12 = await listAdminInventory();
  const adminItem12 = adminInvList12.find(item => item.variantId === vId || item.sku === targetVariant.sku);
  console.log(`Admin Inventory API Available Stock: ${adminItem12?.available} (Expected: 12)`);
  if (adminItem12?.available !== 12) throw new Error('Admin Inventory API mismatch for stock 12');

  const publicProds12 = await listProducts();
  const publicProd12 = publicProds12.data.find(p => p.id === targetVariant.productId);
  const publicVar12 = publicProd12?.allVariants?.find(v => v.id === vId || v.sku === targetVariant.sku);
  console.log(`Client Storefront API Available Stock: ${publicVar12?.availableStock} (Expected: 12)`);
  if (publicVar12?.availableStock !== 12) throw new Error('Client Storefront API mismatch for stock 12');

  // Step 4: Change stock 12 -> 0
  console.log('\n--- Step 4: Adjusting stock 12 -> 0 ---');
  await adjustStock({
    variantId: vId,
    warehouseId: 'w1',
    mode: 'set',
    change: 0,
    reason: 'Stock depletion: 12 -> 0'
  });

  dbInv = await Inventory.findOne({ variantId: vId, warehouseId: 'w1' });
  console.log(`DB Stock after change: ${dbInv.available} (Expected: 0)`);
  if (dbInv.available !== 0) throw new Error('Stock 0 mismatch in DB');

  const adminInvList0 = await listAdminInventory();
  const adminItem0 = adminInvList0.find(item => item.variantId === vId || item.sku === targetVariant.sku);
  console.log(`Admin Inventory API Available Stock: ${adminItem0?.available} (Expected: 0)`);
  if (adminItem0?.available !== 0) throw new Error('Admin Inventory API mismatch for stock 0');

  const publicProds0 = await listProducts();
  const publicProd0 = publicProds0.data.find(p => p.id === targetVariant.productId);
  const publicVar0 = publicProd0?.allVariants?.find(v => v.id === vId || v.sku === targetVariant.sku);
  console.log(`Client Storefront API Available Stock: ${publicVar0?.availableStock} (Expected: 0)`);
  if (publicVar0?.availableStock !== 0) throw new Error('Client Storefront API mismatch for stock 0');

  console.log('\n=========================================');
  console.log('✅ ALL INVENTORY FLOW TESTS PASSED 100%!');
  console.log('=========================================');

  await disconnectDB();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
