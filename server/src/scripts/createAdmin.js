import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';

export async function createAdminUser(
  email = 'admin@zylo.com.np',
  password = 'AdminPassword123!',
  name = 'Zylo Admin'
) {
  logger.info(`Creating admin user for: ${email}`);
  await connectDB();

  const db = mongoose.connection.db;
  const usersColl = db.collection('users');

  const existing = await usersColl.findOne({ email: email.toLowerCase() });
  if (existing) {
    logger.warn(`User with email ${email} already exists.`);
    return existing;
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const adminDoc = {
    email: email.toLowerCase(),
    passwordHash,
    name,
    role: 'admin',
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await usersColl.insertOne(adminDoc);
  logger.info(`✅ Admin user created with ID: ${result.insertedId}`);
  return adminDoc;
}

if (process.argv[1] && process.argv[1].endsWith('createAdmin.js')) {
  createAdminUser()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err: err.message }, 'Failed to create admin');
      await disconnectDB();
      process.exit(1);
    });
}

export default createAdminUser;
