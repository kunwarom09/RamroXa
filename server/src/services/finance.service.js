import { Order } from '../models/Order.js';
import { Purchase } from '../models/Purchase.js';

export async function buildJournal(filters = {}) {
  const { fromDate, toDate } = filters;
  const orderFilter = { fulfillmentStatus: { $ne: 'cancelled' } };
  const purchaseFilter = {};

  if (fromDate || toDate) {
    orderFilter.createdAt = {};
    purchaseFilter.date = {};
    if (fromDate) {
      orderFilter.createdAt.$gte = new Date(fromDate);
      purchaseFilter.date.$gte = new Date(fromDate);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      orderFilter.createdAt.$lte = end;
      purchaseFilter.date.$lte = end;
    }
  }

  const [orders, purchases] = await Promise.all([
    Order.find(orderFilter).sort({ createdAt: 1 }).lean(),
    Purchase.find(purchaseFilter).sort({ date: 1 }).lean()
  ]);

  const entries = [];

  // 1. Process Orders (Sales)
  for (const order of orders) {
    const dateStr = order.createdAt ? order.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const voucher = order.orderNo;
    const customer = order.shippingAddress?.fullName || order.guestEmail || 'Customer';
    const grandTotal = order.grandTotal || 0; // Paisa
    const vatTotal = order.vatTotal || 0;     // Paisa
    const netRevenue = grandTotal - vatTotal;  // Paisa

    const drAccount = order.paymentStatus === 'paid' ? 'Cash & Bank' : 'Accounts Receivable';

    // Debit Cash & Bank / Accounts Receivable for full amount
    entries.push({
      date: dateStr,
      voucher,
      account: drAccount,
      narration: `Sale to ${customer} (${order.orderNo})`,
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

  // 2. Process Purchases (Expenses / Inventory Stock)
  for (const purchase of purchases) {
    const dateStr = purchase.date ? purchase.date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const voucher = purchase.billNo;
    const subtotal = purchase.subtotal || 0;
    const vatAmount = purchase.vatAmount || 0;
    const totalAmount = purchase.totalAmount || (subtotal + vatAmount);

    const crAccount = purchase.paymentStatus === 'unpaid' ? 'Accounts Payable' : 'Cash & Bank';

    // Debit Expense Head / Stock
    entries.push({
      date: dateStr,
      voucher,
      account: purchase.head || 'Purchases (stock)',
      narration: `Purchase from ${purchase.supplier}`,
      debit: subtotal,
      credit: 0
    });

    // Debit VAT Receivable (Input VAT)
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
      narration: `Payment to ${purchase.supplier}`,
      debit: 0,
      credit: totalAmount
    });
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
        balance: runningBalance
      };
    });

  return {
    account,
    allAccounts,
    entries: ledgerEntries,
    closingBalance: runningBalance
  };
}

export async function getDaybook(dateStr) {
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  const { entries } = await buildJournal({ fromDate: targetDate, toDate: targetDate });

  const daybookEntries = entries.filter((e) => e.date === targetDate);
  const totalDr = daybookEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCr = daybookEntries.reduce((sum, e) => sum + (e.credit || 0), 0);

  return {
    date: targetDate,
    entries: daybookEntries,
    totalDr,
    totalCr,
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
      return {
        account,
        dr: val > 0 ? val : 0,
        cr: val < 0 ? -val : 0
      };
    });

  const totalDr = trialList.reduce((sum, row) => sum + row.dr, 0);
  const totalCr = trialList.reduce((sum, row) => sum + row.cr, 0);

  return {
    trialList,
    totalDr,
    totalCr,
    isBalanced: totalDr === totalCr
  };
}

export async function getProfitAndLoss(fromDate, toDate) {
  const orderFilter = { fulfillmentStatus: { $ne: 'cancelled' } };
  const purchaseFilter = {};

  if (fromDate || toDate) {
    orderFilter.createdAt = {};
    purchaseFilter.date = {};
    if (fromDate) {
      orderFilter.createdAt.$gte = new Date(fromDate);
      purchaseFilter.date.$gte = new Date(fromDate);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      orderFilter.createdAt.$lte = end;
      purchaseFilter.date.$lte = end;
    }
  }

  const [orders, purchases] = await Promise.all([
    Order.find(orderFilter).lean(),
    Purchase.find(purchaseFilter).lean()
  ]);

  // Net Sales Revenue (Gross Total - VAT)
  const totalSalesNet = orders.reduce((sum, o) => sum + ((o.grandTotal || 0) - (o.vatTotal || 0)), 0);

  // Expense breakdown by head
  const expenseBreakdown = {};
  let totalPurchasesNet = 0;

  purchases.forEach((p) => {
    const head = p.head || 'Purchases (stock)';
    const amount = p.subtotal || 0;
    expenseBreakdown[head] = (expenseBreakdown[head] || 0) + amount;
    totalPurchasesNet += amount;
  });

  const netProfit = totalSalesNet - totalPurchasesNet;

  return {
    period: { fromDate: fromDate || null, toDate: toDate || null },
    totalSalesNet,        // In Paisa
    totalPurchasesNet,    // In Paisa
    expenseBreakdown,     // By head in Paisa
    netProfit             // In Paisa
  };
}

export default {
  buildJournal,
  getGeneralLedger,
  getDaybook,
  getTrialBalance,
  getProfitAndLoss
};
