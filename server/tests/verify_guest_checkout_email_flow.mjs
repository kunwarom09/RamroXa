import mongoose from 'mongoose';
import { User, Session, VerificationToken, Cart, Order } from '../src/models/index.js';
import authService from '../src/services/auth.service.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function runEndToEndVerification() {
  console.log('🚀 Starting Guest-to-User Checkout & Email Verification E2E Flow test...');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zylo_ecommerce';
  await connectDB(mongoUri);

  const testEmail = `guest_${Date.now()}@example.com`;
  const password = 'CheckoutPass123!';

  // Step 1: Simulate Guest Cart on client
  const clientCart = [
    {
      idx: 0,
      size: 'L',
      color: 'Black',
      qty: 2,
      price: 1800
    }
  ];
  console.log('1️⃣ [Client] Guest adds item to cart:', clientCart);

  // Step 2: Guest clicks Checkout -> redirected to /signup?redirect=/checkout
  console.log('2️⃣ [Client] Guest redirected to /signup?redirect=/checkout');

  // Step 3: User fills signup form and submits
  console.log('3️⃣ [Backend] Registering user with email verification...');
  const registrationResult = await authService.register({
    name: 'Aarav Guest',
    email: testEmail,
    phone: '+977 9801234567',
    permanentAddress: 'Baluwatar, Ward 4, Kathmandu',
    temporaryAddress: 'Baluwatar, Ward 4, Kathmandu',
    password,
    redirect: '/checkout'
  });

  const createdUser = registrationResult.user;
  console.log(`✅ [Backend] Account created for: ${createdUser.email}, isEmailVerified: ${createdUser.isEmailVerified}`);
  if (createdUser.isEmailVerified !== false) {
    throw new Error('User should NOT be verified immediately upon signup!');
  }

  // Step 4: Verification token check in DB
  const tokenDoc = await VerificationToken.findOne({ user: createdUser._id || createdUser.id });
  if (!tokenDoc) {
    throw new Error('Verification token was not created in DB!');
  }
  console.log(`4️⃣ [Backend] Verification token generated: ${tokenDoc.token.slice(0, 10)}... (Expires: ${tokenDoc.expiresAt.toISOString()})`);

  // Step 5: Simulate user clicking the link from the verification email
  console.log(`5️⃣ [Client/Email] User clicks verification link -> /verify-email?token=${tokenDoc.token}&redirect=/checkout`);
  const verifyResult = await authService.verifyEmail({
    token: tokenDoc.token,
    userAgent: 'Mozilla/5.0 Test Agent',
    ip: '127.0.0.1'
  });

  console.log(`✅ [Backend] Email verified! User ${verifyResult.user.email} isEmailVerified: ${verifyResult.user.isEmailVerified}`);
  if (!verifyResult.user.isEmailVerified) {
    throw new Error('User should be verified after calling verifyEmail!');
  }
  if (!verifyResult.accessToken || !verifyResult.refreshToken) {
    throw new Error('verifyEmail should return accessToken and refreshToken for instant login!');
  }

  // Verify token was deleted
  const consumedToken = await VerificationToken.findOne({ token: tokenDoc.token });
  if (consumedToken) {
    throw new Error('Verification token was not cleaned up after use!');
  }
  console.log('✅ [Backend] Verification token was safely consumed and deleted.');

  // Step 6: User redirected back to /checkout with restored cart
  console.log('6️⃣ [Client] User is redirected back to /checkout');
  console.log(`   - Verified User: ${verifyResult.user.name} (${verifyResult.user.email})`);
  console.log(`   - Saved Address: ${verifyResult.user.permanentAddress}`);
  console.log(`   - Restored Cart: ${clientCart.length} item(s)`);

  // Clean up test user
  await User.deleteOne({ _id: createdUser._id || createdUser.id });
  await Session.deleteMany({ user: createdUser._id || createdUser.id });

  console.log('\n🎉 ALL GUEST CHECKOUT & EMAIL VERIFICATION STEPS PASSED SUCCESSFULLY!');
  await disconnectDB();
}

runEndToEndVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
