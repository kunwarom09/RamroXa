'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, money, docSubtotal, docVat, docTotal, today } from '../../../services/dataStore';

export default function AdminIrdPage() {
  const [monthStr, setMonthStr] = useState(today().slice(0, 7));
  const [db, setDb] = useState(null);

  const refreshData = () => {
    setDb(loadDB());
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!db) return <div>Loading IRD report...</div>;

  const m = monthStr;
  const settings = db.settings || {};
  const vatRate = settings.vatRate || 13;

  const sales = (db.sales || []).filter(s => s.date && s.date.slice(0, 7) === m);
  const purch = (db.purchases || []).filter(p => p.date && p.date.slice(0, 7) === m);

  const sTaxable = sales.filter(s => s.vatable).reduce((a, s) => a + docSubtotal(s), 0);
  const sExempt = sales.filter(s => !s.vatable).reduce((a, s) => a + docSubtotal(s), 0);
  const sVat = sales.reduce((a, s) => a + docVat(s, vatRate), 0);

  // Posted sales returns in this month
  const rets = (db.returns || []).filter(rt => {
    const isPosted = rt.status === 'approved' || rt.status === 'refund_processed' || rt.status === 'completed';
    const dateStr = (rt.updatedAt || rt.createdAt || '').slice(0, 7);
    return isPosted && dateStr === m;
  });

  const rNet = rets.reduce((a, rt) => a + (rt.refundNet || 0), 0);
  const rVat = rets.reduce((a, rt) => a + (rt.refundVat || 0), 0);

  const finalSalesTaxable = sTaxable - rNet;
  const finalSalesVat = sVat - rVat;

  const pTaxable = purch.filter(p => p.vatable).reduce((a, p) => a + docSubtotal(p), 0);
  const pExempt = purch.filter(p => !p.vatable).reduce((a, p) => a + docSubtotal(p), 0);
  const pVat = purch.reduce((a, p) => a + docVat(p, vatRate), 0);

  const netVatPayable = finalSalesVat - pVat;

  const exportCsv = () => {
    const rows = [
      ['Zylo VAT Return', m],
      [],
      ['SALES REGISTER (Bikri Khata)'],
      ['Date', 'Invoice', 'Customer', 'Taxable', 'VAT', 'Total']
    ];
    sales.forEach(s => {
      rows.push([s.date, s.invoice, `"${s.customer}"`, docSubtotal(s), docVat(s, vatRate), docTotal(s, vatRate)]);
    });
    rows.push([], ['PURCHASE REGISTER (Kharid Khata)'], ['Date', 'Bill no', 'Supplier', 'Taxable', 'VAT', 'Total']);
    purch.forEach(p => {
      rows.push([p.date, p.bill, `"${p.supplier}"`, docSubtotal(p), docVat(p, vatRate), docTotal(p, vatRate)]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zylo-ird-vat-${m}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-head">
        <h1>IRD / VAT report</h1>
        <p>Monthly VAT return summary for Inland Revenue Department filing.</p>
      </div>

      <div className="toolbar no-print">
        <label style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Month</label>
        <input
          type="month"
          value={monthStr}
          onChange={(e) => setMonthStr(e.target.value)}
        />
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        <button className="btn btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="card card-pad form-max" style={{ marginTop: '16px' }}>
        <div className="report-head" style={{ marginBottom: '24px' }}>
          <h2>{settings.company || 'Zylo Pvt. Ltd.'}</h2>
          <p>{settings.address || 'Thamel, Kathmandu'} &middot; PAN: {settings.pan || '601234567'}</p>
          <p style={{ marginTop: '6px', fontWeight: 500, color: 'var(--accent)' }}>
            VAT Return Summary &mdash; {monthStr}
          </p>
        </div>

        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
          <div className="metric">
            <div className="label">Output VAT (sales)</div>
            <div className="value">{money(finalSalesVat)}</div>
          </div>
          <div className="metric">
            <div className="label">Input VAT (purchases)</div>
            <div className="value">{money(pVat)}</div>
          </div>
          <div className="metric">
            <div className="label">{netVatPayable >= 0 ? 'Net VAT payable' : 'Credit carried forward'}</div>
            <div className="value">{money(Math.abs(netVatPayable))}</div>
          </div>
        </div>

        <table style={{ marginBottom: '24px' }}>
          <thead>
            <tr>
              <th>Summary</th>
              <th className="num">Taxable</th>
              <th className="num">Exempt / non-VAT</th>
              <th className="num">VAT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sales (output)</td>
              <td className="num">{money(sTaxable)}</td>
              <td className="num">{money(sExempt)}</td>
              <td className="num">{money(sVat)}</td>
            </tr>
            <tr>
              <td>Purchases (input)</td>
              <td className="num">{money(pTaxable)}</td>
              <td className="num">{money(pExempt)}</td>
              <td className="num">{money(pVat)}</td>
            </tr>
            {rets.length > 0 && (
              <tr>
                <td>Sales returns (credit notes)</td>
                <td className="num">-{money(rNet)}</td>
                <td className="num">-</td>
                <td className="num">-{money(rVat)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3">{netVatPayable >= 0 ? 'Net VAT payable to IRD' : 'Excess input credit'}</td>
              <td className="num">{money(Math.abs(netVatPayable))}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ height: '16px' }} />
        <div className="section-title">Sales Register (Bikri Khata)</div>
        <div className="table-wrap" style={{ marginBottom: '24px' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th className="num">Taxable</th>
                <th className="num">VAT</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.length > 0 ? (
                sales.map(s => (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td><code>{s.invoice}</code></td>
                    <td>{s.customer}</td>
                    <td className="num">{money(docSubtotal(s))}</td>
                    <td className="num">{money(docVat(s, vatRate))}</td>
                    <td className="num">{money(docTotal(s, vatRate))}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ color: 'var(--muted-foreground)' }}>No sales recorded this month</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="section-title">Purchase Register (Kharid Khata)</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Bill No</th>
                <th>Supplier</th>
                <th className="num">Taxable</th>
                <th className="num">VAT</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {purch.length > 0 ? (
                purch.map(p => (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td><code>{p.bill}</code></td>
                    <td>{p.supplier}</td>
                    <td className="num">{money(docSubtotal(p))}</td>
                    <td className="num">{money(docVat(p, vatRate))}</td>
                    <td className="num">{money(docTotal(p, vatRate))}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ color: 'var(--muted-foreground)' }}>No purchases recorded this month</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '20px' }}>
          Prepared from records entered in this system at {vatRate}% VAT. Dates are Gregorian; convert to Bikram Sambat before filing. This is a working summary, not a substitute for the official IRD return form or advice from a registered accountant.
        </p>
      </div>
    </div>
  );
}

