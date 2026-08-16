'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { money, slugify, getProductThumbnail } from '../../../services/formatters';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

export default function AdminProductsListPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // List view states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/api/admin/products'),
        api.get('/api/categories')
      ]);

      const apiProds = prodRes.data?.products || prodRes.data || [];
      const apiCats = catRes.data || [];

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
        if (p.variants && p.variants.length) {
          extractedVars = [...extractedVars, ...p.variants.map(v => ({ ...v, productId: p.id || String(p._id) }))];
        }
      });

      setProducts(normalizedProds);
      setVariants(extractedVars);
      setCategories(apiCats);
    } catch (e) {
      console.error('Failed to load products from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  const getVariantsOf = (masterId) => {
    return variants.filter((v) => v.productId === masterId);
  };

  const getPublishedVariantCount = (masterId) => {
    return getVariantsOf(masterId).filter((v) => v.published && v.status !== 'archived' && v.status !== 'discontinued').length;
  };

  const handleDuplicate = async (id) => {
    const src = products.find((p) => p.id === id || String(p._id) === id);
    if (!src) return;

    try {
      const copy = {
        name: src.name + ' (Copy)',
        slug: slugify(src.name + ' (Copy)'),
        sku: (src.sku || 'SKU') + '-CPY',
        categoryId: src.categoryId || 'c_tops',
        brand: src.brand || 'Zylo',
        gender: src.gender || 'Unisex',
        basePrice: (src.price || 1500) * 100,
        mrp: (src.mrp || 2000) * 100,
        cost: (src.cost || 700) * 100,
        description: src.description || '',
        options: src.options || { Size: ['S', 'M', 'L'] },
        images: src.images || []
      };

      await api.post('/api/admin/products', copy);
      showToast('Product duplicated successfully in MongoDB');
      refreshData();
    } catch (err) {
      showToast('Failed to duplicate product: ' + (err.message || 'Error'));
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;

    const targetProd = products.find((p) =>
      (p.id && (p.id === id || String(p.id) === String(id))) ||
      (p._id && (p._id === id || String(p._id) === String(id))) ||
      (p.sku && p.sku === id) ||
      (p.slug && p.slug === id)
    );

    const targetId = targetProd?.id || targetProd?._id || id;
    const prodName = targetProd?.name || 'this product';

    if (!confirm(`Delete product "${prodName}" from database?`)) return;

    try {
      await api.delete(`/api/admin/products/${targetId}`);
      showToast(`Product "${prodName}" deleted from MongoDB`);
      refreshData();
    } catch (apiErr) {
      showToast(`Failed to delete product: ${apiErr.message || 'Error'}`);
    }
  };

  const filtered = products.filter((p) => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.categoryId === categoryFilter;
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? filtered.map((p) => p.id) : []);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
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
      } catch (e) {}
    }
    setSelectedIds([]);
    refreshData();
    showToast(`Bulk action "${action}" applied to MongoDB`);
  };

  const exportCsv = () => {
    const headers = ['Master', 'SKU', 'Brand', 'Category', 'Price', 'MRP', 'Cost', 'Variants', 'Published Variants', 'Status'];
    const rows = filtered.map((p) => [
      `"${p.name}"`, p.sku, `"${p.brand}"`, `"${categories.find((c) => c.id === p.categoryId)?.name || p.categoryId || ''}"`,
      p.price, p.mrp || 0, p.cost || 0, getVariantsOf(p.id).length, getPublishedVariantCount(p.id), p.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'zylo-master-products.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <h1>Master products</h1>
        <p suppressHydrationWarning>
          {mounted ? `${filtered.length} of ${products.length} master products · ${variants.length} variants total` : 'Loading master products...'}
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
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>
          <Icon name="download" size={15} /> Export CSV
        </button>
        <Link href="/admin/products/new" className="btn btn-primary">
          + New master product
        </Link>
      </div>

      {selectedIds.length > 0 && (
        <div className="bulk-bar" style={{ display: 'flex' }}>
          <span>{selectedIds.length} selected</span>
          <div className="spacer" />
          <button onClick={() => handleBulkAction('publish')}>Publish</button>
          <button onClick={() => handleBulkAction('unpublish')}>Unpublish</button>
          <button onClick={() => handleBulkAction('archive')}>Archive</button>
          <button onClick={() => handleBulkAction('duplicate')}>Duplicate</button>
        </div>
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: '32px' }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
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
            {filtered.length > 0 ? (
              filtered.map((p) => {
                const isChecked = selectedIds.includes(p.id);
                const cat = categories.find((c) => c.id === p.categoryId);
                const vCount = getVariantsOf(p.id).length;
                const pubCount = getPublishedVariantCount(p.id);
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
                      <Link href={`/admin/products/${p.id}`} style={{ fontWeight: 500 }}>
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
                      <Link href={`/admin/products/${p.id}`} className="icon-btn" title="Edit">
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
                  <div className="empty-state">No master products match your filter.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
