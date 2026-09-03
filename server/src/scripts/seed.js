import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { Product, Variant, Inventory, Category, Warehouse } from '../models/index.js';
import { defaultCategories, defaultWarehouses, defaultProducts } from './seedData.js';

export async function seedCategoriesAndWarehouses() {
  logger.info('🌱 Seeding default categories and warehouses...');
  await connectDB();

  // 1. Seed Categories
  const existingCats = await Category.countDocuments();
  if (existingCats === 0) {
    await Category.insertMany(defaultCategories);
    logger.info(`Inserted ${defaultCategories.length} categories`);
  }

  // 2. Seed Warehouses
  const existingWhs = await Warehouse.countDocuments();
  if (existingWhs === 0) {
    await Warehouse.insertMany(defaultWarehouses);
    logger.info(`Inserted ${defaultWarehouses.length} warehouses`);
  }
}

export async function seedProductsAndInventory() {
  logger.info('🌱 Seeding default products, variants and inventory...');
  await connectDB();

  const existingProds = await Product.countDocuments();
  if (existingProds === 0) {
    await Product.insertMany(defaultProducts);
    logger.info(`Inserted ${defaultProducts.length} products`);

    const allVariants = [];
    const allInventory = [];

    for (const p of defaultProducts) {
      const options = p.options || { Colour: ['Standard'], Size: ['One Size'] };
      const colours = options.Colour || ['Standard'];
      const sizes = options.Size || ['One Size'];

      let varIdx = 0;
      for (const col of colours) {
        for (const sz of sizes) {
          varIdx++;
          const vId = `v_${p.id}_${varIdx}`;
          const cleanCol = String(col).toUpperCase().slice(0, 4);
          const cleanSz = String(sz).toUpperCase();
          const sku = `${p.sku}-${cleanCol}-${cleanSz}`;

          allVariants.push({
            id: vId,
            productId: p.id,
            sku,
            options: { Colour: col, Size: sz },
            price: p.basePrice || p.price,
            cost: p.cost || 0,
            published: true,
            status: 'active'
          });

          // Stock in Warehouse 1 (Kathmandu DC)
          allInventory.push({
            id: `inv_${vId}_w1`,
            variantId: vId,
            warehouseId: 'w1',
            available: 40 + ((varIdx * 7) % 25),
            reserved: 0,
            reorderLevel: 5,
            archived: false
          });

          // Stock in Warehouse 2 (Pokhara Store)
          allInventory.push({
            id: `inv_${vId}_w2`,
            variantId: vId,
            warehouseId: 'w2',
            available: 20 + ((varIdx * 3) % 15),
            reserved: 0,
            reorderLevel: 5,
            archived: false
          });
        }
      }
    }

    if (allVariants.length > 0) {
      await Variant.insertMany(allVariants);
      logger.info(`Inserted ${allVariants.length} product variants`);
    }
    if (allInventory.length > 0) {
      await Inventory.insertMany(allInventory);
      logger.info(`Inserted ${allInventory.length} inventory records`);
    }
  }
}

export async function seedDatabase() {
  const { populate20ProductsWithVariantsAndOrders } = await import('../services/populateCatalog.service.js');
  await populate20ProductsWithVariantsAndOrders(false);
  logger.info('✅ Seeding completed.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err: err.message }, 'Seeding failed');
      await disconnectDB();
      process.exit(1);
    });
}

export default seedDatabase;

