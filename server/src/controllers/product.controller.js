import { asyncHandler } from '../utils/asyncHandler.js';
import productService from '../services/product.service.js';

export const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  res.status(200).json(result);
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);
  res.status(200).json({
    data: product
  });
});

export default { getProducts, getProductBySlug };
