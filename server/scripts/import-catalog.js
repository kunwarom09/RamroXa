#!/usr/bin/env node
/**
 * Safe, idempotent catalog importer for Zylo E-Commerce (OP_RAMROXA).
 * Loads products and variants into MongoDB using Mongoose models.
 *
 * Usage:
 *   node scripts/import-catalog.js [flags]
 *
 * Flags:
 *   --products <path>         Path to products JSON file
 *   --variants <path>         Path to variants JSON file
 *   --apply                   Execute live database writes (default is DRY-RUN)
 *   --rollback <manifest>     Rollback an import using its manifest file
 *   --create-inventory        Create default warehouse inventory docs
 *   --stock-qty <number>      Initial stock quantity per variant (default: 0)
 *   --publish                 Set imported products and variants to Published
 *   --archive-existing        Archive existing products so only new products appear
 *   --confirm-production      Required for production or remote databases
 *   --confirm-backup          Bypass interactive backup confirmation prompt
 *   --help                    Show help message
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { z } from 'zod';

import { connectDB, disconnectDB } from '../src/config/db.js';
import env from '../src/config/env.js';
import logger from '../src/config/logger.js';
import {
  Product,
  Variant,
  Category,
  Inventory,
  Warehouse,
  StockMove,
  Order
} from '../src/models/index.js';

// --- Security & Sanitation Helpers ---

export function stripHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasNoDollarOrDot(str) {
  return typeof str === 'string' && !str.includes('$') && !str.includes('.');
}

export function isValidImageUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return false;
  }
  return trimmed.startsWith('/') || /^https:\/\/[^\s]+$/.test(trimmed);
}

export function maskMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/[^@]+@/, '//***:***@');
}

export function checkFileSize(filePath, maxBytes = 20 * 1024 * 1024) {
  const stat = fs.statSync(filePath);
  if (stat.size > maxBytes) {
    throw new Error(
      `File ${filePath} (${(stat.size / 1024 / 1024).toFixed(2)} MB) exceeds 20 MB security limit.`
    );
  }
}

// --- Strict Allow-List Zod Schemas ---

const moneyField = z
  .number({ invalid_type_error: 'Money field must be an integer (paisa)' })
  .int('Money field must be an integer (paisa)')
  .min(0, 'Money field cannot be negative')
  .nullable();

const requiredMoneyField = z
  .number({ invalid_type_error: 'Money field must be an integer (paisa)' })
  .int('Money field must be an integer (paisa)')
  .min(0, 'Money field cannot be negative');

export const imageItemSchema = z
  .object({
    url: z.string().refine(isValidImageUrl, 'Image URL must be relative (/uploads/...) or https://'),
    alt: z.string().max(300).optional().default(''),
    isFeatured: z.boolean().optional().default(false),
    format: z.string().optional().default('webp')
  })
  .strict();

export const productInputSchema = z
  .object({
    name: z.string().min(1, 'Product name is required').max(300, 'Product name exceeds 300 chars'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .max(200, 'Slug exceeds 200 chars')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
    sku: z.string().min(1, 'SKU is required').max(64, 'SKU exceeds 64 chars'),
    categoryId: z.string().min(1, 'categoryId is required').max(64),
    productType: z.string().max(100).optional().default('Top Wear'),
    brand: z.string().max(100).optional().default('Zylo'),
    gender: z.enum(['Men', 'Women', 'Unisex', 'Kids']).optional().default('Unisex'),
    season: z.string().max(50).optional().default('SS26'),
    tags: z.array(z.string().max(50)).max(50).optional().default([]),
    description: z.string().max(5000, 'Description exceeds 5000 chars').optional().default(''),
    options: z
      .record(
        z.string().refine(hasNoDollarOrDot, 'Option key cannot contain $ or .'),
        z.array(z.string().refine(hasNoDollarOrDot, 'Option value cannot contain $ or .'))
      )
      .optional()
      .default({}),
    images: z.array(imageItemSchema).max(50).optional().default([]),
    status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
    labels: z
      .object({
        featured: z.boolean().optional().default(false),
        trending: z.boolean().optional().default(false),
        newArrival: z.boolean().optional().default(false),
        bestSelling: z.boolean().optional().default(false)
      })
      .optional()
      .default({}),
    basePrice: requiredMoneyField,
    price: requiredMoneyField,
    mrp: z.number().int().min(0).optional().default(0),
    cost: z.number().int().min(0).optional().default(0),
    ratingAvg: z.number().min(0).max(5).optional().default(0),
    ratingCount: z.number().int().min(0).optional().default(0),
    deletedAt: z.union([z.string(), z.date(), z.null()]).optional().default(null)
  })
  .strict();

export const variantInputSchema = z
  .object({
    productSku: z.string().min(1, 'productSku is required').max(64),
    sku: z.string().min(1, 'SKU is required').max(64),
    name: z.string().max(300).optional().default(''),
    options: z
      .record(
        z.string().refine(hasNoDollarOrDot, 'Option key cannot contain $ or .'),
        z.string().refine(hasNoDollarOrDot, 'Option value cannot contain $ or .')
      )
      .optional()
      .default({}),
    price: moneyField,
    compareAtPrice: moneyField.optional().default(null),
    cost: moneyField.optional().default(null),
    barcode: z.string().max(100).nullable().optional(),
    capacity: z.string().max(100).nullable().optional(),
    weight: z.number().nullable().optional(),
    status: z
      .enum(['active', 'draft', 'published', 'hidden', 'out_of_stock', 'discontinued', 'archived'])
      .optional()
      .default('out_of_stock'),
    published: z.boolean().optional().default(false),
    hidden: z.boolean().optional().default(false)
  })
  .strict();

// --- Pre-sanitization wrappers ---

export function sanitizeProductInput(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    ...raw,
    name: stripHtml(raw.name),
    description: stripHtml(raw.description),
    brand: stripHtml(raw.brand)
  };
}

export function sanitizeVariantInput(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    ...raw,
    name: stripHtml(raw.name),
    barcode: raw.barcode === '' ? null : raw.barcode
  };
}

// --- Referential Integrity & Checks ---

export async function resolveCategory(rawId) {
  if (!rawId) return null;
  let cat = await Category.findOne({ $or: [{ id: rawId }, { slug: rawId }] }).lean();
  if (cat) return cat.id;

  const norm = rawId.replace(/^cat_/, '');
  cat = await Category.findOne({ $or: [{ id: `c_${norm}` }, { slug: norm }] }).lean();
  if (cat) return cat.id;

  return null;
}

export function checkSkusAndOrphans(products, variants, existingProductSkus = new Set()) {
  const errors = [];
  const warnings = [];
  const pSkus = new Set();
  const pSlugs = new Set();
  const vSkus = new Set();

  for (const [idx, p] of products.entries()) {
    const skuNorm = p.sku.trim().toUpperCase();
    if (pSkus.has(skuNorm)) {
      errors.push({ type: 'DUPLICATE_PRODUCT_SKU', sku: p.sku, reason: `Duplicate product SKU in file at index ${idx}: ${p.sku}` });
    }
    pSkus.add(skuNorm);

    const slugNorm = p.slug.trim().toLowerCase();
    if (pSlugs.has(slugNorm)) {
      errors.push({ type: 'DUPLICATE_PRODUCT_SLUG', sku: p.sku, reason: `Duplicate product slug in file at index ${idx}: ${p.slug}` });
    }
    pSlugs.add(slugNorm);
  }

  const allKnownProductSkus = new Set([...pSkus, ...existingProductSkus]);
  const productSkusWithVariants = new Set();

  for (const [idx, v] of variants.entries()) {
    const vSkuNorm = v.sku.trim().toUpperCase();
    if (vSkus.has(vSkuNorm)) {
      errors.push({ type: 'DUPLICATE_VARIANT_SKU', sku: v.sku, reason: `Duplicate variant SKU in file at index ${idx}: ${v.sku}` });
    }
    vSkus.add(vSkuNorm);

    const parentSkuNorm = v.productSku.trim().toUpperCase();
    if (!allKnownProductSkus.has(parentSkuNorm)) {
      errors.push({
        type: 'ORPHAN_VARIANT',
        sku: v.sku,
        reason: `Orphan variant at index ${idx} with SKU ${v.sku}: parent productSku '${v.productSku}' not found.`
      });
    } else {
      productSkusWithVariants.add(parentSkuNorm);
    }

    if (!vSkuNorm.startsWith(parentSkuNorm) && !vSkuNorm.includes(parentSkuNorm)) {
      warnings.push({
        type: 'SKU_PATTERN_MISMATCH',
        sku: v.sku,
        parentSku: v.productSku,
        reason: `Variant SKU '${v.sku}' does not follow parent SKU pattern '${v.productSku}'.`
      });
    }

    const vOpts = v.options || {};
    for (const [k, val] of Object.entries(vOpts)) {
      if (val === '' || val === null || val === undefined) {
        warnings.push({
          type: 'EMPTY_OPTION_VALUE',
          sku: v.sku,
          reason: `Variant has empty option value for key '${k}'.`
        });
      }
    }
  }

  for (const pSku of pSkus) {
    if (!productSkusWithVariants.has(pSku)) {
      warnings.push({
        type: 'PRODUCT_WITHOUT_VARIANTS',
        sku: pSku,
        reason: `Product with SKU '${pSku}' has 0 variants in the file.`
      });
    }
  }

  return { errors, warnings, productSkus: pSkus, variantSkus: vSkus };
}

export function checkOptionConsistency(products, variants) {
  const discrepancies = [];
  const pMap = new Map(products.map((p) => [p.sku.trim().toUpperCase(), p]));

  for (const v of variants) {
    const p = pMap.get(v.productSku.trim().toUpperCase());
    if (!p) continue;
    const pOpt = p.options || {};
    const vOpt = v.options || {};

    for (const [k, val] of Object.entries(vOpt)) {
      if (!pOpt[k]) {
        discrepancies.push({
          variantSku: v.sku,
          productSku: p.sku,
          issue: `Variant option key '${k}' not defined on parent product options`,
          key: k,
          value: val
        });
      } else if (!pOpt[k].includes(val)) {
        discrepancies.push({
          variantSku: v.sku,
          productSku: p.sku,
          issue: `Variant option value '${val}' not in parent allowed array for '${k}' (${JSON.stringify(pOpt[k])})`,
          key: k,
          value: val
        });
      }
    }
  }

  return discrepancies;
}

// --- File Locators ---

export function locateInputFiles(productsArg, variantsArg) {
  const candidateProducts = [
    productsArg,
    path.resolve('/home/om/scrapper/products_new.json'),
    path.resolve(process.cwd(), '../scrapper/products_new.json'),
    path.resolve(process.cwd(), 'products_new.json')
  ].filter(Boolean);

  const candidateVariants = [
    variantsArg,
    path.resolve('/home/om/scrapper/variants_new.json'),
    path.resolve(process.cwd(), '../scrapper/variants_new.json'),
    path.resolve(process.cwd(), 'variants_new.json')
  ].filter(Boolean);

  const productsPath = candidateProducts.find((p) => fs.existsSync(p));
  const variantsPath = candidateVariants.find((p) => fs.existsSync(p));

  if (!productsPath) {
    throw new Error('Products JSON file not found. Specify with --products <path>');
  }
  if (!variantsPath) {
    throw new Error('Variants JSON file not found. Specify with --variants <path>');
  }

  return { productsPath, variantsPath };
}

// --- Rollback Runner ---

export async function runRollback(manifestPath) {
  const resolvedPath = path.resolve(process.cwd(), manifestPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Rollback manifest file not found: ${resolvedPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  console.log(`\n================ ROLLBACK EXECUTION ================`);
  console.log(`Manifest Timestamp: ${manifest.timestamp}`);
  console.log(`Target Database   : ${manifest.targetDb}`);
  console.log(`Products to remove: ${manifest.products?.insertedObjectIds?.length || 0}`);
  console.log(`Variants to remove: ${manifest.variants?.insertedObjectIds?.length || 0}`);
  console.log(`Inventories remove: ${manifest.inventory?.insertedObjectIds?.length || 0}`);

  await connectDB();

  const insertedVariantIds = manifest.variants?.insertedIds || [];

  if (insertedVariantIds.length > 0) {
    const orderCount = await Order.countDocuments({
      'items.variantId': { $in: insertedVariantIds }
    });
    if (orderCount > 0) {
      throw new Error(
        `Rollback aborted! ${orderCount} order(s) exist for imported variants. Refusing to delete active order records.`
      );
    }

    const moveCount = await StockMove.countDocuments({
      variantId: { $in: insertedVariantIds }
    });
    if (moveCount > 0) {
      throw new Error(
        `Rollback aborted! ${moveCount} stock move(s) exist for imported variants.`
      );
    }
  }

  // 1. Delete created Inventory docs
  if (manifest.inventory?.insertedObjectIds?.length) {
    const res = await Inventory.deleteMany({
      _id: { $in: manifest.inventory.insertedObjectIds }
    });
    console.log(`Deleted ${res.deletedCount} inventory records.`);
  }

  // 2. Delete created Variants
  if (manifest.variants?.insertedObjectIds?.length) {
    const res = await Variant.deleteMany({
      _id: { $in: manifest.variants.insertedObjectIds }
    });
    console.log(`Deleted ${res.deletedCount} variant records.`);
  }

  // 3. Delete created Products
  if (manifest.products?.insertedObjectIds?.length) {
    const res = await Product.deleteMany({
      _id: { $in: manifest.products.insertedObjectIds }
    });
    console.log(`Deleted ${res.deletedCount} product records.`);
  }

  // 4. Restore updated products
  if (manifest.products?.updated?.length) {
    const restoreOps = manifest.products.updated.map((item) => ({
      updateOne: {
        filter: { sku: item.sku },
        update: { $set: item.previous }
      }
    }));
    await Product.bulkWrite(restoreOps);
    console.log(`Restored ${restoreOps.length} updated product records to previous state.`);
  }

  // 5. Restore updated variants
  if (manifest.variants?.updated?.length) {
    const restoreOps = manifest.variants.updated.map((item) => ({
      updateOne: {
        filter: { sku: item.sku },
        update: { $set: item.previous }
      }
    }));
    await Variant.bulkWrite(restoreOps);
    console.log(`Restored ${restoreOps.length} updated variant records to previous state.`);
  }

  console.log(`\n✅ Rollback completed successfully from ${manifestPath}.\n`);
  await disconnectDB();
}

// --- Check Replica Set Transaction Support ---

export async function detectReplicaSet() {
  try {
    const res = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(res.setName || res.hosts || res.msg === 'isdbgrid');
  } catch {
    return false;
  }
}

// --- Main Catalog Import Runner ---

export async function runCatalogImport({
  productsPath,
  variantsPath,
  apply = false,
  createInventory = false,
  stockQty = 0,
  publish = false,
  archiveExisting = false,
  confirmProduction = false,
  confirmBackup = false
}) {
  checkFileSize(productsPath);
  checkFileSize(variantsPath);

  let rawProducts, rawVariants;
  try {
    rawProducts = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse products JSON file: ${err.message}`);
  }
  try {
    rawVariants = JSON.parse(fs.readFileSync(variantsPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse variants JSON file: ${err.message}`);
  }

  if (!Array.isArray(rawProducts) || !Array.isArray(rawVariants)) {
    throw new Error('Input files must contain JSON arrays.');
  }

  // 1. Strict Zod Validation & Sanitization
  const sanitizedProducts = [];
  const validationErrors = [];

  for (const [idx, rawP] of rawProducts.entries()) {
    const cleanP = sanitizeProductInput(rawP);
    const parseRes = productInputSchema.safeParse(cleanP);
    if (!parseRes.success) {
      validationErrors.push({
        type: 'Product',
        index: idx,
        sku: rawP?.sku || 'UNKNOWN',
        issues: parseRes.error.issues
      });
    } else {
      sanitizedProducts.push(parseRes.data);
    }
  }

  const sanitizedVariants = [];
  for (const [idx, rawV] of rawVariants.entries()) {
    const cleanV = sanitizeVariantInput(rawV);
    const parseRes = variantInputSchema.safeParse(cleanV);
    if (!parseRes.success) {
      validationErrors.push({
        type: 'Variant',
        index: idx,
        sku: rawV?.sku || 'UNKNOWN',
        issues: parseRes.error.issues
      });
    } else {
      sanitizedVariants.push(parseRes.data);
    }
  }

  const totalInputDocs = rawProducts.length + rawVariants.length;
  const errorRate = totalInputDocs > 0 ? (validationErrors.length / totalInputDocs) * 100 : 0;

  if (validationErrors.length > 0) {
    console.error(`\n❌ SCHEMA VALIDATION FAILED on ${validationErrors.length} record(s) (${errorRate.toFixed(2)}%).`);
    validationErrors.slice(0, 10).forEach((err) => {
      console.error(
        `  - ${err.type} [SKU: ${err.sku}] at index ${err.index}: ${JSON.stringify(err.issues.map((i) => `${i.path.join('.')}: ${i.message}`))}`
      );
    });
    if (validationErrors.length > 10) {
      console.error(`  ... and ${validationErrors.length - 10} more validation error(s).`);
    }

    if (errorRate > 5) {
      throw new Error(`Validation error rate (${errorRate.toFixed(2)}%) exceeds safety threshold of 5%. Import aborted.`);
    }
  }

  // Connect to DB for referential integrity checks and resolution
  await connectDB();

  // 2. Resolve Categories (link categoryId to existing category)
  const categoryMap = new Map();
  const unresolvableCategories = new Set();

  for (const p of sanitizedProducts) {
    if (!categoryMap.has(p.categoryId)) {
      const resolved = await resolveCategory(p.categoryId);
      if (!resolved) {
        unresolvableCategories.add(p.categoryId);
      } else {
        categoryMap.set(p.categoryId, resolved);
      }
    }
  }

  if (unresolvableCategories.size > 0) {
    const missingList = Array.from(unresolvableCategories).join(', ');
    throw new Error(
      `Category verification failed: missing category in MongoDB [${missingList}]. Halting import as required.`
    );
  }

  for (const p of sanitizedProducts) {
    p.categoryId = categoryMap.get(p.categoryId);
  }

  // 3. Check SKU collisions & orphans
  const existingProductDocs = await Product.find({}, { sku: 1, slug: 1, id: 1 }).lean();
  const existingProductSkus = new Set(existingProductDocs.map((doc) => doc.sku.toUpperCase()));

  const { errors: integrityErrors, warnings: integrityWarnings } = checkSkusAndOrphans(
    sanitizedProducts,
    sanitizedVariants,
    existingProductSkus
  );

  if (integrityErrors.length > 0) {
    console.error(`\n❌ INTEGRITY ERRORS DETECTED:`);
    integrityErrors.forEach((e) => console.error(`  - [${e.type}] ${e.reason}`));
    throw new Error(`Catalog integrity check failed with ${integrityErrors.length} error(s). Import aborted.`);
  }

  // 4. Option consistency checks (detect and report, do not silently fix)
  const optionDiscrepancies = checkOptionConsistency(sanitizedProducts, sanitizedVariants);

  // 5. Categorize Insert vs Update
  const existingProductsBySku = new Map(
    existingProductDocs.map((doc) => [doc.sku.toUpperCase(), doc])
  );

  const existingVariantDocs = await Variant.find({}, { sku: 1, id: 1 }).lean();
  const existingVariantsBySku = new Map(
    existingVariantDocs.map((doc) => [doc.sku.toUpperCase(), doc])
  );

  let pToInsert = 0;
  let pToUpdate = 0;
  for (const p of sanitizedProducts) {
    if (existingProductsBySku.has(p.sku.toUpperCase())) {
      pToUpdate++;
    } else {
      pToInsert++;
    }
  }

  let vToInsert = 0;
  let vToUpdate = 0;
  for (const v of sanitizedVariants) {
    if (existingVariantsBySku.has(v.sku.toUpperCase())) {
      vToUpdate++;
    } else {
      vToInsert++;
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDbMasked = maskMongoUri(env.MONGODB_URI);

  // Build Summary Report Object
  const report = {
    timestamp: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    targetDb: targetDbMasked,
    environment: env.NODE_ENV,
    totals: {
      products: {
        read: rawProducts.length,
        valid: sanitizedProducts.length,
        inserted: apply ? pToInsert : 0,
        updated: apply ? pToUpdate : 0,
        toInsert: pToInsert,
        toUpdate: pToUpdate,
        skipped: 0,
        rejected: validationErrors.filter((e) => e.type === 'Product').length
      },
      variants: {
        read: rawVariants.length,
        valid: sanitizedVariants.length,
        inserted: apply ? vToInsert : 0,
        updated: apply ? vToUpdate : 0,
        toInsert: vToInsert,
        toUpdate: vToUpdate,
        skipped: 0,
        rejected: validationErrors.filter((e) => e.type === 'Variant').length
      },
      inventories: {
        createInventoryFlag: createInventory,
        stockPerVariant: stockQty,
        read: 0,
        valid: createInventory ? vToInsert : 0,
        inserted: apply && createInventory ? vToInsert : 0,
        updated: 0,
        skipped: createInventory ? 0 : sanitizedVariants.length,
        rejected: 0
      }
    },
    warnings: [
      ...integrityWarnings,
      ...optionDiscrepancies.map((d) => ({
        type: 'OPTION_DISCREPANCY',
        sku: d.variantSku,
        parentSku: d.productSku,
        reason: d.issue
      }))
    ],
    rejections: validationErrors.map((e) => ({
      type: e.type,
      sku: e.sku,
      index: e.index,
      reasons: e.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    }))
  };

  // Print Summary Table
  console.log('\n' + '='.repeat(80));
  console.log(
    `               ZYLO CATALOG IMPORT SUMMARY [${apply ? 'LIVE APPLY' : 'DRY-RUN'}]`
  );
  console.log('='.repeat(80));
  console.log(`Target Database   : ${targetDbMasked} (${env.NODE_ENV})`);
  console.log(`Publish Mode      : ${publish ? 'PUBLISHED (Visible on Storefront)' : 'DRAFT'}`);
  console.log(`Archive Existing  : ${archiveExisting ? 'YES (Non-imported products will be archived)' : 'NO'}`);
  console.log(`Products in File  : ${sanitizedProducts.length}`);
  console.log(`  -> To Insert    : ${pToInsert}`);
  console.log(`  -> To Update    : ${pToUpdate}`);
  console.log(`  -> Rejected     : ${report.totals.products.rejected}`);
  console.log(`Variants in File  : ${sanitizedVariants.length}`);
  console.log(`  -> To Insert    : ${vToInsert}`);
  console.log(`  -> To Update    : ${vToUpdate}`);
  console.log(`  -> Rejected     : ${report.totals.variants.rejected}`);
  console.log(`Inventory Creation: ${createInventory ? `${vToInsert} new records (${stockQty} units each)` : 'Skipped'}`);
  console.log(`Warnings Detected : ${report.warnings.length} (listed in report)`);
  console.log('='.repeat(80));

  const reportFileName = `import-report-${timestamp}.json`;
  fs.writeFileSync(reportFileName, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Full report saved to: ${reportFileName}`);

  // If DRY-RUN, stop here cleanly
  if (!apply) {
    console.log(
      `\n💡 DRY-RUN complete! Validated all records with 0 fatal errors. Run with --apply to commit.\n`
    );
    await disconnectDB();
    return { report, manifest: null };
  }

  // --- LIVE APPLY EXECUTION ---

  // Check backup confirmation
  const backupCmds = [
    `mongodump --uri="${targetDbMasked}" --collection=products --out=./backup_${timestamp}`,
    `mongodump --uri="${targetDbMasked}" --collection=variants --out=./backup_${timestamp}`,
    `mongodump --uri="${targetDbMasked}" --collection=inventories --out=./backup_${timestamp}`,
    `mongodump --uri="${targetDbMasked}" --collection=stockmoves --out=./backup_${timestamp}`
  ];

  console.log('\n' + '-'.repeat(80));
  console.log('📦 MANDATORY DATABASE BACKUP COMMAND:');
  backupCmds.forEach((cmd) => console.log(`   ${cmd}`));
  console.log('-'.repeat(80));

  if (!confirmBackup) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('Confirm that a current backup of these collections exists? (yes/no): ');
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.error('\n❌ Backup not confirmed. Aborting live apply.\n');
      await disconnectDB();
      process.exit(1);
    }
  }

  // Check replica set support for transactions
  const isReplicaSet = await detectReplicaSet();
  if (isReplicaSet) {
    console.log('🔄 MongoDB Replica Set detected: bulk batches will run in ACID multi-document transactions.');
  } else {
    console.log('ℹ️  MongoDB is Standalone (no replica set): bulk batches will execute without transactions.');
  }

  // Archive existing products if requested
  if (archiveExisting) {
    const fileSkus = new Set(sanitizedProducts.map((p) => p.sku.toUpperCase()));
    const archiveRes = await Product.updateMany(
      { sku: { $nin: Array.from(fileSkus) }, status: { $ne: 'archived' } },
      { $set: { status: 'archived' } }
    );
    console.log(`📦 Archived ${archiveRes.modifiedCount} existing non-catalog product(s) so only new catalog displays.`);
  }

  console.log(`\n🚀 Commencing LIVE database upsert...`);

  const manifest = {
    timestamp: new Date().toISOString(),
    targetDb: targetDbMasked,
    environment: env.NODE_ENV,
    appliedBy: `${process.env.USER || 'system'}@${process.env.HOSTNAME || 'localhost'}`,
    products: {
      insertedIds: [],
      insertedObjectIds: [],
      insertedSkus: [],
      updated: []
    },
    variants: {
      insertedIds: [],
      insertedObjectIds: [],
      insertedSkus: [],
      updated: []
    },
    inventory: {
      insertedIds: [],
      insertedObjectIds: []
    }
  };

  // Find default warehouse if inventory creation requested
  let defaultWarehouse = null;
  if (createInventory) {
    defaultWarehouse =
      (await Warehouse.findOne({ isDefault: true }).lean()) ||
      (await Warehouse.findOne({}).lean());
    if (!defaultWarehouse) {
      throw new Error('Default warehouse not found. Cannot create inventory docs.');
    }
  }

  // 5. Batch Upsert Products (batches of 200)
  const productRefMap = new Map(); // skuUpper -> { _id, id }
  const productBatchSize = 200;

  for (let i = 0; i < sanitizedProducts.length; i += productBatchSize) {
    const batch = sanitizedProducts.slice(i, i + productBatchSize);
    const batchSkus = batch.map((p) => p.sku.toUpperCase());
    const existingInBatch = await Product.find({ sku: { $in: batchSkus } }).lean();
    const existingMap = new Map(existingInBatch.map((doc) => [doc.sku.toUpperCase(), doc]));

    const bulkOps = [];

    for (const p of batch) {
      const skuUpper = p.sku.toUpperCase();
      const existing = existingMap.get(skuUpper);
      const targetStatus = publish ? 'published' : (p.status || 'draft');

      if (existing) {
        productRefMap.set(skuUpper, { _id: existing._id, id: existing.id || existing._id.toString() });

        manifest.products.updated.push({
          id: existing.id,
          sku: existing.sku,
          previous: {
            name: existing.name,
            description: existing.description,
            categoryId: existing.categoryId,
            productType: existing.productType,
            brand: existing.brand,
            gender: existing.gender,
            season: existing.season,
            tags: existing.tags,
            options: existing.options,
            images: existing.images,
            labels: existing.labels,
            basePrice: existing.basePrice,
            price: existing.price,
            mrp: existing.mrp,
            cost: existing.cost,
            status: existing.status
          }
        });

        bulkOps.push({
          updateOne: {
            filter: { _id: existing._id },
            update: {
              $set: {
                name: p.name,
                description: p.description,
                categoryId: p.categoryId,
                productType: p.productType,
                brand: p.brand,
                gender: p.gender,
                season: p.season,
                tags: p.tags,
                options: p.options,
                images: p.images,
                labels: p.labels,
                basePrice: p.basePrice,
                price: p.price,
                mrp: p.mrp,
                cost: p.cost,
                status: targetStatus
              }
            }
          }
        });
      } else {
        const newObjectId = new mongoose.Types.ObjectId();
        const newId = 'p_' + crypto.randomBytes(6).toString('hex');
        productRefMap.set(skuUpper, { _id: newObjectId, id: newId });

        manifest.products.insertedIds.push(newId);
        manifest.products.insertedObjectIds.push(newObjectId.toString());
        manifest.products.insertedSkus.push(p.sku);

        bulkOps.push({
          insertOne: {
            document: {
              _id: newObjectId,
              id: newId,
              name: p.name,
              slug: p.slug,
              sku: p.sku.toUpperCase(),
              categoryId: p.categoryId,
              productType: p.productType,
              brand: p.brand,
              gender: p.gender,
              season: p.season,
              tags: p.tags,
              description: p.description,
              options: p.options,
              images: p.images,
              status: targetStatus,
              labels: p.labels,
              basePrice: p.basePrice,
              price: p.price,
              mrp: p.mrp,
              cost: p.cost,
              ratingAvg: 0,
              ratingCount: 0,
              deletedAt: null
            }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      if (isReplicaSet) {
        const session = await mongoose.startSession();
        try {
          session.startTransaction();
          await Product.bulkWrite(bulkOps, { ordered: false, session });
          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          session.endSession();
        }
      } else {
        await Product.bulkWrite(bulkOps, { ordered: false });
      }
    }
  }

  // Populate productRefMap for any existing products in DB that were parents of variants
  const missingParentSkus = [
    ...new Set(
      sanitizedVariants
        .map((v) => v.productSku.toUpperCase())
        .filter((sku) => !productRefMap.has(sku))
    )
  ];
  if (missingParentSkus.length > 0) {
    const parentDocs = await Product.find(
      { sku: { $in: missingParentSkus } },
      { sku: 1, id: 1 }
    ).lean();
    for (const doc of parentDocs) {
      productRefMap.set(doc.sku.toUpperCase(), {
        _id: doc._id,
        id: doc.id || doc._id.toString()
      });
    }
  }

  // 6. Batch Upsert Variants (batches of 200)
  const variantBatchSize = 200;
  const newVariantsForInventory = [];

  for (let i = 0; i < sanitizedVariants.length; i += variantBatchSize) {
    const batch = sanitizedVariants.slice(i, i + variantBatchSize);
    const batchSkus = batch.map((v) => v.sku.toUpperCase());
    const existingInBatch = await Variant.find({ sku: { $in: batchSkus } }).lean();
    const existingMap = new Map(existingInBatch.map((doc) => [doc.sku.toUpperCase(), doc]));

    const bulkOps = [];

    for (const v of batch) {
      const skuUpper = v.sku.toUpperCase();
      const parent = productRefMap.get(v.productSku.toUpperCase());
      const existing = existingMap.get(skuUpper);
      const targetPublished = publish ? true : (v.published ?? false);
      const targetStatus = publish ? 'active' : (v.status || 'out_of_stock');

      if (existing) {
        manifest.variants.updated.push({
          id: existing.id,
          sku: existing.sku,
          previous: {
            name: existing.name,
            product: existing.product,
            productId: existing.productId,
            options: existing.options,
            price: existing.price,
            compareAtPrice: existing.compareAtPrice,
            cost: existing.cost,
            barcode: existing.barcode,
            capacity: existing.capacity,
            weight: existing.weight,
            status: existing.status,
            published: existing.published,
            hidden: existing.hidden
          }
        });

        bulkOps.push({
          updateOne: {
            filter: { _id: existing._id },
            update: {
              $set: {
                name: v.name,
                product: parent._id,
                productId: parent.id,
                options: v.options,
                price: v.price,
                compareAtPrice: v.compareAtPrice,
                cost: v.cost,
                barcode: v.barcode,
                capacity: v.capacity,
                weight: v.weight,
                status: targetStatus,
                published: targetPublished,
                hidden: v.hidden
              }
            }
          }
        });
      } else {
        const newObjectId = new mongoose.Types.ObjectId();
        const newId = 'v_' + crypto.randomBytes(6).toString('hex');

        manifest.variants.insertedIds.push(newId);
        manifest.variants.insertedObjectIds.push(newObjectId.toString());
        manifest.variants.insertedSkus.push(v.sku);

        if (createInventory) {
          newVariantsForInventory.push({ _id: newObjectId, id: newId });
        }

        bulkOps.push({
          insertOne: {
            document: {
              _id: newObjectId,
              id: newId,
              name: v.name,
              product: parent._id,
              productId: parent.id,
              parentVariantId: null,
              sku: v.sku.toUpperCase(),
              options: v.options,
              price: v.price,
              compareAtPrice: v.compareAtPrice,
              cost: v.cost,
              barcode: v.barcode,
              capacity: v.capacity,
              status: targetStatus,
              published: targetPublished,
              hidden: v.hidden,
              weight: v.weight
            }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      if (isReplicaSet) {
        const session = await mongoose.startSession();
        try {
          session.startTransaction();
          await Variant.bulkWrite(bulkOps, { ordered: false, session });
          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          session.endSession();
        }
      } else {
        await Variant.bulkWrite(bulkOps, { ordered: false });
      }
    }
  }

  // 7. Create Inventory docs if requested
  if (createInventory && newVariantsForInventory.length > 0) {
    const invOps = [];
    const stockMoveOps = [];
    const initialAvailable = Math.max(0, parseInt(stockQty, 10) || 0);

    for (const vItem of newVariantsForInventory) {
      const invObjectId = new mongoose.Types.ObjectId();
      const invId = `inv_${vItem.id}_${defaultWarehouse.id}`;

      manifest.inventory.insertedIds.push(invId);
      manifest.inventory.insertedObjectIds.push(invObjectId.toString());

      invOps.push({
        insertOne: {
          document: {
            _id: invObjectId,
            id: invId,
            variant: vItem._id,
            variantId: vItem.id,
            warehouse: defaultWarehouse._id,
            warehouseId: defaultWarehouse.id,
            available: initialAvailable,
            reserved: 0,
            incoming: 0,
            damaged: 0,
            returned: 0,
            reorderLevel: 5,
            minStock: 0,
            maxStock: 0,
            archived: false
          }
        }
      });

      if (initialAvailable > 0) {
        stockMoveOps.push({
          insertOne: {
            document: {
              inventory: invObjectId,
              variantId: vItem.id,
              warehouseId: defaultWarehouse.id,
              type: 'restock',
              change: initialAvailable,
              reason: 'Initial Catalog Stock',
              reference: 'CATALOG_IMPORT',
              before: 0,
              after: initialAvailable,
              user: 'Zylo Importer'
            }
          }
        });
      }
    }

    if (invOps.length > 0) {
      if (isReplicaSet) {
        const session = await mongoose.startSession();
        try {
          session.startTransaction();
          await Inventory.bulkWrite(invOps, { ordered: false, session });
          if (stockMoveOps.length > 0) {
            await StockMove.bulkWrite(stockMoveOps, { ordered: false, session });
          }
          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          session.endSession();
        }
      } else {
        await Inventory.bulkWrite(invOps, { ordered: false });
        if (stockMoveOps.length > 0) {
          await StockMove.bulkWrite(stockMoveOps, { ordered: false });
        }
      }
      console.log(`Created ${invOps.length} inventory records (${initialAvailable} units each) at warehouse ${defaultWarehouse.name}.`);
    }
  }

  // 8. Write Rollback Manifest
  const manifestFileName = `import-manifest-${timestamp}.json`;
  fs.writeFileSync(manifestFileName, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n📋 Rollback manifest written to: ${manifestFileName}`);

  // 9. Post-import Verification Pass
  console.log(`\n🔍 Running post-import verification pass...`);
  const verificationResults = [];

  const importedVariantDocs = await Variant.find({
    sku: { $in: sanitizedVariants.map((v) => v.sku.toUpperCase()) }
  }).lean();
  let vParentsValid = true;
  for (const vDoc of importedVariantDocs) {
    if (!vDoc.product || !vDoc.productId) {
      vParentsValid = false;
      break;
    }
  }
  verificationResults.push({
    check: 'Every imported variant has an existing parent product',
    passed: vParentsValid
  });

  const expectedCategoryCounts = {};
  for (const p of sanitizedProducts) {
    expectedCategoryCounts[p.categoryId] = (expectedCategoryCounts[p.categoryId] || 0) + 1;
  }
  let catCountsMatch = true;
  for (const [catId, expectedCount] of Object.entries(expectedCategoryCounts)) {
    const actualCount = await Product.countDocuments({
      categoryId: catId,
      sku: { $in: sanitizedProducts.map((p) => p.sku.toUpperCase()) }
    });
    if (actualCount !== expectedCount) {
      catCountsMatch = false;
      console.error(`Category count mismatch for ${catId}: expected ${expectedCount}, got ${actualCount}`);
    }
  }
  verificationResults.push({
    check: 'Category counts match input files',
    passed: catCountsMatch
  });

  const allDbProducts = await Product.find({ status: { $ne: 'archived' } }, { sku: 1, slug: 1 }).lean();
  const dbSkus = new Set();
  const dbSlugs = new Set();
  let noDuplicates = true;
  for (const p of allDbProducts) {
    if (dbSkus.has(p.sku)) noDuplicates = false;
    dbSkus.add(p.sku);
    if (dbSlugs.has(p.slug)) noDuplicates = false;
    dbSlugs.add(p.slug);
  }
  verificationResults.push({
    check: 'Zero duplicate SKUs or slugs among active products',
    passed: noDuplicates
  });

  console.log('\n--- Sample 5 Stored Products (Inspection) ---');
  const sampleIndices = [0, 10, 25, 50, 75].filter((idx) => idx < sanitizedProducts.length);
  const sampleSkus = sampleIndices.map((idx) => sanitizedProducts[idx].sku.toUpperCase());
  const sampleDocs = await Product.find({ sku: { $in: sampleSkus } }).limit(5).lean();

  for (const doc of sampleDocs) {
    console.log(
      JSON.stringify(
        {
          _id: doc._id,
          id: doc.id,
          sku: doc.sku,
          name: doc.name,
          slug: doc.slug,
          categoryId: doc.categoryId,
          basePricePaisa: doc.basePrice,
          pricePaisa: doc.price,
          status: doc.status,
          imagesCount: doc.images?.length || 0,
          options: doc.options
        },
        null,
        2
      )
    );
  }

  console.log('\nPost-import verification results:');
  verificationResults.forEach((r) => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.check}`);
  });

  console.log(`\n🎉 Import applied successfully!`);
  await disconnectDB();
  return { report, manifest };
}

// --- CLI Execution Entrypoint ---

export async function runCli() {
  const { values } = parseArgs({
    options: {
      products: { type: 'string' },
      variants: { type: 'string' },
      apply: { type: 'boolean', default: false },
      rollback: { type: 'string' },
      'create-inventory': { type: 'boolean', default: false },
      'stock-qty': { type: 'string', default: '0' },
      publish: { type: 'boolean', default: false },
      'archive-existing': { type: 'boolean', default: false },
      'confirm-production': { type: 'boolean', default: false },
      'confirm-backup': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false }
    },
    allowPositionals: false
  });

  if (values.help) {
    console.log(`
Zylo Catalog Importer CLI

Options:
  --products <path>         Path to products JSON file
  --variants <path>         Path to variants JSON file
  --apply                   Execute live database writes (default is DRY-RUN)
  --rollback <manifest>     Rollback an import using manifest file
  --create-inventory        Create default warehouse inventory docs
  --stock-qty <number>      Initial stock per variant (default: 0)
  --publish                 Set imported products and variants to Published
  --archive-existing        Archive existing products so only new products appear
  --confirm-production      Required for production or remote databases
  --confirm-backup          Bypass interactive backup confirmation prompt
  --help                    Show help message
`);
    process.exit(0);
  }

  if (values.rollback) {
    await runRollback(values.rollback);
    process.exit(0);
  }

  const { productsPath, variantsPath } = locateInputFiles(values.products, values.variants);

  const isProduction =
    env.NODE_ENV === 'production' ||
    env.MONGODB_URI.includes('mongodb+srv') ||
    /production|prod/i.test(env.MONGODB_URI);

  if (values.apply && isProduction) {
    if (!values['confirm-production']) {
      console.error(
        `\n❌ PRODUCTION GUARD: Refusing to run --apply against production environment without --confirm-production flag.\n`
      );
      process.exit(1);
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const dbName = mongoose.connection?.name || 'zylo_ecommerce';
    console.log(`\n⚠️  WARNING: You are about to modify a PRODUCTION database: ${maskMongoUri(env.MONGODB_URI)}`);
    const answer = await rl.question(`Please type the target database name (${dbName}) to confirm: `);
    rl.close();

    if (answer.trim() !== dbName) {
      console.error(`\n❌ Confirmation mismatch. Expected '${dbName}', received '${answer.trim()}'. Aborted.\n`);
      process.exit(1);
    }
  }

  await runCatalogImport({
    productsPath,
    variantsPath,
    apply: values.apply,
    createInventory: values['create-inventory'],
    stockQty: parseInt(values['stock-qty'], 10) || 0,
    publish: values.publish,
    archiveExisting: values['archive-existing'],
    confirmProduction: values['confirm-production'],
    confirmBackup: values['confirm-backup']
  });
}

// Execute CLI if run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runCli().catch((err) => {
    console.error('\n❌ Fatal catalog import error:', err.message);
    process.exit(1);
  });
}
