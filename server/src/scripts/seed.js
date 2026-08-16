import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { defaultCategories, defaultWarehouses, defaultProducts } from './seedData.js';

export async function seedCategoriesAndWarehouses() {
  logger.info('🌱 Seeding default categories and warehouses...');
  await connectDB();
  const db = mongoose.connection.db;

  // 1. Seed Categories
  const categoriesColl = db.collection('categories');
  const existingCats = await categoriesColl.countDocuments();
  if (existingCats === 0) {
    await categoriesColl.insertMany(defaultCategories);
    logger.info(`Inserted ${defaultCategories.length} categories`);
  }

  // 2. Seed Warehouses
  const warehousesColl = db.collection('warehouses');
  const existingWhs = await warehousesColl.countDocuments();
  if (existingWhs === 0) {
    await warehousesColl.insertMany(defaultWarehouses);
    logger.info(`Inserted ${defaultWarehouses.length} warehouses`);
  }
}

export async function seedDatabase() {
  await seedCategoriesAndWarehouses();
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
