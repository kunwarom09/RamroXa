'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, saveDB, money } from '../../../services/dataStore';
import Icon from '../../../components/admin/Icons';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const refreshData = () => {
    const db = loadDB();
    setOrders(db.orders || []);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleStatusChange = (no, newStatus) => {
    const db = loadDB();
    db.orders = (db.orders || []).map(o => o.no === no ? { ...o, status: newStatus } : o);
    saveDB(db);
    refreshData();
  };

  const filtered = orders.filter(o => {
    const matchSearch = (o.no || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const shippedCount = orders.filter(o => o.status === 'shipped' || o.status === 'confirmed').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const totalVolume = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const exportCsv = () => {
    const headers = ['Order No', 'Customer', 'Date', 'Total', 'Payment', 'Status'];
    const rows = filtered.map(o => [o.no, `"${o.customer}"`, o.date, o.total, o.pay, o.status]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'zylo-orders.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const badgeForStatus = {
    pending: 'badge-warning',
    confirmed: 'badge-accent',
    shipped: 'badge-accent',
    delivered: 'badge-success',
    cancelled: 'badge-danger'
  };

  return (
    <div>
      <div className="page-head">
        <h1>Orders</h1>
        <p>Storefront online order fulfillment and tracking registry.</p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="label">Total Orders</div>
          <div className="value">{orders.length}</div>
        </div>
        <div className="metric">
          <div className="label">Pending Fulfillment</div>
          <div className="value">{pendingCount}</div>
        </div>
        <div className="metric">
          <div className="label">Dispatched / Shipped</div>
          <div className="value">{shippedCount}</div>
        </div>
        <div className="metric">
          <div className="label">Total Order Value</div>
          <div className="value">{money(totalVolume)}</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search order no or customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '250px' }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="confirmed">confirmed</option>
          <option value="shipped">shipped</option>
          <option value="delivered">delivered</option>
          <option value="cancelled">cancelled</option>
        </select>
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order No</th>
              <th>Customer</th>
              <th>Date</th>
              <th className="num">Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Update Status</th>
              <th style={{ textAlign: 'right' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map(o => (
                <tr key={o.no}>
                  <td><code>{o.no}</code></td>
                  <td>{o.customer}</td>
                  <td>{o.date}</td>
                  <td className="num">{money(o.total)}</td>
                  <td><span className="badge badge-accent">{o.pay}</span></td>
                  <td>
                    <span className={`badge ${badgeForStatus[o.status] || 'badge-muted'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.no, e.target.value)}
                      style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border)' }}
                    >
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" title="View details" onClick={() => setSelectedOrder(o)}>
                      <Icon name="eye" size={15} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8"><div className="empty-state">No orders match filter.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <h2>Order Details ({selectedOrder.no})</h2>
            <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
              <p style={{ margin: '4px 0' }}><strong>Customer:</strong> {selectedOrder.customer}</p>
              <p style={{ margin: '4px 0' }}><strong>Order Date:</strong> {selectedOrder.date}</p>
              <p style={{ margin: '4px 0' }}><strong>Payment Method:</strong> {selectedOrder.pay}</p>
              <p style={{ margin: '4px 0' }}><strong>Fulfillment Status:</strong> <span className={`badge ${badgeForStatus[selectedOrder.status] || 'badge-muted'}`}>{selectedOrder.status}</span></p>
              <p style={{ margin: '4px 0' }}><strong>Invoice Number:</strong> {selectedOrder.invoice || 'N/A'}</p>
              
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div className="section-title">Order Items</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="num">Qty</th>
                        <th className="num">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.desc}</td>
                          <td className="num">{it.qty}</td>
                          <td className="num">{money(it.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="totals-box">
                <div className="grand"><span>Total Amount</span><span>{money(selectedOrder.total)}</span></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

