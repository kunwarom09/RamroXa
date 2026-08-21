import mongoose from 'mongoose';
import { Product, Variant, Inventory, StockMove, Category } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/regex.js';
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
    const escaped = escapeRegex(q.trim());
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { sku: { $regex: escaped, $options: 'i' } },
      { brand: { $regex: escaped, $options: 'i' } }
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

  const allVariants = await Variant.find({ productId: product.id }).lean();
  const topVariants = allVariants.filter((v) => !v.parentVariantId);
  const subVariants = allVariants.filter((v) => !!v.parentVariantId);

  const subVariantsByParent = subVariants.reduce((acc, sv) => {
    if (!acc[sv.parentVariantId]) acc[sv.parentVariantId] = [];
    acc[sv.parentVariantId].push(sv);
    return acc;
  }, {});

  const variantIds = allVariants.map((v) => v.id);
  const inventories = await Inventory.find({ variantId: { $in: variantIds }, archived: false }).lean();

  const invByVariantId = inventories.reduce((acc, inv) => {
    if (!acc[inv.variantId]) acc[inv.variantId] = [];
    acc[inv.variantId].push(inv);
    return acc;
  }, {});

  const enrichedVariants = (topVariants.length ? topVariants : allVariants).map((v) => ({
    ...v,
    subVariants: subVariantsByParent[v.id] || [],
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

  // Create variants & subvariants
  const createdVariants = [];

  if (variants && variants.length) {
    for (const v of variants) {
      const vId = v.id || 'v_' + crypto.randomBytes(6).toString('hex');
      const vName = v.name || (v.options ? Object.values(v.options).join(' / ') : '') || 'Default Variant';
      const vSku = v.sku || `${finalSku}-${(v.name || 'VAR').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'VAR'}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const vPrice = (v.amount !== undefined && v.amount !== null && v.amount !== '')
        ? Number(v.amount)
        : ((v.price !== undefined && v.price !== null && v.price !== '') ? Number(v.price) : finalPrice);

      const newVariant = await Variant.create({
        id: vId,
        name: vName,
        productId: product.id,
        parentVariantId: null,
        sku: vSku,
        options: v.options || {},
        price: vPrice,
        hidden: !!v.hidden,
        published: v.published !== false && !v.hidden,
        status: v.status || (v.hidden ? 'hidden' : (status === 'published' ? 'active' : 'draft'))
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

      // Create SubVariants if provided
      const subList = v.subVariants || v.subvariants || [];
      for (const sv of subList) {
        const svId = sv.id || 'sv_' + crypto.randomBytes(6).toString('hex');
        const svName = sv.name || (sv.options ? Object.values(sv.options).join(' / ') : '') || 'SubVariant';
        const svSku = sv.sku || `${vSku}-${(sv.name || 'SUB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SUB'}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        const svPrice = (sv.amount !== undefined && sv.amount !== null && sv.amount !== '')
          ? Number(sv.amount)
          : ((sv.price !== undefined && sv.price !== null && sv.price !== '') ? Number(sv.price) : vPrice);
        const isHidden = sv.hidden === true;

        await Variant.create({
          id: svId,
          name: svName,
          productId: product.id,
          parentVariantId: vId,
          sku: svSku,
          options: sv.options || {},
          price: svPrice,
          hidden: isHidden,
          published: !isHidden && sv.published !== false,
          status: isHidden ? 'hidden' : (sv.status || 'active')
        });
      }

      createdVariants.push(newVariant);
    }
  } else {
    // Default single variant
    const vId = 'v_' + crypto.randomBytes(6).toString('hex');
    const newVariant = await Variant.create({
      id: vId,
      name: 'Default',
      productId: product.id,
      parentVariantId: null,
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

export async function updateAdminProduct(productId, updates, user) {
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

  // If variants array is provided, sync variants & subvariants
  if (updates.variants && Array.isArray(updates.variants)) {
    const pId = product.id;
    const finalPrice = product.price || product.basePrice || 0;
    const existingVariants = await Variant.find({ productId: pId });
    const existingMap = new Map(existingVariants.map((v) => [v.id, v]));

    const processedIds = new Set();

    for (const v of updates.variants) {
      const vId = v.id || 'v_' + crypto.randomBytes(6).toString('hex');
      processedIds.add(vId);
      const vName = v.name || (v.options ? Object.values(v.options).join(' / ') : '') || 'Variant';
      const vSku = v.sku || `${product.sku}-${(v.name || 'VAR').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;
      const vPrice = (v.amount !== undefined && v.amount !== null && v.amount !== '')
        ? Number(v.amount)
        : ((v.price !== undefined && v.price !== null && v.price !== '') ? Number(v.price) : finalPrice);

      if (existingMap.has(vId)) {
        await Variant.updateOne(
          { id: vId },
          {
            name: vName,
            sku: vSku,
            parentVariantId: null,
            options: v.options || {},
            price: vPrice,
            hidden: !!v.hidden,
            published: v.published !== false && !v.hidden,
            status: v.status || (v.hidden ? 'hidden' : 'active')
          }
        );
      } else {
        await Variant.create({
          id: vId,
          name: vName,
          productId: pId,
          parentVariantId: null,
          sku: vSku,
          options: v.options || {},
          price: vPrice,
          hidden: !!v.hidden,
          published: v.published !== false && !v.hidden,
          status: v.status || (v.hidden ? 'hidden' : 'active')
        });

        await Inventory.create({
          id: `inv_${vId}_w1`,
          variantId: vId,
          warehouseId: 'w1',
          available: v.stock !== undefined ? v.stock : 10,
          reserved: 0
        });
      }

      // Handle Subvariants
      const subList = v.subVariants || v.subvariants || [];
      for (const sv of subList) {
        const svId = sv.id || 'sv_' + crypto.randomBytes(6).toString('hex');
        processedIds.add(svId);
        const svName = sv.name || (sv.options ? Object.values(sv.options).join(' / ') : '') || 'SubVariant';
        const svSku = sv.sku || `${vSku}-${(sv.name || 'SUB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;
        const svPrice = (sv.amount !== undefined && sv.amount !== null && sv.amount !== '')
          ? Number(sv.amount)
          : ((sv.price !== undefined && sv.price !== null && sv.price !== '') ? Number(sv.price) : vPrice);
        const isHidden = sv.hidden === true;

        if (existingMap.has(svId)) {
          await Variant.updateOne(
            { id: svId },
            {
              name: svName,
              sku: svSku,
              parentVariantId: vId,
              options: sv.options || {},
              price: svPrice,
              hidden: isHidden,
              published: !isHidden && sv.published !== false,
              status: isHidden ? 'hidden' : (sv.status || 'active')
            }
          );
        } else {
          await Variant.create({
            id: svId,
            name: svName,
            productId: pId,
            parentVariantId: vId,
            sku: svSku,
            options: sv.options || {},
            price: svPrice,
            hidden: isHidden,
            published: !isHidden && sv.published !== false,
            status: isHidden ? 'hidden' : (sv.status || 'active')
          });
        }
      }
    }

    // Delete variants no longer present in updates
    const toDelete = existingVariants.filter((v) => !processedIds.has(v.id)).map((v) => v.id);
    if (toDelete.length > 0) {
      await Variant.deleteMany({ id: { $in: toDelete } });
      await Inventory.deleteMany({ variantId: { $in: toDelete } });
    }
  }

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

export async function getAllDistinctTags() {
  const tags = await Product.distinct('tags', { deletedAt: null });
  return tags.filter(Boolean).sort();
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
  getAllDistinctTags,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  purgeAllProducts
};
