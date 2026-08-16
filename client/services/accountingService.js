import { loadDB, buildJournal, docSubtotal, docVat } from './dataStore';

export function getJournalEntries() {
  const db = loadDB();
  return buildJournal(db);
}

export function getProfitAndLoss(fromDate, toDate) {
  const db = loadDB();
  const sales = (db.sales || []).filter(s => (!fromDate || s.date >= fromDate) && (!toDate || s.date <= toDate));
  const purchases = (db.purchases || []).filter(p => (!fromDate || p.date >= fromDate) && (!toDate || p.date <= toDate));

  const totalSalesNet = sales.reduce((sum, s) => sum + docSubtotal(s), 0);
  const totalPurchasesNet = purchases.reduce((sum, p) => sum + docSubtotal(p), 0);
  const netProfit = totalSalesNet - totalPurchasesNet;

  return {
    totalSalesNet,
    totalPurchasesNet,
    netProfit
  };
}

export function getIrdVatSummary(monthStr) {
  const db = loadDB();
  const vatRate = db.settings ? db.settings.vatRate : 13;

  const sales = (db.sales || []).filter(s => !monthStr || s.date.startsWith(monthStr));
  const purchases = (db.purchases || []).filter(p => !monthStr || p.date.startsWith(monthStr));

  const salesTaxable = sales.reduce((sum, s) => sum + docSubtotal(s), 0);
  const salesVat = sales.reduce((sum, s) => sum + docVat(s, vatRate), 0);

  const purchasesTaxable = purchases.reduce((sum, p) => sum + docSubtotal(p), 0);
  const purchasesVat = purchases.reduce((sum, p) => sum + docVat(p, vatRate), 0);

  const netVatPayable = salesVat - purchasesVat;

  return {
    salesTaxable,
    salesVat,
    purchasesTaxable,
    purchasesVat,
    netVatPayable
  };
}
