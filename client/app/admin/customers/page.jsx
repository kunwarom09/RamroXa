'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, saveDB, money } from '../../../services/dataStore';
import Icon from '../../../components/admin/Icons';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', city: '', email: '', notes: '' });

  const refreshData = () => {
    const db = loadDB();
    setCustomers(db.customers || []);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openNewCustomerModal = () => {
    setEditingCust(null);
    setFormData({ name: '', phone: '', city: '', email: '', notes: '' });
    setModalOpen(true);
  };

  const openEditCustomerModal = (c) => {
    setEditingCust(c);
    setFormData({
      name: c.name || '',
      phone: c.phone || '',
      city: c.city || '',
      email: c.email || '',
      notes: c.notes || ''
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const db = loadDB();
    const list = db.customers || [];
    if (editingCust) {
      const idx = list.findIndex(c => (c.id ? c.id === editingCust.id : c.name === editingCust.name));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...formData };
      }
    } else {
      list.push({
        id: 'cust_' + Date.now().toString(36),
        ...formData,
        orders: 0,
        spend: 0
      });
    }
    db.customers = list;
    saveDB(db);
    setModalOpen(false);
    refreshData();
  };

  const handleDelete = (c) => {
    if (!confirm(`Delete customer ${c.name}?`)) return;
    const db = loadDB();
    db.customers = (db.customers || []).filter(x => (x.id ? x.id !== c.id : x.name !== c.name));
    saveDB(db);
    refreshData();
  };

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalSpend = customers.reduce((a, c) => a + (Number(c.spend) || 0), 0);
  const totalOrders = customers.reduce((a, c) => a + (Number(c.orders) || 0), 0);

  const exportCsv = () => {
    const headers = ['Name', 'Phone', 'City', 'Email', 'Orders', 'Lifetime Spend'];
    const rows = filtered.map(c => [`"${c.name}"`, `"${c.phone}"`, `"${c.city}"`, `"${c.email || ''}"`, c.orders || 0, c.spend || 0]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'zylo-customers.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Customers</h1>
        <p>Customer directory and lifetime purchasing log.</p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="label">Total Customers</div>
          <div className="value">{customers.length}</div>
        </div>
        <div className="metric">
          <div className="label">Total Orders Placed</div>
          <div className="value">{totalOrders}</div>
        </div>
        <div className="metric">
          <div className="label">Lifetime Revenue</div>
          <div className="value">{money(totalSpend)}</div>
        </div>
        <div className="metric">
          <div className="label">Avg Spend per Customer</div>
          <div className="value">{money(customers.length ? totalSpend / customers.length : 0)}</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search customers by name, phone or city"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '280px' }}
        />
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        <button className="btn btn-primary" onClick={openNewCustomerModal}>+ Add customer</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>City</th>
              <th className="num">Orders</th>
              <th className="num">Lifetime Spend</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((c, idx) => (
                <tr key={c.id || idx}>
                  <td><strong>{c.name}</strong></td>
                  <td style={{ color: 'var(--muted-foreground)' }}><code>{c.phone}</code></td>
                  <td>{c.city}</td>
                  <td className="num">{c.orders || 0}</td>
                  <td className="num"><strong>{money(c.spend || 0)}</strong></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" title="Edit" onClick={() => openEditCustomerModal(c)}><Icon name="edit" size={15} /></button>
                    <button className="icon-btn" title="Delete" onClick={() => handleDelete(c)}><Icon name="trash" size={15} /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6"><div className="empty-state">No customers found.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <h2>{editingCust ? 'Edit Customer' : 'Add Customer'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Full Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Customer Name"
                    required
                  />
                </div>
                <div className="field">
                  <label>Phone Number</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="98XXXXXXXX"
                  />
                </div>
                <div className="field">
                  <label>City</label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Kathmandu"
                  />
                </div>
                <div className="field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Preferences, special instructions..."
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

