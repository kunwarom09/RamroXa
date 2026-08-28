'use client';
import React, { useState, useEffect } from 'react';
import { money, today, docSubtotal, docVat, docTotal } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

export default function AdminSalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewInvoiceModal, setViewInvoiceModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [formData, setFormData] = useState({
    invoice: '',
    date: today(),
    customer: 'Walk-in customer',
    payment: 'COD',
    vatable: true,
    items: [{ desc: '', qty: 1, rate: 0 }]
  });

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/orders');
      const orders = res.data?.orders || res.data || [];
      const normalized = orders.map((o, idx) => {
        const grand = o.grandTotal != null ? Math.round(o.grandTotal / 100) : (Number(o.total) || 0);
        const sub = o.subtotal != null ? Math.round(o.subtotal / 100) : grand;
        const vat = o.vatTotal != null ? Math.round(o.vatTotal / 100) : Math.round(sub * 0.13);

        const rawItems = o.items && o.items.length ? o.items : [{ name: 'Storefront Garment', qty: 1, unitPrice: grand * 100 }];
        const items = rawItems.map(i => {
          const rate = i.unitPrice != null ? Math.round(i.unitPrice / 100) : (Number(i.rate) || grand);
          return {
            desc: i.name + (i.variantLabel ? ` (${i.variantLabel})` : ''),
            qty: Number(i.qty) || 1,
            rate: rate
          };
        });

        return {
          id: o._id || o.orderNo || `s_${idx}`,
          invoice: o.orderNo || `INV-${2030 + idx}`,
          date: (o.createdAt || o.date || today()).slice(0, 10),
          customer: o.shippingAddress?.fullName || o.customer || o.guestPhone || 'Storefront Customer',
          payment: (o.paymentMethod || o.pay || 'COD').toUpperCase(),
          vatable: true,
          items,
          subtotal: sub,
          vat,
          total: grand
        };
      });
      setSales(normalized);
    } catch (e) {
      console.error('Failed to load sales from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openAddSaleModal = () => {
    setEditingId(null);
    setFormData({
      invoice: 'INV-' + (2030 + (sales.length || 0) + 1),
      date: today(),
      customer: 'Walk-in customer',
      payment: 'COD',
      vatable: true,
      items: [{ desc: 'Monolith Tee', qty: 1, rate: 1800 }]
    });
    setModalOpen(true);
  };

  const openEditSaleModal = (s) => {
    setEditingId(s.id);
    setFormData({
      invoice: s.invoice || '',
      date: s.date || today(),
      customer: s.customer || 'Walk-in customer',
      payment: s.payment || s.pay || 'COD',
      vatable: s.vatable !== false,
      items: s.items ? JSON.parse(JSON.stringify(s.items)) : [{ desc: '', qty: 1, rate: 0 }]
    });
    setModalOpen(true);
  };

  const handleLineChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { desc: '', qty: 1, rate: 0 }]
    });
  };

  const removeLine = (index) => {
    if (formData.items.length === 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validItems = formData.items.filter(i => i.desc.trim() && i.qty > 0);
    if (!validItems.length) {
      alert('Please add at least one item description');
      return;
    }
    const sub = validItems.reduce((acc, i) => acc + (Number(i.qty || 0) * Number(i.rate || 0)), 0);
    const vat = formData.vatable ? Math.round(sub * 0.13) : 0;
    const total = sub + vat;

    const newSale = {
      id: editingId || ('s_' + Date.now().toString(36)),
      ...formData,
      items: validItems,
      subtotal: sub,
      vat,
      total
    };

    setSales(prev => editingId ? prev.map(s => s.id === editingId ? newSale : s) : [newSale, ...prev]);
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this sale entry?')) return;
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const filtered = sales.filter(s =>
    (s.invoice || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.customer || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalVat = sales.reduce((sum, s) => sum + (Number(s.vat) || 0), 0);

  const exportCsv = () => {
    const headers = ['Invoice', 'Date', 'Customer', 'Payment', 'Subtotal', 'VAT', 'Total'];
    const rows = filtered.map(s => [s.invoice, s.date, `"${s.customer}"`, s.payment || 'COD', s.subtotal || 0, s.vat || 0, s.total || 0]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'zylo-sales-register.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calcSubtotal = formData.items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const calcVat = formData.vatable ? Math.round(calcSubtotal * 0.13) : 0;
  const calcTotal = calcSubtotal + calcVat;

  return (
    <div>
      <div className="page-head">
        <h2>Sales</h2>
        <p>Manual sales register and tax invoice log.</p>
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="metric">
          <div className="label">Total sales</div>
          <div className="value">{sales.length}</div>
        </div>
        <div className="metric">
          <div className="label">Net revenue</div>
          <div className="value">{money(totalRevenue)}</div>
        </div>
        <div className="metric">
          <div className="label">VAT collected</div>
          <div className="value">{money(totalVat)}</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search invoice or customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '250px' }}
        />
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        <button className="btn btn-primary" onClick={openAddSaleModal}>
          + Add sale
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Payment</th>
              <th className="num">Taxable</th>
              <th className="num">VAT 13%</th>
              <th className="num">Total</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map(s => (
                <tr key={s.id}>
                  <td><code>{s.invoice}</code></td>
                  <td>{s.date}</td>
                  <td>{s.customer}</td>
                  <td><span className="badge badge-accent">{s.payment || s.pay || 'COD'}</span></td>
                  <td className="num">{money(docSubtotal(s))}</td>
                  <td className="num">{money(docVat(s))}</td>
                  <td className="num"><strong>{money(docTotal(s))}</strong></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" title="View tax invoice" onClick={() => { setSelectedSale(s); setViewInvoiceModal(true); }}>
                      <Icon name="eye" size={15} />
                    </button>
                    <button className="icon-btn" title="Edit" onClick={() => openEditSaleModal(s)}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button className="icon-btn" title="Delete" onClick={() => handleDelete(s.id)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8"><div className="empty-state">No sales entries found.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT SALE MODAL */}
      {modalOpen && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <h2>{editingId ? 'Edit Sale' : 'Add Sale'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Invoice No</label>
                  <input
                    value={formData.invoice}
                    onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Customer</label>
                  <input
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Payment Method</label>
                  <select
                    value={formData.payment}
                    onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
                  >
                    <option value="Cash">Cash</option>
                    <option value="COD">COD</option>
                    <option value="eSewa">eSewa</option>
                    <option value="Fonepay">Fonepay</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Items</label>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="line-row" style={{ marginBottom: '8px' }}>
                    <input
                      placeholder="Item description"
                      value={item.desc}
                      onChange={(e) => handleLineChange(idx, 'desc', e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => handleLineChange(idx, 'qty', Number(e.target.value))}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Rate (paisa)"
                      value={item.rate}
                      onChange={(e) => handleLineChange(idx, 'rate', Number(e.target.value))}
                      required
                    />
                    <div className="lt">{money(item.qty * item.rate)}</div>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeLine(idx)}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn btn-sm" onClick={addLine}>+ Add line</button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', margin: '10px 0' }}>
                <input
                  type="checkbox"
                  checked={formData.vatable}
                  onChange={(e) => setFormData({ ...formData, vatable: e.target.checked })}
                /> VAT applicable (13%)
              </label>

              <div className="totals-box">
                <div><span>Taxable amount</span><span>{money(calcSubtotal)}</span></div>
                <div><span>VAT</span><span>{money(calcVat)}</span></div>
                <div className="grand"><span>Total</span><span>{money(calcTotal)}</span></div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save sale</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAX INVOICE MODAL */}
      {viewInvoiceModal && selectedSale && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setViewInvoiceModal(false); }}>
          <div className="modal" style={{ maxWidth: '580px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>TAX INVOICE</h2>
              <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--muted-foreground)' }}>Zylo Pvt. Ltd. &middot; PAN: 601234567</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '14px' }}>
              <div>
                <strong>Invoice: {selectedSale.invoice}</strong><br />
                Date: {selectedSale.date}
              </div>
              <div style={{ textAlign: 'right' }}>
                Customer: {selectedSale.customer}<br />
                Payment: {selectedSale.payment || selectedSale.pay || 'COD'}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Qty</th>
                    <th className="num">Rate</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedSale.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.desc}</td>
                      <td className="num">{it.qty}</td>
                      <td className="num">{money(it.rate)}</td>
                      <td className="num">{money(it.qty * it.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="totals-box" style={{ marginTop: '14px' }}>
              <div><span>Taxable Subtotal</span><span>{money(docSubtotal(selectedSale))}</span></div>
              <div><span>VAT (13%)</span><span>{money(docVat(selectedSale))}</span></div>
              <div className="grand"><span>Grand Total</span><span>{money(docTotal(selectedSale))}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button className="btn btn-primary" onClick={() => window.print()}>Print Tax Invoice</button>
              <button className="btn" onClick={() => setViewInvoiceModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

