import mongoose from 'mongoose';
import { Product, Variant, Inventory, StockMove, Category } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import crypto from 'crypto';

export async function findProduct(productId) {
  if (!productId) return null;
  if (mongoose.Types.ObjectId.isValid(productId) && String(new mongoose.Types.ObjectId(productId)) === String(productId)) {
    const byId = await Product.findById(productId);
    if (byId && !byId.deletedAt) return byId;
  }
  return Product.findOne({ $or: [{ id: productId }, { slug: productId }], deletedAt: null });
}

export async function listAdminProducts(query = {}) {
  const { q, category, status, page = 1, limit = 50 } = query;
  const filter = { deletedAt: null };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (category && category !== 'all') {
    filter.categoryId = category;
  }

  if (q && q.trim()) {
    filter.$or = [
      { name: { $regex: q.trim(), $options: 'i' } },
      { sku: { $regex: q.trim(), $options: 'i' } },
      { brand: { $regex: q.trim(), $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    Product.countDocuments(filter)
  ]);

  const productIds = products.map((p) => p.id);
  const [variants, inventories] = await Promise.all([
    Variant.find({ productId: { $in: productIds } }).lean(),
    Inventory.find({ archived: false }).lean()
  ]);

  const invByVariantId = inventories.reduce((acc, inv) => {
    acc[inv.variantId] = (acc[inv.variantId] || 0) + (inv.available || 0);
    return acc;
  }, {});

  const variantsByProdId = variants.reduce((acc, v) => {
    if (!acc[v.productId]) acc[v.productId] = [];
    acc[v.productId].push({
      ...v,
      availableStock: invByVariantId[v.id] || 0
    });
    return acc;
  }, {});

  const enrichedProducts = products.map((p) => {
    const prodVariants = variantsByProdId[p.id] || [];
    const totalStock = prodVariants.reduce((sum, v) => sum + (v.availableStock || 0), 0);
    return {
      ...p,
      variants: prodVariants,
      variantCount: prodVariants.length,
      totalStock
    };
  });

  return {
    products: enrichedProducts,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      pages: Math.ceil(total / take)
    }
  };
}

export async function getAdminProductById(productId) {
  const product = await findProduct(productId);

  if (!product) {
    throw ApiError.notFound(`Product with identifier '${productId}' not found.`);
  }

  const variants = await Variant.find({ productId: product.id }).lean();
  const variantIds = variants.map((v) => v.id);
  const inventories = await Inventory.find({ variantId: { $in: variantIds }, archived: false }).lean();

  const invByVariantId = inventories.reduce((acc, inv) => {
    if (!acc[inv.variantId]) acc[inv.variantId] = [];
    acc[inv.variantId].push(inv);
    return acc;
  }, {});

  const enrichedVariants = variants.map((v) => ({
    ...v,
    inventory: invByVariantId[v.id] || [],
    availableStock: (invByVariantId[v.id] || []).reduce((sum, i) => sum + i.available, 0),
    reservedStock: (invByVariantId[v.id] || []).reduce((sum, i) => sum + i.reserved, 0)
  }));

  return {
    ...(product.toObject ? product.toObject() : product),
    variants: enrichedVariants
  };
}

export async function createAdminProduct(data, user) {
  const {
    name,
    slug,
    sku,
    categoryId,
    brand = 'Zylo',
    gender = 'Unisex',
    season = 'SS26',
    tags = [],
    basePrice,
    price,
    mrp = 0,
    cost = 0,
    status = 'published',
    labels = {},
    description = '',
    options = {},
    images = [],
    variants = [],
    initialStock = 10
  } = data;

  if (!name || !categoryId) {
    throw ApiError.badRequest('Product name and categoryId are required.');
  }

  const finalPrice = basePrice !== undefined ? basePrice : price || 0;
  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = 'p_' + crypto.randomBytes(6).toString('hex');
  const finalSku = sku || `ZYL-${categoryPrefix(categoryId)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const existingSlug = await Product.findOne({ slug: finalSlug, deletedAt: null });
  if (existingSlug) {
    throw ApiError.conflict(`Product with slug '${finalSlug}' already exists.`);
  }

  const product = await Product.create({
    id,
    name,
    slug: finalSlug,
    sku: finalSku,
    categoryId,
    brand,
    gender,
    season,
    tags,
    basePrice: finalPrice,
    price: finalPrice,
    mrp,
    cost,
    status,
    labels: {
      featured: labels.featured || false,
      trending: labels.trending || false,
      newArrival: labels.newArrival || false,
      bestSelling: labels.bestSelling || false
    },
    description,
    options,
    images
  });

  // Create variants
  const createdVariants = [];

  if (variants && variants.length) {
    for (const v of variants) {
      const vId = v.id || 'v_' + crypto.randomBytes(6).toString('hex');
      const vSku = v.sku || `${finalSku}-${Object.values(v.options || {}).join('-').toUpperCase() || 'DEF'}`;
      const vPrice = v.price !== undefined ? v.price : finalPrice;

      const newVariant = await Variant.create({
        id: vId,
        productId: product.id,
        sku: vSku,
        options: v.options || {},
        price: vPrice,
        published: v.published !== false
      });

      const stockQty = v.stock !== undefined ? v.stock : initialStock;
      await Inventory.create({
        id: `inv_${vId}_w1`,
        variantId: vId,
        warehouseId: 'w1',
        available: stockQty,
        reserved: 0
      });

      if (stockQty > 0) {
        await StockMove.create({
          variantId: vId,
          warehouseId: 'w1',
          type: 'purchase',
          change: stockQty,
          reason: 'Initial Product Stock',
          reference: product.id,
          before: 0,
          after: stockQty,
          user: user ? user.name : 'Admin'
        });
      }

      createdVariants.push(newVariant);
    }
  } else {
    // Default single variant
    const vId = 'v_' + crypto.randomBytes(6).toString('hex');
    const newVariant = await Variant.create({
      id: vId,
      productId: product.id,
      sku: `${finalSku}-DEF`,
      options: {},
      price: finalPrice,
      published: true
    });

    await Inventory.create({
      id: `inv_${vId}_w1`,
      variantId: vId,
      warehouseId: 'w1',
      available: initialStock,
      reserved: 0
    });

    createdVariants.push(newVariant);
  }

  return getAdminProductById(product.id);
}

export async function updateAdminProduct(productId, updates) {
  const product = await findProduct(productId);
  if (!product) {
    throw ApiError.notFound(`Product '${productId}' not found.`);
  }

  if (updates.slug && updates.slug !== product.slug) {
    const existing = await Product.findOne({ slug: updates.slug, id: { $ne: product.id }, deletedAt: null });
    if (existing) {
      throw ApiError.conflict(`Product with slug '${updates.slug}' already exists.`);
    }
  }

  const allowedFields = [
    'name', 'slug', 'sku', 'categoryId', 'brand', 'gender', 'season', 'tags',
    'basePrice', 'price', 'mrp', 'cost', 'status', 'labels', 'description',
    'options', 'images'
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      product[field] = updates[field];
    }
  }

  if (updates.basePrice !== undefined && updates.price === undefined) {
    product.price = updates.basePrice;
  }
  if (updates.price !== undefined && updates.basePrice === undefined) {
    product.basePrice = updates.price;
  }

  await product.save();
  return getAdminProductById(product.id);
}

export async function deleteAdminProduct(productId) {
  const product = await findProduct(productId);
  if (!product) {
    throw ApiError.notFound(`Product '${productId}' not found.`);
  }

  const pId = product.id || product._id.toString();
  product.deletedAt = new Date();
  product.status = 'archived';
  await product.save();

  // Archive variants of this specific product
  await Variant.updateMany(
    { $or: [{ productId: pId }, { productId: product.id }, { productId: product._id.toString() }] },
    { published: false }
  );
  return { message: `Product '${product.name}' archived successfully.` };
}

export async function purgeAllProducts() {
  await Promise.all([
    Product.deleteMany({}),
    Variant.deleteMany({}),
    Inventory.deleteMany({}),
    StockMove.deleteMany({})
  ]);
  return { message: 'All products, variants, and inventory have been permanently deleted from database.' };
}

function categoryPrefix(catId) {
  if (catId.includes('tops') || catId.includes('apparel')) return 'APP';
  if (catId.includes('acc')) return 'ACC';
  if (catId.includes('bag')) return 'BAG';
  return 'OBJ';
}

export default {
  listAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  purgeAllProducts
};
