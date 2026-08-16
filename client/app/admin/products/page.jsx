'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadDB, saveDB, money, slugify } from '../../../services/dataStore';
import Icon from '../../../components/admin/Icons';

export default function AdminProductsListPage() {
  const router = useRouter();
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

  const refreshData = () => {
    const db = loadDB();
    setProducts(db.products || []);
    setVariants(db.variants || []);
    setCategories(db.categories || []);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const getVariantsOf = (masterId) => {
    return variants.filter((v) => v.productId === masterId);
  };

  const getPublishedVariantCount = (masterId) => {
    return getVariantsOf(masterId).filter((v) => v.published && v.status !== 'archived' && v.status !== 'discontinued').length;
  };

  const handleDuplicate = (id) => {
    const src = products.find((p) => p.id === id);
    if (!src) return;
    const db = loadDB();
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'm_' + Date.now().toString(36);
    copy.name = src.name + ' (copy)';
    copy.slug = slugify(copy.name);
    copy.sku = src.sku + '-C' + String((db.products || []).length + 1);
    copy.status = 'draft';
    db.products.push(copy);
    saveDB(db);
    refreshData();
    showToast('Product duplicated');
  };

  const handleDelete = (id) => {
    const vCount = getVariantsOf(id).length;
    if (!confirm(`Delete this master product and its ${vCount} variant(s)?`)) return;
    const db = loadDB();
    db.products = (db.products || []).filter((p) => p.id !== id);
    db.variants = (db.variants || []).filter((v) => v.productId !== id);
    saveDB(db);
    refreshData();
    showToast('Product deleted');
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

  const handleBulkAction = (action) => {
    if (!selectedIds.length) return;
    if (action === 'duplicate') {
      selectedIds.forEach((id) => handleDuplicate(id));
      setSelectedIds([]);
      return;
    }
    const db = loadDB();
    db.products = (db.products || []).map((p) => {
      if (!selectedIds.includes(p.id)) return p;
      if (action === 'publish') return { ...p, status: 'published' };
      if (action === 'unpublish') return { ...p, status: 'draft' };
      if (action === 'archive') return { ...p, status: 'archived' };
      return p;
    });
    saveDB(db);
    setSelectedIds([]);
    refreshData();
    showToast(`Bulk action "${action}" applied`);
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
        <p>{filtered.length} of {products.length} master products &middot; {variants.length} variants total</p>
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
                const featImg = (p.images || []).find((img) => img.isFeatured) || (p.images || [])[0];

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
                        {featImg ? (
                          <img src={featImg.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Icon name="camera" size={14} />
                        )}
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
