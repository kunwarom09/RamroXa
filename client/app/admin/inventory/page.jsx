'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { money } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

export default function AdminInventoryPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([
    { id: 'w1', name: 'Kathmandu DC' },
    { id: 'w2', name: 'Pokhara Store' }
  ]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [stockMoves, setStockMoves] = useState([]);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [publishFilter, setPublishFilter] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Active Action Menu state
  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const menuRef = useRef(null);

  // Modals state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [purchasesModalOpen, setPurchasesModalOpen] = useState(false);
  const [returnsModalOpen, setReturnsModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Target item for modals
  const [activeItem, setActiveItem] = useState(null);
  const [variantTransactions, setVariantTransactions] = useState({ sales: [], purchases: [], returns: [], ledger: [] });
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Adjustment Form
  const [adjMode, setAdjMode] = useState('increase'); // 'increase', 'decrease', 'replace'
  const [adjQty, setAdjQty] = useState(1);
  const [adjReason, setAdjReason] = useState('Stock correction');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjRef, setAdjRef] = useState('');
  const [adjWarehouse, setAdjWarehouse] = useState('w1');

  // Price Form
  const [editPriceVal, setEditPriceVal] = useState(0);

  // Transfer Form
  const [trfTo, setTrfTo] = useState('');
  const [trfQty, setTrfQty] = useState(1);
  const [trfReason, setTrfReason] = useState('Warehouse stock rebalance');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Close action menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuRowId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [invRes, prodRes, moveRes] = await Promise.allSettled([
        api.get('/api/admin/inventory'),
        api.get('/api/admin/products'),
        api.get('/api/admin/inventory/moves')
      ]);

      let rawInv = [];
      if (invRes.status === 'fulfilled') {
        rawInv = invRes.value.data?.inventory || invRes.value.data || [];
      }

      let rawProds = [];
      let extractedVars = [];
      if (prodRes.status === 'fulfilled') {
        rawProds = prodRes.value.data?.products || prodRes.value.data || [];
        rawProds.forEach((p) => {
          const pId = p.id || String(p._id);
          if (p.allVariants && p.allVariants.length) {
            extractedVars = [...extractedVars, ...p.allVariants.map(v => ({ ...v, productId: pId }))];
          } else if (p.variants && p.variants.length) {
            p.variants.forEach(v => {
              extractedVars.push({ ...v, productId: pId });
              if (v.subVariants && v.subVariants.length) {
                v.subVariants.forEach(sv => {
                  extractedVars.push({ ...sv, productId: pId, parentVariant: v });
                });
              }
            });
          }
        });
      }

      let rawMoves = [];
      if (moveRes.status === 'fulfilled') {
        rawMoves = moveRes.value.data?.moves || moveRes.value.data || [];
      }

      setInventoryList(rawInv);
      setProducts(rawProds);
      setVariants(extractedVars);
      setStockMoves(rawMoves);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  const masterById = (id) => products.find(p => p.id === id || String(p._id) === id);
  const variantById = (id) => variants.find(v => v.id === id);
  const warehouseById = (id) => warehouses.find(w => w.id === id) || { id, name: id || 'Kathmandu DC' };

  const getVariantLabel = (v) => {
    if (!v) return 'Default';
    if (v.variantLabel) return v.variantLabel;
    if (v.parentVariant) {
      const parentLabel = getVariantLabel(v.parentVariant);
      const childParts = Object.keys(v.options || {}).map(k => v.options[k]);
      const childLabel = childParts.join(' / ') || v.name || '';
      return parentLabel ? `${parentLabel} / ${childLabel}` : childLabel;
    }
    const parts = Object.keys(v.options || {}).map(k => v.options[k]);
    return parts.join(' / ') || v.name || 'Default';
  };

  const getVariantSize = (v, r) => {
    if (r?.size) return r.size;
    if (v?.options?.Size || v?.options?.size) return v.options.Size || v.options.size;
    if (v?.parentVariant?.options?.Size || v?.parentVariant?.options?.size) {
      return v.parentVariant.options.Size || v.parentVariant.options.size;
    }
    return '—';
  };

  const getVariantColor = (v, r) => {
    if (r?.color) return r.color;
    if (v?.options?.Colour || v?.options?.colour || v?.options?.Color || v?.options?.color) {
      return v.options.Colour || v.options.colour || v.options.Color || v.options.color;
    }
    if (v?.parentVariant?.options?.Colour || v?.parentVariant?.options?.colour) {
      return v.parentVariant.options.Colour || v.parentVariant.options.colour;
    }
    return '—';
  };

  const getVariantPrice = (v, m) => {
    if (v && v.price != null && v.price !== '') return Number(v.price);
    if (m && m.price != null && m.price !== '') return Number(m.price);
    if (m && m.basePrice != null && m.basePrice !== '') return Math.round(Number(m.basePrice) / 100);
    return 0;
  };

  const stockState = (r) => {
    if (!r || r.available <= 0) return 'out';
    if (r.reorderLevel && r.available <= r.reorderLevel) return 'low';
    return 'ok';
  };

  const STOCK_BADGES = {
    ok: <span className="badge badge-success">in stock</span>,
    low: <span className="badge badge-warning">low stock</span>,
    out: <span className="badge badge-danger">out of stock</span>
  };

  // Build Unified Enriched Operational Rows
  const enrichedRows = useMemo(() => {
    const list = [];

    // Map all inventory records
    inventoryList.forEach(r => {
      const v = variantById(r.variantId) || (r.variantId ? { id: r.variantId, sku: r.sku || r.variantSku, name: r.variantLabel || r.name, options: {} } : null);
      const m = (v && masterById(v.productId)) || (r.productId && masterById(r.productId)) || { id: r.productId || 'p_unknown', name: r.name || 'Master Product', sku: r.sku };
      const w = warehouseById(r.warehouseId);
      const price = r.price !== undefined ? r.price : getVariantPrice(v, m);
      const isArchived = r.archived === true || (v && v.status === 'archived');
      const isPublished = v ? (v.published !== false && v.status !== 'draft' && v.status !== 'archived') : true;

      list.push({
        id: r.id || `${r.variantId}_${r.warehouseId}`,
        invId: r.id,
        r,
        v: v || { id: r.variantId, sku: r.sku || 'SKU' },
        m,
        w,
        sku: r.sku || (v && v.sku) || m.sku || 'SKU',
        barcode: (v && v.barcode) || r.barcode || r.sku || (v && v.sku),
        size: getVariantSize(v, r),
        color: getVariantColor(v, r),
        available: Number(r.available) || 0,
        reserved: Number(r.reserved) || 0,
        incoming: Number(r.incoming) || 0,
        damaged: Number(r.damaged) || 0,
        returned: Number(r.returned) || 0,
        reorderLevel: r.reorderLevel || 5,
        price,
        state: stockState(r),
        published: isPublished,
        archived: isArchived
      });
    });

    return list;
  }, [inventoryList, variants, products, warehouses]);

  // Filtered rows
  const filtered = useMemo(() => {
    return enrichedRows.filter(x => {
      if (x.archived) return false; // Archived variants hidden from active operational view
      if (warehouseFilter && x.w.id !== warehouseFilter) return false;
      if (statusFilter && x.state !== statusFilter) return false;
      if (publishFilter === 'published' && !x.published) return false;
      if (publishFilter === 'unpublished' && x.published) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        const matchName = x.m?.name?.toLowerCase().includes(q);
        const matchSku = x.sku?.toLowerCase().includes(q);
        const matchLabel = getVariantLabel(x.v)?.toLowerCase().includes(q);
        const matchSize = x.size?.toLowerCase().includes(q);
        const matchColor = x.color?.toLowerCase().includes(q);
        return matchName || matchSku || matchLabel || matchSize || matchColor;
      }
      return true;
    });
  }, [enrichedRows, warehouseFilter, statusFilter, publishFilter, search]);

  const totalUnits = filtered.reduce((a, b) => a + (Number(b.available) || 0), 0);
  const lowStockCount = filtered.filter(r => r.state === 'low').length;
  const outOfStockCount = filtered.filter(r => r.state === 'out').length;
  const publishedCount = filtered.filter(r => r.published).length;

  // Load Transactions & Ledger for exact variant
  const loadVariantDetails = async (variantId, sku) => {
    setLoadingTransactions(true);
    try {
      const res = await api.get(`/api/admin/inventory/variants/${variantId}/transactions?sku=${encodeURIComponent(sku)}`);
      if (res?.data) {
        setVariantTransactions(res.data);
      }
    } catch (err) {
      console.error('Failed to load variant transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------

  // 1. Open Stock Adjustment
  const handleOpenAdjust = (row) => {
    setOpenMenuRowId(null);
    setActiveItem(row);
    setAdjMode('increase');
    setAdjQty(1);
    setAdjReason('Stock correction');
    setAdjNotes('');
    setAdjRef('');
    setAdjWarehouse(row.w.id || 'w1');
    setAdjustModalOpen(true);
  };

  // Submit Stock Adjustment
  const handleApplyAdjust = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    const currentStock = activeItem.available;
    let delta = adjQty;
    if (adjMode === 'decrease') delta = -adjQty;
    else if (adjMode === 'replace') delta = adjQty - currentStock;

    if (currentStock + delta < 0) {
      alert(`Adjustment cannot result in negative stock balance. Current stock is ${currentStock}.`);
      return;
    }

    try {
      await api.post('/api/admin/inventory/adjust', {
        variantId: activeItem.v.id,
        warehouseId: adjWarehouse,
        change: delta,
        reason: adjReason,
        note: adjNotes,
        reference: adjRef || `ADJ-${Date.now().toString().slice(-4)}`
      });
      showToast(`Stock updated for SKU ${activeItem.sku} (${delta >= 0 ? '+' : ''}${delta})`);
      setAdjustModalOpen(false);
      refreshData();
    } catch (err) {
      alert('Failed to adjust stock: ' + (err.message || 'Error'));
    }
  };

  // 2. Open Edit Price
  const handleOpenPrice = (row) => {
    setOpenMenuRowId(null);
    setActiveItem(row);
    setEditPriceVal(row.price || 0);
    setPriceModalOpen(true);
  };

  // Submit Price Update
  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!activeItem) return;
    const p = Number(editPriceVal);
    if (isNaN(p) || p < 0) {
      alert('Please enter a valid price.');
      return;
    }

    try {
      await api.post('/api/admin/inventory/price', {
        variantId: activeItem.v.id,
        price: p
      });
      showToast(`Price updated to ${money(p)} for ${activeItem.sku}`);
      setPriceModalOpen(false);
      refreshData();
    } catch (err) {
      alert('Failed to update price: ' + (err.message || 'Error'));
    }
  };

  // 3. Open Stock History & Ledger
  const handleOpenHistory = async (row) => {
    setOpenMenuRowId(null);
    setActiveItem(row);
    setHistoryModalOpen(true);
    await loadVariantDetails(row.v.id, row.sku);
  };

  // 4. Open Barcode Modal
  const handleOpenBarcode = (row) => {
    setOpenMenuRowId(null);
    setActiveItem(row);
    setLabelModalOpen(true);
  };

  // 5. Open Sales / Orders
  const handleOpenSales = async (row) => {
    setOpenMenuRowId(null);
    setActiveItem(row);
    setSalesModalOpen(true);
    await loadVariantDetails(row.v.id, row.sku);
  };

  // 6. Open Purchases
  const handleOpenPurchases = async (row) => {
    setOpenMenuRowId(null);
    setActiveItem(row);
    setPurchasesModalOpen(true);
    await loadVariantDetails(row.v.id, row.sku);
  };

  // 7. Open Returns
  const handleOpenReturns = async (row) => {
    setOpenMenuRowId(null);
    setActiveItem(row);
    setReturnsModalOpen(true);
    await loadVariantDetails(row.v.id, row.sku);
  };

  // 8. Open Transfer Modal
  const handleOpenTransfer = (row) => {
    setOpenMenuRowId(null);
    setActiveItem(row);
    const dest = warehouses.find(w => w.id !== row.w.id);
    setTrfTo(dest ? dest.id : '');
    setTrfQty(1);
    setTrfReason('Warehouse stock rebalance');
    setTransferModalOpen(true);
  };

  const handleApplyTransfer = async (e) => {
    e.preventDefault();
    if (!activeItem) return;
    if (trfQty <= 0) { alert('Enter a valid transfer quantity.'); return; }
    if (trfQty > activeItem.available) { alert(`Only ${activeItem.available} units available at source warehouse.`); return; }
    if (!trfTo || trfTo === activeItem.w.id) { alert('Select a different destination warehouse.'); return; }

    try {
      await api.post('/api/admin/inventory/transfer', {
        variantId: activeItem.v.id,
        fromWarehouseId: activeItem.w.id,
        toWarehouseId: trfTo,
        qty: trfQty,
        reason: trfReason
      });
      showToast(`Transferred ${trfQty} units to destination warehouse.`);
      setTransferModalOpen(false);
      refreshData();
    } catch (err) {
      alert('Failed to execute transfer: ' + (err.message || 'Error'));
    }
  };

  // 9. Toggle Publish Status
  const handleTogglePublish = async (row) => {
    setOpenMenuRowId(null);
    const newStatus = !row.published;
    try {
      await api.post(`/api/admin/inventory/variants/${row.v.id}/publish`, {
        published: newStatus
      });
      showToast(`Variant ${newStatus ? 'Published to Storefront' : 'Unpublished'}`);
      refreshData();
    } catch (err) {
      alert('Failed to update published status: ' + (err.message || 'Error'));
    }
  };

  // 10. Archive Variant (Preserves all history; no permanent delete)
  const handleArchiveVariant = async (row) => {
    setOpenMenuRowId(null);
    const confirmed = confirm(
      `Archive variant "${row.m.name} - ${getVariantLabel(row.v)}" (${row.sku})?\n\n` +
      `• The variant will be hidden from the active storefront.\n` +
      `• All historical records (sales, purchases, returns, stock ledger) will be permanently preserved.`
    );
    if (!confirmed) return;

    try {
      await api.post(`/api/admin/inventory/variants/${row.v.id}/archive`);
      showToast(`Variant archived successfully. Historical ledger preserved.`);
      refreshData();
    } catch (err) {
      alert('Failed to archive variant: ' + (err.message || 'Error'));
    }
  };

  // CSV Export
  const exportCsv = () => {
    const headers = ['Product', 'Size', 'Colour', 'Variant Label', 'SKU', 'Barcode', 'Warehouse', 'Price (NPR)', 'Available', 'Reserved', 'Incoming', 'Damaged', 'Returned', 'Status', 'Published'];
    const rows = filtered.map(r => [
      `"${r.m.name}"`,
      `"${r.size}"`,
      `"${r.color}"`,
      `"${getVariantLabel(r.v)}"`,
      r.sku,
      r.barcode,
      `"${r.w.name}"`,
      r.price,
      r.available,
      r.reserved,
      r.incoming,
      r.damaged,
      r.returned,
      r.state,
      r.published ? 'Published' : 'Unpublished'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'zylo-inventory-published-stock.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '13px',
          fontWeight: 500
        }}>
          {toastMsg}
        </div>
      )}

      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Operational Inventory & Published Stock</h2>
          <p suppressHydrationWarning>
            Unified inventory control: manage variant stock, selling price, availability, storefront publishing, and stock ledger.
          </p>
        </div>
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="metric">
          <div className="label">Active Variants</div>
          <div className="value" suppressHydrationWarning>{filtered.length}</div>
        </div>
        <div className="metric">
          <div className="label">Total Units Available</div>
          <div className="value" suppressHydrationWarning>{totalUnits.toLocaleString('en-IN')}</div>
        </div>
        <div className="metric">
          <div className="label">Published On Store</div>
          <div className="value" suppressHydrationWarning>{publishedCount}</div>
        </div>
        <div className="metric">
          <div className="label">Stock Alerts</div>
          <div className="value" style={{ color: outOfStockCount > 0 ? 'var(--danger)' : 'inherit' }} suppressHydrationWarning>
            {outOfStockCount} out &middot; {lowStockCount} low
          </div>
        </div>
      </div>

      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <input
          type="text"
          placeholder="Search by product, size, colour, SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '280px' }}
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
        <select value={publishFilter} onChange={(e) => setPublishFilter(e.target.value)}>
          <option value="">All publishing status</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
        </select>
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="card table-wrap" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Size</th>
              <th>Colour</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th className="num">Price</th>
              <th className="num">Stock</th>
              <th className="num">Reserved</th>
              <th>Availability</th>
              <th>Publishing</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11"><div className="empty-state">Loading operational inventory...</div></td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((row, idx) => {
                const isMenuOpen = openMenuRowId === row.id;

                return (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{row.m.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                          {getVariantLabel(row.v)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{row.size}</span>
                    </td>
                    <td>
                      <span>{row.color}</span>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{row.sku}</code>
                    </td>
                    <td>{row.w.name}</td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {money(row.price)}
                    </td>
                    <td className="num" style={{ fontWeight: 600, color: row.available <= 0 ? 'var(--danger)' : 'inherit' }}>
                      {row.available}
                    </td>
                    <td className="num" style={{ color: 'var(--muted-foreground)' }}>
                      {row.reserved || 0}
                    </td>
                    <td>{STOCK_BADGES[row.state]}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(row)}
                        title="Click to toggle storefront publishing"
                        className={row.published ? 'stock-badge-published' : 'stock-badge-unpublished'}
                        style={{ border: 'none', cursor: 'pointer' }}
                      >
                        {row.published ? '✓ Published' : '○ Unpublished'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center', position: 'relative' }}>
                      <div className="action-menu-wrap" ref={isMenuOpen ? menuRef : null}>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Variant Actions"
                          onClick={() => setOpenMenuRowId(isMenuOpen ? null : row.id)}
                          style={{ background: isMenuOpen ? 'var(--muted)' : 'none' }}
                        >
                          <Icon name="more" size={16} />
                        </button>

                        {isMenuOpen && (
                          <div className="action-menu-dropdown">
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => handleOpenAdjust(row)}
                            >
                              <Icon name="edit" size={14} />
                              <span>Edit Stock</span>
                            </button>

                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => handleOpenPrice(row)}
                            >
                              <Icon name="finance" size={14} />
                              <span>Edit Price</span>
                            </button>

                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => handleOpenTransfer(row)}
                            >
                              <Icon name="arrowDown" size={14} />
                              <span>Transfer Warehouse</span>
                            </button>

                            <div className="action-menu-divider" />

                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => handleOpenHistory(row)}
                            >
                              <Icon name="reports" size={14} />
                              <span>Stock History & Ledger</span>
                            </button>

                            <Link
                              href={`/admin/products?q=${encodeURIComponent(row.m.name)}`}
                              className="action-menu-item"
                            >
                              <Icon name="products" size={14} />
                              <span>View Product</span>
                            </Link>

                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => handleOpenBarcode(row)}
                            >
                              <Icon name="products" size={14} />
                              <span>View Barcode</span>
                            </button>

                            <div className="action-menu-divider" />

                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => handleOpenSales(row)}
                            >
                              <Icon name="orders" size={14} />
                              <span>View Sales</span>
                            </button>

                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => handleOpenPurchases(row)}
                            >
                              <Icon name="purchases" size={14} />
                              <span>View Purchases</span>
                            </button>

                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => handleOpenReturns(row)}
                            >
                              <Icon name="arrowDown" size={14} />
                              <span>View Returns</span>
                            </button>

                            <div className="action-menu-divider" />

                            <button
                              type="button"
                              className="action-menu-item danger"
                              onClick={() => handleArchiveVariant(row)}
                            >
                              <Icon name="trash" size={14} />
                              <span>Archive Variant</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="11"><div className="empty-state">No inventory or published stock records match the filter.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 1. STOCK ADJUSTMENT MODAL */}
      {/* ---------------------------------------------------------------- */}
      {adjustModalOpen && activeItem && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setAdjustModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <h2>Stock Adjustment</h2>
            <div style={{
              background: 'var(--muted)',
              padding: '12px',
              borderRadius: '8px',
              margin: '12px 0 18px',
              fontSize: '12.5px',
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                {activeItem.m.name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', color: 'var(--muted-foreground)' }}>
                <div>Size: <strong style={{ color: 'var(--primary)' }}>{activeItem.size}</strong></div>
                <div>Colour: <strong style={{ color: 'var(--primary)' }}>{activeItem.color}</strong></div>
                <div>SKU: <code style={{ color: 'var(--primary)' }}>{activeItem.sku}</code></div>
                <div>Warehouse: <strong style={{ color: 'var(--primary)' }}>{activeItem.w.name}</strong></div>
              </div>
            </div>

            <form onSubmit={handleApplyAdjust}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Current Stock</label>
                  <input
                    type="text"
                    value={`${activeItem.available} units`}
                    disabled
                    style={{ background: 'var(--muted)', fontWeight: 600 }}
                  />
                </div>

                <div className="field">
                  <label>Warehouse</label>
                  <select value={adjWarehouse} onChange={(e) => setAdjWarehouse(e.target.value)} required>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field">
                  <label>Adjustment Mode</label>
                  <select value={adjMode} onChange={(e) => setAdjMode(e.target.value)}>
                    <option value="increase">Add Stock (+)</option>
                    <option value="decrease">Deduct Stock (-)</option>
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
              </div>

              {/* Calculated New Balance Preview */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--canvas)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px'
              }}>
                <span>New Calculated Balance:</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>
                  {adjMode === 'increase' && (activeItem.available + adjQty)}
                  {adjMode === 'decrease' && Math.max(0, activeItem.available - adjQty)}
                  {adjMode === 'replace' && adjQty} units
                </span>
              </div>

              <div className="field">
                <label>Reason for Adjustment (Predefined)</label>
                <select value={adjReason} onChange={(e) => setAdjReason(e.target.value)} required>
                  <option value="Purchase received">Purchase received</option>
                  <option value="Customer return">Customer return</option>
                  <option value="Stock correction">Stock correction</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Manual adjustment">Manual adjustment</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="field">
                  <label>Reference / Transaction No. (optional)</label>
                  <input
                    placeholder="e.g. PO-1029 / RET-402"
                    value={adjRef}
                    onChange={(e) => setAdjRef(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Notes / Remarks</label>
                  <input
                    placeholder="Physical count adjustment..."
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={() => setAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Apply & Record in Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 2. EDIT PRICE MODAL */}
      {/* ---------------------------------------------------------------- */}
      {priceModalOpen && activeItem && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setPriceModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '440px' }}>
            <h2>Edit Selling Price</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '14px' }}>
              {activeItem.m.name} &middot; {getVariantLabel(activeItem.v)} ({activeItem.sku})
            </p>

            <form onSubmit={handleSavePrice}>
              <div className="field">
                <label>Current Selling Price</label>
                <input type="text" value={money(activeItem.price)} disabled style={{ background: 'var(--muted)' }} />
              </div>

              <div className="field">
                <label>New Selling Price (NPR)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editPriceVal}
                  onChange={(e) => setEditPriceVal(Number(e.target.value))}
                  required
                  autoFocus
                />
              </div>

              <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '8px' }}>
                ✓ The updated selling price will synchronize immediately with the storefront catalog and future checkout orders.
              </p>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={() => setPriceModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Price</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 3. STOCK HISTORY & LEDGER MODAL */}
      {/* ---------------------------------------------------------------- */}
      {historyModalOpen && activeItem && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setHistoryModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '780px' }}>
            <h2>Stock History & Ledger</h2>
            <div style={{
              background: 'var(--muted)',
              padding: '10px 14px',
              borderRadius: '8px',
              margin: '10px 0 16px',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{activeItem.m.name}</strong> &middot; {getVariantLabel(activeItem.v)}
                <span style={{ marginLeft: '8px', color: 'var(--muted-foreground)', fontSize: '12px' }}>
                  SKU: <code>{activeItem.sku}</code>
                </span>
              </div>
              <div style={{ fontWeight: 600 }}>
                Balance: {activeItem.available} units
              </div>
            </div>

            <div className="table-wrap" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Activity / Type</th>
                    <th className="num">Change</th>
                    <th className="num">Balance</th>
                    <th>User / System</th>
                    <th>Reference</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTransactions ? (
                    <tr>
                      <td colSpan="7"><div className="empty-state">Loading ledger entries...</div></td>
                    </tr>
                  ) : (variantTransactions.ledger && variantTransactions.ledger.length > 0) || stockMoves.filter(m => m.variantId === activeItem.v.id).length > 0 ? (
                    (variantTransactions.ledger.length > 0 ? variantTransactions.ledger : stockMoves.filter(m => m.variantId === activeItem.v.id))
                      .sort((a, b) => new Date(b.createdAt || b.at || 0) - new Date(a.createdAt || a.at || 0))
                      .map((m, idx) => {
                        const dateStr = m.createdAt ? new Date(m.createdAt).toLocaleString('en-GB') : (m.at ? new Date(m.at).toLocaleString('en-GB') : m.date || '—');
                        const isPositive = m.change > 0;
                        const isNegative = m.change < 0;

                        return (
                          <tr key={idx}>
                            <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{dateStr}</td>
                            <td>
                              <span className={`badge ${isPositive ? 'badge-success' : isNegative ? 'badge-danger' : 'badge-accent'}`}>
                                {(m.type || 'Adjustment').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="num" style={{ fontWeight: 600, color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'inherit' }}>
                              {isPositive ? `+${m.change}` : m.change}
                            </td>
                            <td className="num" style={{ fontWeight: 600 }}>
                              {m.after !== undefined ? m.after : '—'}
                            </td>
                            <td style={{ fontSize: '12px' }}>{m.user || 'System'}</td>
                            <td>
                              {m.reference ? (
                                <code className="ledger-ref-link" onClick={() => {
                                  if (m.type === 'sale' || m.reference.startsWith('ORD')) handleOpenSales(activeItem);
                                  else if (m.type === 'purchase' || m.reference.startsWith('PO') || m.reference.startsWith('PUR')) handleOpenPurchases(activeItem);
                                  else if (m.type === 'return' || m.reference.startsWith('RET')) handleOpenReturns(activeItem);
                                }}>
                                  {m.reference}
                                </code>
                              ) : '—'}
                            </td>
                            <td style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>
                              {m.reason || 'Manual Adjustment'}
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan="7"><div className="empty-state">No stock ledger entries recorded yet for this variant.</div></td>
                    </tr>
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

      {/* ---------------------------------------------------------------- */}
      {/* 4. BARCODE MODAL */}
      {/* ---------------------------------------------------------------- */}
      {labelModalOpen && activeItem && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setLabelModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '380px', textAlign: 'center' }}>
            <h2>Variant Barcode</h2>
            <div style={{ padding: '20px', background: '#fff', color: '#000', borderRadius: '10px', margin: '14px 0', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{activeItem.m.name}</div>
              <div style={{ fontSize: '13px', color: '#4b5563', margin: '4px 0 10px' }}>
                Size: <strong>{activeItem.size}</strong> &middot; Colour: <strong>{activeItem.color}</strong>
              </div>
              <div style={{ letterSpacing: '5px', fontSize: '32px', fontFamily: 'monospace', margin: '14px 0', userSelect: 'none' }}>
                |||| | ||||| || |||
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '1px', fontWeight: 600 }}>
                {activeItem.barcode || activeItem.sku}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '10px', color: '#111827' }}>
                {money(activeItem.price)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => window.print()}>Print Barcode Label</button>
              <button className="btn" onClick={() => setLabelModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 5. VIEW SALES MODAL */}
      {/* ---------------------------------------------------------------- */}
      {salesModalOpen && activeItem && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setSalesModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '680px' }}>
            <h2>Variant Sales & Customer Orders</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '14px' }}>
              Sales orders containing SKU <code>{activeItem.sku}</code> ({activeItem.m.name} - {getVariantLabel(activeItem.v)})
            </p>

            <div className="table-wrap" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th className="num">Order Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTransactions ? (
                    <tr>
                      <td colSpan="5"><div className="empty-state">Loading sales...</div></td>
                    </tr>
                  ) : variantTransactions.sales && variantTransactions.sales.length > 0 ? (
                    variantTransactions.sales.map((s, idx) => (
                      <tr key={idx}>
                        <td>
                          <Link href={`/admin/orders`} className="ledger-ref-link">
                            {s.orderNo}
                          </Link>
                        </td>
                        <td style={{ fontSize: '12px' }}>{new Date(s.date).toLocaleDateString('en-GB')}</td>
                        <td>{s.customer}</td>
                        <td className="num">{money(Math.round((s.grandTotal || 0) / 100))}</td>
                        <td><span className="badge badge-success">{s.status || 'Paid'}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5"><div className="empty-state">No customer sales recorded for this SKU yet.</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn" onClick={() => setSalesModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 6. VIEW PURCHASES MODAL */}
      {/* ---------------------------------------------------------------- */}
      {purchasesModalOpen && activeItem && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setPurchasesModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '680px' }}>
            <h2>Supplier Purchases</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '14px' }}>
              Inward stock purchase bills for SKU <code>{activeItem.sku}</code>
            </p>

            <div className="table-wrap" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Bill No</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th className="num">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTransactions ? (
                    <tr>
                      <td colSpan="4"><div className="empty-state">Loading purchases...</div></td>
                    </tr>
                  ) : variantTransactions.purchases && variantTransactions.purchases.length > 0 ? (
                    variantTransactions.purchases.map((p, idx) => (
                      <tr key={idx}>
                        <td>
                          <Link href={`/admin/purchases`} className="ledger-ref-link">
                            {p.billNo || `PUR-${idx + 1}`}
                          </Link>
                        </td>
                        <td style={{ fontSize: '12px' }}>{new Date(p.date).toLocaleDateString('en-GB')}</td>
                        <td>{p.supplier || 'Supplier'}</td>
                        <td className="num">{money(Math.round((p.totalAmount || 0) / 100))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4"><div className="empty-state">No supplier purchases recorded for this variant.</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn" onClick={() => setPurchasesModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 7. VIEW RETURNS MODAL */}
      {/* ---------------------------------------------------------------- */}
      {returnsModalOpen && activeItem && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setReturnsModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '680px' }}>
            <h2>Sales Returns & Refunds</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '14px' }}>
              Returns history for SKU <code>{activeItem.sku}</code>
            </p>

            <div className="table-wrap" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th className="num">Refunded</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTransactions ? (
                    <tr>
                      <td colSpan="5"><div className="empty-state">Loading returns...</div></td>
                    </tr>
                  ) : variantTransactions.returns && variantTransactions.returns.length > 0 ? (
                    variantTransactions.returns.map((r, idx) => (
                      <tr key={idx}>
                        <td>
                          <Link href={`/admin/returns`} className="ledger-ref-link">
                            {r.orderNo}
                          </Link>
                        </td>
                        <td style={{ fontSize: '12px' }}>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                        <td>{r.customer}</td>
                        <td className="num" style={{ color: 'var(--danger)' }}>
                          {money(Math.round((r.refundedAmount || 0) / 100))}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{r.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5"><div className="empty-state">No sales returns recorded for this variant.</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn" onClick={() => setReturnsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 8. TRANSFER STOCK MODAL */}
      {/* ---------------------------------------------------------------- */}
      {transferModalOpen && activeItem && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setTransferModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <h2>Warehouse Stock Transfer</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '14px' }}>
              {activeItem.m.name} &middot; {getVariantLabel(activeItem.v)} &mdash; {activeItem.available} available at {activeItem.w.name}.
            </p>
            <form onSubmit={handleApplyTransfer}>
              <div className="field">
                <label>Destination Warehouse</label>
                <select value={trfTo} onChange={(e) => setTrfTo(e.target.value)} required>
                  {warehouses.filter(w => w.id !== activeItem.w.id).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantity to Transfer</label>
                <input
                  type="number"
                  min="1"
                  max={activeItem.available}
                  value={trfQty}
                  onChange={(e) => setTrfQty(Number(e.target.value))}
                  required
                />
              </div>
              <div className="field">
                <label>Transfer Reason / Note</label>
                <input
                  value={trfReason}
                  onChange={(e) => setTrfReason(e.target.value)}
                  placeholder="e.g. Store replenishment"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={() => setTransferModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Execute Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
