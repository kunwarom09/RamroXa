import { asyncHandler } from '../utils/asyncHandler.js';
import financeService from '../services/finance.service.js';
import reportsService from '../services/reports.service.js';
import irdService from '../services/ird.service.js';
import purchaseService from '../services/purchase.service.js';

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
  res.status(200).json({ data: result.purchases, pagination: result.pagination });
});

export const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.getPurchaseById(req.params.id);
  res.status(200).json({ data: { purchase } });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.createPurchase(req.body);
  res.status(201).json({ message: 'Purchase bill created successfully.', data: { purchase } });
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const result = await purchaseService.deletePurchase(req.params.id);
  res.status(200).json(result);
});

export default {
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
};
