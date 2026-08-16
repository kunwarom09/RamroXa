import mongoose from 'mongoose';
import { Category, Product } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import crypto from 'crypto';

export async function findCategory(catId) {
  if (!catId) return null;
  if (mongoose.Types.ObjectId.isValid(catId) && String(new mongoose.Types.ObjectId(catId)) === String(catId)) {
    const byId = await Category.findById(catId);
    if (byId && !byId.deletedAt) return byId;
  }
  return Category.findOne({ $or: [{ id: catId }, { slug: catId }], deletedAt: null });
}

export async function listAdminCategories() {
  const [categories, products] = await Promise.all([
    Category.find({ deletedAt: null }).sort({ displayOrder: 1, name: 1 }).lean(),
    Product.find({ deletedAt: null }).select('id categoryId').lean()
  ]);

  const directCounts = products.reduce((acc, p) => {
    acc[p.categoryId] = (acc[p.categoryId] || 0) + 1;
    return acc;
  }, {});

  // Build recursive children map
  const childrenMap = {};
  categories.forEach((c) => {
    const pId = c.parentId || 'root';
    if (!childrenMap[pId]) childrenMap[pId] = [];
    childrenMap[pId].push(c.id);
  });

  function getDeepCount(catId) {
    let count = directCounts[catId] || 0;
    const children = childrenMap[catId] || [];
    for (const childId of children) {
      count += getDeepCount(childId);
    }
    return count;
  }

  const enriched = categories.map((c) => ({
    ...c,
    directCount: directCounts[c.id] || 0,
    deepCount: getDeepCount(c.id)
  }));

  return enriched;
}

export async function createCategory(data) {
  const {
    name,
    slug,
    parentId = null,
    displayOrder = 0,
    status = 'active',
    isVisible = true,
    description = '',
    image = null
  } = data;

  if (!name) {
    throw ApiError.badRequest('Category name is required.');
  }

  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = 'c_' + crypto.randomBytes(4).toString('hex');

  const existing = await Category.findOne({ slug: finalSlug, deletedAt: null });
  if (existing) {
    throw ApiError.conflict(`Category with slug '${finalSlug}' already exists.`);
  }

  const category = await Category.create({
    id,
    name,
    slug: finalSlug,
    parentId: parentId || null,
    displayOrder,
    status,
    isVisible,
    description,
    image
  });

  return category;
}

export async function updateCategory(catId, updates) {
  const category = await findCategory(catId);
  if (!category) {
    throw ApiError.notFound(`Category '${catId}' not found.`);
  }

  if (updates.slug && updates.slug !== category.slug) {
    const existing = await Category.findOne({ slug: updates.slug, id: { $ne: category.id }, deletedAt: null });
    if (existing) {
      throw ApiError.conflict(`Category with slug '${updates.slug}' already exists.`);
    }
  }

  const allowed = ['name', 'slug', 'parentId', 'displayOrder', 'status', 'isVisible', 'description', 'image'];
  for (const field of allowed) {
    if (updates[field] !== undefined) {
      category[field] = updates[field];
    }
  }

  await category.save();
  return category;
}

export async function deleteCategory(catId) {
  const category = await findCategory(catId);
  if (!category) {
    throw ApiError.notFound(`Category '${catId}' not found.`);
  }

  // Check if category has active products
  const productCount = await Product.countDocuments({ categoryId: category.id, deletedAt: null });
  if (productCount > 0) {
    throw ApiError.conflict(
      `Cannot delete category '${category.name}' because it contains ${productCount} active products. Move or delete products first.`
    );
  }

  // Check if category has child subcategories
  const childCount = await Category.countDocuments({ parentId: category.id, deletedAt: null });
  if (childCount > 0) {
    throw ApiError.conflict(
      `Cannot delete category '${category.name}' because it has ${childCount} subcategories. Move or delete subcategories first.`
    );
  }

  category.deletedAt = new Date();
  category.status = 'inactive';
  await category.save();

  return { message: `Category '${category.name}' deleted successfully.` };
}

export default {
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
