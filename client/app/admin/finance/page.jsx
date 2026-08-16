'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, money, docSubtotal, docVat, today, offsetDate, buildJournal } from '../../../services/dataStore';

export default function AdminFinancePage() {
  const [tab, setTab] = useState('journal');
  const [journal, setJournal] = useState([]);
  const [db, setDb] = useState(null);

  // Ledger state
  const [selectedAccount, setSelectedAccount] = useState('Sales Revenue');
  
  // Daybook state
  const [daybookDate, setDaybookDate] = useState(today());

  // P&L state
  const [plFrom, setPlFrom] = useState(offsetDate(-365));
  const [plTo, setPlTo] = useState(today());

  const refreshData = () => {
    const loadedDb = loadDB();
    setDb(loadedDb);
    const entries = buildJournal(loadedDb);
    setJournal(entries);
  };

  useEffect(() => {
    refreshData();
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

  // P&L calculation
  const sales = (db?.sales || []).filter(s => s.date >= plFrom && s.date <= plTo);
  const purchases = (db?.purchases || []).filter(p => p.date >= plFrom && p.date <= plTo);

  const totInc = sales.reduce((a, s) => a + docSubtotal(s), 0);
  
  const expenseMap = {};
  purchases.forEach(p => {
    const head = p.head || 'Purchases (stock)';
    expenseMap[head] = (expenseMap[head] || 0) + docSubtotal(p);
  });
  const totExp = Object.keys(expenseMap).reduce((a, k) => a + expenseMap[k], 0);
  const netPl = totInc - totExp;

  const totDr = journal.reduce((a, b) => a + (b.debit || 0), 0);
  const totCr = journal.reduce((a, b) => a + (b.credit || 0), 0);

  return (
    <div>
      <div className="page-head">
        <h1>Finance</h1>
        <p>Double-entry accounting journal, general ledger, daybook, trial balance, and P&L statement.</p>
      </div>

      <div className="tabs">
        <a className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}>Journal</a>
        <a className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>General Ledger</a>
        <a className={tab === 'daybook' ? 'active' : ''} onClick={() => setTab('daybook')}>Daybook</a>
        <a className={tab === 'trial' ? 'active' : ''} onClick={() => setTab('trial')}>Trial Balance</a>
        <a className={tab === 'pl' ? 'active' : ''} onClick={() => setTab('pl')}>Profit & Loss</a>
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
                  <td colSpan="6"><div className="empty-state">No journal entries recorded.</div></td>
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

      {/* TAB 2: LEDGER */}
      {tab === 'ledger' && (
        <div>
          <div className="toolbar">
            <label style={{ fontSize: '13px', fontWeight: 500 }}>Account:</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              style={{ width: '240px' }}
            >
              {allAccounts.map(acct => (
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
                      <td style={{ color: 'var(--muted-foreground)' }}>{e.narration}</td>
                      <td className="num">{e.debit ? money(e.debit) : '-'}</td>
                      <td className="num">{e.credit ? money(e.credit) : '-'}</td>
                      <td className="num" style={{ fontWeight: 500 }}>
                        {money(Math.abs(e.balance))} {e.balance < 0 ? 'Cr' : 'Dr'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6"><div className="empty-state">No entries for this account.</div></td>
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
          <div className="toolbar">
            <label style={{ fontSize: '13px', fontWeight: 500 }}>From:</label>
            <input
              type="date"
              value={plFrom}
              onChange={(e) => setPlFrom(e.target.value)}
            />
            <label style={{ fontSize: '13px', fontWeight: 500, marginLeft: '10px' }}>To:</label>
            <input
              type="date"
              value={plTo}
              onChange={(e) => setPlTo(e.target.value)}
            />
          </div>

          <div className="card card-pad form-max">
            <div className="report-head">
              <h2>{db?.settings?.company || 'Zylo Pvt. Ltd.'}</h2>
              <p>Profit & Loss Statement &middot; {plFrom} to {plTo}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 10px' }}>Income</h3>
              <table>
                <thead>
                  <tr><th>Head</th><th className="num">Amount</th></tr>
                </thead>
                <tbody>
                  <tr><td>Sales revenue (net)</td><td className="num">{money(totInc)}</td></tr>
                </tbody>
                <tfoot>
                  <tr><td>Total Income</td><td className="num">{money(totInc)}</td></tr>
                </tfoot>
              </table>
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 10px' }}>Expenses</h3>
              <table>
                <thead>
                  <tr><th>Head</th><th className="num">Amount</th></tr>
                </thead>
                <tbody>
                  {Object.keys(expenseMap).length > 0 ? (
                    Object.keys(expenseMap).sort().map(k => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td className="num">{money(expenseMap[k])}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="2" style={{ color: 'var(--muted-foreground)' }}>No expenses recorded in this period</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr><td>Total Expenses</td><td className="num">{money(totExp)}</td></tr>
                </tfoot>
              </table>
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '14px',
                borderRadius: '10px',
                background: netPl >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 500
              }}
            >
              <span>{netPl >= 0 ? 'Net profit' : 'Net loss'}</span>
              <span>{money(Math.abs(netPl))}</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '12px' }}>
              Cash-basis summary from recorded sales and purchases. VAT is excluded from revenue/expenses as it is collected on behalf of the IRD.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

