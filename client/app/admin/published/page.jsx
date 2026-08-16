'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, saveDB, money } from '../../../services/dataStore';

export default function AdminPublishedPage() {
  const [mounted, setMounted] = useState(false);
  const [db, setDb] = useState(null);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState([]);

  const refreshData = () => {
    const loaded = loadDB();
    if (!loaded.inventory) loaded.inventory = [];
    if (!loaded.warehouses) loaded.warehouses = [{ id: 'w1', name: 'Kathmandu DC' }, { id: 'w2', name: 'Pokhara Store' }];
    setDb(loaded);
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  if (!db || !mounted) {
    return (
      <div>
        <div className="page-head">
          <h1>Published inventory</h1>
          <p>Loading published inventory...</p>
        </div>
      </div>
    );
  }

  const warehouses = db.warehouses || [{ id: 'w1', name: 'Kathmandu DC' }, { id: 'w2', name: 'Pokhara Store' }];
  const products = db.products || [];
  const variants = db.variants || [];
  const inventoryList = db.inventory || [];

  const masterById = (id) => products.find(p => p.id === id);
  const warehouseById = (id) => warehouses.find(w => w.id === id) || { name: 'Kathmandu DC' };

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

  const toDisplayPrice = (val) => {
    const n = Number(val) || 0;
    return n >= 10000 ? Math.round(n / 100) : n;
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
    const entered = Number(newPrice) || 0;
    const valInPaisa = entered < 10000 ? entered * 100 : entered;
    v.price = (m && valInPaisa === m.price) ? null : valInPaisa;
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
      setSelectedVariantIds(filtered.map(x => x.v.id + '_' + (x.r ? x.r.id : 'none')));
    } else {
      setSelectedVariantIds([]);
    }
  };

  const toggleSelect = (rowKey) => {
    if (selectedVariantIds.includes(rowKey)) {
      setSelectedVariantIds(selectedVariantIds.filter(i => i !== rowKey));
    } else {
      setSelectedVariantIds([...selectedVariantIds, rowKey]);
    }
  };

  const handleBulkAction = (action) => {
    if (!selectedVariantIds.length) return;
    if (action === 'price') {
      const valStr = prompt(`Set price for selected variant(s), in NPR:`);
      if (valStr === null) return;
      const val = Number(valStr) || 0;
      const valInPaisa = val < 10000 ? val * 100 : val;
      db.variants.forEach(v => {
        if (selectedVariantIds.some(key => key.startsWith(v.id))) v.price = valInPaisa;
      });
    } else if (action === 'stock') {
      const valStr = prompt(`Set available stock for selected variant(s):`);
      if (valStr === null) return;
      const q = Number(valStr) || 0;
      db.inventory.forEach(r => {
        if (selectedVariantIds.some(key => key.endsWith('_' + r.id))) {
          const b = r.available;
          r.available = q;
          if (b !== q && db.stockMoves) {
            db.stockMoves.push({
              id: 'mv_' + Date.now().toString(36),
              date: new Date().toISOString().slice(0, 10),
              variantId: r.variantId,
              warehouseId: r.warehouseId,
              type: 'correction',
              change: q - b,
              reason: 'Bulk stock update',
              reference: '',
              before: b,
              after: q,
              user: 'Zylo Super Admin',
              at: new Date().toISOString()
            });
          }
        }
      });
    } else if (action === 'unpublish') {
      db.variants.forEach(v => {
        if (selectedVariantIds.some(key => key.startsWith(v.id))) v.published = false;
      });
    }
    saveDB(db);
    setSelectedVariantIds([]);
    refreshData();
  };

  const exportCsv = () => {
    const headers = ['Product', 'Variant', 'SKU', 'Warehouse', 'Price (NPR)', 'Stock', 'Status', 'Published'];
    const rows = filtered.map(x => {
      const w = x.r ? warehouseById(x.r.warehouseId) : null;
      return [
        `"${x.m.name}"`,
        `"${getVariantLabel(x.v)}"`,
        x.v.sku,
        `"${w ? w.name : 'no record'}"`,
        toDisplayPrice(getVariantPrice(x.v)),
        x.r ? x.r.available : 0,
        stockState(x.r),
        x.r && x.r.available <= 0 ? 'Out of stock' : 'Active'
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
        <h1>Published inventory</h1>
        <p>Every published sellable variant. Edit price and stock inline.</p>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search product or SKU"
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
              <th style={{ width: '90px', textAlign: 'center' }}>Price</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Stock</th>
              <th>Status</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((x, idx) => {
                const rowKey = x.v.id + '_' + (x.r ? x.r.id : 'none_' + idx);
                const w = x.r ? warehouseById(x.r.warehouseId) : null;
                const st = stockState(x.r);
                const displayPrice = toDisplayPrice(getVariantPrice(x.v));
                const isOutOfStock = x.r && x.r.available <= 0;

                return (
                  <tr key={rowKey}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedVariantIds.includes(rowKey)}
                        onChange={() => toggleSelect(rowKey)}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>{x.m.name}</td>
                    <td style={{ color: 'var(--muted-foreground)' }}>{getVariantLabel(x.v)}</td>
                    <td style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>{x.v.sku}</td>
                    <td>{w ? w.name : <span style={{ color: 'var(--muted-foreground)' }}>no record</span>}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        defaultValue={displayPrice}
                        onBlur={(e) => handleInlinePriceChange(x.v.id, e.target.value)}
                        style={{
                          height: '28px',
                          width: '72px',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: 500,
                          padding: '0 4px',
                          background: '#ffffff',
                          color: '#000000',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          outline: 'none'
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {x.r ? (
                        <input
                          type="number"
                          defaultValue={x.r.available}
                          onBlur={(e) => handleInlineStockChange(x.r.id, e.target.value)}
                          style={{
                            height: '28px',
                            width: '60px',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: 500,
                            padding: '0 4px',
                            background: '#ffffff',
                            color: '#000000',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      ) : (
                        <span style={{ color: 'var(--muted-foreground)' }}>-</span>
                      )}
                    </td>
                    <td>{STOCK_BADGES[st]}</td>
                    <td>
                      {isOutOfStock ? (
                        <span style={{ color: '#d97706', fontSize: '12px', fontWeight: 500 }}>
                          Out of stock
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 500 }}>
                          Active
                        </span>
                      )}
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


