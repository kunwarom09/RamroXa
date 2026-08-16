'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, saveDB, money } from '../../../services/dataStore';
import Icon from '../../../components/admin/Icons';

export default function AdminInventoryPage() {
  const [db, setDb] = useState(null);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);

  // Modal data
  const [selectedInv, setSelectedInv] = useState(null);
  const [invFormData, setInvFormData] = useState({
    variantId: '', warehouseId: 'w1', available: 0, reserved: 0,
    incoming: 0, damaged: 0, returned: 0, reorderLevel: 5, minStock: 0, maxStock: 0
  });

  const [adjMode, setAdjMode] = useState('increase');
  const [adjQty, setAdjQty] = useState(1);
  const [adjReason, setAdjReason] = useState('');
  const [adjRef, setAdjRef] = useState('');

  const [trfTo, setTrfTo] = useState('');
  const [trfQty, setTrfQty] = useState(1);
  const [trfReason, setTrfReason] = useState('');

  const refreshData = () => {
    const loaded = loadDB();
    if (!loaded.inventory) loaded.inventory = [];
    if (!loaded.warehouses) loaded.warehouses = [{ id: 'w1', name: 'Main Warehouse' }, { id: 'w2', name: 'Secondary Store' }];
    if (!loaded.stockMoves) loaded.stockMoves = [];
    setDb(loaded);
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!db) return <div>Loading inventory...</div>;

  const warehouses = db.warehouses || [{ id: 'w1', name: 'Main Warehouse' }];
  const products = db.products || [];
  const variants = db.variants || [];
  const inventoryList = db.inventory || [];
  const stockMoves = db.stockMoves || [];

  const masterById = (id) => products.find(p => p.id === id);
  const variantById = (id) => variants.find(v => v.id === id);
  const warehouseById = (id) => warehouses.find(w => w.id === id) || { name: id };

  const getVariantLabel = (v) => {
    if (!v) return 'Default';
    const parts = Object.keys(v.options || {}).map(k => v.options[k]);
    return parts.join(' / ') || 'Default';
  };

  const stockState = (r) => {
    if (r.available <= 0) return 'out';
    if (r.reorderLevel && r.available <= r.reorderLevel) return 'low';
    return 'ok';
  };

  const STOCK_BADGES = {
    ok: <span className="badge badge-success">in stock</span>,
    low: <span className="badge badge-warning">low stock</span>,
    out: <span className="badge badge-danger">out of stock</span>
  };

  const enrichedRows = inventoryList.filter(r => !r.archived).map(r => {
    const v = variantById(r.variantId);
    const m = v ? masterById(v.productId) : null;
    const w = warehouseById(r.warehouseId);
    return { ...r, v, m, w, state: stockState(r) };
  }).filter(x => x.v && x.m);

  const filtered = enrichedRows.filter(x => {
    if (warehouseFilter && x.warehouseId !== warehouseFilter) return false;
    if (statusFilter && x.state !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = (x.m.name + ' ' + getVariantLabel(x.v) + ' ' + x.v.sku).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totalUnits = filtered.reduce((n, r) => n + (r.available || 0), 0);
  const lowStockCount = filtered.filter(r => r.state === 'low').length;
  const outOfStockCount = filtered.filter(r => r.state === 'out').length;

  const logMove = (inv, type, change, reason, reference, before, after) => {
    db.stockMoves.push({
      id: 'mv_' + Date.now().toString(36),
      date: new Date().toISOString().slice(0, 10),
      variantId: inv.variantId,
      warehouseId: inv.warehouseId,
      type, change, reason: reason || '', reference: reference || '',
      before, after, user: 'Zylo Super Admin', at: new Date().toISOString()
    });
  };

  // Open Add/Edit Inventory
  const openInvRecord = (rec) => {
    setSelectedInv(rec);
    if (rec) {
      setInvFormData({
        variantId: rec.variantId,
        warehouseId: rec.warehouseId,
        available: rec.available || 0,
        reserved: rec.reserved || 0,
        incoming: rec.incoming || 0,
        damaged: rec.damaged || 0,
        returned: rec.returned || 0,
        reorderLevel: rec.reorderLevel || 5,
        minStock: rec.minStock || 0,
        maxStock: rec.maxStock || 0
      });
    } else {
      setInvFormData({
        variantId: variants[0]?.id || '',
        warehouseId: warehouses[0]?.id || 'w1',
        available: 0, reserved: 0, incoming: 0, damaged: 0, returned: 0,
        reorderLevel: 5, minStock: 0, maxStock: 0
      });
    }
    setInvModalOpen(true);
  };

  const saveInvRecord = (e) => {
    e.preventDefault();
    if (selectedInv) {
      const idx = db.inventory.findIndex(r => r.id === selectedInv.id);
      if (idx >= 0) {
        const before = db.inventory[idx].available;
        db.inventory[idx] = { ...db.inventory[idx], ...invFormData };
        if (before !== invFormData.available) {
          logMove(db.inventory[idx], 'correction', invFormData.available - before, 'Edited via form', '', before, invFormData.available);
        }
      }
    } else {
      const existing = db.inventory.find(r => r.variantId === invFormData.variantId && r.warehouseId === invFormData.warehouseId);
      if (existing) {
        alert('This variant already has a record in the selected warehouse.');
        return;
      }
      const newRec = {
        id: 'inv_' + Date.now().toString(36),
        ...invFormData
      };
      db.inventory.push(newRec);
      if (newRec.available > 0) {
        logMove(newRec, 'opening', newRec.available, 'Opening balance', '', 0, newRec.available);
      }
    }
    saveDB(db);
    setInvModalOpen(false);
    refreshData();
  };

  // Adjust stock
  const openAdjust = (rec) => {
    setSelectedInv(rec);
    setAdjMode('increase');
    setAdjQty(1);
    setAdjReason('');
    setAdjRef('');
    setAdjustModalOpen(true);
  };

  const applyAdjust = (e) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      alert('Please enter a reason for stock adjustment.');
      return;
    }
    const idx = db.inventory.findIndex(r => r.id === selectedInv.id);
    if (idx < 0) return;
    const inv = db.inventory[idx];
    const before = inv.available;
    let after = before;
    if (adjMode === 'increase') after = before + adjQty;
    else if (adjMode === 'decrease') after = before - adjQty;
    else after = adjQty;

    if (after < 0) {
      alert('Adjustment cannot result in negative stock.');
      return;
    }
    inv.available = after;
    logMove(inv, adjMode, after - before, adjReason, adjRef, before, after);
    saveDB(db);
    setAdjustModalOpen(false);
    refreshData();
  };

  // Transfer stock
  const openTransfer = (rec) => {
    setSelectedInv(rec);
    const otherWh = warehouses.find(w => w.id !== rec.warehouseId);
    setTrfTo(otherWh ? otherWh.id : '');
    setTrfQty(1);
    setTrfReason('');
    setTransferModalOpen(true);
  };

  const applyTransfer = (e) => {
    e.preventDefault();
    if (trfQty <= 0) { alert('Enter valid transfer quantity.'); return; }
    if (trfQty > selectedInv.available) { alert(`Only ${selectedInv.available} available at source.`); return; }
    if (!trfTo || trfTo === selectedInv.warehouseId) { alert('Select a different destination warehouse.'); return; }

    const fromIdx = db.inventory.findIndex(r => r.id === selectedInv.id);
    if (fromIdx < 0) return;
    const fromInv = db.inventory[fromIdx];

    let toInv = db.inventory.find(r => r.variantId === fromInv.variantId && r.warehouseId === trfTo);
    if (!toInv) {
      toInv = {
        id: 'inv_' + Date.now().toString(36),
        variantId: fromInv.variantId,
        warehouseId: trfTo,
        available: 0, reserved: 0, incoming: 0, damaged: 0, returned: 0,
        reorderLevel: fromInv.reorderLevel, minStock: fromInv.minStock, maxStock: fromInv.maxStock
      };
      db.inventory.push(toInv);
    }

    const fb = fromInv.available;
    const tb = toInv.available;
    fromInv.available -= trfQty;
    toInv.available += trfQty;

    const ref = 'TRF-' + Date.now().toString(36).toUpperCase();
    logMove(fromInv, 'transfer_out', -trfQty, trfReason || `Transfer to ${warehouseById(trfTo).name}`, ref, fb, fromInv.available);
    logMove(toInv, 'transfer_in', trfQty, trfReason || `Transfer from ${warehouseById(fromInv.warehouseId).name}`, ref, tb, toInv.available);

    saveDB(db);
    setTransferModalOpen(false);
    refreshData();
  };

  const openHistory = (rec) => {
    setSelectedInv(rec);
    setHistoryModalOpen(true);
  };

  const openLabel = (rec) => {
    setSelectedInv(rec);
    setLabelModalOpen(true);
  };

  const handleDeleteInv = (rec) => {
    if (!confirm(`Delete inventory record for ${rec.m.name} - ${getVariantLabel(rec.v)} at ${rec.w.name}?`)) return;
    db.inventory = db.inventory.filter(r => r.id !== rec.id);
    logMove(rec, 'deleted', -rec.available, 'Inventory record deleted', '', rec.available, 0);
    saveDB(db);
    refreshData();
  };

  const exportCsv = () => {
    const headers = ['Product', 'Variant', 'SKU', 'Warehouse', 'Available', 'Reserved', 'Incoming', 'Damaged', 'Returned', 'Reorder Level', 'Status'];
    const rows = filtered.map(r => [
      `"${r.m.name}"`, `"${getVariantLabel(r.v)}"`, r.v.sku, `"${r.w.name}"`,
      r.available, r.reserved, r.incoming, r.damaged, r.returned, r.reorderLevel, r.state
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'zylo-inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Inventory</h1>
        <p>Variant-level stock across warehouses.</p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="label">Stock records</div>
          <div className="value">{filtered.length}</div>
        </div>
        <div className="metric">
          <div className="label">Units available</div>
          <div className="value">{totalUnits.toLocaleString('en-IN')}</div>
        </div>
        <div className="metric">
          <div className="label">Low stock</div>
          <div className="value">{lowStockCount}</div>
        </div>
        <div className="metric">
          <div className="label">Out of stock</div>
          <div className="value">{outOfStockCount}</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search product, variant or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '240px' }}
        />
        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
          <option value="">All warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All stock states</option>
          <option value="ok">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        <button className="btn btn-primary" onClick={() => openInvRecord(null)}>+ Add record</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th className="num">Available</th>
              <th className="num">Reserved</th>
              <th className="num">Incoming</th>
              <th className="num">Damaged</th>
              <th className="num">Returned</th>
              <th className="num">Reorder</th>
              <th>Status</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.m.name}</strong></td>
                  <td style={{ color: 'var(--muted-foreground)' }}>{getVariantLabel(r.v)}</td>
                  <td style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}><code>{r.v.sku}</code></td>
                  <td>{r.w.name}</td>
                  <td className="num" style={{ fontWeight: 500 }}>{r.available}</td>
                  <td className="num">{r.reserved || ''}</td>
                  <td className="num">{r.incoming || ''}</td>
                  <td className="num">{r.damaged || ''}</td>
                  <td className="num">{r.returned || ''}</td>
                  <td className="num" style={{ color: 'var(--muted-foreground)' }}>{r.reorderLevel}</td>
                  <td>{STOCK_BADGES[r.state]}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" title="Adjust stock" onClick={() => openAdjust(r)}><Icon name="edit" size={14} /></button>
                    <button className="icon-btn" title="Transfer stock" onClick={() => openTransfer(r)}><Icon name="arrowDown" size={14} /></button>
                    <button className="icon-btn" title="Stock history" onClick={() => openHistory(r)}><Icon name="reports" size={14} /></button>
                    <button className="icon-btn" title="Barcode / QR" onClick={() => openLabel(r)}><Icon name="products" size={14} /></button>
                    <button className="icon-btn" title="Delete" onClick={() => handleDeleteInv(r)}><Icon name="trash" size={14} /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12"><div className="empty-state">No inventory records match.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT INVENTORY MODAL */}
      {invModalOpen && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setInvModalOpen(false); }}>
          <div className="modal">
            <h2>{selectedInv ? 'Edit Inventory Record' : 'Add Inventory Record'}</h2>
            <form onSubmit={saveInvRecord}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Variant</label>
                  <select
                    value={invFormData.variantId}
                    onChange={(e) => setInvFormData({ ...invFormData, variantId: e.target.value })}
                    disabled={!!selectedInv}
                    required
                  >
                    {variants.map(v => {
                      const m = masterById(v.productId);
                      return (
                        <option key={v.id} value={v.id}>
                          {(m ? m.name : '?') + ' - ' + getVariantLabel(v) + ' (' + v.sku + ')'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="field">
                  <label>Warehouse</label>
                  <select
                    value={invFormData.warehouseId}
                    onChange={(e) => setInvFormData({ ...invFormData, warehouseId: e.target.value })}
                    disabled={!!selectedInv}
                    required
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Available Qty</label>
                  <input
                    type="number"
                    value={invFormData.available}
                    onChange={(e) => setInvFormData({ ...invFormData, available: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Reserved Qty</label>
                  <input
                    type="number"
                    value={invFormData.reserved}
                    onChange={(e) => setInvFormData({ ...invFormData, reserved: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Incoming Qty</label>
                  <input
                    type="number"
                    value={invFormData.incoming}
                    onChange={(e) => setInvFormData({ ...invFormData, incoming: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Damaged Qty</label>
                  <input
                    type="number"
                    value={invFormData.damaged}
                    onChange={(e) => setInvFormData({ ...invFormData, damaged: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    value={invFormData.reorderLevel}
                    onChange={(e) => setInvFormData({ ...invFormData, reorderLevel: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn" onClick={() => setInvModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {adjustModalOpen && selectedInv && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setAdjustModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <h2>Adjust Stock</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '14px' }}>
              {selectedInv.m.name} &middot; {getVariantLabel(selectedInv.v)} at {selectedInv.w.name} &mdash; {selectedInv.available} currently available.
            </p>
            <form onSubmit={applyAdjust}>
              <div className="field">
                <label>Mode</label>
                <select value={adjMode} onChange={(e) => setAdjMode(e.target.value)}>
                  <option value="increase">Increase (+)</option>
                  <option value="decrease">Decrease (-)</option>
                  <option value="replace">Set Absolute Quantity (=)</option>
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={adjQty}
                  onChange={(e) => setAdjQty(Number(e.target.value))}
                  required
                />
              </div>
              <div className="field">
                <label>Reason (recorded on stock ledger)</label>
                <input
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Stock count discrepancy, damages..."
                  required
                />
              </div>
              <div className="field">
                <label>Reference No. (optional)</label>
                <input
                  value={adjRef}
                  onChange={(e) => setAdjRef(e.target.value)}
                  placeholder="PO-1029 / ADJ-001"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn" onClick={() => setAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Apply adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER STOCK MODAL */}
      {transferModalOpen && selectedInv && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setTransferModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <h2>Transfer Stock</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '14px' }}>
              {selectedInv.m.name} &middot; {getVariantLabel(selectedInv.v)} &mdash; {selectedInv.available} available at {selectedInv.w.name}.
            </p>
            <form onSubmit={applyTransfer}>
              <div className="field">
                <label>Destination Warehouse</label>
                <select value={trfTo} onChange={(e) => setTrfTo(e.target.value)} required>
                  {warehouses.filter(w => w.id !== selectedInv.warehouseId).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantity to Transfer</label>
                <input
                  type="number"
                  min="1"
                  max={selectedInv.available}
                  value={trfQty}
                  onChange={(e) => setTrfQty(Number(e.target.value))}
                  required
                />
              </div>
              <div className="field">
                <label>Transfer Reason</label>
                <input
                  value={trfReason}
                  onChange={(e) => setTrfReason(e.target.value)}
                  placeholder="e.g. Store replenishment"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn" onClick={() => setTransferModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Execute transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyModalOpen && selectedInv && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setHistoryModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '680px' }}>
            <h2>Stock History & Ledger</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '14px' }}>
              {selectedInv.m.name} &middot; {getVariantLabel(selectedInv.v)} at {selectedInv.w.name}
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Ref</th>
                    <th className="num">Change</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMoves.filter(m => m.variantId === selectedInv.variantId && m.warehouseId === selectedInv.warehouseId).length > 0 ? (
                    stockMoves
                      .filter(m => m.variantId === selectedInv.variantId && m.warehouseId === selectedInv.warehouseId)
                      .sort((a, b) => b.at.localeCompare(a.at))
                      .map((m, idx) => (
                        <tr key={idx}>
                          <td>{m.date}</td>
                          <td><span className="badge badge-accent">{m.type.replace(/_/g, ' ')}</span></td>
                          <td style={{ color: 'var(--muted-foreground)' }}>{m.reason || '-'}</td>
                          <td style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}><code>{m.reference || '-'}</code></td>
                          <td className="num" style={{ color: m.change < 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {m.change > 0 ? '+' : ''}{m.change}
                          </td>
                          <td className="num">{m.after}</td>
                        </tr>
                      ))
                  ) : (
                    <tr><td colSpan="6"><div className="empty-state">No movement log for this item.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn" onClick={() => setHistoryModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* LABEL / BARCODE MODAL */}
      {labelModalOpen && selectedInv && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setLabelModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '360px', textAlign: 'center' }}>
            <h2>Barcode Label</h2>
            <div style={{ padding: '16px', background: '#fff', color: '#000', borderRadius: '10px', margin: '14px 0', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedInv.m.name}</div>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
                {getVariantLabel(selectedInv.v)} &middot; {selectedInv.w.name}
              </div>
              <div style={{ letterSpacing: '4px', fontSize: '24px', fontFamily: 'monospace', margin: '12px 0' }}>
                |||| | ||||| || |
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', letterSpacing: '1px' }}>{selectedInv.v.sku}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>{money(selectedInv.v.price || selectedInv.m.price)}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => window.print()}>Print label</button>
              <button className="btn" onClick={() => setLabelModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

