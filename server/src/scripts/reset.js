import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { seedDatabase } from './seed.js';

export async function resetDatabase() {
  logger.warn('⚠️ Resetting database...');
  await connectDB();

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const coll of collections) {
    if (coll.name !== 'system.indexes') {
      await db.collection(coll.name).deleteMany({});
      logger.info(`Cleared collection: ${coll.name}`);
    }
  }

  await seedDatabase();
  const { createAdminUser } = await import('./createAdmin.js');
  await createAdminUser('admin@zylo.com.np', 'AdminPassword123!', 'Super Admin');
  logger.info('✅ Database reset and re-seeded successfully with Super Admin.');
}

if (process.argv[1] && process.argv[1].endsWith('reset.js')) {
  resetDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err: err.message }, 'Database reset failed');
      await disconnectDB();
      process.exit(1);
    });
}

export default resetDatabase;
