'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, money, docSubtotal, docVat, docTotal, today, offsetDate, periodKey, esc } from '../../../services/dataStore';
import Icon from '../../../components/admin/Icons';

export default function AdminReportsPage() {
  const [periodMode, setPeriodMode] = useState('monthly');
  const [fromDate, setFromDate] = useState(offsetDate(-365));
  const [toDate, setToDate] = useState(today());
  const [db, setDb] = useState(null);

  const refreshData = () => {
    setDb(loadDB());
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!db) return <div style={{ padding: '24px' }}>Loading reports...</div>;

  const sales = db.sales || [];
  const vatRate = (db.settings && db.settings.vatRate) || 13;

  const setPreset = (type) => {
    const t = today();
    if (type === 'thisMonth') {
      setFromDate(t.slice(0, 7) + '-01');
      setToDate(t);
      setPeriodMode('daily');
    } else if (type === 'lastMonth') {
      const prev = offsetDate(-30);
      const ym = prev.slice(0, 7);
      setFromDate(ym + '-01');
      setToDate(ym + '-31');
      setPeriodMode('daily');
    } else if (type === 'ytd') {
      setFromDate(t.slice(0, 4) + '-01-01');
      setToDate(t);
      setPeriodMode('monthly');
    } else if (type === 'all') {
      setFromDate('');
      setToDate('');
      setPeriodMode('monthly');
    }
  };

  const filteredSales = sales.filter(s => {
    const matchFrom = !fromDate || (s.date && s.date >= fromDate);
    const matchTo = !toDate || (s.date && s.date <= toDate);
    return matchFrom && matchTo;
  });

  // Group by period key
  const groups = {};
  filteredSales.forEach(s => {
    const k = periodKey(s.date || today(), periodMode);
    if (!groups[k]) groups[k] = { count: 0, taxable: 0, vat: 0, total: 0 };
    groups[k].count++;
    groups[k].taxable += docSubtotal(s);
    groups[k].vat += docVat(s, vatRate);
    groups[k].total += docTotal(s, vatRate);
  });

  const sortedKeys = Object.keys(groups).sort();

  let tc = 0, tx = 0, tv = 0, tt = 0;
  sortedKeys.forEach(k => {
    const g = groups[k];
    tc += g.count;
    tx += g.taxable;
    tv += g.vat;
    tt += g.total;
  });

  const exportCsv = () => {
    const headers = [`Period (${periodMode})`, 'Invoices', 'Taxable Amount', 'VAT', 'Gross Total'];
    const rows = sortedKeys.map(k => {
      const g = groups[k];
      return [k, g.count, g.taxable, g.vat, g.total];
    });
    rows.push(['TOTAL', tc, tx, tv, tt]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zylo-sales-report-${periodMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Sales reports</h1>
        <p>Daily, weekly, monthly, quarterly and annual summaries.</p>
      </div>

      <div className="toolbar no-print">
        <label style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Period</label>
        <select value={periodMode} onChange={(e) => setPeriodMode(e.target.value)} style={{ width: '130px' }}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>

        <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginLeft: '8px' }}>From</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <label style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>To</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <button className="btn btn-sm" onClick={() => setPreset('thisMonth')}>This Month</button>
        <button className="btn btn-sm" onClick={() => setPreset('lastMonth')}>Last Month</button>
        <button className="btn btn-sm" onClick={() => setPreset('ytd')}>YTD</button>
        <button className="btn btn-sm" onClick={() => setPreset('all')}>All Time</button>

        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>
          <Icon name="download" size={15} /> Export CSV
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          Print Report
        </button>
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="metric">
          <div className="label">Invoices</div>
          <div className="value">{tc}</div>
        </div>
        <div className="metric">
          <div className="label">Taxable amount</div>
          <div className="value">{money(tx)}</div>
        </div>
        <div className="metric">
          <div className="label">VAT (13%)</div>
          <div className="value">{money(tv)}</div>
        </div>
        <div className="metric">
          <div className="label">Gross total</div>
          <div className="value">{money(tt)}</div>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th className="num">Invoices</th>
              <th className="num">Taxable</th>
              <th className="num">VAT</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedKeys.length > 0 ? (
              sortedKeys.map(k => {
                const g = groups[k];
                return (
                  <tr key={k}>
                    <td style={{ fontWeight: 500 }}>{k}</td>
                    <td className="num">{g.count}</td>
                    <td className="num">{money(g.taxable)}</td>
                    <td className="num">{money(g.vat)}</td>
                    <td className="num">{money(g.total)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5">
                  <div className="empty-state">No sales recorded in the selected range.</div>
                </td>
              </tr>
            )}
          </tbody>
          {sortedKeys.length > 0 && (
            <tfoot>
              <tr>
                <td style={{ fontWeight: 600 }}>Totals</td>
                <td className="num" style={{ fontWeight: 600 }}>{tc}</td>
                <td className="num" style={{ fontWeight: 600 }}>{money(tx)}</td>
                <td className="num" style={{ fontWeight: 600 }}>{money(tv)}</td>
                <td className="num" style={{ fontWeight: 600 }}>{money(tt)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
