'use client';
import React, { useState, useEffect } from 'react';
import { money, today, docSubtotal, docVat, docTotal } from '../../../services/formatters';
import { api } from '../../../services/apiClient';

export default function AdminIrdPage() {
  const [monthStr, setMonthStr] = useState(today().slice(0, 7));
  const [salesList, setSalesList] = useState([]);
  const [purchasesList, setPurchasesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [orderRes, purchRes] = await Promise.allSettled([
        api.get('/api/admin/orders'),
        api.get('/api/admin/purchases')
      ]);

      const orders = orderRes.status === 'fulfilled' ? (orderRes.value.data?.orders || orderRes.value.data || []) : [];
      const purchases = purchRes.status === 'fulfilled' ? (purchRes.value.data?.purchases || purchRes.value.data || []) : [];

      setSalesList(orders);
      setPurchasesList(purchases);
    } catch (e) {
      console.error('Failed to load IRD data from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const m = monthStr;
  const vatRate = 13;

  const sales = salesList.filter(s => {
    const d = (s.createdAt || s.date || '').slice(0, 7);
    return d === m;
  }).map((s, idx) => {
    const grand = s.grandTotal != null ? Math.round(s.grandTotal / 100) : (Number(s.total) || 0);
    const sub = s.subtotal != null ? Math.round(s.subtotal / 100) : grand;
    const vat = s.vatTotal != null ? Math.round(s.vatTotal / 100) : Math.round(sub * 0.13);
    return {
      id: s._id || s.orderNo || `s_${idx}`,
      invoice: s.orderNo || s.no || `INV-${2030 + idx}`,
      date: (s.createdAt || s.date || today()).slice(0, 10),
      customer: s.shippingAddress?.fullName || s.customer || s.guestPhone || 'Storefront Customer',
      vatable: true,
      subtotal: sub,
      vat,
      total: grand
    };
  });

  const purch = purchasesList.filter(p => {
    const d = (p.date || '').slice(0, 7);
    return d === m;
  }).map((p, idx) => {
    const sub = p.subtotal != null ? p.subtotal : (p.total || 0);
    const vat = p.vat != null ? p.vat : (p.vatable !== false ? Math.round(sub * 0.13) : 0);
    return {
      id: p._id || p.id || `p_${idx}`,
      bill: p.bill || p.billNo || `BILL-${500 + idx}`,
      date: (p.date || today()).slice(0, 10),
      supplier: p.supplier || 'Supplier',
      vatable: p.vatable !== false,
      subtotal: sub,
      vat,
      total: sub + vat
    };
  });

  const sTaxable = sales.reduce((a, s) => a + s.subtotal, 0);
  const sExempt = 0;
  const sVat = sales.reduce((a, s) => a + s.vat, 0);

  const finalSalesTaxable = sTaxable;
  const finalSalesVat = sVat;

  const pTaxable = purch.filter(p => p.vatable).reduce((a, p) => a + p.subtotal, 0);
  const pExempt = purch.filter(p => !p.vatable).reduce((a, p) => a + p.subtotal, 0);
  const pVat = purch.reduce((a, p) => a + p.vat, 0);

  const netVatPayable = finalSalesVat - pVat;

  const exportCsv = () => {
    const rows = [
      ['Zylo VAT Return', m],
      [],
      ['SALES REGISTER (Bikri Khata)'],
      ['Date', 'Invoice', 'Customer', 'Taxable', 'VAT', 'Total']
    ];
    sales.forEach(s => {
      rows.push([s.date, s.invoice, `"${s.customer}"`, s.subtotal, s.vat, s.total]);
    });
    rows.push([], ['PURCHASE REGISTER (Kharid Khata)'], ['Date', 'Bill no', 'Supplier', 'Taxable', 'VAT', 'Total']);
    purch.forEach(p => {
      rows.push([p.date, p.bill, `"${p.supplier}"`, p.subtotal, p.vat, p.total]);
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

