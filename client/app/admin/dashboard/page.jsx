'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { money } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

export default function AdminDashboardPage() {
  const [rangePreset, setRangePreset] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartMetric, setChartMetric] = useState('revenue');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [stats, setStats] = useState(null);

  // Computes start/end dates for API query
  const dateParams = useMemo(() => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let fromDate, toDate, compFrom, compTo;

    if (rangePreset === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      toDate = endOfDay;
      compFrom = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
      compTo = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (rangePreset === 'yesterday') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      compFrom = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
      compTo = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (rangePreset === '7d') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      toDate = now;
      compFrom = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      compTo = fromDate;
    } else if (rangePreset === '30d') {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      toDate = now;
      compFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      compTo = fromDate;
    } else if (rangePreset === 'this_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      toDate = now;
      compFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      compTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (rangePreset === 'last_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      compFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      compTo = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    } else if (rangePreset === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      fromDate = new Date(now.getFullYear(), qMonth, 1, 0, 0, 0, 0);
      toDate = now;
      compFrom = new Date(now.getFullYear(), qMonth - 3, 1, 0, 0, 0, 0);
      compTo = new Date(now.getFullYear(), qMonth, 0, 23, 59, 59, 999);
    } else if (rangePreset === 'this_year') {
      fromDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      toDate = now;
      compFrom = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      compTo = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (rangePreset === 'custom' && customFrom && customTo) {
      fromDate = new Date(customFrom + 'T00:00:00.000Z');
      toDate = new Date(customTo + 'T23:59:59.999Z');
      const diffMs = toDate.getTime() - fromDate.getTime();
      compFrom = new Date(fromDate.getTime() - diffMs);
      compTo = new Date(fromDate.getTime() - 1);
    } else {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      toDate = now;
      compFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      compTo = fromDate;
    }

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      compareFrom: compFrom.toISOString(),
      compareTo: compTo.toISOString()
    };
  }, [rangePreset, customFrom, customTo]);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const q = new URLSearchParams(dateParams).toString();
      const res = await api.get(`/api/admin/dashboard/stats?${q}`);
      if (res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateParams]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Helper for Delta rendering
  const renderDelta = (delta, suffix = '%') => {
    if (delta === undefined || delta === null) return null;
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    const abs = Math.abs(delta);
    return (
      <span className={`delta-pill ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}>
        {isPositive ? '↑' : isNegative ? '↓' : '•'} {abs}{suffix}
      </span>
    );
  };

  // Chart computation
  const chartPoints = stats?.chartData || [];
  const maxVal = Math.max(...chartPoints.map(p => p[chartMetric] || 0), 10);
  const chartW = 800;
  const chartH = 180;
  const padX = 20;
  const padY = 20;

  const pointsSvg = chartPoints.map((pt, idx) => {
    const x = padX + (idx / Math.max(chartPoints.length - 1, 1)) * (chartW - padX * 2);
    const val = pt[chartMetric] || 0;
    const y = chartH - padY - (val / maxVal) * (chartH - padY * 2);
    return { x, y, ...pt };
  });

  const polylineStr = pointsSvg.map(p => `${p.x},${p.y}`).join(' ');
  const areaPolygonStr = pointsSvg.length > 0
    ? `${pointsSvg[0].x},${chartH - padY} ${polylineStr} ${pointsSvg[pointsSvg.length - 1].x},${chartH - padY}`
    : '';

  const kpis = stats?.kpis || {};
  const actionRequired = stats?.actionRequired || [];
  const bestSellers = stats?.bestSellers || [];
  const inventory = stats?.inventoryHealth || {};
  const recentOrders = stats?.recentOrders || [];
  const customers = stats?.customersOverview || {};
  const returns = stats?.returnsMetrics || {};
  const finance = stats?.financeSnapshot || {};
  const insights = stats?.storeInsights || [];

  return (
    <div className="dash-container">
      {/* 1. Header & Controls */}
      <div className="dash-head">
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--primary)' }}>
            Operational Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted-foreground)' }}>
            Real-time business performance &amp; automated operational alerts.
          </p>
        </div>

        <div className="dash-controls">
          {rangePreset === 'custom' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ height: '36px', padding: '0 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', color: 'var(--primary)' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ height: '36px', padding: '0 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', color: 'var(--primary)' }}
              />
            </div>
          )}

          <select
            className="dash-date-select"
            value={rangePreset}
            onChange={(e) => setRangePreset(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range...</option>
          </select>

          <button
            type="button"
            className={`dash-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => loadDashboardData(false)}
            title="Refresh dashboard data"
          >
            <Icon name="refresh" size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Top 5 KPI Cards */}
      <div className="dash-kpi-grid">
        <div className="dash-kpi-card">
          <div className="dash-kpi-label">Net Sales</div>
          <div className="dash-kpi-value">
            {loading ? '...' : money(kpis.netSales?.value || 0)}
          </div>
          <div className="dash-kpi-footer">
            {renderDelta(kpis.netSales?.delta)}
            <span>vs prev period</span>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-label">Orders</div>
          <div className="dash-kpi-value">
            {loading ? '...' : (kpis.orders?.value || 0).toLocaleString()}
          </div>
          <div className="dash-kpi-footer">
            {renderDelta(kpis.orders?.delta)}
            <span>vs prev period</span>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-label">Average Order Value</div>
          <div className="dash-kpi-value">
            {loading ? '...' : money(kpis.aov?.value || 0)}
          </div>
          <div className="dash-kpi-footer">
            {renderDelta(kpis.aov?.delta)}
            <span>vs prev period</span>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-label">Conversion Rate</div>
          <div className="dash-kpi-value">
            {loading ? '...' : `${kpis.conversionRate?.value || 0}%`}
          </div>
          <div className="dash-kpi-footer">
            {renderDelta(kpis.conversionRate?.delta)}
            <span>vs prev period</span>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-label">Gross Profit</div>
          <div className="dash-kpi-value">
            {loading ? '...' : money(kpis.grossProfit?.value || 0)}
          </div>
          <div className="dash-kpi-footer">
            {renderDelta(kpis.grossProfit?.delta)}
            <span>vs prev period</span>
          </div>
        </div>
      </div>

      {/* 3. Action Required Section */}
      <div className="dash-action-section">
        <div className="dash-action-head">
          <div className="dash-action-title">
            <Icon name="bell" size={15} />
            <span>Action Required</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
            {actionRequired.length} pending alert{actionRequired.length === 1 ? '' : 's'}
          </span>
        </div>

        {actionRequired.length > 0 ? (
          <div className="dash-action-grid">
            {actionRequired.map((alert) => (
              <Link
                key={alert.id}
                href={alert.link}
                className={`dash-action-card ${alert.type}`}
              >
                <div>
                  <div className="dash-action-badge">{alert.title}</div>
                  <div className="dash-action-msg">{alert.message}</div>
                </div>
                <span className="dash-action-btn">
                  {alert.linkText}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="dash-action-empty">
            ✓ All caught up &mdash; There are no urgent actions right now.
          </div>
        )}
      </div>

      {/* 4. Sales Performance Interactive Chart */}
      <div className="dash-chart-card">
        <div className="dash-chart-head">
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary)' }}>
              Sales Performance
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
              Showing {chartMetric === 'revenue' ? 'Revenue (NPR)' : chartMetric === 'orders' ? 'Order Volume' : 'Average Order Value (NPR)'} across the selected period.
            </div>
          </div>

          <div className="dash-metric-switch">
            <button
              type="button"
              className={`dash-metric-btn ${chartMetric === 'revenue' ? 'active' : ''}`}
              onClick={() => setChartMetric('revenue')}
            >
              Revenue
            </button>
            <button
              type="button"
              className={`dash-metric-btn ${chartMetric === 'orders' ? 'active' : ''}`}
              onClick={() => setChartMetric('orders')}
            >
              Orders
            </button>
            <button
              type="button"
              className={`dash-metric-btn ${chartMetric === 'aov' ? 'active' : ''}`}
              onClick={() => setChartMetric('aov')}
            >
              AOV
            </button>
          </div>
        </div>

        <div className="dash-svg-container">
          {hoveredPoint && (
            <div className="dash-chart-tooltip">
              <strong>{hoveredPoint.label}</strong>
              <span>Revenue: {money(hoveredPoint.revenue)}</span>
              <span>Orders: {hoveredPoint.orders}</span>
              <span>AOV: {money(hoveredPoint.aov)}</span>
            </div>
          )}

          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((frac, i) => {
              const y = chartH - padY - frac * (chartH - padY * 2);
              return (
                <line
                  key={i}
                  x1={padX}
                  y1={y}
                  x2={chartW - padX}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              );
            })}

            {/* Filled Area */}
            {areaPolygonStr && (
              <polygon
                points={areaPolygonStr}
                fill="url(#chartGradient)"
              />
            )}

            {/* Polyline */}
            {polylineStr && (
              <polyline
                points={polylineStr}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Points & Hover targets */}
            {pointsSvg.map((pt, idx) => (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint?.date === pt.date ? 5.5 : 3}
                  fill="var(--surface)"
                  stroke="var(--primary)"
                  strokeWidth="2"
                />
                {/* Hit target for easier mouse hover */}
                <rect
                  x={pt.x - 12}
                  y={0}
                  width={24}
                  height={chartH}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Date labels at bottom of chart */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 20px 0', fontSize: '11px', color: 'var(--muted-foreground)' }}>
          <span>{chartPoints[0]?.label || ''}</span>
          {chartPoints.length > 2 && (
            <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.label || ''}</span>
          )}
          <span>{chartPoints[chartPoints.length - 1]?.label || ''}</span>
        </div>
      </div>

      {/* 5. 2-Column: Best Sellers + Inventory Health */}
      <div className="dash-2col-grid">
        {/* Best Sellers */}
        <div className="dash-panel-card">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Best Sellers</h2>
            <Link href="/admin/reports" className="dash-panel-link">View Sales Report &rarr;</Link>
          </div>

          <div className="dash-best-list">
            {bestSellers.length > 0 ? (
              bestSellers.map((item, idx) => (
                <div key={item.id || idx} className="dash-best-item">
                  <div className="dash-best-rank">{idx + 1}</div>
                  {item.image && (
                    <img src={item.image} alt={item.name} className="dash-best-img" />
                  )}
                  <div className="dash-best-info">
                    <div className="dash-best-name">{item.name}</div>
                    <div className="dash-best-sub">{item.unitsSold} units sold</div>
                  </div>
                  <div className="dash-best-meta">
                    <div className="dash-best-rev">{money(item.revenue)}</div>
                    <div className="dash-best-stock">
                      {item.stock > 0 ? `${item.stock} in stock` : <span style={{ color: '#ef4444' }}>Out of stock</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '13px' }}>
                No product sales recorded in this period.
              </div>
            )}
          </div>
        </div>

        {/* Inventory Health */}
        <div className="dash-panel-card">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Inventory Health</h2>
            <Link href="/admin/inventory" className="dash-panel-link">Manage Inventory &rarr;</Link>
          </div>

          <div className="dash-inv-metrics">
            <Link href="/admin/inventory" className="dash-inv-box featured">
              <div className="dash-inv-box-label">Total Inventory Valuation</div>
              <div className="dash-inv-box-val">{money(inventory.totalValue || 0)}</div>
              <div className="dash-inv-box-hint">Asset value at purchase cost</div>
            </Link>

            <Link href="/admin/inventory" className="dash-inv-box">
              <div className="dash-inv-box-label">Low Stock</div>
              <div className="dash-inv-box-val" style={{ color: (inventory.lowStockCount || 0) > 0 ? '#f59e0b' : 'inherit' }}>
                {inventory.lowStockCount || 0} variants
              </div>
              <div className="dash-inv-box-hint">Below safe reorder level</div>
            </Link>

            <Link href="/admin/products" className="dash-inv-box">
              <div className="dash-inv-box-label">Out of Stock</div>
              <div className="dash-inv-box-val" style={{ color: (inventory.outOfStockCount || 0) > 0 ? '#ef4444' : 'inherit' }}>
                {inventory.outOfStockCount || 0} products
              </div>
              <div className="dash-inv-box-hint">Zero sellable stock</div>
            </Link>

            <Link href="/admin/inventory" className="dash-inv-box">
              <div className="dash-inv-box-label">Fast Moving</div>
              <div className="dash-inv-box-val">{inventory.fastMovingCount || 0} items</div>
              <div className="dash-inv-box-hint">High turnover demand</div>
            </Link>

            <Link href="/admin/purchases" className="dash-inv-box">
              <div className="dash-inv-box-label">Reorder Required</div>
              <div className="dash-inv-box-val">{inventory.reorderRequiredCount || 0} items</div>
              <div className="dash-inv-box-hint">Immediate PO needed</div>
            </Link>
          </div>
        </div>
      </div>

      {/* 6. 2-Column: Recent Orders + Customer Overview */}
      <div className="dash-2col-grid">
        {/* Recent Orders */}
        <div className="dash-panel-card">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Recent Orders</h2>
            <Link href="/admin/orders" className="dash-panel-link">View All Orders &rarr;</Link>
          </div>

          <div className="dash-order-list">
            {recentOrders.length > 0 ? (
              recentOrders.map((ord) => (
                <div key={ord.id} className="dash-order-row">
                  <div>
                    <div className="dash-order-no">{ord.orderNo}</div>
                    <div className="dash-order-cust">{ord.customer}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{money(ord.amount)}</div>
                    <span className={`dash-order-status ${ord.status}`}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '13px' }}>
                No recent orders placed.
              </div>
            )}
          </div>
        </div>

        {/* Customer Overview */}
        <div className="dash-panel-card">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Customer Overview</h2>
            <Link href="/admin/customers" className="dash-panel-link">View Customers &rarr;</Link>
          </div>

          <div className="dash-inv-metrics">
            <div className="dash-inv-box">
              <div className="dash-inv-box-label">Total Customers</div>
              <div className="dash-inv-box-val">{customers.totalCustomers?.toLocaleString() || 0}</div>
              <div className="dash-inv-box-hint">Registered + guest buyers</div>
            </div>

            <div className="dash-inv-box">
              <div className="dash-inv-box-label">New Customers</div>
              <div className="dash-inv-box-val">{customers.newCustomers?.toLocaleString() || 0}</div>
              <div className="dash-inv-box-hint">
                {renderDelta(customers.newCustomersDelta)} in period
              </div>
            </div>

            <div className="dash-inv-box">
              <div className="dash-inv-box-label">Returning Buyers</div>
              <div className="dash-inv-box-val">{customers.returningCustomers?.toLocaleString() || 0}</div>
              <div className="dash-inv-box-hint">Placed &gt; 1 order</div>
            </div>

            <div className="dash-inv-box">
              <div className="dash-inv-box-label">Returning Rate</div>
              <div className="dash-inv-box-val">{customers.returningRate || 0}%</div>
              <div className="dash-inv-box-hint">Repeat purchase loyalty</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. 2-Column: Returns & Refunds + Finance Snapshot */}
      <div className="dash-2col-grid">
        {/* Returns & Refunds */}
        <div className="dash-panel-card">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Returns &amp; Refunds</h2>
            <Link href="/admin/returns" className="dash-panel-link">View Returns &rarr;</Link>
          </div>

          <div className="dash-inv-metrics">
            <div className="dash-inv-box">
              <div className="dash-inv-box-label">Total Returns</div>
              <div className="dash-inv-box-val">{returns.returnCount || 0}</div>
              <div className="dash-inv-box-hint">Units returned in period</div>
            </div>

            <div className="dash-inv-box">
              <div className="dash-inv-box-label">Return Rate</div>
              <div className="dash-inv-box-val">{returns.returnRate || 0}%</div>
              <div className="dash-inv-box-hint">Percentage of orders returned</div>
            </div>

            <div className="dash-inv-box">
              <div className="dash-inv-box-label">Refund Value</div>
              <div className="dash-inv-box-val">{money(returns.refundValue || 0)}</div>
              <div className="dash-inv-box-hint">Total refunded cash/credit</div>
            </div>

            <div className="dash-inv-box">
              <div className="dash-inv-box-label">Pending Reviews</div>
              <div className="dash-inv-box-val" style={{ color: (returns.pendingReturnsCount || 0) > 0 ? '#f59e0b' : 'inherit' }}>
                {returns.pendingReturnsCount || 0}
              </div>
              <div className="dash-inv-box-hint">Awaiting inspection</div>
            </div>
          </div>
        </div>

        {/* Finance Snapshot */}
        <div className="dash-panel-card">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Finance Snapshot</h2>
            <Link href="/admin/finance" className="dash-panel-link">View Full P&amp;L &rarr;</Link>
          </div>

          <table className="dash-finance-table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--muted-foreground)' }}>Net Sales Revenue</td>
                <td>{money(finance.netSales || 0)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted-foreground)' }}>Gross Profit (after COGS)</td>
                <td>{money(finance.grossProfit || 0)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted-foreground)' }}>Operating Expenses</td>
                <td style={{ color: '#ef4444' }}>-{money(finance.expenses || 0)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted-foreground)' }}>13% Output VAT Estimate</td>
                <td>{money(finance.vat || 0)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--border)' }}>
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>Net Profit</td>
                <td style={{ color: (finance.netProfit || 0) >= 0 ? '#16a34a' : '#ef4444' }}>
                  {money(finance.netProfit || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Dynamic Store Insights */}
      {insights.length > 0 && (
        <div className="dash-insights-section">
          <div className="dash-action-title">
            <Icon name="sparkle" size={16} />
            <span>Store Insights</span>
          </div>

          <div className="dash-insights-grid">
            {insights.map((ins, i) => (
              <div key={i} className="dash-insight-card">
                <span className="dash-insight-icon">
                  {ins.icon === 'trendingUp' ? '📈' : ins.icon === 'star' ? '⭐' : ins.icon === 'alertTriangle' ? '⚠️' : '💡'}
                </span>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
