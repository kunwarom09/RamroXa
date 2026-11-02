import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment from server/.env if not already present
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { Product, User } from '../models/index.js';
import { populate20ProductsWithVariantsAndOrders } from '../services/populateCatalog.service.js';
import { createAdminUser } from './createAdmin.js';

export async function runDeploymentSeeder({ force = false } = {}) {
  const isForce = force || process.env.FORCE_SEED === 'true';

  if (process.env.AUTO_SEED === 'false') {
    logger.info('ℹ️ [deploy:seed] AUTO_SEED is disabled via environment variable. Skipping.');
    return { skipped: true, reason: 'AUTO_SEED=false' };
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    logger.warn('⚠️ [deploy:seed] MONGODB_URI is not set. Skipping build-time seeding (will seed on runtime startup).');
    return { skipped: true, reason: 'NO_MONGODB_URI' };
  }

  logger.info('🚀 [deploy:seed] Starting deployment build seeder check...');

  try {
    // Connect with a 5 second serverSelectionTimeout
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
  } catch (connErr) {
    logger.warn(
      { err: connErr.message },
      '⚠️ [deploy:seed] MongoDB could not be reached during build/deployment phase. Database will auto-seed upon runtime startup.'
    );
    return { skipped: true, reason: 'CONN_FAILED', error: connErr.message };
  }

  try {
    const productCount = await Product.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });

    if (productCount === 0 || isForce) {
      logger.info(
        `🌱 [deploy:seed] ${isForce ? 'Force seeding' : 'Database empty - auto-seeding'} catalog, variants, inventory, and warehouses...`
      );
      const result = await populate20ProductsWithVariantsAndOrders(isForce);
      logger.info(
        { result },
        '✅ [deploy:seed] Master catalog successfully populated from repository seeds.'
      );
    } else {
      logger.info(
        `📦 [deploy:seed] Catalog already contains ${productCount} products. Skipping catalog recreation.`
      );
    }

    if (adminCount === 0) {
      logger.info('🔑 [deploy:seed] Super Admin account not found. Creating default Super Admin...');
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@zylo.com.np';
      const adminPass = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
      const adminName = process.env.ADMIN_NAME || 'Super Admin';
      await createAdminUser(adminEmail, adminPass, adminName);
      logger.info(`✅ [deploy:seed] Super Admin user created (${adminEmail}).`);
    } else {
      logger.info('🔑 [deploy:seed] Super Admin account already exists.');
    }

    logger.info('🎉 [deploy:seed] Deployment seeder step completed successfully.');
    return { success: true };
  } catch (err) {
    logger.error({ err: err.message }, '❌ [deploy:seed] Error during deployment seeding');
    // In build environments, do not crash the container/build if seeding encountered a non-fatal error
    return { success: false, error: err.message };
  } finally {
    try {
      await mongoose.disconnect();
    } catch (_) {}
  }
}

if (process.argv[1] && process.argv[1].endsWith('deploySeed.js')) {
  runDeploymentSeeder()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err: err.message }, 'Fatal error in deployment seeder');
      // Exit 0 so build step does not fail the deployment container build
      process.exit(0);
    });
}

export default runDeploymentSeeder;
