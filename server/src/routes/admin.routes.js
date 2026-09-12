import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  listProductTags,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  purgeProducts,
  populateProducts,
  listInventory,
  rebuildInventory,
  adjustStock,
  updateVariantPrice,
  archiveVariant,
  toggleVariantPublish,
  getVariantTransactions,
  transferStock,
  listStockMoves,
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  cancelOrder,
  refundOrder,
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getDashboardStats,
  listSalesReturns,
  createSalesReturn,
  updateSalesReturnStatus,
  cancelSalesReturn,
  deleteSalesReturn
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
  getBalanceSheet,
  getSalesReport,
  getIrdVatSummary,
  listPurchases,
  getPurchase,
  createPurchase,
  cancelPurchase,
  deletePurchase,
  listPurchaseReturns,
  getPurchaseReturn,
  createPurchaseReturn,
  cancelPurchaseReturn,
  listSuppliers,
  createSupplier
} from '../controllers/finance.controller.js';

export const router = express.Router();

// Enforce authentication and admin RBAC across all /api/admin routes
router.use(requireAuth, requireAdmin);

// Dashboard Live Stats
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard', getDashboardStats);

// Categories
router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Products
router.delete('/products/purge-all', purgeProducts);
router.post('/products/populate', populateProducts);
router.get('/products/tags', listProductTags);
router.get('/products', listProducts);
router.post('/products', createProduct);
router.get('/products/:id', getProduct);
router.put('/products/:id', updateProduct);
router.patch('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Inventory & Stock Moves
router.get('/inventory', listInventory);
router.post('/inventory/rebuild', rebuildInventory);
router.post('/inventory/adjust', adjustStock);
router.post('/inventory/price', updateVariantPrice);
router.put('/inventory/variants/:variantId/price', updateVariantPrice);
router.patch('/inventory/variants/:variantId/price', updateVariantPrice);
router.post('/inventory/variants/:variantId/archive', archiveVariant);
router.post('/inventory/variants/:variantId/publish', toggleVariantPublish);
router.get('/inventory/variants/:variantId/transactions', getVariantTransactions);
router.get('/inventory/transactions', getVariantTransactions);
router.post('/inventory/transfer', transferStock);
router.get('/inventory/moves', listStockMoves);

// Orders & Fulfillment
router.get('/orders', listOrders);
router.post('/orders', createOrder);
router.get('/orders/:id', getOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/cancel', cancelOrder);
router.delete('/orders/:id', deleteOrder);
router.post('/orders/:id/refund', refundOrder);

// Sales Returns (Credit Notes)
router.get('/returns', listSalesReturns);
router.post('/returns', createSalesReturn);
router.put('/returns/:id/status', updateSalesReturnStatus);
router.patch('/returns/:id/status', updateSalesReturnStatus);
router.post('/returns/:id/cancel', cancelSalesReturn);
router.delete('/returns/:id', deleteSalesReturn);

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
router.post('/customers', createCustomer);
router.get('/customers/:id', getCustomer);
router.put('/customers/:id', updateCustomer);
router.patch('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// Suppliers Directory
router.get('/suppliers', listSuppliers);
router.post('/suppliers', createSupplier);

// Finance & Accounting
router.get('/finance/journal', getJournal);
router.get('/finance/ledger', getLedger);
router.get('/finance/daybook', getDaybook);
router.get('/finance/trial-balance', getTrialBalance);
router.get('/finance/profit-and-loss', getProfitAndLoss);
router.get('/finance/balance-sheet', getBalanceSheet);

// Sales Reports
router.get('/reports/sales', getSalesReport);

// IRD VAT Return Summaries
router.get('/ird/vat-summary', getIrdVatSummary);

// Purchases & Supplier Bills
router.get('/purchases', listPurchases);
router.post('/purchases', createPurchase);
router.get('/purchases/:id', getPurchase);
router.post('/purchases/:id/cancel', cancelPurchase);
router.delete('/purchases/:id', deletePurchase);

// Purchase Returns (Debit Notes)
router.get('/purchase-returns', listPurchaseReturns);
router.post('/purchase-returns', createPurchaseReturn);
router.get('/purchase-returns/:id', getPurchaseReturn);
router.post('/purchase-returns/:id/cancel', cancelPurchaseReturn);

// Email Diagnostic & Testing (Admin)
router.get('/email/diagnostic', async (req, res, next) => {
  const { getEmailDiagnostic } = await import('../controllers/auth.controller.js');
  return getEmailDiagnostic(req, res, next);
});
router.post('/email/test', async (req, res, next) => {
  const { sendTestEmail } = await import('../controllers/auth.controller.js');
  return sendTestEmail(req, res, next);
});

export default router;
