import { Order } from '../models/Order.js';
import { Purchase } from '../models/Purchase.js';
import { SalesReturn } from '../models/SalesReturn.js';
import { PurchaseReturn } from '../models/PurchaseReturn.js';
import { Inventory } from '../models/Inventory.js';
import { Variant } from '../models/Variant.js';

export async function buildJournal(filters = {}) {
  const { fromDate, toDate } = filters;
  const orderFilter = { fulfillmentStatus: { $ne: 'cancelled' } };
  const purchaseFilter = { status: { $ne: 'cancelled' } };
  const salesReturnFilter = { status: { $nin: ['rejected', 'cancelled'] } };
  const purchaseReturnFilter = { status: { $ne: 'cancelled' } };

  if (fromDate || toDate) {
    const dateRange = {};
    if (fromDate) dateRange.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateRange.$lte = end;
    }
    orderFilter.createdAt = dateRange;
    purchaseFilter.date = dateRange;
    purchaseReturnFilter.date = dateRange;
  }

  const [orders, purchases, salesReturns, purchaseReturns] = await Promise.all([
    Order.find(orderFilter).sort({ createdAt: 1 }).lean(),
    Purchase.find(purchaseFilter).sort({ date: 1 }).lean(),
    SalesReturn.find(salesReturnFilter).sort({ createdAt: 1 }).lean(),
    PurchaseReturn.find(purchaseReturnFilter).sort({ date: 1 }).lean()
  ]);

  const entries = [];

  // 1. Process Orders (Sales) - All amounts in Paisa
  for (const order of orders) {
    const dateStr = order.createdAt ? order.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const voucher = order.orderNo;
    const customer = order.shippingAddress?.fullName || order.guestEmail || 'Customer';
    const grandTotal = Number(order.grandTotal) || 0; // In Paisa
    const vatTotal = Number(order.vatTotal) || 0;     // In Paisa
    const netRevenue = grandTotal - vatTotal;        // In Paisa

    const drAccount = (order.paymentStatus === 'paid' && order.paymentMethod !== 'credit') ? 'Cash & Bank' : 'Accounts Receivable';

    // Debit Cash & Bank / Accounts Receivable for full amount
    entries.push({
      date: dateStr,
      voucher,
      account: drAccount,
      narration: `Sale to ${customer} (${order.orderNo}${order.paymentMethod === 'credit' ? ' - Credit' : ''})`,
      debit: grandTotal,
      credit: 0
    });

    // Credit Sales Revenue (net of VAT)
    entries.push({
      date: dateStr,
      voucher,
      account: 'Sales Revenue',
      narration: `Sales revenue net of VAT (${order.orderNo})`,
      debit: 0,
      credit: netRevenue
    });

    // Credit VAT Payable (Output VAT) if applicable
    if (vatTotal > 0) {
      entries.push({
        date: dateStr,
        voucher,
        account: 'VAT Payable',
        narration: `Output VAT @ 13% (${order.orderNo})`,
        debit: 0,
        credit: vatTotal
      });
    }
  }

  // 2. Process Sales Returns (Credit Notes) - All amounts in Paisa
  for (const ret of salesReturns) {
    const dateStr = ret.date || (ret.createdAt ? ret.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const voucher = ret.creditNoteNo || ret.no;
    const customer = ret.customer || 'Customer';
    const refundTotal = Number(ret.refundAmount) || 0; // In Paisa
    const refundVat = Number(ret.refundVat) || 0;       // In Paisa
    const refundNet = Number(ret.refundNet) || (refundTotal - refundVat); // In Paisa

    // Check if original order was on credit / unpaid to determine reversal account
    const origOrder = orders.find(o => o.orderNo === ret.orderNo || o.orderNo === ret.invoice);
    const crAccount = (origOrder && (origOrder.paymentMethod === 'credit' || origOrder.paymentStatus !== 'paid'))
      ? 'Accounts Receivable'
      : 'Cash & Bank';

    // Debit Sales Returns & Allowances (Contra-revenue)
    entries.push({
      date: dateStr,
      voucher,
      account: 'Sales Returns & Allowances',
      narration: `Sales return from ${customer} (${voucher})`,
      debit: refundNet,
      credit: 0
    });

    // Debit VAT Payable (reversing Output VAT liability)
    if (refundVat > 0) {
      entries.push({
        date: dateStr,
        voucher,
        account: 'VAT Payable',
        narration: `Output VAT reversed on Credit Note (${voucher})`,
        debit: refundVat,
        credit: 0
      });
    }

    // Credit Cash & Bank or Accounts Receivable
    entries.push({
      date: dateStr,
      voucher,
      account: crAccount,
      narration: `Credit adjustment for ${customer} on #${voucher}`,
      debit: 0,
      credit: refundTotal
    });
  }

  // 3. Process Purchases - All amounts in Paisa
  for (const purchase of purchases) {
    const dateStr = purchase.date ? purchase.date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const voucher = purchase.billNo;
    const subtotal = Number(purchase.subtotal) || 0;
    const vatAmount = Number(purchase.vatAmount) || 0;
    const totalAmount = Number(purchase.totalAmount) || (subtotal + vatAmount);

    const crAccount = (purchase.paymentStatus === 'unpaid' || purchase.paymentMethod === 'credit') ? 'Accounts Payable' : 'Cash & Bank';

    // Debit Expense Head / Inventory Stock
    entries.push({
      date: dateStr,
      voucher,
      account: purchase.head || 'Purchases (stock)',
      narration: `Purchase from ${purchase.supplier} (${voucher})`,
      debit: subtotal,
      credit: 0
    });

    // Debit VAT Receivable (Input VAT asset)
    if (vatAmount > 0) {
      entries.push({
        date: dateStr,
        voucher,
        account: 'VAT Receivable',
        narration: `Input VAT @ 13% (${purchase.billNo})`,
        debit: vatAmount,
        credit: 0
      });
    }

    // Credit Cash & Bank / Accounts Payable
    entries.push({
      date: dateStr,
      voucher,
      account: crAccount,
      narration: `Payment/Payable to ${purchase.supplier}`,
      debit: 0,
      credit: totalAmount
    });
  }

  // 4. Process Purchase Returns (Debit Notes) - All amounts in Paisa
  for (const pr of purchaseReturns) {
    const dateStr = pr.date ? pr.date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const voucher = pr.no;
    const subtotal = Number(pr.subtotal) || 0;
    const vatAmount = Number(pr.vatAmount) || 0;
    const totalAmount = Number(pr.totalAmount) || (subtotal + vatAmount);

    // Debit Accounts Payable (reducing liability to supplier)
    entries.push({
      date: dateStr,
      voucher,
      account: 'Accounts Payable',
      narration: `Debit Note issued to ${pr.supplier} (${voucher})`,
      debit: totalAmount,
      credit: 0
    });

    // Credit Purchase Returns / Stock
    entries.push({
      date: dateStr,
      voucher,
      account: 'Purchase Returns',
      narration: `Goods returned to ${pr.supplier} (${voucher})`,
      debit: 0,
      credit: subtotal
    });

    // Credit VAT Receivable (reversing Input VAT claimed)
    if (vatAmount > 0) {
      entries.push({
        date: dateStr,
        voucher,
        account: 'VAT Receivable',
        narration: `Input VAT reversed on Debit Note (${voucher})`,
        debit: 0,
        credit: vatAmount
      });
    }
  }

  // Sort chronological
  entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const totalDr = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCr = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

  return {
    entries,
    summary: {
      totalDr,
      totalCr,
      totalDrNpr: Math.round(totalDr / 100),
      totalCrNpr: Math.round(totalCr / 100),
      isBalanced: totalDr === totalCr,
      totalEntries: entries.length
    }
  };
}

export async function getGeneralLedger(account = 'Sales Revenue', filters = {}) {
  const { entries } = await buildJournal(filters);
  const allAccounts = Array.from(new Set(entries.map((e) => e.account))).sort();

  let runningBalance = 0;
  const ledgerEntries = entries
    .filter((e) => e.account === account)
    .map((e) => {
      runningBalance += (e.debit || 0) - (e.credit || 0);
      return {
        ...e,
        debitNpr: Math.round((e.debit || 0) / 100),
        creditNpr: Math.round((e.credit || 0) / 100),
        balance: runningBalance,
        balanceNpr: Math.round(runningBalance / 100)
      };
    });

  return {
    account,
    allAccounts,
    entries: ledgerEntries,
    closingBalance: runningBalance,
    closingBalanceNpr: Math.round(runningBalance / 100)
  };
}

export async function getDaybook(dateStr) {
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  const { entries } = await buildJournal({ fromDate: targetDate, toDate: targetDate });

  const daybookEntries = entries
    .filter((e) => e.date === targetDate)
    .map((e) => ({
      ...e,
      debitNpr: Math.round((e.debit || 0) / 100),
      creditNpr: Math.round((e.credit || 0) / 100)
    }));

  const totalDr = daybookEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCr = daybookEntries.reduce((sum, e) => sum + (e.credit || 0), 0);

  return {
    date: targetDate,
    entries: daybookEntries,
    totalDr,
    totalCr,
    totalDrNpr: Math.round(totalDr / 100),
    totalCrNpr: Math.round(totalCr / 100),
    isBalanced: totalDr === totalCr
  };
}

export async function getTrialBalance(filters = {}) {
  const { entries } = await buildJournal(filters);
  const balances = {};

  entries.forEach((e) => {
    balances[e.account] = (balances[e.account] || 0) + (e.debit || 0) - (e.credit || 0);
  });

  const trialList = Object.keys(balances)
    .sort()
    .map((account) => {
      const val = balances[account];
      const dr = val > 0 ? val : 0;
      const cr = val < 0 ? -val : 0;
      return {
        account,
        dr,
        cr,
        drNpr: Math.round(dr / 100),
        crNpr: Math.round(cr / 100)
      };
    });

  const totalDr = trialList.reduce((sum, row) => sum + row.dr, 0);
  const totalCr = trialList.reduce((sum, row) => sum + row.cr, 0);

  return {
    trialList,
    totalDr,
    totalCr,
    totalDrNpr: Math.round(totalDr / 100),
    totalCrNpr: Math.round(totalCr / 100),
    isBalanced: totalDr === totalCr
  };
}

export async function getProfitAndLoss(fromDate, toDate) {
  const orderFilter = { fulfillmentStatus: { $ne: 'cancelled' } };
  const purchaseFilter = { status: { $ne: 'cancelled' } };
  const returnFilter = { status: { $nin: ['rejected', 'cancelled'] } };
  const purchaseReturnFilter = { status: { $ne: 'cancelled' } };

  if (fromDate || toDate) {
    const range = {};
    if (fromDate) range.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    orderFilter.createdAt = range;
    purchaseFilter.date = range;
    purchaseReturnFilter.date = range;
  }

  const [orders, purchases, salesReturns, purchaseReturns] = await Promise.all([
    Order.find(orderFilter).lean(),
    Purchase.find(purchaseFilter).lean(),
    SalesReturn.find(returnFilter).lean(),
    PurchaseReturn.find(purchaseReturnFilter).lean()
  ]);

  // Gross Sales Revenue net of VAT (in Paisa)
  const grossSalesRevenue = orders.reduce((sum, o) => sum + ((Number(o.grandTotal) || 0) - (Number(o.vatTotal) || 0)), 0);

  // Sales Returns net of VAT (in Paisa)
  const salesReturnsNet = salesReturns.reduce((sum, r) => sum + (Number(r.refundNet) || ((Number(r.refundAmount) || 0) - (Number(r.refundVat) || 0))), 0);

  // Net Sales Revenue
  const netSalesRevenue = Math.max(0, grossSalesRevenue - salesReturnsNet);

  // Purchase & Expenses breakdown (in Paisa)
  const expenseBreakdown = {};
  let grossPurchases = 0;

  purchases.forEach((p) => {
    const head = p.head || 'Purchases (stock)';
    const amount = Number(p.subtotal) || 0;
    expenseBreakdown[head] = (expenseBreakdown[head] || 0) + amount;
    grossPurchases += amount;
  });

  const purchaseReturnsTotal = purchaseReturns.reduce((sum, pr) => sum + (Number(pr.subtotal) || 0), 0);
  const netPurchases = Math.max(0, grossPurchases - purchaseReturnsTotal);

  if (purchaseReturnsTotal > 0) {
    expenseBreakdown['Less: Purchase Returns'] = -purchaseReturnsTotal;
  }

  const netProfit = netSalesRevenue - netPurchases;

  return {
    period: { fromDate: fromDate || null, toDate: toDate || null },
    grossSalesRevenue,
    salesReturnsNet,
    netSalesRevenue,
    grossPurchases,
    purchaseReturnsTotal,
    netPurchases,
    expenseBreakdown,
    netProfit,
    // Formatted NPR values for frontend display
    grossSalesRevenueNpr: Math.round(grossSalesRevenue / 100),
    salesReturnsNetNpr: Math.round(salesReturnsNet / 100),
    netSalesRevenueNpr: Math.round(netSalesRevenue / 100),
    netPurchasesNpr: Math.round(netPurchases / 100),
    netProfitNpr: Math.round(netProfit / 100)
  };
}

/**
 * Balance Sheet (Statement of Financial Position)
 * Formatted cleanly in accordance with NAS 1 (SMEs)
 */
export async function getBalanceSheet(asOfDate) {
  const targetDate = asOfDate || new Date().toISOString().slice(0, 10);
  const { entries } = await buildJournal({ toDate: targetDate });

  const balances = {};
  entries.forEach((e) => {
    balances[e.account] = (balances[e.account] || 0) + (e.debit || 0) - (e.credit || 0);
  });

  // Calculate current inventory asset valuation (available stock * estimated cost)
  const [inventories, variants] = await Promise.all([
    Inventory.find({ archived: false }).lean(),
    Variant.find().lean()
  ]);

  const varPriceMap = {};
  variants.forEach((v) => {
    const key = v.id || v._id?.toString();
    varPriceMap[key] = Number(v.price) || 0;
  });

  let inventoryAssetValuation = 0;
  inventories.forEach((inv) => {
    const qty = Math.max(0, Number(inv.available) || 0);
    const retailPrice = varPriceMap[inv.variantId] || 150000;
    // Standard retail cost approximation: 60% of retail price if purchase cost not specified
    const estimatedCost = Math.round(retailPrice * 0.6);
    inventoryAssetValuation += qty * estimatedCost;
  });

  // Assets
  const cashAndBank = balances['Cash & Bank'] || 0;
  const accountsReceivable = balances['Accounts Receivable'] || 0;
  const totalCurrentAssets = cashAndBank + accountsReceivable + inventoryAssetValuation;

  // Liabilities
  const accountsPayable = -(balances['Accounts Payable'] || 0);
  const outputVatPayable = -(balances['VAT Payable'] || 0);
  const inputVatReceivable = balances['VAT Receivable'] || 0;
  const netVatPayable = outputVatPayable - inputVatReceivable;
  const totalCurrentLiabilities = accountsPayable + netVatPayable;

  // Equity: Retained Earnings / Current Period Net Profit
  const netSalesRevenue = -(balances['Sales Revenue'] || 0) - (balances['Sales Returns & Allowances'] || 0);
  const netExpenses = (balances['Purchases (stock)'] || 0) + (balances['Purchase Returns'] || 0);
  const currentPeriodProfit = netSalesRevenue - netExpenses;
  const totalEquity = totalCurrentAssets - totalCurrentLiabilities;

  return {
    asOfDate: targetDate,
    assets: {
      cashAndBank,
      accountsReceivable,
      inventoryAsset: inventoryAssetValuation,
      totalAssets: totalCurrentAssets,
      cashAndBankNpr: Math.round(cashAndBank / 100),
      accountsReceivableNpr: Math.round(accountsReceivable / 100),
      inventoryAssetNpr: Math.round(inventoryAssetValuation / 100),
      totalAssetsNpr: Math.round(totalCurrentAssets / 100)
    },
    liabilities: {
      accountsPayable,
      netVatPayable,
      totalLiabilities: totalCurrentLiabilities,
      accountsPayableNpr: Math.round(accountsPayable / 100),
      netVatPayableNpr: Math.round(netVatPayable / 100),
      totalLiabilitiesNpr: Math.round(totalCurrentLiabilities / 100)
    },
    equity: {
      retainedEarnings: totalEquity,
      currentPeriodProfit,
      totalEquity,
      retainedEarningsNpr: Math.round(totalEquity / 100),
      currentPeriodProfitNpr: Math.round(currentPeriodProfit / 100),
      totalEquityNpr: Math.round(totalEquity / 100)
    },
    isBalanced: Math.abs(totalCurrentAssets - (totalCurrentLiabilities + totalEquity)) <= 100
  };
}

export default {
  buildJournal,
  getGeneralLedger,
  getDaybook,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet
};
