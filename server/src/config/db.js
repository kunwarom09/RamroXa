import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';

let isConnected = false;

export async function seedIfEmpty() {
  try {
    const { Product, User } = await import('../models/index.js');
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      logger.info('Database empty. Seeding initial catalog, categories, products, inventory, and reviews...');
      const { populate20ProductsWithVariantsAndOrders } = await import('../services/populateCatalog.service.js');
      await populate20ProductsWithVariantsAndOrders(false);
    } else {
      logger.info(`Database contains ${productCount} products. Skipping seeding.`);
    }

    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const { createAdminUser } = await import('../scripts/createAdmin.js');
      await createAdminUser('admin@zylo.com.np', 'AdminPassword123!', 'Super Admin');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Auto-seed check encountered an issue');
  }
}

export async function connectDB(uri = env.MONGODB_URI) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: process.env.MONGODB_TIMEOUT_MS ? parseInt(process.env.MONGODB_TIMEOUT_MS, 10) : 5000,
      autoIndex: env.NODE_ENV !== 'production'
    });
    isConnected = true;
    if (env.NODE_ENV !== 'test' && !process.env.VITEST && !uri.includes('memory')) {
      await seedIfEmpty();
    }
    return conn.connection;
  } catch (error) {
    logger.error({ err: error.message }, 'Failed to connect to MongoDB');
    throw error;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Disconnected from MongoDB');
  }
}

export function isDbReady() {
  return mongoose.connection.readyState === 1;
}

export async function pingDB() {
  if (!isDbReady()) return false;
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (e) {
    return false;
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error({ err: err.message }, 'MongoDB connection error');
});

export default { connectDB, disconnectDB, isDbReady, pingDB };
