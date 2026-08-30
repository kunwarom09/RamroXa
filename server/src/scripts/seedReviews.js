import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product, Variant, User, Order, Review } from '../models/index.js';
import { recalculateProductRating } from '../services/review.service.js';
import logger from '../config/logger.js';

const SAMPLE_REVIEWS_TEMPLATES = [
  { rating: 5, title: 'Incredible quality and fit', comment: 'The fabric weight and stitching are world-class. Fits true to size with a beautiful modern silhouette.' },
  { rating: 5, title: 'Exceeded my expectations', comment: 'Super comfortable all day long. Delivered to Kathmandu in under 48 hours with great packaging.' },
  { rating: 4, title: 'Great everyday staple', comment: 'Very clean cut and durable material. Holds up well through multiple cold washes with no fading.' },
  { rating: 5, title: 'Worth every rupee', comment: 'The texture is premium and breathable. Easily competes with top international designer streetwear.' },
  { rating: 5, title: 'Perfect silhouette', comment: 'The color depth matches the photos accurately. Exactly the boxy aesthetic I was searching for in Nepal.' },
  { rating: 4, title: 'Very solid purchase', comment: 'Great quality and fast delivery. Would recommend sizing up only if you want an extra relaxed streetwear drape.' }
];

async function seedReviews() {
  await connectDB();
  logger.info('🌱 Seeding reviews and verified purchases for all products...');

  const products = await Product.find({ deletedAt: null });
  const users = await User.find();

  let adminUser = users.find(u => u.role === 'admin') || users[0];
  let regularUsers = users.filter(u => u.role !== 'admin');

  if (!regularUsers.length && adminUser) {
    regularUsers = [adminUser];
  }

  let totalCreated = 0;

  for (const prod of products) {
    const variants = await Variant.find({ productId: prod.id });
    const pReviewsCount = await Review.countDocuments({ productId: prod.id });

    if (pReviewsCount === 0 && regularUsers.length > 0) {
      // Pick 2-4 users to review
      const numToCreate = Math.min(regularUsers.length, Math.floor(Math.random() * 3) + 2);

      for (let i = 0; i < numToCreate; i++) {
        const user = regularUsers[i % regularUsers.length];
        const template = SAMPLE_REVIEWS_TEMPLATES[(prod.name.length + i) % SAMPLE_REVIEWS_TEMPLATES.length];
        const chosenVar = variants[i % (variants.length || 1)] || null;

        const varColor = chosenVar?.options?.get ? chosenVar.options.get('Colour') : (chosenVar?.options?.Colour || chosenVar?.color || 'Black');
        const varSize = chosenVar?.options?.get ? chosenVar.options.get('Size') : (chosenVar?.options?.Size || chosenVar?.size || 'M');

        // Create completed order for user to verify purchase
        await Order.create({
          orderNo: `ZY-${Math.floor(100000 + Math.random() * 900000)}`,
          user: user._id,
          guestEmail: user.email,
          paymentStatus: 'paid',
          fulfillmentStatus: 'delivered',
          paymentMethod: 'cod',
          subtotal: prod.price || 180000,
          grandTotal: prod.price || 180000,
          shippingAddress: {
            fullName: user.name || 'Verified Customer',
            phone: user.phone || '9800000000',
            city: 'Kathmandu',
            line1: 'Baluwatar',
            country: 'NP'
          },
          items: [{
            product: prod._id,
            productId: prod.id,
            variant: chosenVar?._id,
            variantId: chosenVar?.id || 'v_default',
            name: prod.name,
            variantLabel: `${varColor} / ${varSize}`,
            sku: chosenVar?.sku || prod.sku,
            qty: 1,
            unitPrice: prod.price || 180000,
            lineTotal: prod.price || 180000
          }]
        });

        // Create verified review
        await Review.create({
          product: prod._id,
          productId: prod.id,
          user: user._id,
          userName: user.name || 'Verified Customer',
          userEmail: user.email || '',
          rating: template.rating,
          title: template.title,
          comment: template.comment,
          color: varColor,
          size: varSize,
          variantLabel: `${varColor} / ${varSize}`,
          status: 'published',
          verifiedPurchase: true,
          createdAt: new Date(Date.now() - (i + 1) * 24 * 3600 * 1000)
        });

        totalCreated++;
      }

      await recalculateProductRating(prod.id);
    }
  }

  logger.info(`✅ Successfully seeded ${totalCreated} reviews with verified purchases!`);
}

seedReviews()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error({ err: err.message }, 'Failed to seed reviews');
    await disconnectDB();
    process.exit(1);
  });
