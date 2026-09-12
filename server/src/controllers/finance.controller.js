import { asyncHandler } from '../utils/asyncHandler.js';
import financeService from '../services/finance.service.js';
import reportsService from '../services/reports.service.js';
import irdService from '../services/ird.service.js';
import purchaseService from '../services/purchase.service.js';
import purchaseReturnService from '../services/purchaseReturn.service.js';
import { Supplier } from '../models/Supplier.js';

// --- Finance & Accounting ---
export const getJournal = asyncHandler(async (req, res) => {
  const result = await financeService.buildJournal(req.query);
  res.status(200).json({ data: result });
});

export const getLedger = asyncHandler(async (req, res) => {
  const result = await financeService.getGeneralLedger(req.query.account, req.query);
  res.status(200).json({ data: result });
});

export const getDaybook = asyncHandler(async (req, res) => {
  const result = await financeService.getDaybook(req.query.date);
  res.status(200).json({ data: result });
});

export const getTrialBalance = asyncHandler(async (req, res) => {
  const result = await financeService.getTrialBalance(req.query);
  res.status(200).json({ data: result });
});

export const getProfitAndLoss = asyncHandler(async (req, res) => {
  const result = await financeService.getProfitAndLoss(req.query.fromDate, req.query.toDate);
  res.status(200).json({ data: result });
});

export const getBalanceSheet = asyncHandler(async (req, res) => {
  const result = await financeService.getBalanceSheet(req.query.asOfDate);
  res.status(200).json({ data: result });
});

// --- Reports ---
export const getSalesReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getSalesReport(req.query);
  res.status(200).json({ data: result });
});

// --- IRD VAT Summaries ---
export const getIrdVatSummary = asyncHandler(async (req, res) => {
  const result = await irdService.getIrdVatSummary(req.query.month);
  res.status(200).json({ data: result });
});

// --- Purchases ---
export const listPurchases = asyncHandler(async (req, res) => {
  const result = await purchaseService.listPurchases(req.query);
  res.status(200).json({ data: result.purchases, purchases: result.purchases, pagination: result.pagination });
});

export const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.getPurchaseById(req.params.id);
  res.status(200).json({ data: { purchase } });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.createPurchase(req.body, req.user);
  res.status(201).json({ message: 'Purchase bill created successfully.', data: { purchase } });
});

export const cancelPurchase = asyncHandler(async (req, res) => {
  const result = await purchaseService.cancelPurchase(req.params.id, { reason: req.body.reason, user: req.user });
  res.status(200).json({ message: 'Purchase bill cancelled successfully.', data: { purchase: result } });
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const result = await purchaseService.deletePurchase(req.params.id, req.user);
  res.status(200).json(result);
});

// --- Purchase Returns (Debit Notes) ---
export const listPurchaseReturns = asyncHandler(async (req, res) => {
  const result = await purchaseReturnService.listPurchaseReturns(req.query);
  res.status(200).json({ data: result.returns, returns: result.returns, pagination: result.pagination });
});

export const getPurchaseReturn = asyncHandler(async (req, res) => {
  const record = await purchaseReturnService.getPurchaseReturnById(req.params.id);
  res.status(200).json({ data: { purchaseReturn: record } });
});

export const createPurchaseReturn = asyncHandler(async (req, res) => {
  const record = await purchaseReturnService.createPurchaseReturn(req.body, req.user);
  res.status(201).json({ message: 'Debit Note created successfully.', data: { purchaseReturn: record } });
});

export const cancelPurchaseReturn = asyncHandler(async (req, res) => {
  const record = await purchaseReturnService.cancelPurchaseReturn(req.params.id, { reason: req.body.reason, user: req.user });
  res.status(200).json({ message: 'Debit Note cancelled successfully.', data: { purchaseReturn: record } });
});

// --- Suppliers Directory ---
export const listSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find({ active: true }).sort({ name: 1 }).lean();
  res.status(200).json({ data: suppliers, suppliers });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json({ message: 'Supplier added successfully.', data: { supplier } });
});

export default {
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
};
