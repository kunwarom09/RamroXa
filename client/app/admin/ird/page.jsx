'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { money, today } from '../../../services/formatters';
import { api } from '../../../services/apiClient';

// Convert backend Paisa (if value > 1000 and integer) or raw NPR to display rupees
function toRupees(val) {
  if (val === null || val === undefined) return 0;
  const num = Number(val) || 0;
  // If backend returns in Paisa (standard in Zylo order/purchase models)
  if (Math.abs(num) >= 100 && Number.isInteger(num)) {
    return Math.round(num / 100);
  }
  return Math.round(num);
}

export default function AdminIrdPage() {
  const [monthStr, setMonthStr] = useState(today().slice(0, 7));
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'sales', 'purchases', 'returns'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summaryData, setSummaryData] = useState({
    summary: {
      sales: { taxable: 0, vat: 0, gross: 0, count: 0 },
      returns: { taxable: 0, vat: 0, gross: 0, count: 0 },
      purchases: { taxable: 0, exempt: 0, vat: 0, gross: 0, count: 0 },
      netVatPayable: 0
    },
    salesRegister: [],
    returnsRegister: [],
    purchaseRegister: [],
    vatRate: 13
  });

  const [settings, setSettings] = useState({
    company: 'Zylo Pvt. Ltd.',
    address: 'Thamel, Kathmandu, Nepal',
    pan: '601234567',
    vatRate: 13
  });

  const loadIrdData = useCallback(async (targetMonth) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/admin/ird/vat-summary?month=${targetMonth}`);
      if (res && res.data) {
        setSummaryData(res.data);
      } else if (res && res.summary) {
        setSummaryData(res);
      }
    } catch (err) {
      console.warn('API /api/admin/ird/vat-summary failed, attempting fallback calculation:', err);
      try {
        // Fallback: fetch orders and purchases directly
        const [ordersRes, purchRes, returnsRes] = await Promise.allSettled([
          api.get('/api/admin/orders'),
          api.get('/api/admin/purchases'),
          api.get('/api/admin/returns')
        ]);

        const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.data?.orders || ordersRes.value.data || []) : [];
        const purchases = purchRes.status === 'fulfilled' ? (purchRes.value.data?.purchases || purchRes.value.data || []) : [];
        const returns = returnsRes.status === 'fulfilled' ? (returnsRes.value.data?.returns || returnsRes.value.data || []) : [];

        const filteredOrders = orders.filter(o => (o.createdAt || o.date || '').slice(0, 7) === targetMonth);
        const filteredPurch = purchases.filter(p => (p.date || '').slice(0, 7) === targetMonth);
        const filteredReturns = returns.filter(r => (r.createdAt || r.date || '').slice(0, 7) === targetMonth);

        const salesRegister = filteredOrders.map(o => {
          const gross = o.grandTotal != null ? o.grandTotal : (Number(o.total || 0) * 100);
          const vat = o.vatTotal != null ? o.vatTotal : Math.round(gross * 0.13 / 1.13);
          const taxable = gross - vat;
          return {
            date: (o.createdAt || o.date || today()).slice(0, 10),
            invoice: o.orderNo || o.id || 'INV',
            customer: o.shippingAddress?.fullName || o.customer || o.guestEmail || 'Customer',
            taxable,
            vat,
            total: gross
          };
        });

        const purchaseRegister = filteredPurch.map(p => {
          const taxable = p.subtotal != null ? p.subtotal : (p.taxable || (p.total || 0));
          const vat = p.vatAmount != null ? p.vatAmount : (p.vat != null ? p.vat : (p.vatable !== false ? Math.round(taxable * 0.13) : 0));
          const total = p.totalAmount != null ? p.totalAmount : (taxable + vat);
          return {
            date: (p.date || today()).slice(0, 10),
            bill: p.billNo || p.bill || 'BILL',
            supplier: p.supplier || 'Supplier',
            supplierPan: p.supplierPan || '',
            vatable: p.vatable !== false,
            taxable,
            vat,
            total
          };
        });

        const returnsRegister = filteredReturns.map(r => {
          const gross = r.refundAmount != null ? (r.refundAmount > 1000 ? r.refundAmount : r.refundAmount * 100) : 0;
          const vat = r.refundVat != null ? (r.refundVat > 1000 ? r.refundVat : r.refundVat * 100) : Math.round(gross * 0.13 / 1.13);
          const taxable = r.refundNet != null ? (r.refundNet > 1000 ? r.refundNet : r.refundNet * 100) : (gross - vat);
          return {
            date: (r.date || r.createdAt || today()).slice(0, 10),
            creditNoteNo: r.no || r.id || 'CN',
            orderNo: r.orderNo || '',
            customer: r.customer || 'Customer',
            taxable,
            vat,
            total: gross,
            reason: r.reason || ''
          };
        });

        const sTaxable = salesRegister.reduce((a, s) => a + s.taxable, 0);
        const sVat = salesRegister.reduce((a, s) => a + s.vat, 0);
        const sGross = salesRegister.reduce((a, s) => a + s.total, 0);

        const rTaxable = returnsRegister.reduce((a, r) => a + r.taxable, 0);
        const rVat = returnsRegister.reduce((a, r) => a + r.vat, 0);
        const rGross = returnsRegister.reduce((a, r) => a + r.total, 0);

        const pTaxable = purchaseRegister.filter(p => p.vatable).reduce((a, p) => a + p.taxable, 0);
        const pExempt = purchaseRegister.filter(p => !p.vatable).reduce((a, p) => a + p.taxable, 0);
        const pVat = purchaseRegister.reduce((a, p) => a + p.vat, 0);
        const pGross = purchaseRegister.reduce((a, p) => a + p.total, 0);

        const netVat = (sVat - rVat) - pVat;

        setSummaryData({
          month: targetMonth,
          vatRate: 13,
          summary: {
            sales: { taxable: sTaxable, vat: sVat, gross: sGross, count: salesRegister.length },
            returns: { taxable: rTaxable, vat: rVat, gross: rGross, count: returnsRegister.length },
            purchases: { taxable: pTaxable, exempt: pExempt, vat: pVat, gross: pGross, count: purchaseRegister.length },
            netVatPayable: netVat
          },
          salesRegister,
          returnsRegister,
          purchaseRegister
        });
      } catch (fallbackErr) {
        setError('Failed to load IRD VAT data. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? (localStorage.getItem('zylo_admin_settings') || localStorage.getItem('zylo_settings')) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch (e) {}
    loadIrdData(monthStr);
  }, [loadIrdData, monthStr]);

  const vatRate = summaryData?.vatRate || settings?.vatRate || 13;
  const rawSummary = summaryData?.summary || {};

  // Formatted values in Rupees
  const salesTaxable = toRupees(rawSummary?.sales?.taxable);
  const salesVat = toRupees(rawSummary?.sales?.vat);
  const salesGross = toRupees(rawSummary?.sales?.gross);

  const returnsTaxable = toRupees(rawSummary?.returns?.taxable);
  const returnsVat = toRupees(rawSummary?.returns?.vat);
  const returnsGross = toRupees(rawSummary?.returns?.gross);

  const purchasesTaxable = toRupees(rawSummary?.purchases?.taxable);
  const purchasesExempt = toRupees(rawSummary?.purchases?.exempt);
  const purchasesVat = toRupees(rawSummary?.purchases?.vat);
  const purchasesGross = toRupees(rawSummary?.purchases?.gross);

  const netVatPayable = toRupees(rawSummary?.netVatPayable);

  const sales = summaryData.salesRegister || [];
  const returns = summaryData.returnsRegister || [];
  const purch = summaryData.purchaseRegister || [];

  const exportCsv = () => {
    const rows = [
      [`NEPAL INLAND REVENUE DEPARTMENT (IRD) - VAT RETURN SUMMARY`],
      [`Company Name`, `"${settings?.company || 'Zylo Pvt. Ltd.'}"`],
      [`Taxpayer PAN`, `"${settings?.pan || '601234567'}"`],
      [`Tax Period (AD)`, monthStr],
      [`Applicable VAT Rate`, `${vatRate}%`],
      [],
      [`--- SUMMARY OF VAT COMPUTATION ---`],
      [`Category`, `Taxable Amount (NPR)`, `Exempt Amount (NPR)`, `VAT (13% NPR)`, `Total Gross (NPR)`],
      [`Sales / Output VAT`, salesTaxable, 0, salesVat, salesGross],
      [`Less: Sales Returns (Credit Notes)`, returnsTaxable, 0, returnsVat, returnsGross],
      [`Purchases / Input VAT`, purchasesTaxable, purchasesExempt, purchasesVat, purchasesGross],
      [netVatPayable >= 0 ? `Net VAT Payable to IRD` : `Excess Input VAT Credit C/F`, ``, ``, Math.abs(netVatPayable), ``],
      [],
      [`--- SALES REGISTER (Bikri Khata - Anusuchi 8) ---`],
      [`Date`, `Tax Invoice No`, `Buyer / Customer Name`, `Taxable Sales (NPR)`, `Output VAT 13% (NPR)`, `Total Invoice (NPR)`]
    ];

    sales.forEach(s => {
      rows.push([
        s.date,
        s.invoice,
        `"${s.customer || 'Store Customer'}"`,
        toRupees(s.taxable),
        toRupees(s.vat),
        toRupees(s.total)
      ]);
    });

    if (returns.length > 0) {
      rows.push(
        [],
        [`--- CREDIT NOTES REGISTER (Sales Returns - Anusuchi 10) ---`],
        [`Date`, `Credit Note No`, `Original Invoice No`, `Customer Name`, `Reason`, `Taxable Credit (NPR)`, `VAT 13% (NPR)`, `Total Refund (NPR)`]
      );
      returns.forEach(r => {
        rows.push([
          r.date,
          r.creditNoteNo,
          r.orderNo,
          `"${r.customer || 'Customer'}"`,
          `"${r.reason || ''}"`,
          toRupees(r.taxable),
          toRupees(r.vat),
          toRupees(r.total)
        ]);
      });
    }

    rows.push(
      [],
      [`--- PURCHASE REGISTER (Kharid Khata - Anusuchi 9) ---`],
      [`Date`, `Supplier Bill No`, `Supplier Name`, `Supplier PAN`, `Taxable Purchase (NPR)`, `Input VAT 13% (NPR)`, `Total Bill (NPR)`]
    );

    purch.forEach(p => {
      rows.push([
        p.date,
        p.bill,
        `"${p.supplier || 'Supplier'}"`,
        `"${p.supplierPan || ''}"`,
        toRupees(p.taxable),
        toRupees(p.vat),
        toRupees(p.total)
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nepal-ird-vat-return-${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Header */}
      <div className="page-head">
        <h2>IRD / VAT Return Module</h2>
        <p>
          Official VAT return computation, Bikri Khata (Sales), Kharid Khata (Purchases), and Credit Notes for Inland Revenue Department filing.
        </p>
      </div>

      {/* Toolbar & Month Selection */}
      <div className="toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--primary)' }}>Tax Period (AD):</label>
          <input
            type="month"
            value={monthStr}
            onChange={(e) => setMonthStr(e.target.value)}
          />
        </div>

        <button
          className="btn btn-sm"
          onClick={() => loadIrdData(monthStr)}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>

        <div className="spacer" />

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Reports
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'sales' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            Bikri Khata ({sales.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'purchases' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            Kharid Khata ({purch.length})
          </button>
          {returns.length > 0 && (
            <button
              className={`btn btn-sm ${activeTab === 'returns' ? 'btn-primary' : ''}`}
              onClick={() => setActiveTab('returns')}
            >
              Credit Notes ({returns.length})
            </button>
          )}
        </div>

        <button className="btn btn-sm" onClick={exportCsv}>
          📥 Export IRD CSV
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => window.print()}>
          🖨️ Print / PDF
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Main Report Card */}
      <div className="card card-pad" style={{ marginTop: '16px' }}>
        {/* Taxpayer Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '500', color: 'var(--primary)', margin: 0 }}>
              {settings?.company || 'Zylo Pvt. Ltd.'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted-foreground)' }}>
              {settings?.address || 'Thamel, Kathmandu, Nepal'} &middot; <strong style={{ color: 'var(--primary)' }}>PAN: {settings?.pan || '601234567'}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-accent" style={{ marginBottom: '4px', display: 'inline-block' }}>
              Standard Rate: {vatRate}% VAT
            </span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
              Filing Period: {monthStr}
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="metric-grid" style={{ gridTemplateColumns: returnsVat > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', marginBottom: '28px' }}>
          <div className="metric" style={{ background: 'var(--success-soft)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)' }}>
            <div className="label" style={{ color: 'var(--success)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Output VAT (Sales)
            </div>
            <div className="value" style={{ color: 'var(--success)', fontWeight: '700' }}>
              {money(salesVat)}
            </div>
            <div className="hint" style={{ color: 'var(--muted-foreground)' }}>
              On {money(salesTaxable)} taxable sales ({rawSummary?.sales?.count || 0} invoices)
            </div>
          </div>

          <div className="metric" style={{ background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
            <div className="label" style={{ color: 'var(--accent)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Input VAT (Purchases)
            </div>
            <div className="value" style={{ color: 'var(--accent)', fontWeight: '700' }}>
              {money(purchasesVat)}
            </div>
            <div className="hint" style={{ color: 'var(--muted-foreground)' }}>
              On {money(purchasesTaxable)} taxable purchases ({rawSummary?.purchases?.count || 0} bills)
            </div>
          </div>

          {returnsVat > 0 && (
            <div className="metric" style={{ background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
              <div className="label" style={{ color: 'var(--danger)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sales Returns (Credit Notes)
              </div>
              <div className="value" style={{ color: 'var(--danger)', fontWeight: '700' }}>
                -{money(returnsVat)}
              </div>
              <div className="hint" style={{ color: 'var(--muted-foreground)' }}>
                On {money(returnsTaxable)} returned goods ({rawSummary?.returns?.count || 0} notes)
              </div>
            </div>
          )}

          <div className="metric" style={{
            background: netVatPayable >= 0 ? 'var(--warning-soft)' : 'var(--accent-soft)',
            border: netVatPayable >= 0 ? '1px solid color-mix(in srgb, var(--warning) 25%, transparent)' : '1px solid color-mix(in srgb, var(--accent) 25%, transparent)'
          }}>
            <div className="label" style={{
              color: netVatPayable >= 0 ? 'var(--warning)' : 'var(--accent)',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {netVatPayable >= 0 ? 'Net VAT Payable to IRD' : 'Excess Input Credit C/F'}
            </div>
            <div className="value" style={{
              color: netVatPayable >= 0 ? 'var(--warning)' : 'var(--accent)',
              fontWeight: '700'
            }}>
              {money(Math.abs(netVatPayable))}
            </div>
            <div className="hint" style={{ color: 'var(--muted-foreground)' }}>
              {netVatPayable >= 0 ? 'Due by 25th of next Nepali month' : 'Eligible for deduction in next period'}
            </div>
          </div>
        </div>

        {/* VAT Computation Master Table */}
        <div style={{ marginBottom: '32px' }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📋</span> Monthly VAT Return Summary (IRD Filing Worksheet)
          </div>
          <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
            <table>
              <thead>
                <tr style={{ background: 'var(--muted)' }}>
                  <th>Classification / Account Head</th>
                  <th className="num">Taxable Amount (Rs)</th>
                  <th className="num">Exempt / Non-VAT (Rs)</th>
                  <th className="num">13% VAT Amount (Rs)</th>
                  <th className="num">Total Gross (Rs)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: '500' }}>1. Total Sales (Output Taxable Goods)</td>
                  <td className="num">{money(salesTaxable)}</td>
                  <td className="num">{money(0)}</td>
                  <td className="num" style={{ fontWeight: '600', color: 'var(--success)' }}>{money(salesVat)}</td>
                  <td className="num" style={{ fontWeight: '600' }}>{money(salesGross)}</td>
                </tr>
                {returns.length > 0 && (
                  <tr style={{ background: 'var(--danger-soft)' }}>
                    <td style={{ fontWeight: '500', color: 'var(--danger)' }}>2. Less: Sales Returns / Credit Notes (Anusuchi 10)</td>
                    <td className="num" style={{ color: 'var(--danger)' }}>-{money(returnsTaxable)}</td>
                    <td className="num">-</td>
                    <td className="num" style={{ fontWeight: '600', color: 'var(--danger)' }}>-{money(returnsVat)}</td>
                    <td className="num" style={{ color: 'var(--danger)' }}>-{money(returnsGross)}</td>
                  </tr>
                )}
                <tr style={{ background: 'var(--muted)' }}>
                  <td style={{ fontWeight: '600' }}>Net Adjusted Sales (Output Base)</td>
                  <td className="num" style={{ fontWeight: '600' }}>{money(salesTaxable - returnsTaxable)}</td>
                  <td className="num">{money(0)}</td>
                  <td className="num" style={{ fontWeight: '700', color: 'var(--success)' }}>{money(salesVat - returnsVat)}</td>
                  <td className="num" style={{ fontWeight: '600' }}>{money(salesGross - returnsGross)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '500' }}>3. Total Purchases (Input Taxable Stock & Materials)</td>
                  <td className="num">{money(purchasesTaxable)}</td>
                  <td className="num">{money(purchasesExempt)}</td>
                  <td className="num" style={{ fontWeight: '600', color: 'var(--accent)' }}>{money(purchasesVat)}</td>
                  <td className="num" style={{ fontWeight: '600' }}>{money(purchasesGross)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{
                  background: netVatPayable >= 0 ? 'var(--warning-soft)' : 'var(--accent-soft)',
                  fontWeight: '700',
                  color: netVatPayable >= 0 ? 'var(--warning)' : 'var(--accent)'
                }}>
                  <td colSpan="3">
                    {netVatPayable >= 0 ? 'Net VAT Payable to Inland Revenue Department (IRD)' : 'Excess Input Credit Carried Forward'}
                  </td>
                  <td className="num">
                    {money(Math.abs(netVatPayable))}
                  </td>
                  <td className="num" style={{ fontSize: '11px' }}>
                    {netVatPayable >= 0 ? 'Tax Payable' : 'Credit Carried Forward'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sales Register (Bikri Khata) */}
        {(activeTab === 'all' || activeTab === 'sales') && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div className="section-title" style={{ margin: 0 }}>
                🧾 Sales Register &mdash; Bikri Khata (Anusuchi 8)
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                {sales.length} record{sales.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
              <table>
                <thead>
                  <tr style={{ background: 'var(--muted)' }}>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th>Customer / Buyer</th>
                    <th className="num">Taxable Sales (Rs)</th>
                    <th className="num">VAT 13% (Rs)</th>
                    <th className="num">Total Gross (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length > 0 ? (
                    sales.map((s, idx) => (
                      <tr key={s.id || s.invoice || idx}>
                        <td>{s.date || today()}</td>
                        <td>
                          <code style={{ background: 'var(--muted)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border)' }}>
                            {s.invoice}
                          </code>
                        </td>
                        <td style={{ fontWeight: '500' }}>{s.customer || 'Storefront Customer'}</td>
                        <td className="num">{money(toRupees(s.taxable))}</td>
                        <td className="num" style={{ color: 'var(--success)', fontWeight: '500' }}>{money(toRupees(s.vat))}</td>
                        <td className="num" style={{ fontWeight: '600' }}>{money(toRupees(s.total))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                        No sales invoices recorded for {monthStr}
                      </td>
                    </tr>
                  )}
                </tbody>
                {sales.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--muted)', fontWeight: '700' }}>
                      <td colSpan="3">Total Sales (Bikri Khata)</td>
                      <td className="num">{money(salesTaxable)}</td>
                      <td className="num" style={{ color: 'var(--success)' }}>{money(salesVat)}</td>
                      <td className="num">{money(salesGross)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Credit Notes (Sales Returns Register - Anusuchi 10) */}
        {(activeTab === 'all' || activeTab === 'returns') && returns.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div className="section-title" style={{ margin: 0, color: 'var(--danger)' }}>
                ↩️ Credit Notes Register &mdash; Sales Returns (Anusuchi 10)
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                {returns.length} note{returns.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
              <table>
                <thead>
                  <tr style={{ background: 'var(--danger-soft)' }}>
                    <th>Date</th>
                    <th>Credit Note No</th>
                    <th>Orig. Invoice</th>
                    <th>Customer</th>
                    <th>Reason</th>
                    <th className="num">Taxable Refund (Rs)</th>
                    <th className="num">VAT 13% (Rs)</th>
                    <th className="num">Total Credit (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r, idx) => (
                    <tr key={r.id || r.creditNoteNo || idx}>
                      <td>{r.date || today()}</td>
                      <td>
                        <code style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                          {r.creditNoteNo}
                        </code>
                      </td>
                      <td>{r.orderNo || '-'}</td>
                      <td>{r.customer || 'Customer'}</td>
                      <td style={{ color: 'var(--muted-foreground)' }}>{r.reason || 'Sales return'}</td>
                      <td className="num" style={{ color: 'var(--danger)' }}>-{money(toRupees(r.taxable))}</td>
                      <td className="num" style={{ color: 'var(--danger)' }}>-{money(toRupees(r.vat))}</td>
                      <td className="num" style={{ fontWeight: '600', color: 'var(--danger)' }}>-{money(toRupees(r.total))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--danger-soft)', fontWeight: '700' }}>
                    <td colSpan="5">Total Credit Notes (Sales Deductions)</td>
                    <td className="num" style={{ color: 'var(--danger)' }}>-{money(returnsTaxable)}</td>
                    <td className="num" style={{ color: 'var(--danger)' }}>-{money(returnsVat)}</td>
                    <td className="num" style={{ color: 'var(--danger)' }}>-{money(returnsGross)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Purchase Register (Kharid Khata) */}
        {(activeTab === 'all' || activeTab === 'purchases') && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div className="section-title" style={{ margin: 0 }}>
                📦 Purchase Register &mdash; Kharid Khata (Anusuchi 9)
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                {purch.length} record{purch.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
              <table>
                <thead>
                  <tr style={{ background: 'var(--muted)' }}>
                    <th>Date</th>
                    <th>Supplier Bill No</th>
                    <th>Supplier Name</th>
                    <th>Supplier PAN</th>
                    <th className="num">Taxable (Rs)</th>
                    <th className="num">Input VAT 13% (Rs)</th>
                    <th className="num">Total Bill (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {purch.length > 0 ? (
                    purch.map((p, idx) => (
                      <tr key={p.id || p.bill || idx}>
                        <td>{p.date || today()}</td>
                        <td>
                          <code style={{ background: 'var(--muted)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border)' }}>
                            {p.bill}
                          </code>
                        </td>
                        <td style={{ fontWeight: '500' }}>{p.supplier || 'Vendor / Supplier'}</td>
                        <td style={{ color: 'var(--muted-foreground)' }}>{p.supplierPan || '-'}</td>
                        <td className="num">{money(toRupees(p.taxable))}</td>
                        <td className="num" style={{ color: 'var(--accent)', fontWeight: '500' }}>{money(toRupees(p.vat))}</td>
                        <td className="num" style={{ fontWeight: '600' }}>{money(toRupees(p.total))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                        No purchase bills recorded for {monthStr}
                      </td>
                    </tr>
                  )}
                </tbody>
                {purch.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--muted)', fontWeight: '700' }}>
                      <td colSpan="4">Total Purchases (Kharid Khata)</td>
                      <td className="num">{money(purchasesTaxable)}</td>
                      <td className="num" style={{ color: 'var(--accent)' }}>{money(purchasesVat)}</td>
                      <td className="num">{money(purchasesGross)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Legal & Compliance Footer */}
        <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: '1.6' }}>
          <p style={{ margin: 0 }}>
            <strong>Nepal Inland Revenue Department (IRD) Filing Guidelines:</strong> Taxable sales and input purchases are calculated in accordance with the Value Added Tax Act, 2052. Returns must be verified against fiscal sales invoices and authentic tax purchase bills. Dates are recorded in Gregorian (AD) and should be reconciled with Bikram Sambat (BS) month schedules for monthly e-TDS and VAT filing before the 25th of the succeeding month.
          </p>
        </div>
      </div>
    </div>
  );
}
