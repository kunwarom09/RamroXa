import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  purgeProducts,
  populateProducts,
  listInventory,
  adjustStock,
  transferStock,
  listStockMoves,
  listOrders,
  getOrder,
  updateOrderStatus,
  refundOrder,
  listCustomers,
  getCustomer
} from '../controllers/admin.controller.js';
import {
  listAdminCoupons,
  getAdminCoupon,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon
} from '../controllers/coupon.controller.js';
import {
  listAdminReviews,
  updateAdminReviewStatus,
  deleteAdminReview
} from '../controllers/review.controller.js';
import {
  getJournal,
  getLedger,
  getDaybook,
  getTrialBalance,
  getProfitAndLoss,
  getSalesReport,
  getIrdVatSummary,
  listPurchases,
  getPurchase,
  createPurchase,
  deletePurchase
} from '../controllers/finance.controller.js';

export const router = express.Router();

// Enforce authentication and admin RBAC across all /api/admin routes
router.use(requireAuth, requireAdmin);

// Categories
router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Products
router.delete('/products/purge-all', purgeProducts);
router.post('/products/populate', populateProducts);
router.get('/products', listProducts);
router.post('/products', createProduct);
router.get('/products/:id', getProduct);
router.put('/products/:id', updateProduct);
router.patch('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Inventory & Stock Moves
router.get('/inventory', listInventory);
router.post('/inventory/adjust', adjustStock);
router.post('/inventory/transfer', transferStock);
router.get('/inventory/moves', listStockMoves);

// Orders & Fulfillment
router.get('/orders', listOrders);
router.get('/orders/:id', getOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/refund', refundOrder);

// Coupons Management
router.get('/coupons', listAdminCoupons);
router.post('/coupons', createAdminCoupon);
router.get('/coupons/:id', getAdminCoupon);
router.put('/coupons/:id', updateAdminCoupon);
router.patch('/coupons/:id', updateAdminCoupon);
router.delete('/coupons/:id', deleteAdminCoupon);

// Reviews Moderation
router.get('/reviews', listAdminReviews);
router.put('/reviews/:id/status', updateAdminReviewStatus);
router.patch('/reviews/:id/status', updateAdminReviewStatus);
router.delete('/reviews/:id', deleteAdminReview);

// Customers
router.get('/customers', listCustomers);
router.get('/customers/:id', getCustomer);

// Finance & Accounting
router.get('/finance/journal', getJournal);
router.get('/finance/ledger', getLedger);
router.get('/finance/daybook', getDaybook);
router.get('/finance/trial-balance', getTrialBalance);
router.get('/finance/profit-and-loss', getProfitAndLoss);

// Sales Reports
router.get('/reports/sales', getSalesReport);

// IRD VAT Return Summaries
router.get('/ird/vat-summary', getIrdVatSummary);

// Purchases & Supplier Bills
router.get('/purchases', listPurchases);
router.post('/purchases', createPurchase);
router.get('/purchases/:id', getPurchase);
router.delete('/purchases/:id', deletePurchase);

export default router;
