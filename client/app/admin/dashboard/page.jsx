'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { money, today } from '../../../services/formatters';
import { api } from '../../../services/apiClient';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [metrics, setMetrics] = useState({
    salesToday: 0,
    monthRevenue: 0,
    vatPayable: 0,
    netProfit: 0
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [ordersRes, pnlRes] = await Promise.allSettled([
          api.get('/api/admin/orders'),
          api.get('/api/admin/finance/profit-and-loss')
        ]);

        const apiOrders = ordersRes.status === 'fulfilled' ? (ordersRes.value.data?.orders || ordersRes.value.data || []) : [];
        setOrders(apiOrders);

        const t = today();
        const m = t.slice(0, 7);

        const todayCount = apiOrders.filter(o => (o.createdAt || o.date || '').slice(0, 10) === t).length;
        const monthOrders = apiOrders.filter(o => (o.createdAt || o.date || '').slice(0, 7) === m);
        const rev = monthOrders.reduce((sum, o) => {
          const g = o.grandTotal != null ? Math.round(o.grandTotal / 100) : (Number(o.total) || 0);
          return sum + g;
        }, 0);

        let netProf = rev;
        let vat = Math.round(rev * 0.13);
        if (pnlRes.status === 'fulfilled' && pnlRes.value.data?.pnl) {
          const pnl = pnlRes.value.data.pnl;
          if (pnl.netProfit != null) netProf = Math.round(pnl.netProfit / 100);
          if (pnl.vatPayable != null) vat = Math.round(pnl.vatPayable / 100);
        }

        setMetrics({
          salesToday: todayCount,
          monthRevenue: rev,
          vatPayable: vat,
          netProfit: netProf
        });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const recentOrders = orders.slice(0, 5);

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>Live overview of store activity from MongoDB.</p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="label">Orders today</div>
          <div className="value">{metrics.salesToday}</div>
          <div className="hint">Orders placed today</div>
        </div>
        <div className="metric">
          <div className="label">Revenue this month</div>
          <div className="value">{money(metrics.monthRevenue)}</div>
          <div className="hint">Storefront gross sales</div>
        </div>
        <div className="metric">
          <div className="label">VAT payable</div>
          <div className="value">{money(metrics.vatPayable)}</div>
          <div className="hint">13% Output VAT estimate</div>
        </div>
        <div className="metric">
          <div className="label">Net profit (month)</div>
          <div className="value">{money(metrics.netProfit)}</div>
          <div className="hint">Net operational revenue</div>
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
            <div className="section-title" style={{ margin: 0 }}>Recent orders</div>
            <Link href="/admin/orders" style={{ fontSize: '12px', color: 'var(--accent)' }}>View all</Link>
          </div>
          <div>
            {recentOrders.length > 0 ? (
              recentOrders.map((o) => {
                const cust = o.shippingAddress?.fullName || o.customer || o.guestPhone || 'Storefront Customer';
                const total = o.grandTotal != null ? Math.round(o.grandTotal / 100) : (Number(o.total) || 0);
                const date = (o.createdAt || o.date || '').slice(0, 10);
                return (
                  <div
                    key={o._id || o.orderNo || o.no}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{o.orderNo || o.no}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                        {cust} &middot; {date}
                      </div>
                    </div>
                    <div style={{ fontWeight: 500 }}>{money(total)}</div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">No orders yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

