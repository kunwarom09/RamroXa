import { asyncHandler } from '../utils/asyncHandler.js';
import adminProductService from '../services/adminProduct.service.js';
import adminCategoryService from '../services/adminCategory.service.js';
import adminInventoryService from '../services/adminInventory.service.js';
import adminOrderService from '../services/adminOrder.service.js';
import { updateFulfillmentStatus } from '../services/order.service.js';

// --- Categories ---
export const listCategories = asyncHandler(async (req, res) => {
  const categories = await adminCategoryService.listAdminCategories();
  res.status(200).json({ data: { categories } });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await adminCategoryService.createCategory(req.body);
  res.status(201).json({ message: 'Category created successfully.', data: { category } });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await adminCategoryService.updateCategory(req.params.id, req.body);
  res.status(200).json({ message: 'Category updated successfully.', data: { category } });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await adminCategoryService.deleteCategory(req.params.id);
  res.status(200).json(result);
});

// --- Products ---
export const listProducts = asyncHandler(async (req, res) => {
  const result = await adminProductService.listAdminProducts(req.query);
  res.status(200).json({ data: result });
});

export const listProductTags = asyncHandler(async (req, res) => {
  const tags = await adminProductService.getAllDistinctTags();
  res.status(200).json({ data: { tags } });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await adminProductService.getAdminProductById(req.params.id);
  res.status(200).json({ data: { product } });
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await adminProductService.createAdminProduct(req.body, req.user);
  res.status(201).json({ message: 'Product created successfully.', data: { product } });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await adminProductService.updateAdminProduct(req.params.id, req.body);
  res.status(200).json({ message: 'Product updated successfully.', data: { product } });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await adminProductService.deleteAdminProduct(req.params.id);
  res.status(200).json(result);
});

export const purgeProducts = asyncHandler(async (req, res) => {
  const result = await adminProductService.purgeAllProducts();
  res.status(200).json(result);
});

export const populateProducts = asyncHandler(async (req, res) => {
  const { populate20ProductsWithVariantsAndOrders } = await import('../services/populateCatalog.service.js');
  const result = await populate20ProductsWithVariantsAndOrders();
  res.status(200).json({ message: 'Catalog populated with 20 products, variants, inventory and sample orders.', data: result });
});

// --- Inventory ---
export const listInventory = asyncHandler(async (req, res) => {
  const inventory = await adminInventoryService.listAdminInventory(req.query);
  res.status(200).json({ data: { inventory } });
});

export const rebuildInventory = asyncHandler(async (req, res) => {
  const result = await adminInventoryService.rebuildInventoryFromMasterProducts();
  res.status(200).json({ message: result.message, data: result });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const { variantId, warehouseId, change, adjustment, mode, reason, note, reference } = req.body;
  const result = await adminInventoryService.adjustStock({
    variantId,
    warehouseId,
    change,
    adjustment,
    mode,
    reason,
    note,
    reference,
    user: req.user
  });
  res.status(200).json({ message: 'Stock adjusted successfully.', data: result });
});

export const updateVariantPrice = asyncHandler(async (req, res) => {
  const variantId = req.params.variantId || req.body.variantId;
  const { price } = req.body;
  const result = await adminInventoryService.updateVariantPrice({
    variantId,
    price,
    user: req.user
  });
  res.status(200).json({ message: 'Variant price updated successfully.', data: { variant: result } });
});

export const archiveVariant = asyncHandler(async (req, res) => {
  const variantId = req.params.variantId || req.body.variantId;
  const result = await adminInventoryService.archiveVariant({
    variantId,
    user: req.user
  });
  res.status(200).json({ message: result.message, data: result });
});

export const toggleVariantPublish = asyncHandler(async (req, res) => {
  const variantId = req.params.variantId || req.body.variantId;
  const { published } = req.body;
  const result = await adminInventoryService.toggleVariantPublish({
    variantId,
    published,
    user: req.user
  });
  res.status(200).json({ message: result.message, data: result });
});

export const getVariantTransactions = asyncHandler(async (req, res) => {
  const variantId = req.params.variantId || req.query.variantId;
  const sku = req.query.sku;
  const result = await adminInventoryService.getVariantTransactions({ variantId, sku });
  res.status(200).json({ data: result });
});

export const transferStock = asyncHandler(async (req, res) => {
  const { variantId, fromWarehouseId, toWarehouseId, qty } = req.body;
  const result = await adminInventoryService.transferStock({
    variantId,
    fromWarehouseId,
    toWarehouseId,
    qty,
    user: req.user
  });
  res.status(200).json({ message: 'Stock transferred successfully.', data: result });
});

export const listStockMoves = asyncHandler(async (req, res) => {
  const result = await adminInventoryService.listStockMoves(req.query);
  res.status(200).json({ data: result });
});

// --- Orders ---
export const listOrders = asyncHandler(async (req, res) => {
  const result = await adminOrderService.listAdminOrders(req.query);
  res.status(200).json({ data: result });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await adminOrderService.getAdminOrderById(req.params.id);
  res.status(200).json({ data: { order } });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { fulfillmentStatus, note } = req.body;
  const order = await updateFulfillmentStatus({
    orderId: req.params.id,
    newStatus: fulfillmentStatus,
    note,
    user: req.user
  });
  res.status(200).json({ message: 'Order status updated.', data: { order } });
});

export const refundOrder = asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;
  const order = await adminOrderService.processOrderRefund({
    orderId: req.params.id,
    amount,
    reason,
    user: req.user
  });
  res.status(200).json({ message: 'Order refunded.', data: { order } });
});

// --- Customers ---
export const listCustomers = asyncHandler(async (req, res) => {
  const { listAdminCustomers } = await import('../services/adminCustomer.service.js');
  const result = await listAdminCustomers(req.query);
  res.status(200).json({ data: result.customers, pagination: result.pagination });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const { getAdminCustomerById } = await import('../services/adminCustomer.service.js');
  const result = await getAdminCustomerById(req.params.id);
  res.status(200).json({ data: result });
});

// --- Dashboard Live Stats ---
export const getDashboardStats = asyncHandler(async (req, res) => {
  const { getDashboardStats: fetchStats } = await import('../services/dashboard.service.js');
  const result = await fetchStats(req.query);
  res.status(200).json({ data: result });
});

export default {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listInventory,
  adjustStock,
  transferStock,
  listStockMoves,
  listOrders,
  getOrder,
  updateOrderStatus,
  refundOrder,
  listCustomers,
  getCustomer,
  getDashboardStats
};
