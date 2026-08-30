import mongoose from 'mongoose';
import { Product, Variant, Inventory, StockMove, Category } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/regex.js';
import crypto from 'crypto';

export function categoryPrefix(catId) {
  if (!catId) return 'GEN';
  return String(catId).replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GEN';
}

export async function ensureUniqueVariantSku(baseSkuCandidate, currentVariantId = null, usedSkusInBatch = new Set()) {
  let cleanBase = String(baseSkuCandidate || 'SKU').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-').replace(/--+/g, '-');
  if (!cleanBase || cleanBase === '-') cleanBase = 'SKU';
  let candidate = cleanBase;
  let counter = 1;

  while (
    usedSkusInBatch.has(candidate) ||
    (await Variant.findOne({ sku: candidate, ...(currentVariantId ? { id: { $ne: currentVariantId } } : {}) }))
  ) {
    counter++;
    candidate = `${cleanBase}-${counter}`;
  }

  usedSkusInBatch.add(candidate);
  return candidate;
}

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

  const subVariants = variants.filter((v) => !!v.parentVariantId);

  const subVariantsByParent = subVariants.reduce((acc, sv) => {
    if (!acc[sv.parentVariantId]) acc[sv.parentVariantId] = [];
    acc[sv.parentVariantId].push({
      ...sv,
      availableStock: invByVariantId[sv.id] || 0,
      stock: invByVariantId[sv.id] || 0
    });
    return acc;
  }, {});

  const variantsByProdId = variants.reduce((acc, v) => {
    if (!acc[v.productId]) acc[v.productId] = [];
    acc[v.productId].push(v);
    return acc;
  }, {});

  const enrichedProducts = products.map((p) => {
    const prodAllVars = variantsByProdId[p.id] || [];
    const prodTopVars = prodAllVars.filter((v) => !v.parentVariantId);
    const prodSubVars = prodAllVars.filter((v) => !!v.parentVariantId);

    const structuredVariants = (prodTopVars.length ? prodTopVars : prodAllVars).map((v) => {
      const subs = subVariantsByParent[v.id] || [];
      const directStock = invByVariantId[v.id] || 0;
      const subStock = subs.reduce((sum, s) => sum + (s.availableStock || 0), 0);
      const stock = subs.length > 0 ? subStock : directStock;
      return {
        ...v,
        subVariants: subs,
        availableStock: stock,
        stock
      };
    });

    const totalStock = prodSubVars.length > 0
      ? prodSubVars.reduce((sum, sv) => sum + (invByVariantId[sv.id] || 0), 0)
      : prodTopVars.reduce((sum, tv) => sum + (invByVariantId[tv.id] || 0), 0);

    return {
      ...p,
      variants: structuredVariants,
      allVariants: prodAllVars.map((v) => ({
        ...v,
        availableStock: invByVariantId[v.id] || 0,
        stock: invByVariantId[v.id] || 0
      })),
      variantCount: structuredVariants.length,
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

  const variantIds = allVariants.map((v) => v.id);
  const inventories = await Inventory.find({ variantId: { $in: variantIds }, archived: false }).lean();

  const invByVariantId = inventories.reduce((acc, inv) => {
    if (!acc[inv.variantId]) acc[inv.variantId] = [];
    acc[inv.variantId].push(inv);
    return acc;
  }, {});

  const enrichedSubvariants = (subVariants || []).map((sv) => ({
    ...sv,
    inventory: invByVariantId[sv.id] || [],
    availableStock: (invByVariantId[sv.id] || []).reduce((sum, i) => sum + i.available, 0),
    reservedStock: (invByVariantId[sv.id] || []).reduce((sum, i) => sum + i.reserved, 0)
  }));

  const subVariantsByParent = enrichedSubvariants.reduce((acc, sv) => {
    if (!acc[sv.parentVariantId]) acc[sv.parentVariantId] = [];
    acc[sv.parentVariantId].push(sv);
    return acc;
  }, {});

  const enrichedVariants = (topVariants.length ? topVariants : allVariants).map((v) => {
    const subs = subVariantsByParent[v.id] || [];
    const directAvailable = (invByVariantId[v.id] || []).reduce((sum, i) => sum + i.available, 0);
    const directReserved = (invByVariantId[v.id] || []).reduce((sum, i) => sum + i.reserved, 0);
    const subsAvailable = subs.reduce((sum, s) => sum + (s.availableStock || 0), 0);
    const subsReserved = subs.reduce((sum, s) => sum + (s.reservedStock || 0), 0);
    return {
      ...v,
      subVariants: subs,
      inventory: invByVariantId[v.id] || [],
      availableStock: subs.length > 0 ? subsAvailable : directAvailable,
      reservedStock: subs.length > 0 ? subsReserved : directReserved
    };
  });

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

  if (!name || !name.trim()) {
    throw ApiError.badRequest('Product Name is required.');
  }
  if (!categoryId || !categoryId.trim()) {
    throw ApiError.badRequest('Category is required.');
  }

  const finalPrice = basePrice !== undefined && basePrice !== null ? Number(basePrice) : (price !== undefined && price !== null ? Number(price) : 0);
  if (isNaN(finalPrice) || finalPrice <= 0) {
    throw ApiError.badRequest('Price is required and must be greater than 0.');
  }

  const baseSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product';
  let finalSlug = baseSlug;
  let counter = 1;
  while (await Product.findOne({ slug: finalSlug, deletedAt: null })) {
    counter++;
    finalSlug = `${baseSlug}-${counter}`;
  }
  const id = 'p_' + crypto.randomBytes(6).toString('hex');
  let baseSku = sku || `ZYL-${categoryPrefix(categoryId)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  let finalSku = baseSku;
  let skuCounter = 1;
  while (await Product.findOne({ sku: finalSku, deletedAt: null })) {
    skuCounter++;
    finalSku = `${baseSku}-${skuCounter}`;
  }

  const validGenders = ['Men', 'Women', 'Unisex', 'Kids'];
  const normalizedGender = validGenders.find((g) => g.toLowerCase() === String(gender || '').toLowerCase().trim()) || 'Unisex';

  const validStatuses = ['draft', 'published', 'archived'];
  const normalizedStatus = validStatuses.find((s) => s.toLowerCase() === String(status || '').toLowerCase().trim()) || 'published';

  const validImages = (Array.isArray(images) ? images : [])
    .filter((img) => img && (typeof img === 'string' ? img.trim() : (img.url && typeof img.url === 'string' && img.url.trim())))
    .map((img, idx) => {
      if (typeof img === 'string') {
        return { url: img.trim(), alt: name, isFeatured: idx === 0, format: 'webp' };
      }
      return {
        url: img.url.trim(),
        alt: img.alt || name,
        isFeatured: img.isFeatured !== undefined ? !!img.isFeatured : idx === 0,
        format: img.format || 'webp'
      };
    });

  const product = await Product.create({
    id,
    name,
    slug: finalSlug,
    sku: finalSku,
    categoryId,
    brand,
    gender: normalizedGender,
    season,
    tags,
    basePrice: finalPrice,
    price: finalPrice,
    mrp,
    cost,
    status: normalizedStatus,
    labels: {
      featured: labels.featured || false,
      trending: labels.trending || false,
      newArrival: labels.newArrival || false,
      bestSelling: labels.bestSelling || false
    },
    description,
    options,
    images: validImages
  });

  // Create variants & subvariants
  const createdVariants = [];
  const usedSkusInBatch = new Set();
  usedSkusInBatch.add(finalSku.toUpperCase());

  if (variants && variants.length) {
    for (let vIndex = 0; vIndex < variants.length; vIndex++) {
      const v = variants[vIndex];
      const vId = v.id || 'v_' + crypto.randomBytes(6).toString('hex');
      const vName = v.name || (v.options ? Object.values(v.options).join(' / ') : '') || `Variant ${vIndex + 1}`;
      const rawVSku = (v.sku && v.sku.trim()) || `${finalSku}-${(v.name || 'VAR').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'VAR'}-${vIndex + 1}`;
      const vSku = await ensureUniqueVariantSku(rawVSku, null, usedSkusInBatch);
      const vPrice = (v.amount !== undefined && v.amount !== null && v.amount !== '')
        ? Number(v.amount)
        : ((v.price !== undefined && v.price !== null && v.price !== '') ? Number(v.price) : finalPrice);

      const isValHidden = v.hidden === true || v.status === 'hidden';
      const isValPublished = normalizedStatus === 'published' && !isValHidden && v.published !== false && v.status !== 'draft';

      const newVariant = await Variant.create({
        id: vId,
        name: vName,
        productId: product.id,
        parentVariantId: null,
        sku: vSku,
        options: v.options || {},
        price: vPrice,
        hidden: isValHidden,
        published: isValPublished,
        status: isValHidden ? 'hidden' : (isValPublished ? 'active' : 'draft')
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
      for (let sIndex = 0; sIndex < subList.length; sIndex++) {
        const sv = subList[sIndex];
        const svId = sv.id || 'sv_' + crypto.randomBytes(6).toString('hex');
        const svName = sv.name || (sv.options ? Object.values(sv.options).join(' / ') : '') || `SubVariant ${sIndex + 1}`;
        const rawSvSku = (sv.sku && sv.sku.trim()) || `${vSku}-${(sv.name || 'SUB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'SUB'}-${sIndex + 1}`;
        const svSku = await ensureUniqueVariantSku(rawSvSku, null, usedSkusInBatch);
        const svPrice = (sv.amount !== undefined && sv.amount !== null && sv.amount !== '')
          ? Number(sv.amount)
          : ((sv.price !== undefined && sv.price !== null && sv.price !== '') ? Number(sv.price) : vPrice);
        let svOpts = sv.options ? (sv.options instanceof Map ? Object.fromEntries(sv.options) : { ...sv.options }) : {};
        if (!svOpts.Size && !svOpts.size) {
          const parentSize = (v.name || '').replace(/^(Size|Variant)\s*:\s*/i, '').trim();
          if (parentSize) svOpts.Size = parentSize;
        }
        if (!svOpts.Colour && !svOpts.colour && !svOpts.Color && !svOpts.color) {
          let subCol = (sv.name || '').replace(/^(Size|Variant)\s*:\s*/i, '').trim();
          if (subCol.includes('/')) {
            const parts = subCol.split('/');
            subCol = parts[parts.length - 1].trim();
          }
          if (subCol) svOpts.Colour = subCol;
        }

        await Variant.create({
          id: svId,
          name: svName,
          productId: product.id,
          parentVariantId: vId,
          sku: svSku,
          options: svOpts,
          price: svPrice,
          hidden: isHidden,
          published: isSubPublished,
          status: isHidden ? 'hidden' : (isSubPublished ? 'active' : 'draft')
        });

        const svStock = sv.stock !== undefined ? sv.stock : stockQty;
        await Inventory.create({
          id: `inv_${svId}_w1`,
          variantId: svId,
          warehouseId: 'w1',
          available: svStock,
          reserved: 0
        });

        if (svStock > 0) {
          await StockMove.create({
            variantId: svId,
            warehouseId: 'w1',
            type: 'purchase',
            change: svStock,
            reason: 'Initial Subvariant Stock',
            reference: product.id,
            before: 0,
            after: svStock,
            user: user ? user.name : 'Admin'
          });
        }
      }

      createdVariants.push(newVariant);
    }
  } else {
    // Default single variant
    const vId = 'v_' + crypto.randomBytes(6).toString('hex');
    const defaultSku = await ensureUniqueVariantSku(`${finalSku}-DEF`, null, usedSkusInBatch);
    const newVariant = await Variant.create({
      id: vId,
      name: 'Default',
      productId: product.id,
      parentVariantId: null,
      sku: defaultSku,
      options: {},
      price: finalPrice,
      hidden: false,
      published: normalizedStatus === 'published',
      status: normalizedStatus === 'published' ? 'active' : 'draft'
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
      const baseSlug = updates.slug;
      let candidateSlug = baseSlug;
      let counter = 1;
      while (await Product.findOne({ slug: candidateSlug, id: { $ne: product.id }, deletedAt: null })) {
        counter++;
        candidateSlug = `${baseSlug}-${counter}`;
      }
      updates.slug = candidateSlug;
    }
  }

  if (updates.gender !== undefined) {
    const validGenders = ['Men', 'Women', 'Unisex', 'Kids'];
    updates.gender = validGenders.find((g) => g.toLowerCase() === String(updates.gender || '').toLowerCase().trim()) || 'Unisex';
  }
  if (updates.status !== undefined) {
    const validStatuses = ['draft', 'published', 'archived'];
    updates.status = validStatuses.find((s) => s.toLowerCase() === String(updates.status || '').toLowerCase().trim()) || 'published';
  }
  if (updates.images !== undefined && Array.isArray(updates.images)) {
    updates.images = updates.images
      .filter((img) => img && (typeof img === 'string' ? img.trim() : (img.url && typeof img.url === 'string' && img.url.trim())))
      .map((img, idx) => {
        if (typeof img === 'string') {
          return { url: img.trim(), alt: updates.name || product.name, isFeatured: idx === 0, format: 'webp' };
        }
        return {
          url: img.url.trim(),
          alt: img.alt || updates.name || product.name,
          isFeatured: img.isFeatured !== undefined ? !!img.isFeatured : idx === 0,
          format: img.format || 'webp'
        };
      });
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
    const usedSkusInBatch = new Set();
    usedSkusInBatch.add(product.sku.toUpperCase());

    for (let vIndex = 0; vIndex < updates.variants.length; vIndex++) {
      const v = updates.variants[vIndex];
      const vId = v.id || 'v_' + crypto.randomBytes(6).toString('hex');
      processedIds.add(vId);
      const vName = v.name || (v.options ? Object.values(v.options).join(' / ') : '') || `Variant ${vIndex + 1}`;
      const rawVSku = (v.sku && v.sku.trim()) || `${product.sku}-${(v.name || 'VAR').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'VAR'}-${vIndex + 1}`;
      const vSku = await ensureUniqueVariantSku(rawVSku, vId, usedSkusInBatch);
      const vPrice = (v.amount !== undefined && v.amount !== null && v.amount !== '')
        ? Number(v.amount)
        : ((v.price !== undefined && v.price !== null && v.price !== '') ? Number(v.price) : finalPrice);

      const isValHidden = v.hidden === true || v.status === 'hidden';
      const isValPublished = product.status === 'published' && !isValHidden && v.published !== false && v.status !== 'draft';

      if (existingMap.has(vId)) {
        await Variant.updateOne(
          { id: vId },
          {
            name: vName,
            sku: vSku,
            parentVariantId: null,
            options: v.options || {},
            price: vPrice,
            hidden: isValHidden,
            published: isValPublished,
            status: isValHidden ? 'hidden' : (isValPublished ? 'active' : 'draft')
          }
        );

        if (v.stock !== undefined) {
          const vStock = Number(v.stock);
          const existingInv = await Inventory.findOne({ variantId: vId });
          if (existingInv) {
            if (existingInv.available !== vStock) {
              const diff = vStock - existingInv.available;
              existingInv.available = vStock;
              await existingInv.save();
              await StockMove.create({
                variantId: vId,
                warehouseId: existingInv.warehouseId || 'w1',
                type: diff > 0 ? 'purchase' : 'correction',
                change: diff,
                reason: 'Master Product Stock Update',
                reference: product.id,
                before: vStock - diff,
                after: vStock,
                user: user ? user.name : 'Admin'
              });
            }
          } else {
            await Inventory.create({
              id: `inv_${vId}_w1`,
              variantId: vId,
              warehouseId: 'w1',
              available: vStock,
              reserved: 0
            });
          }
        }
      } else {
        await Variant.create({
          id: vId,
          name: vName,
          productId: pId,
          parentVariantId: null,
          sku: vSku,
          options: v.options || {},
          price: vPrice,
          hidden: isValHidden,
          published: isValPublished,
          status: isValHidden ? 'hidden' : (isValPublished ? 'active' : 'draft')
        });

        const vStock = v.stock !== undefined ? Number(v.stock) : 10;
        await Inventory.create({
          id: `inv_${vId}_w1`,
          variantId: vId,
          warehouseId: 'w1',
          available: vStock,
          reserved: 0
        });
      }

      // Handle Subvariants
      const subList = v.subVariants || v.subvariants || [];
      for (let sIndex = 0; sIndex < subList.length; sIndex++) {
        const sv = subList[sIndex];
        const svId = sv.id || 'sv_' + crypto.randomBytes(6).toString('hex');
        processedIds.add(svId);
        const svName = sv.name || (sv.options ? Object.values(sv.options).join(' / ') : '') || `SubVariant ${sIndex + 1}`;
        const rawSvSku = (sv.sku && sv.sku.trim()) || `${vSku}-${(sv.name || 'SUB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'SUB'}-${sIndex + 1}`;
        const svSku = await ensureUniqueVariantSku(rawSvSku, svId, usedSkusInBatch);
        const svPrice = (sv.amount !== undefined && sv.amount !== null && sv.amount !== '')
          ? Number(sv.amount)
          : ((sv.price !== undefined && sv.price !== null && sv.price !== '') ? Number(sv.price) : vPrice);
        const isHidden = sv.hidden === true || sv.status === 'hidden';
        const isSubPublished = product.status === 'published' && !isHidden && sv.published !== false && sv.status !== 'draft';

        const svStock = sv.stock !== undefined ? Number(sv.stock) : (v.stock !== undefined ? Number(v.stock) : 25);
        let svOpts = sv.options ? (sv.options instanceof Map ? Object.fromEntries(sv.options) : { ...sv.options }) : {};
        if (!svOpts.Size && !svOpts.size) {
          const parentSize = (v.name || '').replace(/^(Size|Variant)\s*:\s*/i, '').trim();
          if (parentSize) svOpts.Size = parentSize;
        }
        if (!svOpts.Colour && !svOpts.colour && !svOpts.Color && !svOpts.color) {
          let subCol = (sv.name || '').replace(/^(Size|Variant)\s*:\s*/i, '').trim();
          if (subCol.includes('/')) {
            const parts = subCol.split('/');
            subCol = parts[parts.length - 1].trim();
          }
          if (subCol) svOpts.Colour = subCol;
        }

        if (existingMap.has(svId)) {
          await Variant.updateOne(
            { id: svId },
            {
              name: svName,
              sku: svSku,
              parentVariantId: vId,
              options: svOpts,
              price: svPrice,
              hidden: isHidden,
              published: isSubPublished,
              status: isHidden ? 'hidden' : (isSubPublished ? 'active' : 'draft')
            }
          );
          const existingInv = await Inventory.findOne({ variantId: svId });
          if (existingInv) {
            if (sv.stock !== undefined && existingInv.available !== svStock) {
              const diff = svStock - existingInv.available;
              existingInv.available = svStock;
              await existingInv.save();
              await StockMove.create({
                variantId: svId,
                warehouseId: existingInv.warehouseId || 'w1',
                type: diff > 0 ? 'purchase' : 'correction',
                change: diff,
                reason: 'Master Product Subvariant Stock Update',
                reference: product.id,
                before: svStock - diff,
                after: svStock,
                user: user ? user.name : 'Admin'
              });
            }
          } else {
            await Inventory.create({
              id: `inv_${svId}_w1`,
              variantId: svId,
              warehouseId: 'w1',
              available: svStock,
              reserved: 0
            });
          }
        } else {
          await Variant.create({
            id: svId,
            name: svName,
            productId: pId,
            parentVariantId: vId,
            sku: svSku,
            options: svOpts,
            price: svPrice,
            hidden: isHidden,
            published: isSubPublished,
            status: isHidden ? 'hidden' : (isSubPublished ? 'active' : 'draft')
          });
          await Inventory.create({
            id: `inv_${svId}_w1`,
            variantId: svId,
            warehouseId: 'w1',
            available: svStock,
            reserved: 0
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

export default {
  listAdminProducts,
  getAdminProductById,
  getAllDistinctTags,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  purgeAllProducts
};
