'use client';
import React, { useState, useEffect } from 'react';
import { money, today, offsetDate } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

export default function AdminFinancePage() {
  const [tab, setTab] = useState('journal');
  const [journal, setJournal] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [purchasesList, setPurchasesList] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [settings, setSettings] = useState({ company: 'Ramroxa Pvt. Ltd.', pan: '601234567' });
  const [loading, setLoading] = useState(true);

  // Ledger state
  const [selectedAccount, setSelectedAccount] = useState('Sales Revenue');
  
  // Daybook state
  const [daybookDate, setDaybookDate] = useState(today());

  // P&L state
  const [plFrom, setPlFrom] = useState(offsetDate(-365));
  const [plTo, setPlTo] = useState(today());
  const [plPreset, setPlPreset] = useState('ytd');

  const refreshData = async () => {
    setLoading(true);
    try {
      const [orderRes, purchRes, retRes] = await Promise.allSettled([
        api.get('/api/admin/orders'),
        api.get('/api/admin/purchases'),
        api.get('/api/admin/returns')
      ]);

      const orders = orderRes.status === 'fulfilled' ? (orderRes.value.data?.orders || orderRes.value.data || []) : [];
      const purchases = purchRes.status === 'fulfilled' ? (purchRes.value.data?.purchases || purchRes.value.data || []) : [];
      const returns = retRes.status === 'fulfilled' ? (retRes.value.data?.returns || retRes.value.data?.data || retRes.value.data || []) : [];

      setSalesList(orders);
      setPurchasesList(purchases);
      setReturnsList(returns);

      // Build double-entry accounting journal
      const entries = [];

      // 1. Sales Entries
      orders.forEach((o) => {
        const grand = o.grandTotal != null ? Math.round(o.grandTotal / 100) : (Number(o.total) || 0);
        const sub = o.subtotal != null ? Math.round(o.subtotal / 100) : grand;
        const vat = o.vatTotal != null ? Math.round(o.vatTotal / 100) : Math.round(sub * 0.13);
        const date = (o.createdAt || o.date || today()).slice(0, 10);
        const voucher = o.orderNo || o.no || 'ORD';
        const cust = o.shippingAddress?.fullName || o.customer || 'Customer';

        // Debit Cash/Bank or Accounts Receivable
        entries.push({
          date,
          voucher,
          account: (o.paymentMethod || o.pay || '').toLowerCase() === 'credit' ? 'Accounts Receivable' : 'Cash & Bank',
          narration: `Sale to ${cust}`,
          debit: grand,
          credit: 0
        });

        // Credit Sales Revenue
        entries.push({
          date,
          voucher,
          account: 'Sales Revenue',
          narration: 'Gross sales revenue',
          debit: 0,
          credit: sub
        });

        // Credit Output VAT Payable
        if (vat > 0) {
          entries.push({
            date,
            voucher,
            account: 'Output VAT Payable',
            narration: '13% IRD VAT collected',
            debit: 0,
            credit: vat
          });
        }
      });

      // 2. Sales Returns Entries
      returns.forEach((r) => {
        if (r.status === 'rejected') return;
        const date = (r.date || r.createdAt || today()).slice(0, 10);
        const voucher = r.no || 'RET';
        const refundAmt = Number(r.refundAmount) || 0;
        const netRef = r.refundNet != null ? Number(r.refundNet) : Math.round(refundAmt / 1.13);
        const vatRef = refundAmt - netRef;

        // Debit Sales Returns & Allowances
        entries.push({
          date,
          voucher,
          account: 'Sales Returns & Allowances',
          narration: `Return from ${r.customer || 'Customer'} (${r.reason || 'Return'})`,
          debit: netRef,
          credit: 0
        });

        // Debit Output VAT (Reversal)
        if (vatRef > 0) {
          entries.push({
            date,
            voucher,
            account: 'Output VAT Payable',
            narration: `VAT reversal for return ${voucher}`,
            debit: vatRef,
            credit: 0
          });
        }

        // Credit Cash & Bank / Refund Payable
        entries.push({
          date,
          voucher,
          account: 'Cash & Bank',
          narration: `Refund payment for ${voucher}`,
          debit: 0,
          credit: refundAmt
        });
      });

      // 3. Purchases & Expense Entries
      purchases.forEach((p) => {
        const sub = p.subtotal != null ? p.subtotal : (p.total || 0);
        const vat = p.vat != null ? p.vat : (p.vatable !== false ? Math.round(sub * 0.13) : 0);
        const tot = sub + vat;
        const date = (p.date || today()).slice(0, 10);
        const voucher = p.bill || p.billNo || 'BILL';
        const supp = p.supplier || 'Supplier';
        const head = p.head || 'Purchases (stock)';

        // Debit Expense / Stock Head
        entries.push({
          date,
          voucher,
          account: head,
          narration: `Purchase from ${supp}`,
          debit: sub,
          credit: 0
        });

        // Debit Input VAT Receivable
        if (vat > 0) {
          entries.push({
            date,
            voucher,
            account: 'Input VAT Receivable',
            narration: '13% Input VAT paid',
            debit: vat,
            credit: 0
          });
        }

        // Credit Accounts Payable / Cash
        entries.push({
          date,
          voucher,
          account: 'Accounts Payable',
          narration: `Bill from ${supp}`,
          debit: 0,
          credit: tot
        });
      });

      setJournal(entries);
    } catch (e) {
      console.error('Failed to load finance data from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rmx_admin_settings') || localStorage.getItem('zylo_admin_settings') || localStorage.getItem('zylo_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.company) {
            setSettings(prev => ({ ...prev, company: parsed.company, pan: parsed.pan || prev.pan }));
          }
        }
      } catch (e) {}
    }
  }, []);

  // Accounts list for ledger dropdown
  const allAccounts = Array.from(new Set(journal.map(e => e.account))).sort();

  // Ledger entries and balance calculation
  let runningBal = 0;
  const ledgerEntries = journal.filter(e => e.account === selectedAccount).map(e => {
    runningBal += (e.debit || 0) - (e.credit || 0);
    return { ...e, balance: runningBal };
  });

  // Daybook entries for selected date
  const daybookEntries = journal.filter(e => e.date === daybookDate);
  const daybookTotDr = daybookEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const daybookTotCr = daybookEntries.reduce((sum, e) => sum + (e.credit || 0), 0);

  // Trial Balance calculation
  const balances = {};
  journal.forEach(e => {
    balances[e.account] = (balances[e.account] || 0) + (e.debit || 0) - (e.credit || 0);
  });
  const trialList = Object.keys(balances).sort().map(acct => {
    const val = balances[acct];
    return {
      account: acct,
      dr: val > 0 ? val : 0,
      cr: val < 0 ? -val : 0
    };
  });
  const trialTotDr = trialList.reduce((a, b) => a + b.dr, 0);
  const trialTotCr = trialList.reduce((a, b) => a + b.cr, 0);

  // P&L Preset Handlers
  const handleSetPreset = (preset) => {
    setPlPreset(preset);
    const t = today();
    if (preset === 'thisMonth') {
      setPlFrom(t.slice(0, 7) + '-01');
      setPlTo(t);
    } else if (preset === 'lastMonth') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const ym = d.toISOString().slice(0, 7);
      setPlFrom(ym + '-01');
      setPlTo(ym + '-31');
    } else if (preset === 'quarter') {
      const m = parseInt(t.slice(5, 7), 10);
      const qStartMonth = (Math.floor((m - 1) / 3) * 3) + 1;
      const startStr = `${t.slice(0, 4)}-${String(qStartMonth).padStart(2, '0')}-01`;
      setPlFrom(startStr);
      setPlTo(t);
    } else if (preset === 'ytd') {
      setPlFrom(t.slice(0, 4) + '-01-01');
      setPlTo(t);
    } else if (preset === 'all') {
      setPlFrom('');
      setPlTo('');
    }
  };

  // P&L calculation
  const filteredSales = salesList.filter(s => {
    const d = (s.createdAt || s.date || '').slice(0, 10);
    return (!plFrom || d >= plFrom) && (!plTo || d <= plTo);
  });

  const filteredReturns = returnsList.filter(r => {
    if (r.status === 'rejected') return false;
    const d = (r.date || r.createdAt || '').slice(0, 10);
    return (!plFrom || d >= plFrom) && (!plTo || d <= plTo);
  });

  const filteredPurchases = purchasesList.filter(p => {
    const d = (p.date || '').slice(0, 10);
    return (!plFrom || d >= plFrom) && (!plTo || d <= plTo);
  });

  // Revenue & Returns
  const grossSalesRevenue = filteredSales.reduce((a, s) => {
    const g = s.grandTotal != null ? Math.round(s.grandTotal / 100) : (Number(s.total) || 0);
    return a + (s.subtotal != null ? Math.round(s.subtotal / 100) : g);
  }, 0);

  const totalSalesReturns = filteredReturns.reduce((a, r) => {
    const amt = Number(r.refundAmount) || 0;
    const net = r.refundNet != null ? Number(r.refundNet) : Math.round(amt / 1.13);
    return a + net;
  }, 0);

  const netSalesRevenue = Math.max(0, grossSalesRevenue - totalSalesReturns);

  // Expense categorization: COGS vs Operating Expenses (OPEX)
  const cogsHeads = ['Purchases (stock)', 'Freight and delivery', 'Raw materials', 'Packaging'];
  let totalCogs = 0;
  const cogsBreakdown = {};
  const opexBreakdown = {};
  let totalOpex = 0;

  filteredPurchases.forEach(p => {
    const head = p.head || 'Purchases (stock)';
    const sub = p.subtotal != null ? p.subtotal : (p.total || 0);
    if (cogsHeads.some(h => head.toLowerCase().includes(h.toLowerCase()) || head.toLowerCase().includes('stock') || head.toLowerCase().includes('freight'))) {
      cogsBreakdown[head] = (cogsBreakdown[head] || 0) + sub;
      totalCogs += sub;
    } else {
      opexBreakdown[head] = (opexBreakdown[head] || 0) + sub;
      totalOpex += sub;
    }
  });

  const grossProfit = netSalesRevenue - totalCogs;
  const grossMarginPct = netSalesRevenue > 0 ? ((grossProfit / netSalesRevenue) * 100).toFixed(1) : '0.0';
  const netProfitLoss = grossProfit - totalOpex;
  const netMarginPct = netSalesRevenue > 0 ? ((netProfitLoss / netSalesRevenue) * 100).toFixed(1) : '0.0';

  const exportPlCsv = () => {
    const rows = [
      ['Profit and Loss Statement', `Period: ${plFrom || 'Beginning'} to ${plTo || 'Present'}`],
      ['Company: Zylo Pvt. Ltd.', `Generated: ${today()}`],
      [],
      ['Account / Head', 'Category', 'Amount (NPR)'],
      ['Gross Sales Revenue (Net of VAT)', 'Revenue', grossSalesRevenue],
      ['Less: Sales Returns & Allowances', 'Revenue Deduction', -totalSalesReturns],
      ['NET SALES REVENUE', 'Net Revenue', netSalesRevenue],
      [],
      ...Object.keys(cogsBreakdown).map(k => [k, 'Cost of Goods Sold', cogsBreakdown[k]]),
      ['TOTAL COST OF GOODS SOLD (COGS)', 'COGS', totalCogs],
      ['GROSS PROFIT', 'Gross Profit', grossProfit],
      [],
      ...Object.keys(opexBreakdown).map(k => [k, 'Operating Expense', opexBreakdown[k]]),
      ['TOTAL OPERATING EXPENSES (OPEX)', 'OPEX', totalOpex],
      [],
      [netProfitLoss >= 0 ? 'NET PROFIT' : 'NET LOSS', 'Bottom Line', netProfitLoss]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(x => `"${x}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zylo-profit-and-loss-${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totDr = journal.reduce((a, b) => a + (b.debit || 0), 0);
  const totCr = journal.reduce((a, b) => a + (b.credit || 0), 0);

  return (
    <div>
      <div className="page-head">
        <h2>Finance &amp; Accounts</h2>
        <p>Double-entry accounting journal, general ledger, daybook, trial balance, and Profit &amp; Loss statement.</p>
      </div>

      <div className="tabs">
        <a className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}>Journal</a>
        <a className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>General Ledger</a>
        <a className={tab === 'daybook' ? 'active' : ''} onClick={() => setTab('daybook')}>Daybook</a>
        <a className={tab === 'trial' ? 'active' : ''} onClick={() => setTab('trial')}>Trial Balance</a>
        <a className={tab === 'pl' ? 'active' : ''} onClick={() => setTab('pl')}>Profit &amp; Loss</a>
      </div>

      {/* TAB 1: JOURNAL */}
      {tab === 'journal' && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher</th>
                <th>Account</th>
                <th>Narration</th>
                <th className="num">Debit</th>
                <th className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              {journal.length > 0 ? (
                journal.map((e, idx) => (
                  <tr key={idx}>
                    <td>{e.date}</td>
                    <td><code>{e.voucher}</code></td>
                    <td><strong>{e.account}</strong></td>
                    <td style={{ color: 'var(--muted-foreground)' }}>{e.narration}</td>
                    <td className="num">{e.debit ? money(e.debit) : '-'}</td>
                    <td className="num">{e.credit ? money(e.credit) : '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6"><div className="empty-state">No journal entries recorded yet.</div></td>
                </tr>
              )}
            </tbody>
            {journal.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan="4">Totals</td>
                  <td className="num">{money(totDr)}</td>
                  <td className="num">{money(totCr)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* TAB 2: GENERAL LEDGER */}
      {tab === 'ledger' && (
        <div>
          <div className="toolbar">
            <label style={{ fontSize: '13px', fontWeight: 500 }}>Account:</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              style={{ width: '280px' }}
            >
              {allAccounts.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Voucher</th>
                  <th>Narration</th>
                  <th className="num">Debit</th>
                  <th className="num">Credit</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.length > 0 ? (
                  ledgerEntries.map((e, idx) => (
                    <tr key={idx}>
                      <td>{e.date}</td>
                      <td><code>{e.voucher}</code></td>
                      <td>{e.narration}</td>
                      <td className="num">{e.debit ? money(e.debit) : '-'}</td>
                      <td className="num">{e.credit ? money(e.credit) : '-'}</td>
                      <td className="num"><strong>{money(Math.abs(e.balance))} {e.balance >= 0 ? 'Dr' : 'Cr'}</strong></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6"><div className="empty-state">No ledger transactions for {selectedAccount}.</div></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DAYBOOK */}
      {tab === 'daybook' && (
        <div>
          <div className="toolbar">
            <label style={{ fontSize: '13px', fontWeight: 500 }}>Date:</label>
            <input
              type="date"
              value={daybookDate}
              onChange={(e) => setDaybookDate(e.target.value)}
            />
          </div>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Voucher</th>
                  <th>Account</th>
                  <th>Narration</th>
                  <th className="num">Debit</th>
                  <th className="num">Credit</th>
                </tr>
              </thead>
              <tbody>
                {daybookEntries.length > 0 ? (
                  daybookEntries.map((e, idx) => (
                    <tr key={idx}>
                      <td><code>{e.voucher}</code></td>
                      <td><strong>{e.account}</strong></td>
                      <td style={{ color: 'var(--muted-foreground)' }}>{e.narration}</td>
                      <td className="num">{e.debit ? money(e.debit) : '-'}</td>
                      <td className="num">{e.credit ? money(e.credit) : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5"><div className="empty-state">No transactions on {daybookDate}.</div></td>
                  </tr>
                )}
              </tbody>
              {daybookEntries.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="3">Totals</td>
                    <td className="num">{money(daybookTotDr)}</td>
                    <td className="num">{money(daybookTotCr)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TRIAL BALANCE */}
      {tab === 'trial' && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th className="num">Debit</th>
                <th className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              {trialList.length > 0 ? (
                trialList.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.account}</strong></td>
                    <td className="num">{row.dr ? money(row.dr) : '-'}</td>
                    <td className="num">{row.cr ? money(row.cr) : '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3"><div className="empty-state">No balances recorded yet.</div></td>
                </tr>
              )}
            </tbody>
            {trialList.length > 0 && (
              <tfoot>
                <tr>
                  <td>Totals</td>
                  <td className="num">{money(trialTotDr)}</td>
                  <td className="num">{money(trialTotCr)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* TAB 5: PROFIT & LOSS */}
      {tab === 'pl' && (
        <div>
          {/* Quick Preset Filter Toolbar */}
          <div className="toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className={`btn btn-sm ${plPreset === 'thisMonth' ? 'btn-primary' : ''}`}
                onClick={() => handleSetPreset('thisMonth')}
              >
                This Month
              </button>
              <button
                className={`btn btn-sm ${plPreset === 'lastMonth' ? 'btn-primary' : ''}`}
                onClick={() => handleSetPreset('lastMonth')}
              >
                Last Month
              </button>
              <button
                className={`btn btn-sm ${plPreset === 'quarter' ? 'btn-primary' : ''}`}
                onClick={() => handleSetPreset('quarter')}
              >
                This Quarter
              </button>
              <button
                className={`btn btn-sm ${plPreset === 'ytd' ? 'btn-primary' : ''}`}
                onClick={() => handleSetPreset('ytd')}
              >
                Fiscal Year (YTD)
              </button>
              <button
                className={`btn btn-sm ${plPreset === 'all' ? 'btn-primary' : ''}`}
                onClick={() => handleSetPreset('all')}
              >
                All Time
              </button>
            </div>

            <div className="spacer" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500 }}>From:</label>
              <input
                type="date"
                value={plFrom}
                onChange={(e) => { setPlFrom(e.target.value); setPlPreset('custom'); }}
                style={{ width: '140px' }}
              />
              <label style={{ fontSize: '13px', fontWeight: 500 }}>To:</label>
              <input
                type="date"
                value={plTo}
                onChange={(e) => { setPlTo(e.target.value); setPlPreset('custom'); }}
                style={{ width: '140px' }}
              />
            </div>

            <button className="btn btn-sm" onClick={exportPlCsv}>
              <Icon name="download" size={14} /> Export CSV
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => window.print()}>
              <Icon name="printer" size={14} /> Print Statement
            </button>
          </div>

          {/* Top Metrics Cards */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '18px' }}>
            <div className="metric">
              <div className="label">Net Revenue</div>
              <div className="value" style={{ color: 'var(--accent)' }}>{money(netSalesRevenue)}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                Gross: {money(grossSalesRevenue)} | Returns: -{money(totalSalesReturns)}
              </div>
            </div>
            <div className="metric">
              <div className="label">Cost of Goods (COGS)</div>
              <div className="value" style={{ color: '#d97706' }}>{money(totalCogs)}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                Stock &amp; production costs
              </div>
            </div>
            <div className="metric">
              <div className="label">Gross Profit</div>
              <div className="value" style={{ color: grossProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {money(grossProfit)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                Margin: <strong>{grossMarginPct}%</strong>
              </div>
            </div>
            <div className="metric">
              <div className="label">Net Profit / (Loss)</div>
              <div className="value" style={{ color: netProfitLoss >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {money(netProfitLoss)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                Net Margin: <strong>{netMarginPct}%</strong>
              </div>
            </div>
          </div>

          {/* Main Profit & Loss Statement Card */}
          <div className="card card-pad form-max" style={{ margin: '0 auto' }}>
            <div className="report-head" style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '20px', margin: '0 0 4px' }}>{settings.company || 'Zylo Pvt. Ltd.'}</h2>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Income &amp; Expenditure Statement (Profit &amp; Loss)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                Period: {plFrom || 'Beginning'} &mdash; {plTo || 'Present'} &middot; Currency: NPR (VAT Exclusive)
              </div>
            </div>

            {/* SECTION 1: REVENUE */}
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: 'var(--foreground)', display: 'flex', justifyContent: 'space-between' }}>
                <span>1. Operating Revenue</span>
              </h3>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr><th>Account Title</th><th className="num">Amount (NPR)</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gross Sales Revenue (Taxable)</td>
                    <td className="num">{money(grossSalesRevenue)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: totalSalesReturns > 0 ? 'var(--danger)' : 'inherit' }}>
                      <em>Less:</em> Sales Returns, Refunds &amp; Allowances
                    </td>
                    <td className="num" style={{ color: totalSalesReturns > 0 ? 'var(--danger)' : 'inherit' }}>
                      ({money(totalSalesReturns)})
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--muted)', fontWeight: 600 }}>
                    <td>Total Net Revenue</td>
                    <td className="num">{money(netSalesRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* SECTION 2: COST OF GOODS SOLD */}
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: 'var(--foreground)' }}>
                2. Cost of Goods Sold (COGS)
              </h3>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr><th>Direct Cost Head</th><th className="num">Amount (NPR)</th></tr>
                </thead>
                <tbody>
                  {Object.keys(cogsBreakdown).length > 0 ? (
                    Object.keys(cogsBreakdown).sort().map(k => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td className="num">{money(cogsBreakdown[k])}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                        No direct material or stock purchase bills recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--muted)', fontWeight: 600 }}>
                    <td>Total Cost of Goods Sold</td>
                    <td className="num">{money(totalCogs)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* GROSS PROFIT HIGHLIGHT */}
            <div
              style={{
                marginBottom: '24px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: grossProfit >= 0 ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--danger) 12%, transparent)',
                border: `1px solid ${grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 600,
                fontSize: '15px'
              }}
            >
              <span>GROSS PROFIT (Net Revenue &minus; COGS)</span>
              <span>{money(grossProfit)} <span style={{ fontSize: '12px', fontWeight: 400 }}>({grossMarginPct}% margin)</span></span>
            </div>

            {/* SECTION 3: OPERATING EXPENSES */}
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: 'var(--foreground)' }}>
                3. Operating &amp; Administrative Expenses (OPEX)
              </h3>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr><th>Expense Head</th><th className="num">Amount (NPR)</th></tr>
                </thead>
                <tbody>
                  {Object.keys(opexBreakdown).length > 0 ? (
                    Object.keys(opexBreakdown).sort().map(k => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td className="num">{money(opexBreakdown[k])}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                        No operating expenses recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--muted)', fontWeight: 600 }}>
                    <td>Total Operating Expenses</td>
                    <td className="num">{money(totalOpex)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* NET PROFIT / LOSS HIGHLIGHT BANNER */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px 20px',
                borderRadius: '10px',
                background: netProfitLoss >= 0 ? 'var(--success)' : 'var(--danger)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700 }}>
                  {netProfitLoss >= 0 ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                  Net Margin: {netMarginPct}% &middot; Before Income Tax
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>
                {money(Math.abs(netProfitLoss))}
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--muted)', borderRadius: '8px', fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: '1.5' }}>
              <strong>Accounting Notes &amp; IRD Policy:</strong> All revenue and expense heads are presented net of 13% Value Added Tax (VAT), as VAT collected on sales and input VAT paid on purchases are balance sheet tax obligations recorded in the IRD Sales &amp; Purchase Register rather than direct income/expense items.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}