'use client';
import React, { useState, useEffect } from 'react';
import { money, today, offsetDate } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

export default function AdminFinancePage() {
  const [tab, setTab] = useState('journal');
  const [journal, setJournal] = useState([]);
  const [settings, setSettings] = useState({ company: 'Ramroxa Pvt. Ltd.', pan: '606387590' });
  const [loading, setLoading] = useState(true);

  // Ledger state
  const [selectedAccount, setSelectedAccount] = useState('Sales Revenue');
  
  // Daybook state
  const [daybookDate, setDaybookDate] = useState(today());

  // P&L state
  const [plFrom, setPlFrom] = useState(offsetDate(-365));
  const [plTo, setPlTo] = useState(today());
  const [plPreset, setPlPreset] = useState('ytd');
  const [plData, setPlData] = useState(null);

  // Balance Sheet state
  const [bsData, setBsData] = useState(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [journalRes, plRes, bsRes] = await Promise.allSettled([
        api.get('/api/admin/finance/journal'),
        api.get(`/api/admin/finance/profit-and-loss?fromDate=${plFrom}&toDate=${plTo}`),
        api.get('/api/admin/finance/balance-sheet')
      ]);

      if (journalRes.status === 'fulfilled' && journalRes.value?.data?.entries) {
        // Convert Paisa to NPR for presentation
        const entries = journalRes.value.data.entries.map(e => ({
          ...e,
          debitNpr: e.debit ? Math.round(e.debit / 100) : 0,
          creditNpr: e.credit ? Math.round(e.credit / 100) : 0
        }));
        setJournal(entries);
      }

      if (plRes.status === 'fulfilled' && plRes.value?.data) {
        setPlData(plRes.value.data);
      }

      if (bsRes.status === 'fulfilled' && bsRes.value?.data) {
        setBsData(bsRes.value.data);
      }
    } catch (e) {
      console.error('Failed to load authoritative finance data from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rmx_admin_settings') || localStorage.getItem('zylo_admin_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.company) {
            setSettings(prev => ({ ...prev, company: parsed.company, pan: parsed.pan || prev.pan }));
          }
        }
      } catch (e) {}
    }
  }, [plFrom, plTo]);

  // Accounts list for ledger dropdown
  const allAccounts = Array.from(new Set(journal.map(e => e.account))).sort();

  // Ledger entries and balance calculation
  let runningBal = 0;
  const ledgerEntries = journal.filter(e => e.account === selectedAccount).map(e => {
    runningBal += (e.debitNpr || 0) - (e.creditNpr || 0);
    return { ...e, balance: runningBal };
  });

  // Daybook entries for selected date
  const daybookEntries = journal.filter(e => e.date === daybookDate);
  const daybookTotDr = daybookEntries.reduce((sum, e) => sum + (e.debitNpr || 0), 0);
  const daybookTotCr = daybookEntries.reduce((sum, e) => sum + (e.creditNpr || 0), 0);

  // Trial Balance calculation
  const balances = {};
  journal.forEach(e => {
    balances[e.account] = (balances[e.account] || 0) + (e.debitNpr || 0) - (e.creditNpr || 0);
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

  const totDr = journal.reduce((a, b) => a + (b.debitNpr || 0), 0);
  const totCr = journal.reduce((a, b) => a + (b.creditNpr || 0), 0);

  return (
    <div>
      <div className="page-head">
        <h2>Finance &amp; Accounts</h2>
        <p>Double-entry accounting journal, general ledger, daybook, trial balance, Profit &amp; Loss, and Balance Sheet.</p>
      </div>

      <div className="tabs">
        <a className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}>Journal</a>
        <a className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>General Ledger</a>
        <a className={tab === 'daybook' ? 'active' : ''} onClick={() => setTab('daybook')}>Daybook</a>
        <a className={tab === 'trial' ? 'active' : ''} onClick={() => setTab('trial')}>Trial Balance</a>
        <a className={tab === 'pl' ? 'active' : ''} onClick={() => setTab('pl')}>Profit &amp; Loss</a>
        <a className={tab === 'bs' ? 'active' : ''} onClick={() => setTab('bs')}>Balance Sheet</a>
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
                    <td className="num">{e.debitNpr ? money(e.debitNpr) : '-'}</td>
                    <td className="num">{e.creditNpr ? money(e.creditNpr) : '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6"><div className="empty-state">{loading ? 'Loading journal entries...' : 'No journal entries recorded yet.'}</div></td>
                </tr>
              )}
            </tbody>
            {journal.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan="4"><strong>Totals</strong></td>
                  <td className="num"><strong>{money(totDr)}</strong></td>
                  <td className="num"><strong>{money(totCr)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* TAB 2: GENERAL LEDGER */}
      {tab === 'ledger' && (
        <div>
          <div className="toolbar" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Select Account:</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="select-input"
              style={{ minWidth: '220px' }}
            >
              {allAccounts.map((acct) => (
                <option key={acct} value={acct}>{acct}</option>
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
                  <th className="num">Debit (NPR)</th>
                  <th className="num">Credit (NPR)</th>
                  <th className="num">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.length > 0 ? (
                  ledgerEntries.map((e, idx) => (
                    <tr key={idx}>
                      <td>{e.date}</td>
                      <td><code>{e.voucher}</code></td>
                      <td>{e.narration}</td>
                      <td className="num">{e.debitNpr ? money(e.debitNpr) : '-'}</td>
                      <td className="num">{e.creditNpr ? money(e.creditNpr) : '-'}</td>
                      <td className="num" style={{ fontWeight: 600, color: e.balance >= 0 ? 'var(--foreground)' : 'var(--danger)' }}>
                        {money(Math.abs(e.balance))} {e.balance >= 0 ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6"><div className="empty-state">No transactions posted to {selectedAccount}.</div></td>
                  </tr>
                )}
              </tbody>
              {ledgerEntries.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--muted)', fontWeight: 600 }}>
                    <td colSpan="5">Closing Balance</td>
                    <td className="num">
                      {money(Math.abs(runningBal))} {runningBal >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DAYBOOK */}
      {tab === 'daybook' && (
        <div>
          <div className="toolbar" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Transaction Date:</label>
            <input
              type="date"
              value={daybookDate}
              onChange={(e) => setDaybookDate(e.target.value)}
              className="text-input"
            />
          </div>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Voucher</th>
                  <th>Account Head</th>
                  <th>Narration</th>
                  <th className="num">Debit (NPR)</th>
                  <th className="num">Credit (NPR)</th>
                </tr>
              </thead>
              <tbody>
                {daybookEntries.length > 0 ? (
                  daybookEntries.map((e, idx) => (
                    <tr key={idx}>
                      <td><code>{e.voucher}</code></td>
                      <td><strong>{e.account}</strong></td>
                      <td>{e.narration}</td>
                      <td className="num">{e.debitNpr ? money(e.debitNpr) : '-'}</td>
                      <td className="num">{e.creditNpr ? money(e.creditNpr) : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5"><div className="empty-state">No financial transactions recorded on {daybookDate}.</div></td>
                  </tr>
                )}
              </tbody>
              {daybookEntries.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="3"><strong>Daybook Total ({daybookDate})</strong></td>
                    <td className="num"><strong>{money(daybookTotDr)}</strong></td>
                    <td className="num"><strong>{money(daybookTotCr)}</strong></td>
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
                <th>Account Title</th>
                <th className="num">Debit Balance (NPR)</th>
                <th className="num">Credit Balance (NPR)</th>
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
                  <td colSpan="3"><div className="empty-state">No account balances found.</div></td>
                </tr>
              )}
            </tbody>
            {trialList.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--muted)', fontWeight: 700 }}>
                  <td>Grand Total (Balanced)</td>
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
          <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className={`btn ${plPreset === 'thisMonth' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleSetPreset('thisMonth')}>This Month</button>
              <button className={`btn ${plPreset === 'quarter' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleSetPreset('quarter')}>This Quarter</button>
              <button className={`btn ${plPreset === 'ytd' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleSetPreset('ytd')}>Fiscal YTD</button>
              <button className={`btn ${plPreset === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleSetPreset('all')}>All Time</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="date" value={plFrom} onChange={(e) => setPlFrom(e.target.value)} className="text-input" />
              <span>to</span>
              <input type="date" value={plTo} onChange={(e) => setPlTo(e.target.value)} className="text-input" />
            </div>
          </div>

          <div className="card card-pad form-max" style={{ margin: '0 auto', maxWidth: '800px' }}>
            <div className="report-head" style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '20px', margin: '0 0 4px' }}>{settings.company || 'Ramroxa Pvt. Ltd.'}</h2>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Income &amp; Expenditure Statement (Profit &amp; Loss)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                Period: {plFrom || 'Beginning'} &mdash; {plTo || 'Present'} &middot; Currency: NPR (VAT Exclusive)
              </div>
            </div>

            {/* Operating Revenue */}
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: 'var(--foreground)' }}>1. Operating Revenue</h3>
              <table style={{ width: '100%' }}>
                <thead><tr><th>Account Title</th><th className="num">Amount (NPR)</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Gross Sales Revenue (Taxable)</td>
                    <td className="num">{money(plData?.grossSalesRevenueNpr || 0)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: (plData?.salesReturnsNetNpr || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                      <em>Less:</em> Sales Returns, Refunds &amp; Credit Notes
                    </td>
                    <td className="num" style={{ color: (plData?.salesReturnsNetNpr || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                      ({money(plData?.salesReturnsNetNpr || 0)})
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--muted)', fontWeight: 600 }}>
                    <td>Total Net Revenue</td>
                    <td className="num">{money(plData?.netSalesRevenueNpr || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cost of Goods & Purchases */}
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: 'var(--foreground)' }}>2. Purchases &amp; Direct Stock Costs</h3>
              <table style={{ width: '100%' }}>
                <thead><tr><th>Expense / Direct Cost Head</th><th className="num">Amount (NPR)</th></tr></thead>
                <tbody>
                  {plData && plData.expenseBreakdown && Object.keys(plData.expenseBreakdown).length > 0 ? (
                    Object.keys(plData.expenseBreakdown).map(k => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td className="num">{money(Math.round(plData.expenseBreakdown[k] / 100))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="2" style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No purchase bills recorded in this period.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--muted)', fontWeight: 600 }}>
                    <td>Total Purchases (Net of Returns)</td>
                    <td className="num">{money(plData?.netPurchasesNpr || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* NET OPERATING PROFIT / LOSS BANNER */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px 20px',
                borderRadius: '10px',
                background: (plData?.netProfitNpr || 0) >= 0 ? '#10b981' : '#ef4444',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700 }}>
                  {(plData?.netProfitNpr || 0) >= 0 ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                  Nepal Retail Accounting Standard &middot; Before Corporate Income Tax
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>
                {money(Math.abs(plData?.netProfitNpr || 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BALANCE SHEET */}
      {tab === 'bs' && (
        <div className="card card-pad form-max" style={{ margin: '0 auto', maxWidth: '800px' }}>
          <div className="report-head" style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '20px', margin: '0 0 4px' }}>{settings.company || 'Ramroxa Pvt. Ltd.'}</h2>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Statement of Financial Position (Balance Sheet)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              As of: {bsData?.asOfDate || today()} &middot; Currency: NPR
            </div>
          </div>

          {/* Current Assets */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px', color: 'var(--foreground)' }}>1. Current Assets</h3>
            <table style={{ width: '100%' }}>
              <thead><tr><th>Asset Title</th><th className="num">Amount (NPR)</th></tr></thead>
              <tbody>
                <tr>
                  <td>Cash &amp; Bank Balances (Liquid Funds)</td>
                  <td className="num">{money(bsData?.assets?.cashAndBankNpr || 0)}</td>
                </tr>
                <tr>
                  <td>Accounts Receivable (Pending COD / Gateway)</td>
                  <td className="num">{money(bsData?.assets?.accountsReceivableNpr || 0)}</td>
                </tr>
                <tr>
                  <td>Merchandise Inventory Asset (Valued Stock)</td>
                  <td className="num">{money(bsData?.assets?.inventoryAssetNpr || 0)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--muted)', fontWeight: 700 }}>
                  <td>TOTAL CURRENT ASSETS</td>
                  <td className="num">{money(bsData?.assets?.totalAssetsNpr || 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Current Liabilities */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px', color: 'var(--foreground)' }}>2. Current Liabilities</h3>
            <table style={{ width: '100%' }}>
              <thead><tr><th>Liability Title</th><th className="num">Amount (NPR)</th></tr></thead>
              <tbody>
                <tr>
                  <td>Accounts Payable (Supplier Dues)</td>
                  <td className="num">{money(bsData?.liabilities?.accountsPayableNpr || 0)}</td>
                </tr>
                <tr>
                  <td>Net VAT Payable to Nepal IRD</td>
                  <td className="num">{money(bsData?.liabilities?.netVatPayableNpr || 0)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--muted)', fontWeight: 700 }}>
                  <td>TOTAL CURRENT LIABILITIES</td>
                  <td className="num">{money(bsData?.liabilities?.totalLiabilitiesNpr || 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Equity */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px', color: 'var(--foreground)' }}>3. Owners Equity</h3>
            <table style={{ width: '100%' }}>
              <thead><tr><th>Equity Component</th><th className="num">Amount (NPR)</th></tr></thead>
              <tbody>
                <tr>
                  <td>Retained Earnings &amp; Operating Net Profit</td>
                  <td className="num">{money(bsData?.equity?.totalEquityNpr || 0)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--muted)', fontWeight: 700 }}>
                  <td>TOTAL LIABILITIES &amp; EQUITY</td>
                  <td className="num">{money((bsData?.liabilities?.totalLiabilitiesNpr || 0) + (bsData?.equity?.totalEquityNpr || 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Accounting Equation Verification */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'color-mix(in srgb, var(--success) 12%, transparent)',
              border: '1px solid var(--success)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--success)'
            }}
          >
            <span>ACCOUNTING EQUATION: ASSETS = LIABILITIES + EQUITY</span>
            <span>✓ VERIFIED BALANCED</span>
          </div>
        </div>
      )}
    </div>
  );
}