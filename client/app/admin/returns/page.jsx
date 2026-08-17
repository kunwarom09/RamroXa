'use client';
import React, { useState, useEffect, useRef } from 'react';
import { money, today, docSubtotal, docVat, docTotal } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Return Wizard Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState('search'); // 'search' | 'form'
  const [saleSearch, setSaleSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  // Return Form State
  const [returnType, setReturnType] = useState('full'); // 'full' | 'item' | 'quantity' | 'custom'
  const [lineSelections, setLineSelections] = useState([]); // [{ desc, sku, rate, bought, returned, returnQty, selected }]
  const [customAmount, setCustomAmount] = useState(0);
  const [returnReason, setReturnReason] = useState('Wrong size / fit');
  const [customReason, setCustomReason] = useState('');
  const [restockDest, setRestockDest] = useState('available');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // View / Detail Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/orders');
      const orders = res.data?.orders || res.data || [];
      const normalizedSales = orders.map((o, idx) => {
        const grand = o.grandTotal != null ? Math.round(o.grandTotal / 100) : (Number(o.total) || 0);
        const rawItems = o.items && o.items.length ? o.items : [{ name: 'Garment', qty: 1, unitPrice: grand * 100 }];
        return {
          id: o._id || o.orderNo || `s_${idx}`,
          invoice: o.orderNo || `INV-${2030 + idx}`,
          orderNo: o.orderNo || o.no,
          date: (o.createdAt || o.date || today()).slice(0, 10),
          customer: o.shippingAddress?.fullName || o.customer || 'Storefront Customer',
          customerPhone: o.shippingAddress?.phone || o.phone || '',
          total: grand,
          items: rawItems.map(i => ({
            desc: i.name + (i.variantLabel ? ` (${i.variantLabel})` : ''),
            sku: i.sku || 'SKU',
            rate: i.unitPrice != null ? Math.round(i.unitPrice / 100) : (Number(i.rate) || grand),
            qty: Number(i.qty) || 1
          }))
        };
      });
      setSales(normalizedSales);
    } catch (e) {
      console.error('Failed to load orders for returns:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openNewReturnModal = () => {
    setStep('search');
    setSaleSearch('');
    setSelectedSale(null);
    setReturnType('full');
    setLineSelections([]);
    setCustomAmount(0);
    setReturnReason('Wrong size / fit');
    setCustomReason('');
    setRestockDest('available');
    setNotes('');
    setAttachments([]);
    setModalOpen(true);
  };

  const handleSelectSale = (s) => {
    setSelectedSale(s);
    const initialLines = (s.items || []).map((it, idx) => ({
      index: idx,
      desc: it.desc || 'Item',
      sku: it.sku || `SKU-${idx + 1}`,
      rate: Number(it.rate) || 0,
      bought: Number(it.qty) || 1,
      returned: 0,
      returnQty: Number(it.qty) || 1,
      selected: true
    }));

    setLineSelections(initialLines);
    setCustomAmount(0);
    setStep('form');
  };

  // Compute live return totals
  const vatRate = 13;
  let calculatedRefundTotal = 0;
  let returnItemsList = [];

  if (selectedSale) {
    if (returnType === 'full') {
      calculatedRefundTotal = selectedSale.total || 0;
      returnItemsList = lineSelections.map(l => ({ ...l, returnQty: l.bought }));
    } else if (returnType === 'custom') {
      calculatedRefundTotal = Number(customAmount) || 0;
      returnItemsList = [];
    } else {
      const selected = lineSelections.filter(l => l.selected && l.returnQty > 0);
      returnItemsList = selected;
      const subtotal = selected.reduce((sum, l) => sum + (l.rate * l.returnQty), 0);
      const vat = Math.round(subtotal * (vatRate / 100));
      calculatedRefundTotal = subtotal + vat;
    }
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > 500 * 1024) {
        alert(`File ${file.name} is too large (> 500KB).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachments(prev => [...prev, { name: file.name, data: ev.target.result, type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateReturn = (e) => {
    e.preventDefault();
    if (!selectedSale) return;
    if (calculatedRefundTotal <= 0) {
      alert('Return refund amount must be greater than Rs 0.');
      return;
    }

    const returnNet = Math.round(calculatedRefundTotal / (1 + vatRate / 100));
    const refundVat = calculatedRefundTotal - returnNet;

    const newReturn = {
      id: 'ret_' + Date.now().toString(36),
      no: 'RET-' + (1000 + returns.length + 1),
      saleId: selectedSale.id,
      invoice: selectedSale.invoice,
      customer: selectedSale.customer,
      date: today(),
      type: returnType,
      reason: returnReason === 'Other' ? (customReason || 'Other') : returnReason,
      restock: restockDest,
      items: returnItemsList,
      refundNet: returnNet,
      refundVat,
      refundAmount: calculatedRefundTotal,
      status: 'pending',
      notes,
      attachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setReturns(prev => [newReturn, ...prev]);
    setModalOpen(false);
  };

  const updateReturnStatus = (retId, newStatus) => {
    setReturns(prev => prev.map(r => r.id === retId ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r));
    if (selectedReturn?.id === retId) {
      setSelectedReturn(prev => ({ ...prev, status: newStatus, updatedAt: new Date().toISOString() }));
    }
  };

  const handleDeleteReturn = (retId) => {
    if (!confirm('Are you sure you want to delete this return record?')) return;
    setReturns(prev => prev.filter(r => r.id !== retId));
    setViewModalOpen(false);
  };

  const filteredReturns = returns.filter(r => {
    const matchSearch = (r.no || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.invoice || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.customer || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const saleSearchResults = sales.filter(s => {
    if (!saleSearch) return false;
    const q = saleSearch.toLowerCase();
    const hay = `${s.invoice} ${s.customer} ${s.customerPhone || ''} ${s.orderNo || ''} ${(s.items || []).map(i => i.desc + ' ' + (i.sku || '')).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });

  const badgeClassForStatus = {
    pending: 'badge-warning',
    inspected: 'badge-accent',
    approved: 'badge-success',
    refund_processed: 'badge-success',
    completed: 'badge-success',
    rejected: 'badge-danger'
  };

  return (
    <div>
      <div className="page-head">
        <h1>Sales returns</h1>
        <p>Return authorization, inspection, restocking, and credit note registry.</p>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search return no, invoice or customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '260px' }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="inspected">Inspected</option>
          <option value="approved">Approved</option>
          <option value="refund_processed">Refund Processed</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={openNewReturnModal}>
          + New sales return
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Return No</th>
              <th>Date</th>
              <th>Orig Invoice</th>
              <th>Customer</th>
              <th>Reason</th>
              <th className="num">Refund Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.length > 0 ? (
              filteredReturns.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}><code>{r.no}</code></td>
                  <td>{r.date}</td>
                  <td><code>{r.invoice}</code></td>
                  <td>{r.customer}</td>
                  <td>{r.reason}</td>
                  <td className="num">{money(r.refundAmount)}</td>
                  <td>
                    <span className={`badge ${badgeClassForStatus[r.status] || 'badge-muted'}`}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        setSelectedReturn(r);
                        setViewModalOpen(true);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">
                  <div className="empty-state">No sales returns recorded yet.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NEW RETURN WIZARD MODAL */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '740px' }}>
            <h2>New Sales Return</h2>

            {step === 'search' && (
              <div>
                <div className="field">
                  <label>Step 1 &mdash; Find the original sale</label>
                  <input
                    type="text"
                    placeholder="Search by invoice (e.g. INV-2030), customer, phone, order no, SKU..."
                    value={saleSearch}
                    onChange={(e) => setSaleSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="table-wrap" style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '10px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th className="num">Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(saleSearch ? saleSearchResults : sales).map(s => (
                        <tr key={s.id}>
                          <td><code>{s.invoice}</code></td>
                          <td>{s.date}</td>
                          <td>{s.customer}</td>
                          <td className="num">{money(docTotal(s, vatRate))}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-sm btn-primary" onClick={() => handleSelectSale(s)}>
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                      {saleSearch && saleSearchResults.length === 0 && (
                        <tr><td colSpan="5" style={{ color: 'var(--muted-foreground)' }}>No sales match your query.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {step === 'form' && selectedSale && (
              <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
                <div className="card card-pad" style={{ background: 'var(--muted)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{selectedSale.invoice} &middot; {selectedSale.customer}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                        Date: {selectedSale.date} | Payment: {selectedSale.payment || selectedSale.pay} | Phone: {selectedSale.customerPhone || 'N/A'}
                      </div>
                    </div>
                    <button className="btn btn-sm" type="button" onClick={() => setStep('search')}>
                      Change sale
                    </button>
                  </div>
                </div>

                {/* Step 2: Return Type */}
                <div className="field">
                  <label>Step 2 &mdash; Return type</label>
                  <select value={returnType} onChange={(e) => setReturnType(e.target.value)}>
                    <option value="full">Full order return</option>
                    <option value="item">Item-based return</option>
                    <option value="quantity">Quantity-based return</option>
                    <option value="custom">Custom refund amount</option>
                  </select>
                </div>

                {/* Item / Quantity Table */}
                {(returnType === 'item' || returnType === 'quantity') && (
                  <div className="table-wrap" style={{ marginBottom: '14px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '32px' }}></th>
                          <th>Item</th>
                          <th>SKU</th>
                          <th className="num">Rate</th>
                          <th className="num">Bought</th>
                          <th className="num" style={{ width: '90px' }}>Return Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineSelections.map((line, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="checkbox"
                                checked={line.selected}
                                onChange={(e) => {
                                  const copy = [...lineSelections];
                                  copy[idx].selected = e.target.checked;
                                  setLineSelections(copy);
                                }}
                              />
                            </td>
                            <td>{line.desc}</td>
                            <td><code>{line.sku}</code></td>
                            <td className="num">{money(line.rate)}</td>
                            <td className="num">{line.bought}</td>
                            <td className="num">
                              <input
                                type="number"
                                min="1"
                                max={line.bought}
                                value={line.returnQty}
                                disabled={!line.selected}
                                onChange={(e) => {
                                  const copy = [...lineSelections];
                                  copy[idx].returnQty = Math.max(1, Math.min(line.bought, Number(e.target.value) || 1));
                                  setLineSelections(copy);
                                }}
                                style={{ width: '60px', height: '30px', textAlign: 'right' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {returnType === 'custom' && (
                  <div className="field">
                    <label>Custom refund amount (NPR, VAT inclusive)</label>
                    <input
                      type="number"
                      min="0"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                )}

                {/* Live Totals Box */}
                <div className="totals-box" style={{ marginBottom: '16px' }}>
                  <div><span>Original sale total</span><span>{money(originalSaleTotal)}</span></div>
                  <div><span>Already refunded</span><span>{money(alreadyRefunded)}</span></div>
                  <div><span>Refund net (excl. VAT)</span><span>{money(refundNet)}</span></div>
                  <div><span>Refund VAT (13%)</span><span>{money(refundVat)}</span></div>
                  <div className="grand"><span>Refund total</span><span>{money(calculatedRefundTotal)}</span></div>
                  <div><span>Remaining balance</span><span>{money(remainingBalance)}</span></div>
                </div>

                {/* Step 3: Reason & Restock */}
                <div className="form-grid-2">
                  <div className="field">
                    <label>Step 3 &mdash; Return reason</label>
                    <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
                      <option value="Wrong size / fit">Wrong size / fit</option>
                      <option value="Defective / damaged product">Defective / damaged product</option>
                      <option value="Not as pictured / described">Not as pictured / described</option>
                      <option value="Changed mind">Changed mind</option>
                      <option value="Delayed delivery">Delayed delivery</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Restock destination</label>
                    <select value={restockDest} onChange={(e) => setRestockDest(e.target.value)}>
                      <option value="available">Return to available stock</option>
                      <option value="damaged">Return to damaged stock</option>
                      <option value="inspection">Return to inspection stock</option>
                    </select>
                  </div>
                </div>

                {returnReason === 'Other' && (
                  <div className="field">
                    <label>Please describe the reason</label>
                    <textarea
                      rows="2"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Required when Other is selected"
                    />
                  </div>
                )}

                <div className="field">
                  <label>Internal notes (staff only)</label>
                  <textarea
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes on return condition or customer communication"
                  />
                </div>

                {/* Step 4: Supporting Documents */}
                <div className="field">
                  <label>Step 4 &mdash; Supporting documents / photos</label>
                  <div
                    style={{
                      border: '1px dashed var(--border)',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--canvas)'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icon name="camera" size={20} />
                    <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>Click to upload photos or receipts</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>JPG, PNG, WEBP up to 500KB</div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />

                  {attachments.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {attachments.map((att, i) => (
                        <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <img src={att.data} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(i)}
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              background: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              {step === 'form' && (
                <button className="btn btn-primary" onClick={handleSubmitReturn}>
                  Save return authorization
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW RETURN DETAILS MODAL */}
      {viewModalOpen && selectedReturn && (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Return {selectedReturn.no}</h2>
              <span className={`badge ${badgeClassForStatus[selectedReturn.status] || 'badge-muted'}`}>
                {selectedReturn.status?.replace('_', ' ')}
              </span>
            </div>

            <div style={{ fontSize: '13px', lineHeight: '1.6', marginTop: '14px' }}>
              <div className="form-grid-2" style={{ marginBottom: '14px' }}>
                <div><strong>Original Invoice:</strong> <code>{selectedReturn.invoice}</code></div>
                <div><strong>Customer:</strong> {selectedReturn.customer}</div>
                <div><strong>Return Date:</strong> {selectedReturn.date}</div>
                <div><strong>Restock Destination:</strong> {selectedReturn.restockDest}</div>
                <div><strong>Reason:</strong> {selectedReturn.reason}</div>
                <div><strong>Type:</strong> {selectedReturn.type}</div>
              </div>

              <div className="totals-box" style={{ marginBottom: '14px' }}>
                <div><span>Refund Net:</span><span>{money(selectedReturn.refundNet)}</span></div>
                <div><span>Refund VAT (13%):</span><span>{money(selectedReturn.refundVat)}</span></div>
                <div className="grand"><span>Total Refund:</span><span>{money(selectedReturn.refundAmount)}</span></div>
              </div>

              {selectedReturn.notes && (
                <div style={{ background: 'var(--muted)', padding: '10px', borderRadius: '8px', marginBottom: '14px' }}>
                  <strong>Notes:</strong> {selectedReturn.notes}
                </div>
              )}

              {selectedReturn.attachments && selectedReturn.attachments.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <strong>Attachments:</strong>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {selectedReturn.attachments.map((att, i) => (
                      <a key={i} href={att.data} target="_blank" rel="noreferrer">
                        <img src={att.data} alt={att.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Workflow Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '20px' }}>
              {selectedReturn.status === 'pending' && (
                <button className="btn btn-sm" onClick={() => updateReturnStatus(selectedReturn.id, 'inspected')}>
                  Mark as Inspected
                </button>
              )}
              {(selectedReturn.status === 'pending' || selectedReturn.status === 'inspected') && (
                <button className="btn btn-sm btn-primary" onClick={() => updateReturnStatus(selectedReturn.id, 'approved')}>
                  Approve Return
                </button>
              )}
              {selectedReturn.status === 'approved' && (
                <button className="btn btn-sm btn-primary" onClick={() => updateReturnStatus(selectedReturn.id, 'refund_processed')}>
                  Process Refund
                </button>
              )}
              {selectedReturn.status === 'refund_processed' && (
                <button className="btn btn-sm btn-primary" onClick={() => updateReturnStatus(selectedReturn.id, 'completed')}>
                  Complete
                </button>
              )}
              {selectedReturn.status !== 'rejected' && selectedReturn.status !== 'completed' && (
                <button className="btn btn-sm btn-danger" onClick={() => updateReturnStatus(selectedReturn.id, 'rejected')}>
                  Reject
                </button>
              )}
              <button className="btn btn-sm" onClick={() => window.print()}>Print Credit Note</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteReturn(selectedReturn.id)}>Delete</button>
              <button className="btn btn-sm" onClick={() => setViewModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
