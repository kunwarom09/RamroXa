import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product, Variant, Inventory } from '../models/index.js';

export async function addShoeProduct() {
  await connectDB();

  const shoeProduct = {
    id: 'prod_phantom_velocity',
    name: 'Phantom Velocity Trail Runner',
    slug: 'phantom-velocity-trail-runner',
    sku: 'ZYL-SHOE-003',
    categoryId: 'c_footwear',
    productType: 'Footwear',
    brand: 'Ramroxa Footwear',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['shoes', 'sneakers', 'runner', 'footwear', 'trail', 'carbon', 'vibram'],
    description: 'Engineered for rugged terrains and urban concrete alike. Features a multi-directional Vibram® Megagrip lugged outsole, breathable ripstop Cordura® upper with TPU film overlays, and an energy-returning dual-density nitrogen-infused midsole.',
    options: {
      Colour: ['Triple Black', 'Desert Sand', 'Alpine Green'],
      Size: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11']
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&auto=format&fit=crop&q=80',
        alt: 'Phantom Velocity Trail Runner Profile',
        isFeatured: true,
        format: 'webp'
      },
      {
        url: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80',
        alt: 'Phantom Velocity Trail Runner Outsole Detail',
        isFeatured: false,
        format: 'webp'
      }
    ],
    status: 'published',
    labels: {
      featured: true,
      trending: true,
      newArrival: true,
      bestSelling: true
    },
    basePrice: 580000,
    price: 580000,
    mrp: 750000,
    cost: 260000,
    ratingAvg: 4.9,
    ratingCount: 14,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await Product.findOneAndUpdate(
    { id: shoeProduct.id },
    shoeProduct,
    { upsert: true, new: true }
  );
  console.log(`✅ Product created in MongoDB: ${shoeProduct.name} (${shoeProduct.id})`);

  const colours = shoeProduct.options.Colour;
  const sizes = shoeProduct.options.Size;

  let idx = 0;
  for (const col of colours) {
    for (const sz of sizes) {
      idx++;
      const cleanSz = sz.toLowerCase().replace(/\s+/g, '');
      const cleanCol = col.toLowerCase().replace(/\s+/g, '');
      const vId = `v_${shoeProduct.id}_${cleanSz}_${cleanCol}`;
      const sku = `${shoeProduct.sku}-${sz.replace(/\s+/g, '')}-${col.slice(0, 3).toUpperCase()}`;
      const barcode = `890${String(Date.now()).slice(-6)}${String(idx).padStart(3, '0')}`;

      const variantDoc = {
        id: vId,
        productId: shoeProduct.id,
        sku,
        barcode,
        options: { Size: sz, Colour: col },
        price: shoeProduct.basePrice,
        compareAtPrice: shoeProduct.mrp,
        cost: shoeProduct.cost,
        weight: 650,
        published: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await Variant.findOneAndUpdate(
        { id: vId },
        variantDoc,
        { upsert: true, new: true }
      );

      // Warehouse 1 (Kathmandu DC)
      await Inventory.findOneAndUpdate(
        { id: `inv_${vId}_w1` },
        {
          id: `inv_${vId}_w1`,
          variantId: vId,
          warehouseId: 'w1',
          available: 12 + ((idx * 3) % 10),
          reserved: 0,
          incoming: 0,
          damaged: 0,
          returned: 0,
          reorderLevel: 3,
          minStock: 1,
          maxStock: 50,
          archived: false,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      // Warehouse 2 (Pokhara Store)
      await Inventory.findOneAndUpdate(
        { id: `inv_${vId}_w2` },
        {
          id: `inv_${vId}_w2`,
          variantId: vId,
          warehouseId: 'w2',
          available: 6 + ((idx * 2) % 6),
          reserved: 0,
          incoming: 0,
          damaged: 0,
          returned: 0,
          reorderLevel: 2,
          minStock: 1,
          maxStock: 25,
          archived: false,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }
  }

  console.log(`✅ Inserted ${colours.length * sizes.length} UK-size Variants & Inventory records!`);
  await disconnectDB();
}

if (process.argv[1] && process.argv[1].endsWith('addShoeProduct.js')) {
  addShoeProduct()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
