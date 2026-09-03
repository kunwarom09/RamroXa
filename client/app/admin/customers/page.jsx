'use client';
import React, { useState, useEffect } from 'react';
import { money } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    permanentAddress: '',
    temporaryAddress: '',
    city: '',
    email: '',
    notes: ''
  });

  const refreshData = async () => {
    setLoading(true);
    try {
      const [custRes, orderRes] = await Promise.all([
        api.get('/api/admin/customers'),
        api.get('/api/admin/orders')
      ]);

      const apiCusts = custRes.data?.customers || custRes.data || [];
      const apiOrders = orderRes.data?.orders || orderRes.data || [];

      const deletedKeys = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('zylo_deleted_customers') || '[]')
        : [];

      const custMap = new Map();

      // 1. Registered API customers
      apiCusts.forEach((ac) => {
        const idKey = (ac.id || ac._id || '').toString().toLowerCase();
        const phoneKey = (ac.phone || '').toLowerCase().trim();
        const emailKey = (ac.email || '').toLowerCase().trim();
        const nameKey = (ac.name || '').toLowerCase().trim();
        const key = phoneKey || emailKey || nameKey;

        if (
          (idKey && deletedKeys.includes(idKey)) ||
          (phoneKey && deletedKeys.includes(phoneKey)) ||
          (emailKey && deletedKeys.includes(emailKey)) ||
          (key && deletedKeys.includes(key))
        ) {
          return;
        }

        const spendNpr = ac.totalSpend != null ? Math.round(ac.totalSpend / 100) : 0;
        if (key) {
          custMap.set(key, {
            id: ac.id || ac._id,
            name: ac.name || 'Customer',
            phone: ac.phone || '',
            permanentAddress: ac.permanentAddress || '',
            temporaryAddress: ac.temporaryAddress || '',
            city: ac.temporaryAddress || ac.permanentAddress || ac.city || 'Kathmandu',
            email: ac.email || '',
            orders: ac.orderCount || 0,
            spend: spendNpr,
            notes: 'Registered User'
          });
        }
      });

      // 2. Aggregate orders placed in MongoDB
      apiOrders.forEach((o) => {
        const name = o.shippingAddress?.fullName || o.customer;
        const phone = o.shippingAddress?.phone || o.phone || o.guestPhone;
        const city = o.shippingAddress?.city || 'Kathmandu';
        const key = (phone || o.guestEmail || name || '').toLowerCase().trim();
        const orderTotal = o.grandTotal != null ? Math.round(o.grandTotal / 100) : (Number(o.total) || 0);

        if (name === '[Deleted Customer]') return;
        if (
          (phone && deletedKeys.includes(phone.toLowerCase().trim())) ||
          (o.guestEmail && deletedKeys.includes(o.guestEmail.toLowerCase().trim())) ||
          (name && deletedKeys.includes(name.toLowerCase().trim())) ||
          (key && deletedKeys.includes(key))
        ) {
          return;
        }

        if (key) {
          const existing = custMap.get(key);
          if (existing) {
            if (existing.orders === 0) {
              existing.orders = 1;
              existing.spend = orderTotal;
            }
          } else {
            custMap.set(key, {
              id: 'cust_' + (phone || name || 'guest').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10),
              name: name || 'Storefront Customer',
              phone: phone || '',
              permanentAddress: '',
              temporaryAddress: city,
              city: city,
              email: o.guestEmail || '',
              orders: 1,
              spend: orderTotal,
              notes: `Order ${o.orderNo || o.no}`
            });
          }
        }
      });

      const merged = Array.from(custMap.values());
      setCustomers(merged);
    } catch (e) {
      console.error('Failed to load customers from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openNewCustomerModal = () => {
    setEditingCust(null);
    setFormData({ name: '', phone: '', permanentAddress: '', temporaryAddress: '', city: '', email: '', notes: '' });
    setModalOpen(true);
  };

  const openEditCustomerModal = (c) => {
    setEditingCust(c);
    setFormData({
      name: c.name || '',
      phone: c.phone || '',
      permanentAddress: c.permanentAddress || '',
      temporaryAddress: c.temporaryAddress || '',
      city: c.city || '',
      email: c.email || '',
      notes: c.notes || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingCust && editingCust.id && !editingCust.id.startsWith('cust_')) {
        await api.put(`/api/admin/customers/${editingCust.id}`, formData);
      } else {
        await api.post('/api/admin/customers', formData);
      }
      await refreshData();
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save customer:', err);
      alert(err.message || 'Failed to save customer.');
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Are you sure you want to delete customer "${c.name || 'this customer'}"?`)) return;
    try {
      const targetId = c.id || c.email || c.phone || c.name;
      if (targetId) {
        await api.delete(`/api/admin/customers/${encodeURIComponent(targetId)}`);
      }

      // Add to exclusion set so order aggregation never resurrects this customer
      const keysToExclude = [
        c.id,
        c.email,
        c.phone,
        c.name,
        (c.phone || c.email || c.name || '').toLowerCase().trim()
      ].filter(Boolean);

      try {
        const deletedKeys = JSON.parse(localStorage.getItem('zylo_deleted_customers') || '[]');
        keysToExclude.forEach((k) => {
          const lk = String(k).toLowerCase().trim();
          if (lk && !deletedKeys.includes(lk)) deletedKeys.push(lk);
        });
        localStorage.setItem('zylo_deleted_customers', JSON.stringify(deletedKeys));
      } catch (e) {}

      // Update state immediately
      setCustomers((prev) => prev.filter((x) => x.id !== c.id && x.email !== c.email && x.phone !== c.phone && x.name !== c.name));
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert(err.message || 'Failed to delete customer.');
    }
  };

  const filtered = customers.filter((c) =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.permanentAddress || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.temporaryAddress || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalSpend = customers.reduce((a, c) => a + (Number(c.spend) || 0), 0);
  const totalOrders = customers.reduce((a, c) => a + (Number(c.orders) || 0), 0);

  const exportCsv = () => {
    const headers = ['Name', 'Email', 'Phone', 'Permanent Address', 'Temporary Address', 'Orders', 'Lifetime Spend'];
    const rows = filtered.map((c) => [
      `"${c.name}"`,
      `"${c.email || ''}"`,
      `"${c.phone}"`,
      `"${c.permanentAddress || ''}"`,
      `"${c.temporaryAddress || ''}"`,
      c.orders || 0,
      c.spend || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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
        <h2>Customers &amp; Registered Users</h2>
        <p>User directory, registered addresses, and customer lifetime purchasing records.</p>
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
          placeholder="Search name, email, phone, or address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '320px' }}
        />
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        <button className="btn btn-primary" onClick={openNewCustomerModal}>+ Add customer</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer / User</th>
              <th>Phone</th>
              <th>Permanent Address</th>
              <th>Temporary Address</th>
              <th className="num">Orders</th>
              <th className="num">Lifetime Spend</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((c, idx) => (
                <tr key={c.id || idx}>
                  <td>
                    <strong>{c.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{c.email || 'No email'}</div>
                  </td>
                  <td style={{ color: 'var(--muted-foreground)' }}>
                    <code>{c.phone || '-'}</code>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px' }}>{c.permanentAddress || '-'}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px' }}>{c.temporaryAddress || c.city || '-'}</span>
                  </td>
                  <td className="num">{c.orders || 0}</td>
                  <td className="num"><strong>{money(c.spend || 0)}</strong></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" title="Edit / View" onClick={() => openEditCustomerModal(c)}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button className="icon-btn" title="Delete" onClick={() => handleDelete(c)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7"><div className="empty-state">No customers found.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '600px' }}>
            <h2>{editingCust ? 'Customer Details' : 'Add Customer'}</h2>
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
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
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
                  <label>City / Location</label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Kathmandu"
                  />
                </div>
                <div className="field">
                  <label>Permanent Address</label>
                  <input
                    value={formData.permanentAddress}
                    onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                    placeholder="Permanent Address (e.g. Pokhara-8)"
                  />
                </div>
                <div className="field">
                  <label>Temporary Address</label>
                  <input
                    value={formData.temporaryAddress}
                    onChange={(e) => setFormData({ ...formData, temporaryAddress: e.target.value })}
                    placeholder="Temporary Address (e.g. Thamel, KTM)"
                  />
                </div>
              </div>
              <div className="field">
                <label>Notes / Status</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Preferences, special instructions..."
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>Close</button>
                <button type="submit" className="btn btn-primary">Save customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

