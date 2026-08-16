import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';

export async function listCategories(filter = {}) {
  const query = { status: 'active' };
  if (filter.visible !== undefined) {
    query.visible = filter.visible;
  }
  if (filter.parentId !== undefined) {
    query.parentId = filter.parentId;
  }

  const categories = await Category.find(query)
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return categories;
}

export async function getCategoryBySlug(slug) {
  const category = await Category.findOne({ slug: slug.toLowerCase(), status: 'active' }).lean();
  if (!category) {
    throw ApiError.notFound(`Category with slug '${slug}' not found.`);
  }
  return category;
}

export default { listCategories, getCategoryBySlug };
