'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { money, today } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

const VAT_RATE = 13;

const STATUS_BADGE = {
  pending: 'badge-warning',
  inspected: 'badge-accent',
  approved: 'badge-success',
  refunded: 'badge-success',
  refund_processed: 'badge-success',
  completed: 'badge-success',
  rejected: 'badge-danger'
};

const RETURN_TYPE_LABELS = {
  full: 'Full Invoice Return',
  payment: 'Full Payment Refund',
  item: 'Item-Based Return',
  custom: 'Specific Amount'
};

const RETURN_REASONS = [
  'Wrong size / fit',
  'Defective / damaged product',
  'Not as pictured / described',
  'Changed mind',
  'Delayed delivery',
  'Other'
];

function genIdempotencyKey() {
  return 'ret_idem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Custom stepper — prevents native <input type="number"> jumping bug
function QtyStepper({ value, min = 1, max, onChange, disabled }) {
  const clamp = (v) => Math.max(min, Math.min(max != null ? max : Infinity, v));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <button
        type="button"
        className="btn btn-sm"
        style={{ padding: '2px 8px', lineHeight: 1 }}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >−</button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(clamp(v));
        }}
        style={{ width: '52px', textAlign: 'center', height: '30px', padding: '0 4px' }}
      />
      <button
        type="button"
        className="btn btn-sm"
        style={{ padding: '2px 8px', lineHeight: 1 }}
        disabled={disabled || (max != null && value >= max)}
        onClick={() => onChange(clamp(value + 1))}
      >+</button>
    </div>
  );
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState('search');
  const [saleSearch, setSaleSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  const [returnType, setReturnType] = useState('full');
  const [lineSelections, setLineSelections] = useState([]);
  const [customAmount, setCustomAmount] = useState(0);
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [restockDest, setRestockDest] = useState('available');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3500);
  };

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, returnsRes] = await Promise.allSettled([
        api.get('/api/admin/orders'),
        api.get('/api/admin/returns')
      ]);
      if (ordersRes.status === 'fulfilled') {
        const orders = ordersRes.value.data?.orders || ordersRes.value.data || [];
        setSales(orders.map((o, idx) => {
          const grand = o.grandTotal != null ? Math.round(o.grandTotal / 100) : (Number(o.total) || 0);
          const rawItems = (o.items && o.items.length) ? o.items : [{ name: 'Garment', qty: 1, unitPrice: grand * 100, sku: '', variantId: '' }];
          return {
            id: o._id || o.id || o.orderNo || `s_${idx}`,
            invoice: o.orderNo || `INV-${2030 + idx}`,
            orderNo: o.orderNo || '',
            date: (o.createdAt || today()).slice(0, 10),
            customer: o.shippingAddress?.fullName || o.customer || 'Customer',
            customerPhone: o.shippingAddress?.phone || o.guestPhone || '',
            payment: (o.paymentMethod || 'COD').toUpperCase(),
            total: grand,
            items: rawItems.map(i => ({
              desc: (i.name || 'Item') + (i.variantLabel ? ` (${i.variantLabel})` : ''),
              sku: i.sku || '',
              variantId: i.variantId || '',
              rate: i.unitPrice != null ? Math.round(i.unitPrice / 100) : (Number(i.rate) || 0),
              qty: Number(i.qty) || 1
            }))
          };
        }));
      }
      if (returnsRes.status === 'fulfilled') {
        const list = returnsRes.value.data?.returns || returnsRes.value.data?.data || returnsRes.value.data || [];
        if (Array.isArray(list)) setReturns(list);
      }
    } catch (e) {
      console.error('Failed to load returns data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const openNewReturnModal = () => {
    setWizardStep('search');
    setSaleSearch('');
    setSelectedSale(null);
    setReturnType('full');
    setLineSelections([]);
    setCustomAmount(0);
    setReturnReason(RETURN_REASONS[0]);
    setCustomReason('');
    setRestockDest('available');
    setNotes('');
    setAttachments([]);
    setSubmitError('');
    setModalOpen(true);
  };

  const handleSelectSale = (s) => {
    setSelectedSale(s);
    const existingForSale = returns.filter(r => r.invoice === s.invoice && r.status !== 'rejected');
    const alreadyBySku = {};
    existingForSale.forEach(ret => {
      (ret.items || []).forEach(item => {
        const key = item.sku || item.variantId || '';
        if (key) alreadyBySku[key] = (alreadyBySku[key] || 0) + (item.returnQty || 0);
      });
    });
    const lines = (s.items || []).map((it, idx) => {
      const key = it.sku || it.variantId || `idx_${idx}`;
      const prevReturned = alreadyBySku[key] || 0;
      const available = Math.max(0, (it.qty || 1) - prevReturned);
      return {
        index: idx,
        desc: it.desc || 'Item',
        sku: it.sku || '',
        variantId: it.variantId || '',
        rate: Number(it.rate) || 0,
        bought: Number(it.qty) || 1,
        returned: prevReturned,
        available,
        returnQty: available > 0 ? available : 0,
        selected: available > 0
      };
    });
    setLineSelections(lines);
    setCustomAmount(0);
    setReturnType('full');
    setWizardStep('form');
  };

  // ALL computed values declared here — never inside JSX — prevents ReferenceError crash
  const originalSaleTotal = selectedSale ? (Number(selectedSale.total) || 0) : 0;
  const alreadyRefunded = selectedSale
    ? returns
        .filter(r => r.invoice === selectedSale.invoice && r.status !== 'rejected')
        .reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0)
    : 0;
  const maxRefundable = Math.max(0, originalSaleTotal - alreadyRefunded);

  let calculatedRefundTotal = 0;
  let returnItemsList = [];
  if (selectedSale) {
    if (returnType === 'full') {
      calculatedRefundTotal = maxRefundable;
      returnItemsList = lineSelections.filter(l => l.available > 0).map(l => ({ ...l, returnQty: l.available }));
    } else if (returnType === 'payment') {
      calculatedRefundTotal = maxRefundable;
      returnItemsList = [];
    } else if (returnType === 'custom') {
      calculatedRefundTotal = Math.min(Number(customAmount) || 0, maxRefundable);
      returnItemsList = [];
    } else {
      const selected = lineSelections.filter(l => l.selected && l.returnQty > 0);
      returnItemsList = selected;
      const sub = selected.reduce((s, l) => s + (l.rate * l.returnQty), 0);
      calculatedRefundTotal = Math.min(sub + Math.round(sub * VAT_RATE / 100), maxRefundable);
    }
  }
  const refundNet = Math.round(calculatedRefundTotal / (1 + VAT_RATE / 100));
  const refundVat = calculatedRefundTotal - refundNet;
  const remainingBalance = Math.max(0, maxRefundable - calculatedRefundTotal);

  const handleFileUpload = (e) => {
    Array.from(e.target.files || []).forEach(file => {
      if (file.size > 500 * 1024) { alert(`${file.name} is too large (> 500KB).`); return; }
      const reader = new FileReader();
      reader.onload = (ev) => setAttachments(prev => [...prev, { name: file.name, data: ev.target.result, type: file.type }]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleCreateReturn = async () => {
    if (!selectedSale) return;
    setSubmitError('');
    if (calculatedRefundTotal <= 0) { setSubmitError('Refund amount must be greater than Rs 0.'); return; }
    if (returnType === 'item' && returnItemsList.length === 0) { setSubmitError('Select at least one item to return.'); return; }
    const finalReason = returnReason === 'Other' ? (customReason.trim() || 'Other') : returnReason;
    const payload = {
      saleId: selectedSale.id,
      orderNo: selectedSale.orderNo || selectedSale.invoice,
      invoice: selectedSale.invoice,
      customer: selectedSale.customer,
      customerPhone: selectedSale.customerPhone || '',
      date: today(),
      type: returnType,
      reason: finalReason,
      restock: restockDest,
      items: returnItemsList.map(l => ({
        sku: l.sku || '', desc: l.desc || '', rate: l.rate || 0,
        bought: l.bought || 0, returned: l.returned || 0,
        returnQty: l.returnQty || 0, variantId: l.variantId || ''
      })),
      refundNet, refundVat, refundAmount: calculatedRefundTotal,
      originalTotal: originalSaleTotal,
      status: 'pending', notes, attachments,
      idempotencyKey: genIdempotencyKey()
    };
    setSubmitting(true);
    try {
      const res = await api.post('/api/admin/returns', payload);
      const created = res.data?.data || res.data;
      if (created) setReturns(prev => [created, ...prev.filter(r => r.id !== created.id && r._id !== created._id)]);
      setModalOpen(false);
      await refreshData();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Server error';
      setSubmitError('Failed to save return: ' + msg);
    } finally {
      setSubmitting(false);
    }
  };

  const updateReturnStatus = async (retId, newStatus) => {
    try {
      const res = await api.patch(`/api/admin/returns/${retId}/status`, { status: newStatus });
      const updated = res.data?.data || res.data;
      const upd = r => (r.id === retId || r._id === retId || r.no === retId)
        ? { ...r, ...(updated || {}), status: newStatus }
        : r;
      setReturns(prev => prev.map(upd));
      setSelectedReturn(prev => prev && (prev.id === retId || prev._id === retId || prev.no === retId)
        ? { ...prev, ...(updated || {}), status: newStatus }
        : prev);
      showToast(`Return ${newStatus === 'approved' ? 'approved successfully!' : newStatus === 'refunded' ? 'marked as refunded!' : 'status updated to ' + newStatus + '.'}`);
    } catch (err) {
      showToast('Failed to update status: ' + (err.response?.data?.message || err.message || 'Error'), true);
    }
  };

  const handleDeleteReturn = async (retId) => {
    if (!confirm('Delete this return record?')) return;
    try {
      await api.delete(`/api/admin/returns/${retId}`);
      setReturns(prev => prev.filter(r => r.id !== retId && r._id !== retId));
      setViewModalOpen(false);
    } catch (err) { alert('Failed to delete: ' + (err.message || 'Error')); }
  };

  const filteredReturns = returns.filter(r => {
    const q = search.toLowerCase();
    return (!q || [(r.no||''),(r.invoice||''),(r.customer||'')].some(s => s.toLowerCase().includes(q)))
      && (!statusFilter || r.status === statusFilter);
  });

  const saleSearchResults = !saleSearch
    ? sales
    : sales.filter(s => {
        const q = saleSearch.toLowerCase();
        return [s.invoice, s.customer, s.customerPhone, s.orderNo, ...(s.items||[]).map(i => `${i.desc} ${i.sku}`)].join(' ').toLowerCase().includes(q);
      });

  return (
    <div>
      <div className="page-head">
        <h2>Sales Returns</h2>
        <p>Return authorization, inspection, restocking, and credit note registry.</p>
      </div>

      <div className="toolbar">
        <input type="text" placeholder="Search return no, invoice or customer" value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: '260px' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="inspected">Inspected</option>
          <option value="approved">Approved</option>
          <option value="refunded">Refunded</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={openNewReturnModal}>+ New sales return</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Return No</th><th>Date</th><th>Orig Invoice</th><th>Customer</th>
              <th>Type</th><th>Reason</th><th className="num">Refund</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9"><div className="empty-state">Loading…</div></td></tr>
            ) : filteredReturns.length > 0 ? filteredReturns.map(r => (
              <tr key={r.id || r._id}>
                <td style={{ fontWeight: 500 }}><code>{r.no}</code></td>
                <td>{r.date}</td>
                <td><code>{r.invoice}</code></td>
                <td>{r.customer}</td>
                <td><span className="badge badge-muted" style={{ fontSize: '11px' }}>{RETURN_TYPE_LABELS[r.type] || r.type}</span></td>
                <td>{r.reason}</td>
                <td className="num">{money(r.refundAmount)}</td>
                <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-muted'}`}>{(r.status||'').replace(/_/g,' ')}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                    {r.status === 'pending' && (
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ padding: '3px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                        title="Approve return"
                        onClick={() => updateReturnStatus(r.id || r._id || r.no, 'approved')}
                      >
                        Approve
                      </button>
                    )}
                    {r.status === 'approved' && (
                      <button
                        className="btn btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px', background: '#10b981', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                        title="Process refund"
                        onClick={() => updateReturnStatus(r.id || r._id || r.no, 'refunded')}
                      >
                        Refund
                      </button>
                    )}
                    <button
                      className="btn btn-sm"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => { setSelectedReturn(r); setViewModalOpen(true); }}
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="9"><div className="empty-state">No sales returns recorded yet.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NEW RETURN WIZARD */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
              <h2 style={{ margin: 0 }}>New Sales Return</h2>
              <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', display: 'flex', gap: '8px' }}>
                {['search','form','confirm'].map((s,i) => (
                  <span key={s} style={{ fontWeight: wizardStep === s ? 700 : 400, color: wizardStep === s ? 'var(--accent)' : undefined }}>
                    {i+1}. {s.charAt(0).toUpperCase()+s.slice(1)}{i<2 && <span style={{ marginLeft:'8px' }}>›</span>}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>

              {/* Step 1: Search */}
              {wizardStep === 'search' && (
                <div>
                  <div className="field">
                    <label>Step 1 — Find the original sale</label>
                    <input type="text" placeholder="Search by invoice no, customer, phone, SKU…"
                      value={saleSearch} onChange={e => setSaleSearch(e.target.value)} autoFocus />
                  </div>
                  <div className="table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table>
                      <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th className="num">Total</th><th></th><th></th></tr></thead>
                      <tbody>
                        {saleSearchResults.length === 0 && (
                          <tr><td colSpan="6" style={{ color: 'var(--muted-foreground)' }}>{saleSearch ? 'No sales match.' : 'No sales found.'}</td></tr>
                        )}
                        {saleSearchResults.map(s => {
                          const alrRef = returns.filter(r => r.invoice === s.invoice && r.status !== 'rejected').reduce((sum, r) => sum + (r.refundAmount||0), 0);
                          const refundable = Math.max(0, (s.total||0) - alrRef);
                          return (
                            <tr key={s.id}>
                              <td><code>{s.invoice}</code></td>
                              <td>{s.date}</td>
                              <td>{s.customer}</td>
                              <td className="num">{money(s.total)}</td>
                              <td>{alrRef > 0 && <span className="badge badge-warning" style={{ fontSize:'11px' }}>Refundable: {money(refundable)}</span>}</td>
                              <td style={{ textAlign:'right' }}>
                                <button className="btn btn-sm btn-primary" disabled={refundable<=0}
                                  title={refundable<=0?'Fully refunded':'Select'} onClick={() => handleSelectSale(s)}>
                                  {refundable<=0 ? 'Fully Returned' : 'Select'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 2: Form */}
              {wizardStep === 'form' && selectedSale && (
                <div>
                  <div className="card card-pad" style={{ background:'var(--muted)', marginBottom:'16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'15px' }}>{selectedSale.invoice} · {selectedSale.customer}</div>
                        <div style={{ fontSize:'12px', color:'var(--muted-foreground)', marginTop:'2px' }}>
                          {selectedSale.date} | {selectedSale.payment} | {selectedSale.customerPhone || 'No phone'} | Total: {money(selectedSale.total)}
                        </div>
                      </div>
                      <button className="btn btn-sm" type="button" onClick={() => setWizardStep('search')}>Change sale</button>
                    </div>
                  </div>

                  <div className="field" style={{ marginBottom:'16px' }}>
                    <label>Step 2 — Return type</label>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px', marginTop:'8px' }}>
                      {[
                        { value:'full', icon:'📄', desc:'Return entire order + restore all inventory' },
                        { value:'payment', icon:'💸', desc:'Refund full remaining balance (no inventory change)' },
                        { value:'item', icon:'📦', desc:'Select specific items/quantities to return' },
                        { value:'custom', icon:'✏️', desc:'Enter a specific refund amount' }
                      ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setReturnType(opt.value)}
                          style={{ border:`2px solid ${returnType===opt.value?'var(--accent)':'var(--border)'}`, borderRadius:'8px', padding:'10px 12px', textAlign:'left',
                            background: returnType===opt.value ? 'color-mix(in srgb,var(--accent) 10%,transparent)' : 'var(--canvas)', cursor:'pointer' }}>
                          <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'2px' }}>{opt.icon} {RETURN_TYPE_LABELS[opt.value]}</div>
                          <div style={{ fontSize:'11px', color:'var(--muted-foreground)' }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {returnType === 'item' && (
                    <div className="table-wrap" style={{ marginBottom:'14px' }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width:'32px' }}></th><th>Item</th><th>SKU</th>
                            <th className="num">Rate</th><th className="num">Sold</th>
                            <th className="num">Prev Ret.</th><th className="num">Available</th>
                            <th className="num">Return Qty</th><th className="num">Refund</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineSelections.map((line, idx) => {
                            const lineRef = line.selected ? Math.round(line.rate * line.returnQty * (1 + VAT_RATE/100)) : 0;
                            return (
                              <tr key={idx} style={{ opacity: line.available<=0 ? 0.45 : 1 }}>
                                <td>
                                  <input type="checkbox" checked={line.selected} disabled={line.available<=0}
                                    onChange={e => setLineSelections(prev => prev.map((l,i) => i===idx ? {...l, selected:e.target.checked} : l))} />
                                </td>
                                <td>
                                  <div style={{ fontWeight:500 }}>{line.desc}</div>
                                  {line.sku && <code style={{ fontSize:'11px', color:'var(--muted-foreground)' }}>{line.sku}</code>}
                                </td>
                                <td><code style={{ fontSize:'11px' }}>{line.sku||'—'}</code></td>
                                <td className="num">{money(line.rate)}</td>
                                <td className="num">{line.bought}</td>
                                <td className="num" style={{ color: line.returned>0?'var(--warning)':undefined }}>{line.returned}</td>
                                <td className="num">{line.available}</td>
                                <td className="num">
                                  <QtyStepper value={line.returnQty} min={1} max={line.available}
                                    disabled={!line.selected || line.available<=0}
                                    onChange={v => setLineSelections(prev => prev.map((l,i) => i===idx ? {...l, returnQty:v} : l))} />
                                </td>
                                <td className="num">{money(lineRef)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {returnType === 'custom' && (
                    <div className="field" style={{ marginBottom:'14px' }}>
                      <label>Custom refund amount (NPR, VAT inclusive) — max {money(maxRefundable)}</label>
                      <input type="number" min="1" max={maxRefundable} value={customAmount || ''}
                        onChange={e => setCustomAmount(Math.max(0, Math.min(maxRefundable, Number(e.target.value)||0)))}
                        style={{ maxWidth:'200px' }} />
                    </div>
                  )}

                  <div className="totals-box" style={{ marginBottom:'16px' }}>
                    <div><span>Original sale total</span><span>{money(originalSaleTotal)}</span></div>
                    <div><span>Already refunded</span><span style={{ color:alreadyRefunded>0?'var(--warning)':undefined }}>{money(alreadyRefunded)}</span></div>
                    <div><span>Max refundable</span><span>{money(maxRefundable)}</span></div>
                    <div><span>Refund net (excl. VAT)</span><span>{money(refundNet)}</span></div>
                    <div><span>Refund VAT ({VAT_RATE}%)</span><span>{money(refundVat)}</span></div>
                    <div className="grand"><span>This refund total</span><span>{money(calculatedRefundTotal)}</span></div>
                    <div><span>Remaining balance after</span><span>{money(remainingBalance)}</span></div>
                  </div>

                  <div className="form-grid-2">
                    <div className="field">
                      <label>Step 3 — Return reason</label>
                      <select value={returnReason} onChange={e => setReturnReason(e.target.value)}>
                        {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Restock destination</label>
                      <select value={restockDest} onChange={e => setRestockDest(e.target.value)}>
                        <option value="available">Return to available stock</option>
                        <option value="damaged">Damaged stock (no restock)</option>
                        <option value="inspection">Inspection queue (no restock)</option>
                        <option value="none">No restock</option>
                      </select>
                    </div>
                  </div>

                  {returnReason === 'Other' && (
                    <div className="field">
                      <label>Describe the reason</label>
                      <textarea rows="2" value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Required when Other is selected" />
                    </div>
                  )}

                  <div className="field">
                    <label>Internal notes (staff only)</label>
                    <textarea rows="2" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Return condition, customer communication, etc." />
                  </div>

                  <div className="field">
                    <label>Step 4 — Supporting documents / photos</label>
                    <div style={{ border:'1px dashed var(--border)', borderRadius:'8px', padding:'14px', textAlign:'center', cursor:'pointer', background:'var(--canvas)' }}
                      onClick={() => fileInputRef.current?.click()}>
                      <Icon name="camera" size={20} />
                      <div style={{ fontSize:'13px', fontWeight:500, marginTop:'4px' }}>Click to upload photos or receipts</div>
                      <div style={{ fontSize:'11px', color:'var(--muted-foreground)' }}>JPG, PNG, WEBP · max 500KB</div>
                    </div>
                    <input type="file" ref={fileInputRef} multiple accept="image/*" style={{ display:'none' }} onChange={handleFileUpload} />
                    {attachments.length > 0 && (
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'10px' }}>
                        {attachments.map((att, i) => (
                          <div key={i} style={{ position:'relative', width:'60px', height:'60px', borderRadius:'6px', overflow:'hidden', border:'1px solid var(--border)' }}>
                            <img src={att.data} alt={att.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            <button type="button" onClick={() => setAttachments(prev => prev.filter((_,j) => j!==i))}
                              style={{ position:'absolute', top:2, right:2, background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', borderRadius:'50%', width:'18px', height:'18px', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {wizardStep === 'confirm' && selectedSale && (
                <div>
                  <div style={{ background:'color-mix(in srgb,var(--accent) 8%,transparent)', border:'1px solid var(--accent)', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
                    <h3 style={{ margin:'0 0 12px' }}>Confirm Return Authorization</h3>
                    <div className="form-grid-2" style={{ fontSize:'13px', gap:'8px 24px' }}>
                      <div><strong>Invoice:</strong> {selectedSale.invoice}</div>
                      <div><strong>Customer:</strong> {selectedSale.customer}</div>
                      <div><strong>Return Type:</strong> {RETURN_TYPE_LABELS[returnType]}</div>
                      <div><strong>Reason:</strong> {returnReason === 'Other' ? customReason : returnReason}</div>
                      <div><strong>Restock:</strong> {restockDest}</div>
                      <div><strong>Status after save:</strong> <span className="badge badge-warning">pending</span></div>
                    </div>
                  </div>

                  <div className="totals-box" style={{ marginBottom:'16px' }}>
                    <div><span>Original sale total</span><span>{money(originalSaleTotal)}</span></div>
                    <div><span>Already refunded</span><span>{money(alreadyRefunded)}</span></div>
                    <div><span>This refund (net excl. VAT)</span><span>{money(refundNet)}</span></div>
                    <div><span>This refund VAT</span><span>{money(refundVat)}</span></div>
                    <div className="grand"><span>Total refund amount</span><span>{money(calculatedRefundTotal)}</span></div>
                    <div><span>Remaining refundable after</span><span>{money(remainingBalance)}</span></div>
                  </div>

                  {returnItemsList.length > 0 && (
                    <div className="table-wrap" style={{ marginBottom:'16px' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th><th className="num">Return Qty</th>
                            <th className="num">Line Refund</th>
                            {restockDest==='available' && <th className="num">Inventory ↑</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {returnItemsList.map((l,i) => (
                            <tr key={i}>
                              <td>
                                <div style={{ fontWeight:500 }}>{l.desc}</div>
                                {l.sku && <code style={{ fontSize:'11px', color:'var(--muted-foreground)' }}>{l.sku}</code>}
                              </td>
                              <td className="num">{l.returnQty || l.available || l.bought}</td>
                              <td className="num">{money(Math.round(l.rate*(l.returnQty||l.bought)*1.13))}</td>
                              {restockDest==='available' && <td className="num" style={{ color:'var(--success)', fontWeight:600 }}>+{l.returnQty||l.bought}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {submitError && (
                    <div style={{ background:'color-mix(in srgb,var(--danger) 10%,transparent)', border:'1px solid var(--danger)', borderRadius:'8px', padding:'10px 14px', marginBottom:'12px', fontSize:'13px', color:'var(--danger)' }}>
                      ⚠ {submitError}
                    </div>
                  )}
                </div>
              )}

            </div>

            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'18px', paddingTop:'16px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              {wizardStep === 'form' && (
                <button className="btn btn-primary" type="button" onClick={() => {
                  setSubmitError('');
                  if (calculatedRefundTotal <= 0) { setSubmitError('Refund amount must be greater than Rs 0.'); return; }
                  if (returnType==='item' && returnItemsList.length===0) { setSubmitError('Select at least one item to return.'); return; }
                  if (returnType==='Other' && !customReason.trim()) { setSubmitError('Please describe the reason.'); return; }
                  setWizardStep('confirm');
                }}>
                  Review &amp; Confirm →
                </button>
              )}
              {wizardStep === 'confirm' && (
                <>
                  <button className="btn" type="button" onClick={() => setWizardStep('form')}>← Back</button>
                  <button className="btn btn-primary" type="button" onClick={handleCreateReturn} disabled={submitting}>
                    {submitting ? 'Saving…' : '✓ Confirm & Save Return'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW RETURN DETAILS MODAL */}
      {viewModalOpen && selectedReturn && (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:'660px', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexShrink:0 }}>
              <h2 style={{ margin:0 }}>Return {selectedReturn.no}</h2>
              <span className={`badge ${STATUS_BADGE[selectedReturn.status]||'badge-muted'}`}>
                {(selectedReturn.status||'').replace(/_/g,' ')}
              </span>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              <div className="form-grid-2" style={{ fontSize:'13px', marginBottom:'14px', gap:'8px 24px' }}>
                <div><strong>Original Invoice:</strong> <code>{selectedReturn.invoice}</code></div>
                <div><strong>Customer:</strong> {selectedReturn.customer}</div>
                <div><strong>Return Date:</strong> {selectedReturn.date}</div>
                <div><strong>Return Type:</strong> {RETURN_TYPE_LABELS[selectedReturn.type]||selectedReturn.type}</div>
                <div><strong>Restock:</strong> {selectedReturn.restock||selectedReturn.restockDest||'available'}</div>
                <div><strong>Reason:</strong> {selectedReturn.reason}</div>
              </div>
              <div className="totals-box" style={{ marginBottom:'14px' }}>
                {(selectedReturn.alreadyRefunded||0) > 0 && <div><span>Previously refunded</span><span>{money(selectedReturn.alreadyRefunded)}</span></div>}
                <div><span>Refund net</span><span>{money(selectedReturn.refundNet)}</span></div>
                <div><span>Refund VAT (13%)</span><span>{money(selectedReturn.refundVat)}</span></div>
                <div className="grand"><span>Total refund</span><span>{money(selectedReturn.refundAmount)}</span></div>
              </div>
              {selectedReturn.items && selectedReturn.items.length > 0 && (
                <div className="table-wrap" style={{ marginBottom:'14px' }}>
                  <table>
                    <thead><tr><th>Item</th><th>SKU</th><th className="num">Return Qty</th><th className="num">Rate</th></tr></thead>
                    <tbody>
                      {selectedReturn.items.map((item,i) => (
                        <tr key={i}>
                          <td>{item.desc||'—'}</td>
                          <td><code>{item.sku||'—'}</code></td>
                          <td className="num">{item.returnQty}</td>
                          <td className="num">{money(item.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {selectedReturn.notes && (
                <div style={{ background:'var(--muted)', padding:'10px', borderRadius:'8px', fontSize:'13px', marginBottom:'14px' }}>
                  <strong>Notes:</strong> {selectedReturn.notes}
                </div>
              )}
              {(selectedReturn.attachments||[]).length > 0 && (
                <div style={{ marginBottom:'14px' }}>
                  <strong style={{ fontSize:'13px' }}>Attachments:</strong>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'6px' }}>
                    {selectedReturn.attachments.map((att,i) => (
                      <a key={i} href={att.data} target="_blank" rel="noreferrer">
                        <img src={att.data} alt={att.name} style={{ width:'80px', height:'80px', objectFit:'cover', borderRadius:'6px', border:'1px solid var(--border)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', flexWrap:'wrap', marginTop:'16px', paddingTop:'14px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
              {selectedReturn.status === 'pending' && (
                <button className="btn btn-sm" onClick={() => updateReturnStatus(selectedReturn.id || selectedReturn._id || selectedReturn.no, 'inspected')}>Mark Inspected</button>
              )}
              {['pending','inspected'].includes(selectedReturn.status) && (
                <button className="btn btn-sm btn-primary" onClick={() => updateReturnStatus(selectedReturn.id || selectedReturn._id || selectedReturn.no, 'approved')}>Approve Return</button>
              )}
              {selectedReturn.status === 'approved' && (
                <button className="btn btn-sm" style={{ background: '#10b981', color: '#fff', border: 'none' }} onClick={() => updateReturnStatus(selectedReturn.id || selectedReturn._id || selectedReturn.no, 'refunded')}>Mark Refunded</button>
              )}
              {selectedReturn.status === 'refunded' && (
                <button className="btn btn-sm btn-primary" onClick={() => updateReturnStatus(selectedReturn.id || selectedReturn._id || selectedReturn.no, 'completed')}>Complete Return</button>
              )}
              {!['rejected','completed'].includes(selectedReturn.status) && (
                <button className="btn btn-sm btn-danger" onClick={() => updateReturnStatus(selectedReturn.id || selectedReturn._id || selectedReturn.no, 'rejected')}>Reject</button>
              )}
              <button className="btn btn-sm" onClick={() => window.print()}>Print Credit Note</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteReturn(selectedReturn.id || selectedReturn._id || selectedReturn.no)}>Delete</button>
              <button className="btn btn-sm" onClick={() => setViewModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: toast.isErr ? '#ef4444' : '#10b981',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 13,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 99999
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
