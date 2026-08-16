'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, saveDB, money } from '../../../services/dataStore';

export default function AdminPublishedPage() {
  const [db, setDb] = useState(null);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState([]);

  const refreshData = () => {
    const loaded = loadDB();
    if (!loaded.inventory) loaded.inventory = [];
    if (!loaded.warehouses) loaded.warehouses = [{ id: 'w1', name: 'Main Warehouse' }];
    setDb(loaded);
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!db) return <div>Loading published inventory...</div>;

  const warehouses = db.warehouses || [{ id: 'w1', name: 'Main Warehouse' }];
  const products = db.products || [];
  const variants = db.variants || [];
  const inventoryList = db.inventory || [];

  const masterById = (id) => products.find(p => p.id === id);
  const warehouseById = (id) => warehouses.find(w => w.id === id) || { name: 'Main Warehouse' };

  const getVariantLabel = (v) => {
    if (!v || !v.options) return 'Default';
    const parts = Object.keys(v.options).map(k => v.options[k]);
    return parts.join(' / ') || 'Default';
  };

  const getVariantPrice = (v) => {
    if (v.price != null && v.price !== '') return Number(v.price);
    const m = masterById(v.productId);
    return m ? m.price : 0;
  };

  const stockState = (invRecord) => {
    if (!invRecord || invRecord.available <= 0) return 'out';
    if (invRecord.reorderLevel && invRecord.available <= invRecord.reorderLevel) return 'low';
    return 'ok';
  };

  const STOCK_BADGES = {
    ok: <span className="badge badge-success">in stock</span>,
    low: <span className="badge badge-warning">low stock</span>,
    out: <span className="badge badge-danger">out of stock</span>
  };

  const VARIANT_STATUS_BADGE = {
    active: 'badge-success',
    published: 'badge-success',
    draft: 'badge-muted',
    hidden: 'badge-muted',
    out_of_stock: 'badge-warning',
    discontinued: 'badge-danger',
    archived: 'badge-danger'
  };

  // Published variant rows
  const allPublishedRows = [];
  variants.forEach(v => {
    if (!v.published) return;
    const m = masterById(v.productId);
    if (!m || m.status === 'archived') return;
    const recs = inventoryList.filter(r => r.variantId === v.id && !r.archived);
    if (!recs.length) {
      allPublishedRows.push({ v, m, r: null });
    } else {
      recs.forEach(r => allPublishedRows.push({ v, m, r }));
    }
  });

  const filtered = allPublishedRows.filter(x => {
    if (warehouseFilter && (!x.r || x.r.warehouseId !== warehouseFilter)) return false;
    if (search) {
      const hay = (x.m.name + ' ' + getVariantLabel(x.v) + ' ' + x.v.sku).toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const handleInlinePriceChange = (variantId, newPrice) => {
    const v = variants.find(x => x.id === variantId);
    if (!v) return;
    const m = masterById(v.productId);
    const val = Number(newPrice) || 0;
    v.price = (m && val === m.price) ? null : val;
    saveDB(db);
    refreshData();
  };

  const handleInlineStockChange = (invId, newStock) => {
    const r = db.inventory.find(x => x.id === invId);
    if (!r) return;
    const before = r.available;
    const after = Number(newStock) || 0;
    r.available = after;
    if (!db.stockMoves) db.stockMoves = [];
    db.stockMoves.push({
      id: 'mv_' + Date.now().toString(36),
      date: new Date().toISOString().slice(0, 10),
      variantId: r.variantId,
      warehouseId: r.warehouseId,
      type: 'correction',
      change: after - before,
      reason: 'Inline edit on published stock',
      reference: '',
      before,
      after,
      user: 'Zylo Super Admin',
      at: new Date().toISOString()
    });
    saveDB(db);
    refreshData();
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedVariantIds(filtered.map(x => x.v.id));
    } else {
      setSelectedVariantIds([]);
    }
  };

  const toggleSelect = (id) => {
    if (selectedVariantIds.includes(id)) {
      setSelectedVariantIds(selectedVariantIds.filter(i => i !== id));
    } else {
      setSelectedVariantIds([...selectedVariantIds, id]);
    }
  };

  const handleBulkAction = (action) => {
    if (!selectedVariantIds.length) return;
    if (action === 'price') {
      const valStr = prompt(`Set price for ${selectedVariantIds.length} variant(s), in NPR Paisa:`);
      if (valStr === null) return;
      const val = Number(valStr) || 0;
      db.variants.forEach(v => {
        if (selectedVariantIds.includes(v.id)) v.price = val;
      });
    } else if (action === 'stock') {
      const valStr = prompt(`Set available stock for ${selectedVariantIds.length} variant(s):`);
      if (valStr === null) return;
      const q = Number(valStr) || 0;
      selectedVariantIds.forEach(id => {
        db.inventory.filter(r => r.variantId === id).forEach(r => {
          r.available = q;
        });
      });
    } else if (action === 'unpublish') {
      db.variants.forEach(v => {
        if (selectedVariantIds.includes(v.id)) v.published = false;
      });
    }
    saveDB(db);
    setSelectedVariantIds([]);
    refreshData();
  };

  const exportCsv = () => {
    const headers = ['Product', 'Variant', 'SKU', 'Warehouse', 'Price', 'Stock', 'Stock Status', 'Variant Status'];
    const rows = filtered.map(x => {
      const w = x.r ? warehouseById(x.r.warehouseId) : null;
      return [
        `"${x.m.name}"`, `"${getVariantLabel(x.v)}"`, x.v.sku, `"${w ? w.name : 'no record'}"`,
        getVariantPrice(x.v), x.r ? x.r.available : 0, stockState(x.r), x.v.status
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'zylo-published-inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Published stock</h1>
        <p>Operational sell-side inventory live on the storefront. Edit prices and stock inline.</p>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search product, variant or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '250px' }}
        />
        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
          <option value="">All warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
      </div>

      {selectedVariantIds.length > 0 && (
        <div className="bulk-bar show">
          <span>{selectedVariantIds.length} selected</span>
          <div className="spacer" />
          <button onClick={() => handleBulkAction('price')}>Bulk Set Price</button>
          <button onClick={() => handleBulkAction('stock')}>Bulk Set Stock</button>
          <button onClick={() => handleBulkAction('unpublish')}>Unpublish</button>
        </div>
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: '32px' }}>
                <input
                  type="checkbox"
                  checked={selectedVariantIds.length === filtered.length && filtered.length > 0}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>
              <th>Product</th>
              <th>Variant</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th className="num" style={{ width: '110px' }}>Price</th>
              <th className="num" style={{ width: '90px' }}>Stock</th>
              <th>Stock Status</th>
              <th>Variant Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((x, idx) => {
                const w = x.r ? warehouseById(x.r.warehouseId) : null;
                const st = stockState(x.r);
                return (
                  <tr key={x.v.id + '_' + (x.r ? x.r.id : idx)}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedVariantIds.includes(x.v.id)}
                        onChange={() => toggleSelect(x.v.id)}
                      />
                    </td>
                    <td><strong>{x.m.name}</strong></td>
                    <td style={{ color: 'var(--muted-foreground)' }}>{getVariantLabel(x.v)}</td>
                    <td style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}><code>{x.v.sku}</code></td>
                    <td>{w ? w.name : <span style={{ color: 'var(--muted-foreground)' }}>no record</span>}</td>
                    <td className="num">
                      <input
                        type="number"
                        defaultValue={getVariantPrice(x.v)}
                        onBlur={(e) => handleInlinePriceChange(x.v.id, e.target.value)}
                        style={{ height: '28px', width: '92px', textAlign: 'right', fontSize: '12px', padding: '0 6px', border: '1px solid var(--border)', borderRadius: '6px' }}
                      />
                    </td>
                    <td className="num">
                      {x.r ? (
                        <input
                          type="number"
                          defaultValue={x.r.available}
                          onBlur={(e) => handleInlineStockChange(x.r.id, e.target.value)}
                          style={{ height: '28px', width: '78px', textAlign: 'right', fontSize: '12px', padding: '0 6px', border: '1px solid var(--border)', borderRadius: '6px' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--muted-foreground)' }}>-</span>
                      )}
                    </td>
                    <td>{STOCK_BADGES[st]}</td>
                    <td>
                      <span className={`badge ${VARIANT_STATUS_BADGE[x.v.status] || 'badge-muted'}`}>
                        {x.v.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9"><div className="empty-state">No published variants match filter.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

