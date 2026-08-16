import { api } from './apiClient';

export async function getJournalEntries() {
  const res = await api.get('/api/admin/finance/journal');
  return res.data?.journal || [];
}

export async function getProfitAndLoss(fromDate, toDate) {
  const query = new URLSearchParams();
  if (fromDate) query.append('from', fromDate);
  if (toDate) query.append('to', toDate);
  const res = await api.get(`/api/admin/finance/profit-and-loss?${query.toString()}`);
  return res.data?.pnl || { totalSalesNet: 0, totalPurchasesNet: 0, netProfit: 0 };
}

export async function getIrdVatSummary(monthStr) {
  const query = monthStr ? `?month=${monthStr}` : '';
  const res = await api.get(`/api/admin/ird/vat-summary${query}`);
  return res.data?.summary || { salesTaxable: 0, salesVat: 0, purchasesTaxable: 0, purchasesVat: 0, netVatPayable: 0 };
}
