import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/db.js';
import { sampleProducts20, populate20ProductsWithVariantsAndOrders } from '../src/services/populateCatalog.service.js';
import { Product, Variant, Inventory, StockMove, Warehouse } from '../src/models/index.js';

async function main() {
  console.log('Connecting to database...');
  await connectDB();

  console.log(`Populating full catalog with ${sampleProducts20.length} master products...`);
  await populate20ProductsWithVariantsAndOrders(true);

  const productCount = await Product.countDocuments();
  const variantCount = await Variant.countDocuments();
  const inventoryCount = await Inventory.countDocuments();

  console.log(`✅ Success! Database now contains:`);
  console.log(`   - ${productCount} Products`);
  console.log(`   - ${variantCount} Variants`);
  console.log(`   - ${inventoryCount} Inventory Records across Warehouses`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
