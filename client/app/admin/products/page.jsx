'use client';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { money, slugify, getProductThumbnail } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

function getPageNumbers(currentPage, totalPages) {
  if (!totalPages || totalPages <= 0) return [1];
  if (totalPages <= 1) return [1];

  const pagesToShow = new Set([
    1,
    totalPages,
    Math.max(1, currentPage - 1),
    currentPage,
    Math.min(totalPages, currentPage + 1)
  ]);

  const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sortedPages.length; i++) {
    const pageNum = sortedPages[i];
    if (i > 0) {
      const prev = sortedPages[i - 1];
      if (pageNum - prev === 2) {
        result.push(prev + 1);
      } else if (pageNum - prev > 2) {
        result.push('...');
      }
    }
    result.push(pageNum);
  }

  return result;
}

function AdminProductsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);

  // Pagination states
  const initialPage = Math.max(1, parseInt(searchParams?.get('page') || '1', 10));
  const rawLimit = parseInt(searchParams?.get('limit') || '50', 10);
  const initialLimit = [25, 50, 100].includes(rawLimit) ? rawLimit : 50;
  const initialSearch = searchParams?.get('search') || searchParams?.get('q') || '';
  const initialCategory = searchParams?.get('category') || '';
  const initialStatus = searchParams?.get('status') || '';

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [variantsTotal, setVariantsTotal] = useState(0);

  // List filter states
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toastMsg, setToastMsg] = useState('');

  // Bulk Tag states
  const [availableTags, setAvailableTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTagsForBulk, setSelectedTagsForBulk] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');

  const isFirstSearchRef = useRef(true);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const updateUrl = (newPage, newLimit, newSearch, newCategory, newStatus) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(newPage));
    params.set('limit', String(newLimit));

    if (newSearch && newSearch.trim()) {
      params.set('search', newSearch.trim());
    } else {
      params.delete('search');
      params.delete('q');
    }

    if (newCategory && newCategory !== 'all') {
      params.set('category', newCategory);
    } else {
      params.delete('category');
    }

    if (newStatus && newStatus !== 'all') {
      params.set('status', newStatus);
    } else {
      params.delete('status');
    }

    const newUrl = window.location.pathname + '?' + params.toString();
    window.history.pushState(null, '', newUrl);
  };

  const loadData = async (targetPage, targetLimit, targetSearch, targetCategory, targetStatus) => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(targetLimit));
      if (targetSearch && targetSearch.trim()) params.set('search', targetSearch.trim());
      if (targetCategory && targetCategory !== 'all') params.set('category', targetCategory);
      if (targetStatus && targetStatus !== 'all') params.set('status', targetStatus);

      const prodRes = await api.get(`/api/admin/products?${params.toString()}`);
      const resData = prodRes.data || {};
      const apiProds = resData.items || resData.products || prodRes.items || prodRes.products || [];
      const fetchedTotal = resData.total ?? prodRes.total ?? apiProds.length;
      const fetchedPages = resData.totalPages ?? prodRes.totalPages ?? (fetchedTotal === 0 ? 0 : Math.ceil(fetchedTotal / targetLimit));
      const fetchedVariantsTotal = resData.variantsTotal ?? prodRes.variantsTotal ?? 0;

      // Clamp if page is greater than totalPages
      if (fetchedPages > 0 && targetPage > fetchedPages) {
        setPage(fetchedPages);
        updateUrl(fetchedPages, targetLimit, targetSearch, targetCategory, targetStatus);
        return loadData(fetchedPages, targetLimit, targetSearch, targetCategory, targetStatus);
      }

      const normalizedProds = apiProds.map((ap) => {
        const apId = ap.id || String(ap._id);
        return {
          ...ap,
          id: apId,
          price: ap.basePrice ? Math.round(ap.basePrice / 100) : (ap.price || 0),
          mrp: ap.mrp ? Math.round(ap.mrp / 100) : 0,
          cost: ap.cost ? Math.round(ap.cost / 100) : 0
        };
      });

      let extractedVars = [];
      apiProds.forEach((p) => {
        const pId = p.id || String(p._id);
        if (p.allVariants && p.allVariants.length) {
          extractedVars = [...extractedVars, ...p.allVariants.map((v) => ({ ...v, productId: pId }))];
        } else if (p.variants && p.variants.length) {
          p.variants.forEach((v) => {
            extractedVars.push({ ...v, productId: pId });
            if (v.subVariants && v.subVariants.length) {
              v.subVariants.forEach((sv) => {
                extractedVars.push({ ...sv, productId: pId, parentVariant: v });
              });
            }
          });
        }
      });

      setProducts(normalizedProds);
      setVariants(extractedVars);
      setTotal(fetchedTotal);
      setTotalPages(fetchedPages);
      setVariantsTotal(fetchedVariantsTotal);
    } catch (e) {
      console.error('Failed to load products from API:', e);
      showToast('Failed to load products: ' + (e.message || 'Error'));
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  // Initial load
  useEffect(() => {
    setMounted(true);

    Promise.all([
      api.get('/api/categories').catch(() => ({ data: [] })),
      api.get('/api/admin/products/tags').catch(() => ({ data: { tags: [] } }))
    ]).then(([catRes, tagRes]) => {
      const apiCats = catRes.data?.categories || catRes.data?.data?.categories || catRes.data || [];
      const fetchedTags = tagRes.data?.tags || tagRes.data?.data?.tags || [];
      setCategories(apiCats);
      setAvailableTags(Array.from(new Set(Array.isArray(fetchedTags) ? fetchedTags : [])).sort((a, b) => a.localeCompare(b)));
    });

    loadData(initialPage, initialLimit, initialSearch, initialCategory, initialStatus);
  }, []);

  // Handle browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const p = Math.max(1, parseInt(params.get('page') || '1', 10));
      const parsedLimit = parseInt(params.get('limit') || '50', 10);
      const l = [25, 50, 100].includes(parsedLimit) ? parsedLimit : 50;
      const s = params.get('search') || params.get('q') || '';
      const c = params.get('category') || '';
      const st = params.get('status') || '';

      setPage(p);
      setLimit(l);
      setSearch(s);
      setCategoryFilter(c);
      setStatusFilter(st);
      loadData(p, l, s, c, st);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Debounced search
  useEffect(() => {
    if (isFirstSearchRef.current) {
      isFirstSearchRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setPage(1);
      updateUrl(1, limit, search, categoryFilter, statusFilter);
      loadData(1, limit, search, categoryFilter, statusFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleCategoryChange = (val) => {
    setCategoryFilter(val);
    setPage(1);
    updateUrl(1, limit, search, val, statusFilter);
    loadData(1, limit, search, val, statusFilter);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    updateUrl(1, limit, search, categoryFilter, val);
    loadData(1, limit, search, categoryFilter, val);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    updateUrl(1, newLimit, search, categoryFilter, statusFilter);
    loadData(1, newLimit, search, categoryFilter, statusFilter);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (totalPages > 0 && newPage > totalPages) || newPage === page) return;
    setPage(newPage);
    updateUrl(newPage, limit, search, categoryFilter, statusFilter);
    loadData(newPage, limit, search, categoryFilter, statusFilter);
  };

  const getVariantsOf = (p) => {
    if (p.allVariants && p.allVariants.length) return p.allVariants;
    if (p.variants && p.variants.length) return p.variants;
    const pId = p.id || String(p._id);
    return variants.filter((v) => v.productId === pId);
  };

  const getPublishedVariantCount = (p) => {
    return getVariantsOf(p).filter((v) => v.published && v.status !== 'archived' && v.status !== 'discontinued').length;
  };

  const handleDuplicate = async (id) => {
    if (!id) return;

    try {
      showToast('Fetching product details for duplication...');
      const res = await api.get(`/api/admin/products/${encodeURIComponent(id)}`);
      const src = res.data?.product || res.data || res.product;
      if (!src) {
        showToast('Product not found for duplication');
        return;
      }

      const copy = {
        name: src.name + ' (Copy)',
        slug: slugify(src.name + ' (Copy)'),
        sku: (src.sku || 'SKU') + '-CPY',
        categoryId: src.categoryId || 'c_tops',
        brand: src.brand || 'Zylo',
        gender: src.gender || 'Unisex',
        basePrice: src.basePrice || (src.price ? src.price * 100 : 150000),
        mrp: src.mrp || 200000,
        cost: src.cost || 70000,
        description: src.description || '',
        options: src.options || { Size: ['S', 'M', 'L'] },
        images: src.images || []
      };

      await api.post('/api/admin/products', copy);
      showToast('Product duplicated successfully in MongoDB');
      loadData(page, limit, search, categoryFilter, statusFilter);
    } catch (err) {
      showToast('Failed to duplicate product: ' + (err.message || 'Error'));
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;

    let prodName = 'this product';
    const localProd = products.find((p) => p.id === id || String(p._id) === id);
    if (localProd && localProd.name) {
      prodName = localProd.name;
    }

    if (!confirm(`Delete product "${prodName}" from database?`)) return;

    try {
      await api.delete(`/api/admin/products/${encodeURIComponent(id)}`);
      showToast(`Product "${prodName}" deleted from MongoDB`);

      // After deleting the last item on a page, go back to previous page
      const isLastOnPage = products.length === 1 && page > 1;
      const targetPage = isLastOnPage ? page - 1 : page;
      if (isLastOnPage) {
        setPage(targetPage);
        updateUrl(targetPage, limit, search, categoryFilter, statusFilter);
      }
      loadData(targetPage, limit, search, categoryFilter, statusFilter);
    } catch (apiErr) {
      showToast(`Failed to delete product: ${apiErr.message || 'Error'}`);
    }
  };

  // Select-all checkbox applies to the CURRENT PAGE only
  const toggleSelectAll = (checked) => {
    if (checked) {
      const pageIds = products.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(products.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleTagSelection = (tag) => {
    setSelectedTagsForBulk((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddNewTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!availableTags.includes(trimmed)) {
      setAvailableTags((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
    }
    if (!selectedTagsForBulk.includes(trimmed)) {
      setSelectedTagsForBulk((prev) => [...prev, trimmed]);
    }
    setNewTagInput('');
  };

  const handleApplyBulkTags = async () => {
    if (!selectedTagsForBulk.length) {
      showToast('Please select or add at least one tag');
      return;
    }
    setLoading(true);
    try {
      for (const id of selectedIds) {
        let existingTags = [];
        const localProd = products.find((p) => p.id === id || String(p._id) === id);
        if (localProd && Array.isArray(localProd.tags)) {
          existingTags = localProd.tags;
        } else {
          try {
            const pRes = await api.get(`/api/admin/products/${encodeURIComponent(id)}`);
            const pData = pRes.data?.product || pRes.data;
            if (Array.isArray(pData?.tags)) existingTags = pData.tags;
          } catch (e) {}
        }
        const mergedTags = Array.from(new Set([...existingTags, ...selectedTagsForBulk])).filter(Boolean);
        await api.put(`/api/admin/products/${encodeURIComponent(id)}`, { tags: mergedTags });
      }
      showToast(`Added ${selectedTagsForBulk.length} tag(s) to ${selectedIds.length} product(s) in MongoDB`);
      setShowTagModal(false);
      setSelectedTagsForBulk([]);
      setSelectedIds([]);
      loadData(page, limit, search, categoryFilter, statusFilter);
    } catch (err) {
      showToast('Failed to apply tags: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;
    if (action === 'duplicate') {
      for (const id of selectedIds) {
        await handleDuplicate(id);
      }
      setSelectedIds([]);
      return;
    }

    const newStatus = action === 'publish' ? 'published' : (action === 'unpublish' ? 'draft' : 'archived');
    for (const id of selectedIds) {
      try {
        await api.put(`/api/admin/products/${id}`, { status: newStatus });
      } catch (e) { }
    }
    setSelectedIds([]);
    loadData(page, limit, search, categoryFilter, statusFilter);
    showToast(`Bulk action "${action}" applied to MongoDB`);
  };

  // Export CSV exports ALL products matching current filters, not just the current page
  const exportCsv = async () => {
    try {
      showToast('Preparing CSV export of all matching products...');
      const params = new URLSearchParams();
      params.set('all', 'true');
      if (search && search.trim()) params.set('search', search.trim());
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await api.get(`/api/admin/products?${params.toString()}`);
      const resData = res.data || {};
      const allItems = resData.items || resData.products || res.items || res.products || [];

      if (!allItems.length) {
        showToast('No products match current filters to export');
        return;
      }

      const headers = ['Master', 'SKU', 'Brand', 'Category', 'Price', 'MRP', 'Cost', 'Variants', 'Published Variants', 'Status'];
      const rows = allItems.map((p) => {
        const cat = categories.find((c) => c.id === p.categoryId)?.name || p.categoryId || '';
        const allVars = p.allVariants || p.variants || [];
        const pubCount = allVars.filter((v) => v.published && v.status !== 'archived' && v.status !== 'discontinued').length;
        const normPrice = p.basePrice ? Math.round(p.basePrice / 100) : (p.price || 0);
        const normMrp = p.mrp ? Math.round(p.mrp / 100) : 0;
        const normCost = p.cost ? Math.round(p.cost / 100) : 0;

        return [
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${(p.sku || '').replace(/"/g, '""')}"`,
          `"${(p.brand || '').replace(/"/g, '""')}"`,
          `"${cat.replace(/"/g, '""')}"`,
          normPrice,
          normMrp,
          normCost,
          allVars.length,
          pubCount,
          `"${(p.status || '').replace(/"/g, '""')}"`
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `zylo-master-products-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Exported ${allItems.length} products to CSV`);
    } catch (err) {
      showToast('Failed to export CSV: ' + (err.message || 'Error'));
    }
  };

  const from = total > 0 ? (page - 1) * limit + 1 : 0;
  const to = total > 0 ? Math.min(page * limit, total) : 0;
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div>
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', background: 'var(--primary)',
          color: 'var(--primary-foreground)', padding: '10px 18px', borderRadius: '8px',
          fontSize: '13px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toastMsg}
        </div>
      )}

      <div className="page-head">
        <h2>Master products</h2>
        <p suppressHydrationWarning>
          {mounted ? (
            <>
              {`${from}–${to} of ${total} master products · ${variantsTotal} variants total`}
              {isFetching && <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--muted-foreground)' }}>Updating...</span>}
            </>
          ) : 'Loading master products...'}
        </p>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search name or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '230px' }}
        />
        <select value={categoryFilter} onChange={(e) => handleCategoryChange(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <div className="spacer" />
        <button className="btn" onClick={exportCsv} title="Export all filtered products to CSV">
          <Icon name="download" size={15} /> Export CSV
        </button>
        <Link href={`/admin/products/new${typeof window !== 'undefined' && window.location.search ? window.location.search : ''}`} className="btn btn-primary">
          + New master product
        </Link>
      </div>

      {selectedIds.length > 0 && (
        <div className="bulk-bar" style={{ display: 'flex' }}>
          <span>{selectedIds.length} selected</span>
          <div className="spacer" />
          <button
            type="button"
            onClick={() => {
              setShowTagModal(true);
              setSelectedTagsForBulk([]);
              setNewTagInput('');
            }}
          >
            + Add Tags
          </button>
          <button onClick={() => handleBulkAction('publish')}>Publish</button>
          <button onClick={() => handleBulkAction('unpublish')}>Unpublish</button>
          <button onClick={() => handleBulkAction('archive')}>Archive</button>
          <button onClick={() => handleBulkAction('duplicate')}>Duplicate</button>
        </div>
      )}

      {showTagModal && (
        <div className="tag-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowTagModal(false); }}>
          <div className="tag-modal">
            <div className="tag-modal-header">
              <h3>Add Tags to {selectedIds.length} Selected Product{selectedIds.length > 1 ? 's' : ''}</h3>
              <button className="icon-btn" onClick={() => setShowTagModal(false)} title="Close">
                ✕
              </button>
            </div>
            <div className="tag-modal-body">
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                  AVAILABLE TAGS (Click to toggle)
                </label>
                {availableTags.length > 0 ? (
                  <div className="tag-chips-container">
                    {availableTags.map((tag) => {
                      const isSelected = selectedTagsForBulk.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-chip-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => toggleTagSelection(tag)}
                        >
                          <span>{isSelected ? '✓' : '+'}</span>
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', padding: '12px', background: 'var(--canvas)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    No tags exist yet. Add a new tag below.
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                  ADD NEW TAG
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Type new tag name (e.g. core, oversized, premium)..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewTag();
                      }
                    }}
                    style={{
                      flex: 1,
                      height: '36px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--canvas)',
                      color: 'var(--primary)'
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleAddNewTag}
                    style={{ height: '36px', padding: '0 14px' }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {selectedTagsForBulk.length > 0 && (
                <div style={{ background: 'var(--canvas)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                    TAGS TO BE ADDED ({selectedTagsForBulk.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedTagsForBulk.map((t) => (
                      <span
                        key={t}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          fontSize: '12px',
                          padding: '3px 10px',
                          borderRadius: '12px'
                        }}
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => toggleTagSelection(t)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '11px',
                            lineHeight: 1
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="tag-modal-footer">
              <button className="btn" type="button" onClick={() => setShowTagModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleApplyBulkTags}
                disabled={selectedTagsForBulk.length === 0}
              >
                Apply Tags ({selectedTagsForBulk.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card table-wrap">
        <table style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
          <thead>
            <tr>
              <th style={{ width: '32px' }}>
                <input
                  type="checkbox"
                  title="Select all on this page"
                  aria-label="Select all on this page"
                  checked={products.length > 0 && products.every((p) => selectedIds.includes(p.id))}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>
              <th>Image</th>
              <th>Master product</th>
              <th>SKU</th>
              <th>Category</th>
              <th className="num">Price</th>
              <th className="num">Variants</th>
              <th className="num">Published</th>
              <th>Status</th>
              <th style={{ width: '130px' }}></th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((p) => {
                const isChecked = selectedIds.includes(p.id);
                const cat = categories.find((c) => c.id === p.categoryId);
                const vCount = getVariantsOf(p).length;
                const pubCount = getPublishedVariantCount(p);
                const imgUrl = getProductThumbnail(p);

                return (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>
                    <td style={{ width: '48px', padding: '6px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          background: 'var(--muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <img
                          src={imgUrl || '/assets/ea97fe30fd8d1dfc.q.jpg'}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/assets/ea97fe30fd8d1dfc.q.jpg';
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <Link href={`/admin/products/${p.id}${typeof window !== 'undefined' && window.location.search ? window.location.search : ''}`} style={{ fontWeight: 500 }}>
                        {p.name}
                      </Link>
                      <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{p.brand || 'Zylo'}</div>
                    </td>
                    <td><code>{p.sku}</code></td>
                    <td>{cat ? cat.name : '-'}</td>
                    <td className="num">{money(p.price)}</td>
                    <td className="num">{vCount}</td>
                    <td className="num">{pubCount}</td>
                    <td>
                      <span className={`badge ${p.status === 'published' ? 'badge-success' : p.status === 'archived' ? 'badge-danger' : 'badge-muted'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link href={`/admin/products/${p.id}${typeof window !== 'undefined' && window.location.search ? window.location.search : ''}`} className="icon-btn" title="Edit">
                        <Icon name="edit" size={15} />
                      </Link>
                      <button className="icon-btn" title="Delete" onClick={() => handleDelete(p.id)}>
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10">
                  <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    {loading || isFetching ? 'Loading products...' : 'No master products match your filter.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div
        className="pagination-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          marginTop: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            style={{
              height: '32px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--canvas)',
              color: 'var(--primary)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isFetching || loading}
            style={{
              opacity: (page <= 1 || isFetching || loading) ? 0.4 : 1,
              cursor: (page <= 1 || isFetching || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            Prev
          </button>

          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: '0 4px',
                    color: 'var(--muted-foreground)',
                    fontSize: '13px',
                    userSelect: 'none'
                  }}
                >
                  …
                </span>
              );
            }

            const isCurrent = p === page;
            return (
              <button
                key={`page-${p}`}
                type="button"
                className={`btn btn-sm ${isCurrent ? 'btn-primary' : ''}`}
                onClick={() => handlePageChange(p)}
                disabled={isFetching || (isCurrent && totalPages > 0) || totalPages === 0}
                style={{
                  minWidth: '32px',
                  fontWeight: isCurrent ? 600 : 400,
                  opacity: (totalPages === 0) ? 0.4 : 1,
                  cursor: (totalPages === 0 || isCurrent) ? 'default' : 'pointer'
                }}
              >
                {p}
              </button>
            );
          })}

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || totalPages === 0 || isFetching || loading}
            style={{
              opacity: (page >= totalPages || totalPages === 0 || isFetching || loading) ? 0.4 : 1,
              cursor: (page >= totalPages || totalPages === 0 || isFetching || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsListPage() {
  return (
    <Suspense fallback={
      <div>
        <div className="page-head">
          <h2>Master products</h2>
          <p>Loading master products...</p>
        </div>
      </div>
    }>
      <AdminProductsListContent />
    </Suspense>
  );
}
