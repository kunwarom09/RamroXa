import { asyncHandler } from '../utils/asyncHandler.js';
import categoryService from '../services/category.service.js';

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories(req.query);
  res.status(200).json({
    data: categories
  });
});

export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(req.params.slug);
  res.status(200).json({
    data: category
  });
});

export default { getCategories, getCategoryBySlug };
