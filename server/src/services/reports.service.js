import { Order } from '../models/Order.js';

export function getPeriodKey(date, mode = 'monthly') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (mode === 'daily') {
    return `${year}-${month}-${day}`;
  }

  if (mode === 'monthly') {
    return `${year}-${month}`;
  }

  if (mode === 'quarterly') {
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `${year}-Q${q}`;
  }

  if (mode === 'annual') {
    return `${year}`;
  }

  if (mode === 'weekly') {
    // Calculate ISO week
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNr = 1 + Math.ceil((firstThursday - target) / 604800000);
    return `${year}-W${String(weekNr).padStart(2, '0')}`;
  }

  return `${year}-${month}`;
}

export async function getSalesReport(query = {}) {
  const { mode = 'monthly', fromDate, toDate } = query;
  const filter = { fulfillmentStatus: { $ne: 'cancelled' } };

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const orders = await Order.find(filter).sort({ createdAt: 1 }).lean();

  const groups = {};

  for (const order of orders) {
    const date = order.createdAt || new Date();
    const key = getPeriodKey(date, mode);

    if (!groups[key]) {
      groups[key] = {
        period: key,
        count: 0,
        taxable: 0,
        vat: 0,
        total: 0
      };
    }

    const grandTotal = order.grandTotal || 0;
    const vatTotal = order.vatTotal || 0;
    const taxable = grandTotal - vatTotal;

    groups[key].count += 1;
    groups[key].taxable += taxable;
    groups[key].vat += vatTotal;
    groups[key].total += grandTotal;
  }

  const sortedKeys = Object.keys(groups).sort();
  const rows = sortedKeys.map((k) => groups[k]);

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalCount += row.count;
      acc.totalTaxable += row.taxable;
      acc.totalVat += row.vat;
      acc.totalGross += row.total;
      return acc;
    },
    { totalCount: 0, totalTaxable: 0, totalVat: 0, totalGross: 0 }
  );

  return {
    mode,
    period: { fromDate: fromDate || null, toDate: toDate || null },
    rows,
    summary
  };
}

export default {
  getPeriodKey,
  getSalesReport
};
