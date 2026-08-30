'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { money, fromPaisa } from '../../../services/formatters';
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

  // Search & Filters
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedProductIds, setExpandedProductIds] = useState(new Set());
  const [toastMsg, setToastMsg] = useState('');

  // Pending manual stock changes state (key: `${v.id}_${warehouseId}` => { variantItem, newStock, originalStock })
  const [pendingStockChanges, setPendingStockChanges] = useState({});
  const [savingPending, setSavingPending] = useState(false);

  // Action Menu dropdown state
  const [openMenuKey, setOpenMenuKey] = useState(null);
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

  // Active target variant item & transactions
  const [activeItem, setActiveItem] = useState(null);
  const [variantTransactions, setVariantTransactions] = useState({ sales: [], purchases: [], returns: [], ledger: [] });
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Adjustment form
  const [adjMode, setAdjMode] = useState('increase');
  const [adjQty, setAdjQty] = useState(1);
  const [adjReason, setAdjReason] = useState('Stock correction');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjRef, setAdjRef] = useState('');
  const [adjWarehouse, setAdjWarehouse] = useState('w1');

  // Price form
  const [editPriceVal, setEditPriceVal] = useState(0);

  // Transfer form
  const [trfTo, setTrfTo] = useState('');
  const [trfQty, setTrfQty] = useState(1);
  const [trfReason, setTrfReason] = useState('Warehouse stock rebalance');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuKey(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [prodRes, invRes, moveRes] = await Promise.allSettled([
        api.get('/api/admin/products'),
        api.get('/api/admin/inventory'),
        api.get('/api/admin/inventory/moves')
      ]);

      let rawProds = [];
      let extractedVars = [];
      if (prodRes.status === 'fulfilled') {
        const prodVal = prodRes.value;
        rawProds = prodVal?.data?.products || prodVal?.products || prodVal?.data || (Array.isArray(prodVal) ? prodVal : []);
        rawProds.forEach((p) => {
          const pId = p.id || String(p._id);
          if (p.allVariants && p.allVariants.length) {
            extractedVars = [...extractedVars, ...p.allVariants.map(v => ({ ...v, id: v.id || String(v._id), productId: pId }))];
          } else if (p.variants && p.variants.length) {
            p.variants.forEach(v => {
              const vId = v.id || String(v._id);
              extractedVars.push({ ...v, id: vId, productId: pId });
              if (v.subVariants && v.subVariants.length) {
                v.subVariants.forEach(sv => {
                  extractedVars.push({ ...sv, id: sv.id || String(sv._id), productId: pId, parentVariant: v });
                });
              }
            });
          }
        });
      }

      let rawInv = [];
      if (invRes.status === 'fulfilled') {
        const val = invRes.value;
        const payload = val?.data?.inventory || val?.inventory || val?.data;
        rawInv = Array.isArray(payload) ? payload : (Array.isArray(val) ? val : []);
      }

      let rawMoves = [];
      if (moveRes.status === 'fulfilled') {
        const val = moveRes.value;
        const payload = val?.data?.moves || val?.moves || val?.data;
        rawMoves = Array.isArray(payload) ? payload : (Array.isArray(val) ? val : []);
      }

      setProducts(rawProds);
      setVariants(extractedVars);
      setInventoryList(rawInv);
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

  const getVariantSize = (v) => {
    if (v?.options?.Size || v?.options?.size) return v.options.Size || v.options.size;
    if (v?.parentVariant?.options?.Size || v?.parentVariant?.options?.size) {
      return v.parentVariant.options.Size || v.parentVariant.options.size;
    }
    if (v?.parentVariant?.name) return v.parentVariant.name;
    if (v?.name && v.name.includes('/')) return v.name.split('/')[0].trim();
    return v?.name || 'Standard';
  };

  const getVariantColor = (v) => {
    if (v?.options?.Colour || v?.options?.colour || v?.options?.Color || v?.options?.color) {
      return v.options.Colour || v.options.colour || v.options.Color || v.options.color;
    }
    if (v?.parentVariant?.options?.Colour || v?.parentVariant?.options?.colour) {
      return v.parentVariant.options.Colour || v.parentVariant.options.colour;
    }
    if (v?.parentVariantId && v?.name) return v.name;
    if (v?.name && v.name.includes('/')) return v.name.split('/')[1].trim();
    return 'Default';
  };

  const getVariantPrice = (v, m) => {
    if (v && v.price != null && v.price !== '') return fromPaisa(v.price);
    if (m && m.basePrice != null && m.basePrice !== '') return fromPaisa(m.basePrice);
    if (m && m.price != null && m.price !== '') return fromPaisa(m.price);
    return 0;
  };

  const stockBadge = (available, reorderLevel = 5) => {
    if (available <= 0) return <span className="badge badge-danger">out of stock</span>;
    if (available <= reorderLevel) return <span className="badge badge-warning">low stock</span>;
    return <span className="badge badge-success">in stock</span>;
  };

  // Map inventories by variantId across warehouses
  const invByVariantId = useMemo(() => {
    const map = {};
    if (Array.isArray(inventoryList)) {
      inventoryList.forEach(inv => {
        if (!inv.archived) {
          const keys = [inv.variantId, inv.id, inv.sku].filter(Boolean);
          keys.forEach(k => {
            if (!map[k]) {
              map[k] = {
                totalAvailable: 0,
                totalReserved: 0,
                byWarehouse: {}
              };
            }
            const avail = Number(inv.available) || 0;
            const res = Number(inv.reserved) || 0;
            map[k].totalAvailable += avail;
            map[k].totalReserved += res;
            map[k].byWarehouse[inv.warehouseId || 'w1'] = inv;
          });
        }
      });
    }
    return map;
  }, [inventoryList]);

  // Group variants directly under their Master Product with Size → Colour hierarchy
  const groupedProducts = useMemo(() => {
    return products.map(prod => {
      const pId = prod.id || String(prod._id);
      const prodVariants = variants.filter(v => v.productId === pId && v.status !== 'archived');

      // Filter out top-level parent variants if child sub-variants exist
      const childVars = prodVariants.filter(v => !!v.parentVariantId);
      const activeVars = childVars.length > 0 ? childVars : prodVariants;

      // Group by Size → Colour
      const sizeGroups = {};
      let totalProdStock = 0;
      let totalProdReserved = 0;
      const sizeSet = new Set();
      const colorSet = new Set();

      activeVars.forEach(v => {
        const size = getVariantSize(v);
        const color = getVariantColor(v);
        sizeSet.add(size);
        colorSet.add(color);

        const vKey = v.id || String(v._id || '');
        const invData = invByVariantId[vKey] || (v._id ? invByVariantId[String(v._id)] : null) || (v.sku ? invByVariantId[v.sku] : null);
        let available = 0;
        let reserved = 0;
        let invDoc = null;

        if (warehouseFilter && warehouseFilter !== 'all') {
          invDoc = invData?.byWarehouse[warehouseFilter] || null;
          available = invDoc ? Number(invDoc.available) || 0 : (v.availableStock !== undefined ? Number(v.availableStock) : (v.stock !== undefined ? Number(v.stock) : 0));
          reserved = invDoc ? Number(invDoc.reserved) || 0 : 0;
        } else {
          invDoc = invData?.byWarehouse['w1'] || (invData ? Object.values(invData.byWarehouse)[0] : null);
          available = invDoc ? Number(invDoc.available) || 0 : (invData ? invData.totalAvailable : (v.availableStock !== undefined ? Number(v.availableStock) : (v.stock !== undefined ? Number(v.stock) : 0)));
          reserved = invDoc ? Number(invDoc.reserved) || 0 : (invData ? invData.totalReserved : 0);
        }

        const price = getVariantPrice(v, prod);

        totalProdStock += available;
        totalProdReserved += reserved;

        if (!sizeGroups[size]) {
          sizeGroups[size] = {
            size,
            totalStock: 0,
            colours: []
          };
        }

        sizeGroups[size].totalStock += available;
        sizeGroups[size].colours.push({
          v,
          m: prod,
          r: invDoc,
          sku: v.sku || `${prod.sku}-${size.replace(/\s+/g, '')}-${color.slice(0, 3).toUpperCase()}`,
          size,
          color,
          available,
          reserved,
          price,
          published: v.published !== false && v.status !== 'draft',
          warehouse: invDoc ? warehouseById(invDoc.warehouseId) : { id: 'w1', name: 'Kathmandu DC' }
        });
      });

      const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', '28', '30', '32', '34', '36', '38', '40'];
      const sizesList = Object.values(sizeGroups).sort((a, b) => {
        const idxA = sizeOrder.indexOf(a.size);
        const idxB = sizeOrder.indexOf(b.size);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.size.localeCompare(b.size, undefined, { numeric: true });
      });
      const isOutOfStock = totalProdStock <= 0;

      return {
        product: prod,
        id: pId,
        name: prod.name,
        sku: prod.sku,
        brand: prod.brand || 'Ramroxa',
        price: prod.basePrice ? fromPaisa(prod.basePrice) : (prod.price ? fromPaisa(prod.price) : (activeVars[0] ? getVariantPrice(activeVars[0], prod) : 0)),
        totalStock: totalProdStock,
        totalReserved: totalProdReserved,
        isOutOfStock,
        sizesCount: sizeSet.size,
        coloursCount: colorSet.size,
        sizesListSummary: Array.from(sizeSet).join(', ') || 'Standard',
        coloursListSummary: Array.from(colorSet).join(', ') || 'Standard',
        sizeGroups: sizesList,
        variantsCount: activeVars.length,
        published: prod.status === 'published'
      };
    });
  }, [products, variants, invByVariantId, warehouseFilter, warehouses]);

  // Overall accurate metrics
  const stats = useMemo(() => {
    let totalStock = 0;
    let totalVariants = 0;
    let outOfStockVars = 0;
    let lowStockVars = 0;
    let inStockVars = 0;

    groupedProducts.forEach(p => {
      p.sizeGroups.forEach(sg => {
        sg.colours.forEach(c => {
          totalVariants++;
          totalStock += c.available;
          if (c.available <= 0) {
            outOfStockVars++;
          } else if (c.available <= 5) {
            lowStockVars++;
          } else {
            inStockVars++;
          }
        });
      });
    });

    return {
      totalStockUnits: totalStock,
      totalVariantsCount: totalVariants,
      masterProductsCount: groupedProducts.length,
      outOfStockCount: outOfStockVars,
      lowStockCount: lowStockVars,
      inStockCount: inStockVars
    };
  }, [groupedProducts]);

  // Filter products by search, warehouse, and status
  const filteredProducts = useMemo(() => {
    return groupedProducts.filter(p => {
      if (statusFilter === 'out' && !p.isOutOfStock) return false;
      if (statusFilter === 'ok' && p.isOutOfStock) return false;
      if (statusFilter === 'low' && (p.totalStock > 10 || p.isOutOfStock)) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchSize = p.sizesListSummary.toLowerCase().includes(q);
        const matchColor = p.coloursListSummary.toLowerCase().includes(q);
        return matchName || matchSku || matchSize || matchColor;
      }
      return true;
    });
  }, [groupedProducts, statusFilter, search]);

  const toggleExpand = (prodId) => {
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(prodId)) next.delete(prodId);
      else next.add(prodId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedProductIds(new Set(filteredProducts.map(p => p.id)));
  };

  const collapseAll = () => {
    setExpandedProductIds(new Set());
  };

  // Load variant transaction history (Sales, Purchases, Returns, Ledger)
  const loadVariantDetails = async (variantId, sku) => {
    setLoadingTransactions(true);
    try {
      const res = await api.get(`/api/admin/inventory/variants/${variantId}/transactions?sku=${encodeURIComponent(sku)}`);
      if (res?.data) {
        setVariantTransactions(res.data);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // ----------------------------------------------------
  // EXACT VARIANT ACTIONS
  // ----------------------------------------------------

  // 1. Stock Adjustment for exact Size + Colour
  const handleOpenAdjust = (variantItem) => {
    setOpenMenuKey(null);
    setActiveItem(variantItem);
    setAdjMode('increase');
    setAdjQty(1);
    setAdjReason('Stock correction');
    setAdjNotes('');
    setAdjRef('');
    setAdjWarehouse(variantItem.warehouse?.id || 'w1');
    setAdjustModalOpen(true);
  };

  const handleApplyAdjust = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    const currentStock = Number(activeItem.available) || 0;
    const vId = activeItem.v?.id || String(activeItem.v?._id || '');
    let delta = Number(adjQty) || 0;
    let targetMode = 'increase';

    if (adjMode === 'decrease') {
      targetMode = 'decrease';
    } else if (adjMode === 'replace') {
      targetMode = 'set';
      delta = Number(adjQty) || 0;
    }

    if (adjMode === 'decrease' && currentStock - delta < 0) {
      alert(`Adjustment cannot result in negative stock balance. Current stock for ${activeItem.size} / ${activeItem.color} is ${currentStock}.`);
      return;
    }

    try {
      await api.post('/api/admin/inventory/adjust', {
        variantId: vId,
        warehouseId: adjWarehouse || 'w1',
        change: delta,
        mode: targetMode,
        reason: adjReason || 'Stock correction',
        note: adjNotes || '',
        reference: adjRef || `ADJ-${Date.now().toString().slice(-4)}`
      });
      showToast(`Stock updated for ${activeItem.size} / ${activeItem.color}`);
      setAdjustModalOpen(false);
      await refreshData();
    } catch (err) {
      alert('Failed to adjust stock: ' + (err.message || 'Error'));
    }
  };

  // 2. Queue manual stock change without immediate saving
  const handleInlineStockChange = (variantItem, value) => {
    const rawNum = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(rawNum) || rawNum < 0) return;
    const vId = variantItem.v?.id || String(variantItem.v?._id || '');
    const wId = variantItem.warehouse?.id || 'w1';
    const itemKey = `${vId}_${wId}`;

    setPendingStockChanges(prev => {
      const next = { ...prev };
      if (rawNum === Number(variantItem.available)) {
        delete next[itemKey];
      } else {
        next[itemKey] = {
          variantItem,
          newStock: rawNum,
          originalStock: Number(variantItem.available) || 0
        };
      }
      return next;
    });
  };

  // Step stock change (+1 or -1) exactly
  const handleStepStockChange = (variantItem, delta) => {
    const vId = variantItem.v?.id || String(variantItem.v?._id || '');
    const wId = variantItem.warehouse?.id || 'w1';
    const itemKey = `${vId}_${wId}`;
    const currentVal = pendingStockChanges[itemKey] !== undefined
      ? Number(pendingStockChanges[itemKey].newStock)
      : Number(variantItem.available) || 0;

    const nextVal = Math.max(0, currentVal + delta);
    handleInlineStockChange(variantItem, nextVal);
  };

  // Save a single variant's modified stock immediately
  const handleSaveSingleStockChange = async (variantItem) => {
    const vId = variantItem.v?.id || String(variantItem.v?._id || '');
    const wId = variantItem.warehouse?.id || 'w1';
    const itemKey = `${vId}_${wId}`;
    const change = pendingStockChanges[itemKey];
    if (!change) return;

    setSavingPending(true);
    try {
      await api.post('/api/admin/inventory/adjust', {
        variantId: vId,
        warehouseId: wId,
        mode: 'set',
        change: change.newStock,
        reason: 'Stock correction',
        note: `Manual inline update: ${variantItem.size} / ${variantItem.color}`
      });
      showToast(`✓ Stock updated to ${change.newStock} for ${variantItem.size} / ${variantItem.color}`);
      setPendingStockChanges(prev => {
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
      await refreshData();
    } catch (err) {
      alert('Failed to save stock change: ' + (err.message || 'Error'));
    } finally {
      setSavingPending(false);
    }
  };

  // Reset all pending changes back to saved values
  const handleResetPendingChanges = () => {
    setPendingStockChanges({});
    showToast('Stock quantities restored to their previous saved state.');
  };

  // Commit and save all pending manual stock changes
  const handleSaveAllPendingChanges = async () => {
    const changesList = Object.values(pendingStockChanges);
    if (changesList.length === 0) return;

    setSavingPending(true);
    try {
      for (const change of changesList) {
        const vId = change.variantItem.v?.id || String(change.variantItem.v?._id || '');
        const wId = change.variantItem.warehouse?.id || 'w1';
        await api.post('/api/admin/inventory/adjust', {
          variantId: vId,
          warehouseId: wId,
          mode: 'set',
          change: change.newStock,
          reason: 'Stock correction',
          note: `Manual inline update: ${change.variantItem.size} / ${change.variantItem.color}`
        });
      }
      showToast(`✓ Successfully saved stock adjustments across ${changesList.length} variant(s).`);
      setPendingStockChanges({});
      await refreshData();
    } catch (err) {
      alert('Failed to save some stock changes: ' + (err.message || 'Error'));
    } finally {
      setSavingPending(false);
    }
  };

  // 3. Edit Selling Price for exact variant
  const handleOpenPrice = (variantItem) => {
    setOpenMenuKey(null);
    setActiveItem(variantItem);
    setEditPriceVal(variantItem.price || 0);
    setPriceModalOpen(true);
  };

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
        price: Math.round(p * 100)
      });
      showToast(`Selling price updated to ${money(p)} for ${activeItem.size} / ${activeItem.color}`);
      setPriceModalOpen(false);
      refreshData();
    } catch (err) {
      alert('Failed to update price: ' + (err.message || 'Error'));
    }
  };

  // 4. Toggle Publish Status
  const handleTogglePublish = async (variantItem) => {
    setOpenMenuKey(null);
    const newStatus = !variantItem.published;
    try {
      await api.post(`/api/admin/inventory/variants/${variantItem.v.id}/publish`, {
        published: newStatus
      });
      showToast(`Variant ${variantItem.size} / ${variantItem.color} ${newStatus ? 'Published' : 'Unpublished'}`);
      refreshData();
    } catch (err) {
      alert('Failed to update publishing status: ' + (err.message || 'Error'));
    }
  };

  // 5. Open Stock Ledger History
  const handleOpenHistory = async (variantItem) => {
    setOpenMenuKey(null);
    setActiveItem(variantItem);
    setHistoryModalOpen(true);
    await loadVariantDetails(variantItem.v.id, variantItem.sku);
  };

  // 6. View Barcode
  const handleOpenBarcode = (variantItem) => {
    setOpenMenuKey(null);
    setActiveItem(variantItem);
    setLabelModalOpen(true);
  };

  // 7. View Sales
  const handleOpenSales = async (variantItem) => {
    setOpenMenuKey(null);
    setActiveItem(variantItem);
    setSalesModalOpen(true);
    await loadVariantDetails(variantItem.v.id, variantItem.sku);
  };

  // 8. View Purchases
  const handleOpenPurchases = async (variantItem) => {
    setOpenMenuKey(null);
    setActiveItem(variantItem);
    setPurchasesModalOpen(true);
    await loadVariantDetails(variantItem.v.id, variantItem.sku);
  };

  // 9. View Returns
  const handleOpenReturns = async (variantItem) => {
    setOpenMenuKey(null);
    setActiveItem(variantItem);
    setReturnsModalOpen(true);
    await loadVariantDetails(variantItem.v.id, variantItem.sku);
  };

  // 10. Archive Variant (Preserves all history; no deletion)
  const handleArchiveVariant = async (variantItem) => {
    setOpenMenuKey(null);
    const confirmed = confirm(
      `Archive variant "${variantItem.m.name} — Size: ${variantItem.size}, Colour: ${variantItem.color}" (${variantItem.sku})?\n\n` +
      `• The variant will be hidden from the active storefront.\n` +
      `• All historical sales, purchases, returns, and stock ledger entries will remain preserved.`
    );
    if (!confirmed) return;

    try {
      await api.post(`/api/admin/inventory/variants/${variantItem.v.id}/archive`);
      showToast(`Variant archived successfully. Historical ledger preserved.`);
      refreshData();
    } catch (err) {
      alert('Failed to archive variant: ' + (err.message || 'Error'));
    }
  };

  // Export CSV
  const exportCsv = () => {
    const headers = ['Product', 'Size', 'Colour', 'SKU', 'Available Stock', 'Price (NPR)', 'Status'];
    const rows = [];
    groupedProducts.forEach(p => {
      p.sizeGroups.forEach(sg => {
        sg.colours.forEach(c => {
          rows.push([
            `"${p.name}"`,
            `"${c.size}"`,
            `"${c.color}"`,
            c.sku,
            c.available,
            c.price,
            c.published ? 'Published' : 'Unpublished'
          ]);
        });
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ramroxa-inventory.csv');
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

      <div className="page-head">
        <h2>Inventory</h2>
        <p>
          Master inventory management: click any product to expand and manage its exact <strong>Size → Colour → Quantity</strong> breakdown.
        </p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="label">Total Stock Balance</div>
          <div className="value">{stats.totalStockUnits.toLocaleString()} units</div>
        </div>
        <div className="metric">
          <div className="label">Total Variants / SKUs</div>
          <div className="value">{stats.totalVariantsCount}</div>
        </div>
        <div className="metric">
          <div className="label">Master Products</div>
          <div className="value">{stats.masterProductsCount}</div>
        </div>
        <div className="metric">
          <div className="label">Out of Stock</div>
          <div className="value">{stats.outOfStockCount}</div>
        </div>
      </div>

      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <input
          type="text"
          placeholder="Search by product, size, colour, SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '260px' }}
        />
        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
          <option value="">All warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All availability</option>
          <option value="ok">In stock products</option>
          <option value="low">Low stock (&le; 5)</option>
          <option value="out">Out of stock products</option>
        </select>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-sm" onClick={expandAll}>Expand All</button>
          <button className="btn btn-sm" onClick={collapseAll}>Collapse All</button>
        </div>
        <div className="spacer" />
        
        {/* Save Changes & Reset actions */}
        {Object.keys(pendingStockChanges).length > 0 && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--accent-soft, #fef3c7)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--accent, #f59e0b)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent, #b45309)', marginRight: '4px' }}>
              {Object.keys(pendingStockChanges).length} unsaved
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleResetPendingChanges}
              disabled={savingPending}
              style={{ padding: '2px 10px', fontSize: '12px' }}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleSaveAllPendingChanges}
              disabled={savingPending}
              style={{ padding: '2px 12px', fontSize: '12px', fontWeight: 600 }}
            >
              {savingPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        <button className="btn" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="card table-wrap" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Master Product</th>
              <th>SKU</th>
              <th>Sizes Available</th>
              <th>Colours</th>
              <th className="num">Price</th>
              <th className="num">Total Stock</th>
              <th>Status</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9"><div className="empty-state">Loading inventory hierarchy...</div></td>
              </tr>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const isExpanded = expandedProductIds.has(p.id);

                return (
                  <React.Fragment key={p.id}>
                    {/* MASTER PRODUCT ROW */}
                    <tr
                      style={{
                        background: isExpanded ? 'var(--muted)' : 'inherit',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                      onClick={() => toggleExpand(p.id)}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
                        <span style={{ fontSize: '12px', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                          ▶
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', background: 'var(--canvas)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            {p.variantsCount} variants
                          </span>
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{p.sku}</code>
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        {p.sizesListSummary}
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                        {p.coloursListSummary}
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>
                        {money(p.price)}
                      </td>
                      <td className="num" style={{ fontWeight: 700, color: p.totalStock <= 0 ? 'var(--danger)' : 'var(--primary)' }}>
                        {p.totalStock} units
                      </td>
                      <td>{stockBadge(p.totalStock)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(p.id); }}
                          style={{ fontSize: '11.5px', padding: '2px 8px' }}
                        >
                          {isExpanded ? 'Hide Sizes' : 'View Sizes'}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED HIERARCHICAL SIZE → COLOUR → QUANTITY VIEW */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="9" style={{ padding: '0', background: 'var(--canvas)', borderBottom: '2px solid var(--border)' }}>
                          <div style={{ padding: '14px 18px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-foreground)', marginBottom: '10px' }}>
                              Variant Breakdown for {p.name} (Size → Colour → Quantity)
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                              {p.sizeGroups.map((sg, sIdx) => (
                                <div
                                  key={sIdx}
                                  style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '12px 14px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                  }}
                                >
                                  {/* SIZE HEADER */}
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid var(--border)',
                                    paddingBottom: '8px',
                                    marginBottom: '10px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>Size:</span>
                                      <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{sg.size}</strong>
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: sg.totalStock <= 0 ? 'var(--danger)' : 'var(--muted-foreground)' }}>
                                      Subtotal: {sg.totalStock} units
                                    </div>
                                  </div>

                                  {/* COLOURS UNDER THIS EXACT SIZE */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {sg.colours.map((item, cIdx) => {
                                      const menuKey = `${item.v.id}_${item.warehouse.id}`;
                                      const isMenuOpen = openMenuKey === menuKey;

                                      return (
                                        <div
                                          key={cIdx}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: 'var(--canvas)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                            padding: '8px 10px',
                                            gap: '8px'
                                          }}
                                        >
                                          {/* Colour & SKU */}
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: item.color.toLowerCase().includes('white') ? '#eee' : (item.color.toLowerCase().includes('black') || item.color.toLowerCase().includes('charcoal') ? '#222' : 'var(--accent)'),
                                                border: '1px solid var(--border)',
                                                display: 'inline-block'
                                              }} />
                                              <strong style={{ fontSize: '13px' }}>{item.color}</strong>
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px', fontFamily: 'monospace' }}>
                                              {item.sku}
                                            </div>
                                          </div>

                                          {/* Stock Quantity Input (Editable with pending state) */}
                                          {(() => {
                                            const vId = item.v?.id || String(item.v?._id || '');
                                            const wId = item.warehouse?.id || 'w1';
                                            const itemKey = `${vId}_${wId}`;
                                            const isModified = pendingStockChanges[itemKey] !== undefined;
                                            const currentQtyVal = isModified ? pendingStockChanges[itemKey].newStock : item.available;

                                            return (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '11px', color: isModified ? 'var(--accent, #b45309)' : 'var(--muted-foreground)', fontWeight: isModified ? 600 : 400 }}>Qty:</span>
                                                <div style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  background: isModified ? 'var(--accent-soft, #fef3c7)' : (item.available <= 0 ? 'var(--danger-soft)' : 'var(--surface)'),
                                                  border: isModified ? '2px solid var(--accent, #f59e0b)' : '1px solid var(--border)',
                                                  borderRadius: '6px',
                                                  boxShadow: isModified ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : 'none',
                                                  overflow: 'hidden'
                                                }}>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleStepStockChange(item, -1); }}
                                                    disabled={currentQtyVal <= 0}
                                                    title="Decrease by 1"
                                                    style={{
                                                      border: 'none',
                                                      background: 'transparent',
                                                      width: '20px',
                                                      height: '28px',
                                                      cursor: currentQtyVal <= 0 ? 'not-allowed' : 'pointer',
                                                      fontSize: '13px',
                                                      fontWeight: 700,
                                                      color: currentQtyVal <= 0 ? 'var(--muted-foreground)' : (isModified ? 'var(--accent, #b45309)' : 'var(--primary)'),
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      padding: 0,
                                                      userSelect: 'none'
                                                    }}
                                                  >
                                                    &minus;
                                                  </button>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={currentQtyVal}
                                                    onChange={(e) => handleInlineStockChange(item, e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSaveSingleStockChange(item);
                                                      } else if (e.key === 'Escape') {
                                                        setPendingStockChanges(prev => {
                                                          const next = { ...prev };
                                                          delete next[itemKey];
                                                          return next;
                                                        });
                                                      }
                                                    }}
                                                    style={{
                                                      width: '40px',
                                                      height: '28px',
                                                      textAlign: 'center',
                                                      fontSize: '13px',
                                                      fontWeight: 700,
                                                      padding: '0 2px',
                                                      background: 'transparent',
                                                      color: isModified ? 'var(--accent, #b45309)' : (item.available <= 0 ? 'var(--danger)' : 'var(--primary)'),
                                                      border: 'none',
                                                      borderLeft: '1px solid var(--border)',
                                                      borderRight: '1px solid var(--border)',
                                                      borderRadius: 0,
                                                      outline: 'none'
                                                    }}
                                                    title={isModified ? `Unsaved change: was ${item.available}, now ${currentQtyVal}. Press Enter or click ✓ to save.` : "Edit quantity for this exact Size + Colour"}
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleStepStockChange(item, 1); }}
                                                    title="Increase by 1"
                                                    style={{
                                                      border: 'none',
                                                      background: 'transparent',
                                                      width: '20px',
                                                      height: '28px',
                                                      cursor: 'pointer',
                                                      fontSize: '13px',
                                                      fontWeight: 700,
                                                      color: isModified ? 'var(--accent, #b45309)' : 'var(--primary)',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      padding: 0,
                                                      userSelect: 'none'
                                                    }}
                                                  >
                                                    +
                                                  </button>
                                                </div>
                                                {isModified && (
                                                  <button
                                                    type="button"
                                                    className="icon-btn"
                                                    title="Save this stock change (Enter)"
                                                    onClick={() => handleSaveSingleStockChange(item)}
                                                    disabled={savingPending}
                                                    style={{
                                                      width: '24px',
                                                      height: '24px',
                                                      background: 'var(--success-soft, #eaf7ee)',
                                                      color: 'var(--success, #16a34a)',
                                                      border: '1px solid var(--success, #16a34a)',
                                                      borderRadius: '4px',
                                                      cursor: 'pointer',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      padding: 0
                                                    }}
                                                  >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                      <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })()}

                                          {/* Price */}
                                          <div style={{ fontSize: '12px', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>
                                            {money(item.price)}
                                          </div>

                                          {/* Action Menu */}
                                          <div className="action-menu-wrap" ref={isMenuOpen ? menuRef : null}>
                                            <button
                                              type="button"
                                              className="icon-btn"
                                              title="Variant actions"
                                              onClick={() => setOpenMenuKey(isMenuOpen ? null : menuKey)}
                                              style={{ width: '26px', height: '26px', background: isMenuOpen ? 'var(--muted)' : 'none' }}
                                            >
                                              <Icon name="more" size={14} />
                                            </button>

                                            {isMenuOpen && (
                                              <div className="action-menu-dropdown" style={{ right: 0 }}>
                                                <button
                                                  type="button"
                                                  className="action-menu-item"
                                                  onClick={() => handleOpenAdjust(item)}
                                                >
                                                  <Icon name="edit" size={13} />
                                                  <span>Edit Stock (+ / -)</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  className="action-menu-item"
                                                  onClick={() => handleOpenPrice(item)}
                                                >
                                                  <Icon name="finance" size={13} />
                                                  <span>Edit Price</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  className="action-menu-item"
                                                  onClick={() => handleTogglePublish(item)}
                                                >
                                                  <Icon name="products" size={13} />
                                                  <span>{item.published ? 'Unpublish' : 'Publish to Store'}</span>
                                                </button>

                                                <div className="action-menu-divider" />

                                                <button
                                                  type="button"
                                                  className="action-menu-item"
                                                  onClick={() => handleOpenHistory(item)}
                                                >
                                                  <Icon name="reports" size={13} />
                                                  <span>Stock History & Ledger</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  className="action-menu-item"
                                                  onClick={() => handleOpenBarcode(item)}
                                                >
                                                  <Icon name="products" size={13} />
                                                  <span>View Barcode</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  className="action-menu-item"
                                                  onClick={() => handleOpenSales(item)}
                                                >
                                                  <Icon name="orders" size={13} />
                                                  <span>View Sales</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  className="action-menu-item"
                                                  onClick={() => handleOpenPurchases(item)}
                                                >
                                                  <Icon name="purchases" size={13} />
                                                  <span>View Purchases</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  className="action-menu-item"
                                                  onClick={() => handleOpenReturns(item)}
                                                >
                                                  <Icon name="arrowDown" size={13} />
                                                  <span>View Returns</span>
                                                </button>

                                                <div className="action-menu-divider" />

                                                <button
                                                  type="button"
                                                  className="action-menu-item danger"
                                                  onClick={() => handleArchiveVariant(item)}
                                                >
                                                  <Icon name="trash" size={13} />
                                                  <span>Archive Variant</span>
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="9"><div className="empty-state">No products match the filter.</div></td>
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
                <div>Warehouse: <strong style={{ color: 'var(--primary)' }}>{activeItem.warehouse.name}</strong></div>
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
              {activeItem.m.name} &middot; Size: <strong>{activeItem.size}</strong>, Colour: <strong>{activeItem.color}</strong> ({activeItem.sku})
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
                ✓ The updated price synchronizes everywhere (storefront catalog, variant price, orders).
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
                <strong>{activeItem.m.name}</strong> &middot; Size: {activeItem.size} / Colour: {activeItem.color}
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
                {activeItem.sku}
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
              Sales orders containing SKU <code>{activeItem.sku}</code> ({activeItem.m.name} — {activeItem.size} / {activeItem.color})
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
      {/* FLOATING ACTION BAR FOR UNSAVED STOCK CHANGES */}
      {/* ---------------------------------------------------------------- */}
      {Object.keys(pendingStockChanges).length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface)',
          border: '2px solid var(--accent, #f59e0b)',
          borderRadius: '12px',
          padding: '12px 24px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          zIndex: 1001
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--accent, #f59e0b)'
            }} />
            <span>
              You have <strong>{Object.keys(pendingStockChanges).length}</strong> unsaved stock {Object.keys(pendingStockChanges).length === 1 ? 'change' : 'changes'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleResetPendingChanges}
              disabled={savingPending}
              style={{ minWidth: '75px' }}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleSaveAllPendingChanges}
              disabled={savingPending}
              style={{ minWidth: '120px', fontWeight: 600 }}
            >
              {savingPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
