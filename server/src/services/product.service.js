import { Product } from '../models/Product.js';
import { Variant } from '../models/Variant.js';
import { Inventory } from '../models/Inventory.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';

import { escapeRegex } from '../utils/regex.js';

export async function listProducts(params = {}) {
  const {
    category,
    status = 'published',
    q,
    sort = 'newest',
    page = 1,
    limit = 50,
    minPrice,
    maxPrice
  } = params;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const query = { deletedAt: null };

  if (status) {
    query.status = status;
  }

  // Category filter (support category slug or category ID)
  if (category) {
    const cat = await Category.findOne({
      $or: [{ id: category }, { slug: category.toLowerCase() }]
    }).lean();

    if (cat) {
      // Find all descendant categories too
      const allCats = await Category.find({ status: 'active' }).lean();
      const catIds = [cat.id];

      const addDescendants = (parentId) => {
        allCats
          .filter((c) => c.parentId === parentId)
          .forEach((c) => {
            if (!catIds.includes(c.id)) {
              catIds.push(c.id);
              addDescendants(c.id);
            }
          });
      };
      addDescendants(cat.id);

      query.categoryId = { $in: catIds };
    } else {
      query.categoryId = category;
    }
  }

  // Price range filters (in Paisa)
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.basePrice = {};
    if (minPrice !== undefined) query.basePrice.$gte = Number(minPrice);
    if (maxPrice !== undefined) query.basePrice.$lte = Number(maxPrice);
  }

  // Text search (ReDoS protected)
  if (q && q.trim()) {
    const term = escapeRegex(q.trim());
    query.$or = [
      { name: { $regex: term, $options: 'i' } },
      { tags: { $regex: term, $options: 'i' } },
      { sku: { $regex: term, $options: 'i' } },
      { brand: { $regex: term, $options: 'i' } }
    ];
  }

  // Sort options
  const sortOptions = {};
  switch (sort) {
    case 'price_asc':
      sortOptions.basePrice = 1;
      break;
    case 'price_desc':
      sortOptions.basePrice = -1;
      break;
    case 'best_selling':
      sortOptions['labels.bestSelling'] = -1;
      sortOptions.createdAt = -1;
      break;
    case 'trending':
      sortOptions['labels.trending'] = -1;
      sortOptions.createdAt = -1;
      break;
    case 'newest':
    default:
      sortOptions.createdAt = -1;
      break;
  }

  const [products, total] = await Promise.all([
    Product.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
    Product.countDocuments(query)
  ]);

  // Enrich products with their active variants and stock count
  const productIds = products.map((p) => p.id || p._id.toString());
  const [variants, inventories] = await Promise.all([
    Variant.find({ productId: { $in: productIds }, status: { $ne: 'archived' }, hidden: { $ne: true } }).lean(),
    Inventory.find({ $or: [{ warehouseId: 'w1' }, { warehouseId: null }], archived: false }).lean()
  ]);

  const invByVariantId = inventories.reduce((acc, inv) => {
    if (inv.variantId) acc[inv.variantId] = (acc[inv.variantId] || 0) + (Number(inv.available) || 0);
    if (inv.id) acc[inv.id] = (acc[inv.id] || 0) + (Number(inv.available) || 0);
    return acc;
  }, {});

  const getVarStock = (v) => {
    if (!v) return 0;
    const vId = v.id || v._id?.toString();
    const vMongoId = v._id?.toString();
    const vSku = v.sku;
    return invByVariantId[vId] ?? (vMongoId ? invByVariantId[vMongoId] : undefined) ?? (vSku ? invByVariantId[vSku] : undefined) ?? 0;
  };

  const variantsByProductId = variants.reduce((acc, v) => {
    const vWithStock = {
      ...v,
      availableStock: getVarStock(v),
      stock: getVarStock(v)
    };
    if (!acc[v.productId]) acc[v.productId] = [];
    acc[v.productId].push(vWithStock);
    return acc;
  }, {});

  const enriched = products.map((p) => {
    const pId = p.id || p._id?.toString();
    const allProdVars = variantsByProductId[pId] || [];
    const topVars = allProdVars.filter((v) => !v.parentVariantId);
    const subVars = allProdVars.filter((v) => !!v.parentVariantId);

    const subVarsByParent = subVars.reduce((acc, sv) => {
      if (!acc[sv.parentVariantId]) acc[sv.parentVariantId] = [];
      acc[sv.parentVariantId].push(sv);
      return acc;
    }, {});

    const enrichedTopVars = (topVars.length ? topVars : allProdVars).map((v) => ({
      ...v,
      subVariants: subVarsByParent[v.id || v._id?.toString()] || []
    }));

    const effectiveStockVars = subVars.length > 0 ? subVars : allProdVars;
    const totalStock = effectiveStockVars.reduce((sum, v) => sum + (v.availableStock || 0), 0);

    return {
      ...p,
      variants: enrichedTopVars,
      allVariants: allProdVars,
      totalStock
    };
  });

  return {
    data: enriched,
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum)
  };
}

export async function getProductBySlug(slug) {
  const product = await Product.findOne({
    slug: slug.toLowerCase(),
    deletedAt: null
  }).lean();

  if (!product) {
    throw ApiError.notFound(`Product with slug '${slug}' not found.`);
  }

  const pId = product.id || product._id.toString();

  const [category, variants, inventories] = await Promise.all([
    Category.findOne({ id: product.categoryId }).lean(),
    Variant.find({ productId: pId, status: { $ne: 'archived' }, hidden: { $ne: true } }).lean(),
    Inventory.find({ $or: [{ warehouseId: 'w1' }, { warehouseId: null }], archived: false }).lean()
  ]);

  const invByVariantId = inventories.reduce((acc, inv) => {
    const keys = [inv.variantId, inv.id].filter(Boolean);
    keys.forEach(k => {
      if (!acc[k]) acc[k] = [];
      acc[k].push(inv);
    });
    return acc;
  }, {});

  const enrichedVariants = variants.map((v) => {
    const records = invByVariantId[v.id] || invByVariantId[v._id?.toString()] || invByVariantId[v.sku] || [];
    const available = records.reduce((sum, r) => sum + (r.available || 0), 0);
    const reserved = records.reduce((sum, r) => sum + (r.reserved || 0), 0);
    return {
      ...v,
      availableStock: available,
      stock: available,
      reservedStock: reserved,
      sellableStock: Math.max(0, available - reserved),
      inventoryRecords: records
    };
  });

  const topVars = enrichedVariants.filter((v) => !v.parentVariantId);
  const subVars = enrichedVariants.filter((v) => !!v.parentVariantId);

  const subVarsByParent = subVars.reduce((acc, sv) => {
    if (!acc[sv.parentVariantId]) acc[sv.parentVariantId] = [];
    acc[sv.parentVariantId].push(sv);
    return acc;
  }, {});

  const structuredTopVars = (topVars.length ? topVars : enrichedVariants).map((v) => ({
    ...v,
    subVariants: subVarsByParent[v.id || v._id?.toString()] || []
  }));

  const effectiveStockVars = subVars.length > 0 ? subVars : enrichedVariants;

  return {
    ...product,
    category,
    variants: enrichedVariants,
    structuredVariants: structuredTopVars,
    allVariants: enrichedVariants,
    totalStock: effectiveStockVars.reduce((sum, v) => sum + (v.availableStock || 0), 0)
  };
}

export default { listProducts, getProductBySlug };
