import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import env from './env.js';
import logger from './logger.js';

let isConnected = false;
let memoryServer = null;
let mongodChildProcess = null;

async function ensurePersistentMongod() {
  const dataDir = path.resolve(process.cwd(), 'data/db');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    const { MongoBinary } = await import('mongodb-memory-server-core');
    const binPath = await MongoBinary.getPath();
    if (binPath && fs.existsSync(binPath)) {
      logger.info(`Starting persistent MongoDB on port 27017 with storage at ${dataDir}...`);
      mongodChildProcess = spawn(binPath, ['--dbpath', dataDir, '--port', '27017', '--bind_ip', '127.0.0.1'], {
        stdio: 'ignore',
        detached: true
      });
      mongodChildProcess.unref();
      // Wait for MongoDB to bind and start listening
      await new Promise(r => setTimeout(r, 1500));
      return true;
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not spawn persistent mongod process');
  }
  return false;
}

export async function seedIfEmpty() {
  try {
    const { Product, User } = await import('../models/index.js');
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      logger.info('Database empty. Seeding initial catalog, categories, products, inventory, and reviews...');
      const { seedDatabase } = await import('../scripts/seed.js');
      await seedDatabase();
      try {
        const { default: populateService } = await import('../services/populateCatalog.service.js');
        if (populateService) await populateService(false);
      } catch (e) { }
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
      serverSelectionTimeoutMS: 2000,
      autoIndex: true
    });
    isConnected = true;
    if (env.NODE_ENV !== 'test' && !process.env.VITEST && !uri.includes('memory')) {
      await seedIfEmpty();
    }
    return conn.connection;
  } catch (error) {
    if (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test' && !process.env.VITEST && !uri.startsWith('mongodb+srv://') && !uri.includes('memory')) {
      logger.warn('Could not connect to external MongoDB. Attempting to start persistent local MongoDB daemon...');
      const started = await ensurePersistentMongod();
      if (started) {
        try {
          const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000, autoIndex: true });
          isConnected = true;
          logger.info({ host: conn.connection.host, name: conn.connection.name }, 'Connected to persistent MongoDB');
          await seedIfEmpty();
          return conn.connection;
        } catch (retryErr) {
          logger.warn({ err: retryErr.message }, 'Retry connection to local MongoDB failed, falling back to in-memory instance');
        }
      }

      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        if (!memoryServer) {
          memoryServer = await MongoMemoryServer.create();
        }
        const memUri = memoryServer.getUri();
        const conn = await mongoose.connect(memUri, { autoIndex: true });
        isConnected = true;
        logger.info('Connected to embedded MongoDB dev server');
        await seedIfEmpty();
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
