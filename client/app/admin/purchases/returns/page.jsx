'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { money, today } from '../../../../services/formatters';
import { api } from '../../../../services/apiClient';
import Icon from '../../../../components/admin/Icons';

export default function AdminPurchaseReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    billNo: '',
    supplier: '',
    supplierPan: '',
    date: today(),
    reason: 'Damaged / Defective garments returned to supplier',
    vatable: true,
    items: [{ name: '', sku: '', qty: 1, rate: 0 }]
  });

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/purchase-returns');
      const list = res.data?.returns || res.data?.data || res.returns || [];
      setReturns(list);
    } catch (e) {
      console.error('Failed to load purchase returns:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // Pre-populate if query params present
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qBill = params.get('billNo');
      const qSupp = params.get('supplier');
      if (qBill || qSupp) {
        setFormData(prev => ({
          ...prev,
          billNo: qBill || prev.billNo,
          supplier: qSupp || prev.supplier
        }));
        setModalOpen(true);
      }
    }
  }, []);

  const handleLineChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', sku: '', qty: 1, rate: 0 }]
    });
  };

  const removeLine = (index) => {
    if (formData.items.length === 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calcSubtotal = formData.items.reduce((sum, i) => sum + (Number(i.qty || 0) * Number(i.rate || 0)), 0);
  const calcVat = formData.vatable ? Math.round(calcSubtotal * 0.13) : 0;
  const calcTotal = calcSubtotal + calcVat;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const validItems = formData.items.filter(i => i.name && i.name.trim() && Number(i.qty) > 0);
    if (!validItems.length) {
      alert('Please add at least one valid return item name.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/admin/purchase-returns', {
        billNo: formData.billNo,
        supplier: formData.supplier,
        supplierPan: formData.supplierPan,
        date: formData.date,
        reason: formData.reason,
        vatable: formData.vatable,
        items: validItems
      });
      setModalOpen(false);
      await refreshData();
    } catch (err) {
      alert('Failed to issue Debit Note: ' + (err?.response?.data?.message || err.message || 'Server error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDebitNote = async (id, no) => {
    const reason = prompt(`Cancel/Void Debit Note ${no}?\nPlease enter a reason:`, 'Incorrect entry / Cancelled with supplier agreement');
    if (reason === null) return;
    try {
      await api.post(`/api/admin/purchase-returns/${id}/cancel`, { reason });
      await refreshData();
    } catch (e) {
      alert('Failed to cancel debit note: ' + (e?.response?.data?.message || e.message || 'Server error'));
    }
  };

  const filtered = returns.filter(r =>
    (r.no || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.billNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.supplier || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalRefundAmount = returns.reduce((sum, r) => sum + (Number(r.totalAmountNpr || (r.totalAmount ? r.totalAmount / 100 : 0)) || 0), 0);
  const totalVatReversed = returns.reduce((sum, r) => sum + (Number(r.vatAmountNpr || (r.vatAmount ? r.vatAmount / 100 : 0)) || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2>Purchase Returns &amp; Debit Notes</h2>
          <p>Schedule 11 Debit Notes issued to vendors for returned stock and Input VAT reversals.</p>
        </div>
        <Link href="/admin/purchases" className="btn btn-outline">
          &larr; Back to Purchases
        </Link>
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="metric">
          <div className="label">Total Debit Notes</div>
          <div className="value">{returns.length}</div>
        </div>
        <div className="metric">
          <div className="label">Total Returned Value</div>
          <div className="value">{money(totalRefundAmount)}</div>
        </div>
        <div className="metric">
          <div className="label">Input VAT Reversed</div>
          <div className="value">{money(totalVatReversed)}</div>
        </div>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search Debit Note #, Bill #, or Supplier"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-input"
          style={{ width: '280px' }}
        />
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Issue Debit Note
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Debit Note No</th>
              <th>Date</th>
              <th>Original Bill</th>
              <th>Supplier</th>
              <th>Reason</th>
              <th className="num">Taxable (NPR)</th>
              <th className="num">13% VAT Reversed</th>
              <th className="num">Total Debit</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((r) => (
                <tr key={r._id || r.id}>
                  <td><code>{r.no}</code></td>
                  <td>{(r.date || '').slice(0, 10)}</td>
                  <td><code>{r.billNo}</code></td>
                  <td>
                    <strong>{r.supplier}</strong>
                    {r.supplierPan && <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>PAN: {r.supplierPan}</div>}
                  </td>
                  <td>{r.reason}</td>
                  <td className="num">{money(r.subtotalNpr || (r.subtotal ? r.subtotal / 100 : 0))}</td>
                  <td className="num">{money(r.vatAmountNpr || (r.vatAmount ? r.vatAmount / 100 : 0))}</td>
                  <td className="num"><strong>{money(r.totalAmountNpr || (r.totalAmount ? r.totalAmount / 100 : 0))}</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="icon-btn"
                      title={r.status === 'cancelled' ? 'Debit Note Cancelled' : 'Cancel/Void Debit Note'}
                      disabled={r.status === 'cancelled'}
                      style={{ color: r.status === 'cancelled' ? 'var(--muted-foreground)' : '#ef4444' }}
                      onClick={() => handleCancelDebitNote(r._id || r.id, r.no)}
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '24px' }}>
                  {loading ? 'Loading debit notes...' : 'No Debit Notes recorded yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Issue Debit Note */}
      {modalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content card card-pad" style={{ background: 'var(--background)', width: '90%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Issue Purchase Return (Debit Note)</h3>
              <button className="icon-btn" onClick={() => setModalOpen(false)}><Icon name="x" size={18} /></button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Original Bill No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BILL-102"
                    value={formData.billNo}
                    onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
                    className="text-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="text-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Supplier / Vendor name"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="text-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Supplier PAN (9 digits)</label>
                  <input
                    type="text"
                    placeholder="e.g. 601234567"
                    value={formData.supplierPan}
                    onChange={(e) => setFormData({ ...formData, supplierPan: e.target.value })}
                    className="text-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Reason for Return</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Defective stitching / Damaged in transit / Wrong size"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="text-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Items Line Matrix */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Return Items (Reduces Sellable Stock)</label>
                {formData.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Item name"
                      required
                      value={it.name}
                      onChange={(e) => handleLineChange(idx, 'name', e.target.value)}
                      className="text-input"
                    />
                    <input
                      type="text"
                      placeholder="SKU (e.g. SNK-BLK-42)"
                      value={it.sku}
                      onChange={(e) => handleLineChange(idx, 'sku', e.target.value)}
                      className="text-input"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={it.qty}
                      onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                      className="text-input"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Rate NPR"
                      value={it.rate}
                      onChange={(e) => handleLineChange(idx, 'rate', e.target.value)}
                      className="text-input"
                    />
                    {formData.items.length > 1 && (
                      <button type="button" className="icon-btn" onClick={() => removeLine(idx)} style={{ color: '#ef4444' }}>
                        <Icon name="x" size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-outline" onClick={addLine} style={{ marginTop: '4px' }}>
                  + Add Item Line
                </button>
              </div>

              {/* Totals Summary */}
              <div style={{ background: 'var(--muted)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Taxable Return Amount:</span>
                  <strong>{money(calcSubtotal)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>13% Input VAT Reversal:</span>
                  <strong>{money(calcVat)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                  <span>Total Debit Note Amount:</span>
                  <span style={{ color: 'var(--accent)' }}>{money(calcTotal)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Issuing...' : 'Issue Debit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
