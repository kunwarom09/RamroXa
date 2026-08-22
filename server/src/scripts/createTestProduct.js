import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { createAdminProduct } from '../services/adminProduct.service.js';
import logger from '../config/logger.js';

async function run() {
  await connectDB();
  logger.info('Connected to DB for creating test product...');

  const productData = {
    name: 'Test by Om',
    slug: 'test-by-om',
    categoryId: 'c_tops',
    brand: 'Zylo',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['test', 'oversized', 'tee', 'custom'],
    basePrice: 250000,
    price: 250000,
    mrp: 320000,
    cost: 110000,
    status: 'published',
    labels: {
      featured: true,
      trending: true,
      newArrival: true,
      bestSelling: true
    },
    description: 'Custom luxury oversized tee created for verification. 260 GSM combed cotton with high-density minimalist graphic detailing.',
    options: {
      Colour: ['Midnight Black', 'Off White'],
      Size: ['M', 'L', 'XL']
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
        alt: 'Test by Om Front View',
        isFeatured: true
      },
      {
        url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
        alt: 'Test by Om Back View',
        isFeatured: false
      }
    ],
    variants: [
      {
        name: 'Midnight Black / M',
        options: { Colour: 'Midnight Black', Size: 'M' },
        price: 250000,
        stock: 45
      },
      {
        name: 'Midnight Black / L',
        options: { Colour: 'Midnight Black', Size: 'L' },
        price: 250000,
        stock: 50
      },
      {
        name: 'Midnight Black / XL',
        options: { Colour: 'Midnight Black', Size: 'XL' },
        price: 250000,
        stock: 30
      },
      {
        name: 'Off White / M',
        options: { Colour: 'Off White', Size: 'M' },
        price: 250000,
        stock: 40
      },
      {
        name: 'Off White / L',
        options: { Colour: 'Off White', Size: 'L' },
        price: 250000,
        stock: 35
      },
      {
        name: 'Off White / XL',
        options: { Colour: 'Off White', Size: 'XL' },
        price: 250000,
        stock: 25
      }
    ]
  };

  const user = { email: 'admin@zylo.com.np', role: 'admin' };
  const product = await createAdminProduct(productData, user);
  logger.info(`✅ Successfully created product: ${product.name} (Slug: ${product.slug}, ID: ${product.id})`);
  
  await disconnectDB();
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error creating product:', err);
    process.exit(1);
  });
