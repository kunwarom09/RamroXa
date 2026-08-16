import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';

let isConnected = false;
let memoryServer = null;

export async function connectDB(uri = env.MONGODB_URI) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      autoIndex: true
    });
    isConnected = true;
    logger.info({ host: conn.connection.host, name: conn.connection.name }, 'Connected to MongoDB');
    return conn.connection;
  } catch (error) {
    if (env.NODE_ENV !== 'production' && !uri.startsWith('mongodb+srv://') && !uri.includes('memory')) {
      logger.warn('Could not connect to external MongoDB. Initializing embedded MongoDB server for dev...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        if (!memoryServer) {
          memoryServer = await MongoMemoryServer.create();
        }
        const memUri = memoryServer.getUri();
        const conn = await mongoose.connect(memUri, { autoIndex: true });
        isConnected = true;
        logger.info('Connected to embedded MongoDB dev server');

        // Auto-seed initial categories, warehouses and admin user
        const { seedCategoriesAndWarehouses } = await import('../scripts/seed.js');
        const { createAdminUser } = await import('../scripts/createAdmin.js');
        await seedCategoriesAndWarehouses();
        await createAdminUser('admin@zylo.com.np', 'AdminPassword123!', 'Super Admin');
        logger.info('✅ Embedded database initialized with admin (admin@zylo.com.np / AdminPassword123!)');
        return conn.connection;
      } catch (memErr) {
        logger.error({ err: memErr.message }, 'Failed to initialize embedded MongoDB');
      }
    }
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
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
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
