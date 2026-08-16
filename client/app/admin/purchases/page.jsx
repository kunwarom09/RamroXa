'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, saveDB, money, docSubtotal, docVat, docTotal, today } from '../../../services/dataStore';
import Icon from '../../../components/admin/Icons';

export default function AdminPurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    bill: '',
    date: today(),
    supplier: '',
    head: 'Purchases (stock)',
    vatable: true,
    items: [{ desc: '', qty: 1, rate: 0 }]
  });

  const refreshData = () => {
    const db = loadDB();
    setPurchases(db.purchases || []);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openAddPurchaseModal = () => {
    setEditingId(null);
    setFormData({
      bill: 'BILL-' + (500 + (purchases.length || 0) + 1),
      date: today(),
      supplier: '',
      head: 'Purchases (stock)',
      vatable: true,
      items: [{ desc: '', qty: 1, rate: 0 }]
    });
    setModalOpen(true);
  };

  const openEditPurchaseModal = (p) => {
    setEditingId(p.id);
    setFormData({
      bill: p.bill || '',
      date: p.date || today(),
      supplier: p.supplier || '',
      head: p.head || 'Purchases (stock)',
      vatable: p.vatable !== false,
      items: p.items ? JSON.parse(JSON.stringify(p.items)) : [{ desc: '', qty: 1, rate: 0 }]
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

  const handleSave = (e) => {
    e.preventDefault();
    const validItems = formData.items.filter(i => i.desc.trim() && i.qty > 0);
    if (!validItems.length) {
      alert('Add at least one item with description and quantity');
      return;
    }
    const db = loadDB();
    const list = db.purchases || [];
    if (editingId) {
      const idx = list.findIndex(p => p.id === editingId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...formData, items: validItems };
      }
    } else {
      const newPurch = {
        id: 'p_' + Date.now().toString(36),
        ...formData,
        items: validItems
      };
      list.unshift(newPurch);
    }
    db.purchases = list;
    saveDB(db);
    setModalOpen(false);
    refreshData();
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this purchase? The journal entry goes with it.')) return;
    const db = loadDB();
    db.purchases = (db.purchases || []).filter(p => p.id !== id);
    saveDB(db);
    refreshData();
  };

  const filtered = purchases.filter(p =>
    (p.bill || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.head || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = purchases.reduce((sum, p) => sum + docSubtotal(p), 0);
  const totalVat = purchases.reduce((sum, p) => sum + docVat(p), 0);

  const exportCsv = () => {
    const headers = ['Bill No', 'Date', 'Supplier', 'Expense Head', 'Subtotal', 'VAT', 'Total'];
    const rows = filtered.map(p => [p.bill, p.date, `"${p.supplier}"`, `"${p.head}"`, docSubtotal(p), docVat(p), docTotal(p)]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'zylo-purchase-register.csv');
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
        <h1>Purchases</h1>
        <p>Supplier bills and operational expense tracking.</p>
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="metric">
          <div className="label">Total purchases</div>
          <div className="value">{purchases.length}</div>
        </div>
        <div className="metric">
          <div className="label">Net cost</div>
          <div className="value">{money(totalCost)}</div>
        </div>
        <div className="metric">
          <div className="label">VAT paid</div>
          <div className="value">{money(totalVat)}</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search bill, supplier or head"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '250px' }}
        />
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        <button className="btn btn-primary" onClick={openAddPurchaseModal}>
          + Add purchase
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Expense Head</th>
              <th className="num">Taxable</th>
              <th className="num">VAT 13%</th>
              <th className="num">Total</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map(p => (
                <tr key={p.id}>
                  <td><code>{p.bill}</code></td>
                  <td>{p.date}</td>
                  <td>{p.supplier}</td>
                  <td><span className="badge badge-muted">{p.head}</span></td>
                  <td className="num">{money(docSubtotal(p))}</td>
                  <td className="num">{money(docVat(p))}</td>
                  <td className="num"><strong>{money(docTotal(p))}</strong></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" title="Edit" onClick={() => openEditPurchaseModal(p)}><Icon name="edit" size={15} /></button>
                    <button className="icon-btn" title="Delete" onClick={() => handleDelete(p.id)}><Icon name="trash" size={15} /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8"><div className="empty-state">No purchases recorded yet.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <h2>{editingId ? 'Edit Purchase' : 'Add Purchase'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Bill No</label>
                  <input
                    value={formData.bill}
                    onChange={(e) => setFormData({ ...formData, bill: e.target.value })}
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
                  <label>Supplier</label>
                  <input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier name"
                    required
                  />
                </div>
                <div className="field">
                  <label>Expense Head</label>
                  <select
                    value={formData.head}
                    onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                  >
                    <option>Purchases (stock)</option>
                    <option>Freight and delivery</option>
                    <option>Rent</option>
                    <option>Salaries</option>
                    <option>Utilities</option>
                    <option>Marketing</option>
                    <option>Other expenses</option>
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
                <button type="submit" className="btn btn-primary">Save purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

