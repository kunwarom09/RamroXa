'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadDB, money, docSubtotal, docVat, docTotal, today } from '../../../services/dataStore';

export default function AdminDashboardPage() {
  const [db, setDb] = useState(null);

  useEffect(() => {
    setDb(loadDB());
  }, []);

  if (!db) return <div>Loading dashboard...</div>;

  const t = today();
  const m = t.slice(0, 7);

  const salesToday = (db.sales || []).filter(s => s.date === t);
  const monthSales = (db.sales || []).filter(s => s.date && s.date.slice(0, 7) === m);
  const monthPurch = (db.purchases || []).filter(p => p.date && p.date.slice(0, 7) === m);

  const rev = monthSales.reduce((a, s) => a + docSubtotal(s), 0);
  const exp = monthPurch.reduce((a, p) => a + docSubtotal(p), 0);
  const vatOut = monthSales.reduce((a, s) => a + docVat(s), 0);
  const vatIn = monthPurch.reduce((a, p) => a + docVat(p), 0);

  const netVat = Math.max(0, vatOut - vatIn);
  const profit = rev - exp;

  const recentSales = (db.sales || [])
    .slice()
    .sort((a, b) => (b.date < a.date ? -1 : 1))
    .slice(0, 5);

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>Live overview of store activity.</p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="label">Sales today</div>
          <div className="value">{salesToday.length}</div>
          <div className="hint">Invoices issued today</div>
        </div>
        <div className="metric">
          <div className="label">Revenue this month</div>
          <div className="value">{money(rev)}</div>
          <div className="hint">Net taxable revenue</div>
        </div>
        <div className="metric">
          <div className="label">VAT payable</div>
          <div className="value">{money(netVat)}</div>
          <div className="hint">Output minus input VAT</div>
        </div>
        <div className="metric">
          <div className="label">Net profit (month)</div>
          <div className="value">{money(profit)}</div>
          <div className="hint">Revenue minus purchases</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="section-title">Revenue, last 30 days</div>
          <svg viewBox="0 0 400 120" style={{ width: '100%', height: '120px' }}>
            <polyline
              points="0,95 30,80 60,85 90,60 120,65 150,45 180,50 210,30 240,38 270,20 300,26 330,10 360,16 400,8"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div className="section-title" style={{ margin: 0 }}>Recent sales</div>
            <Link href="/admin/sales" style={{ fontSize: '12px', color: 'var(--accent)' }}>View all</Link>
          </div>
          <div>
            {recentSales.length > 0 ? (
              recentSales.map(s => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{s.invoice}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                      {s.customer} &middot; {s.date}
                    </div>
                  </div>
                  <div style={{ fontWeight: 500 }}>{money(docTotal(s))}</div>
                </div>
              ))
            ) : (
              <div className="empty-state">No sales yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

