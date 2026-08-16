'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, saveDB, slugify } from '../../../services/dataStore';
import Icon from '../../../components/admin/Icons';

export default function AdminCategoriesPage() {
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '',
    sortOrder: 0,
    status: 'active',
    featured: false,
    visible: true,
    description: '',
    image: '',
    banner: '',
    icon: '',
    metaTitle: '',
    metaDesc: ''
  });

  const refreshData = () => {
    const db = loadDB();
    setCategories(db.categories || []);
    setProducts(db.products || []);
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  const getCatChildren = (parentId) => {
    return categories
      .filter(c => (c.parentId || null) === (parentId || null))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  };

  const getCatDescendants = (catId) => {
    const out = [];
    const walk = (pid) => {
      getCatChildren(pid).forEach(c => {
        out.push(c.id);
        walk(c.id);
      });
    };
    walk(catId);
    return out;
  };

  const productCountInCat = (catId, includeChildren) => {
    const ids = [catId, ...(includeChildren ? getCatDescendants(catId) : [])];
    return products.filter(p => ids.includes(p.categoryId)).length;
  };

  const getCatFlat = () => {
    const out = [];
    const walk = (pid, depth) => {
      getCatChildren(pid).forEach(c => {
        out.push({ cat: c, depth });
        walk(c.id, depth + 1);
      });
    };
    walk(null, 0);
    return out;
  };

  const openNewCategoryModal = () => {
    setEditingCat(null);
    setFormData({
      name: '',
      slug: '',
      parentId: '',
      sortOrder: categories.length,
      status: 'active',
      featured: false,
      visible: true,
      description: '',
      image: '',
      banner: '',
      icon: '',
      metaTitle: '',
      metaDesc: ''
    });
    setModalOpen(true);
  };

  const openEditCategoryModal = (cat) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      parentId: cat.parentId || '',
      sortOrder: cat.sortOrder || 0,
      status: cat.status || 'active',
      featured: !!cat.featured,
      visible: cat.visible !== false,
      description: cat.description || '',
      image: cat.image || '',
      banner: cat.banner || '',
      icon: cat.icon || '',
      metaTitle: cat.metaTitle || '',
      metaDesc: cat.metaDesc || ''
    });
    setModalOpen(true);
  };

  const handleNameChange = (val) => {
    const autoSlug = slugify ? slugify(val) : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData(prev => ({
      ...prev,
      name: val,
      slug: editingCat ? prev.slug : autoSlug
    }));
  };

  const handleMove = (id, dir) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    const sibs = getCatChildren(cat.parentId);
    const idx = sibs.findIndex(s => s.id === id);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sibs.length) return;
    const a = sibs[idx];
    const b = sibs[targetIdx];
    const tmp = a.sortOrder || 0;
    a.sortOrder = b.sortOrder || 0;
    b.sortOrder = tmp;
    if (a.sortOrder === b.sortOrder) {
      a.sortOrder = idx;
      b.sortOrder = targetIdx;
    }
    
    const db = loadDB();
    db.categories = db.categories.map(c => {
      if (c.id === a.id) return { ...c, sortOrder: a.sortOrder };
      if (c.id === b.id) return { ...c, sortOrder: b.sortOrder };
      return c;
    });
    saveDB(db);
    refreshData();
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const db = loadDB();
    const list = db.categories || [];
    const parentVal = formData.parentId || null;

    if (editingCat) {
      const idx = list.findIndex(c => c.id === editingCat.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...formData, parentId: parentVal };
      }
    } else {
      const newCat = {
        id: 'c_' + Date.now().toString(36),
        ...formData,
        parentId: parentVal
      };
      list.push(newCat);
    }
    db.categories = list;
    saveDB(db);
    setModalOpen(false);
    refreshData();
  };

  const handleDelete = (id) => {
    const used = productCountInCat(id, true);
    let msg = 'Delete this category?';
    if (used) msg += `\n${used} product(s) in this branch will become uncategorised.`;
    if (!confirm(msg)) return;
    const descendants = [id, ...getCatDescendants(id)];
    const db = loadDB();
    db.categories = (db.categories || []).filter(c => !descendants.includes(c.id));
    if (db.products) {
      db.products.forEach(p => {
        if (descendants.includes(p.categoryId)) p.categoryId = null;
      });
    }
    saveDB(db);
    refreshData();
  };

  const exportCsv = () => {
    const headers = ['Category', 'Slug', 'Products (Direct)', 'Products (Total)', 'Featured', 'Visibility', 'Status'];
    const rows = getCatFlat().map(n => {
      const c = n.cat;
      const own = productCountInCat(c.id, false);
      const deep = productCountInCat(c.id, true);
      return [
        `"${'  '.repeat(n.depth)}${c.name}"`,
        c.slug,
        own,
        deep,
        c.featured ? 'Yes' : 'No',
        c.visible !== false ? 'Yes' : 'No',
        c.status
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'zylo-categories.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const flatList = getCatFlat();
  const blockedIds = editingCat ? [editingCat.id, ...getCatDescendants(editingCat.id)] : [];

  return (
    <div>
      <div className="page-head">
        <h1>Categories</h1>
        <p>Unlimited-depth tree. Drag order with the arrows; the storefront nav follows this structure.</p>
      </div>

      <div className="toolbar">
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        <button className="btn btn-primary" onClick={openNewCategoryModal}>
          + New category
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Slug</th>
              <th className="num">Products</th>
              <th>Featured</th>
              <th>Visibility</th>
              <th>Status</th>
              <th style={{ width: '140px', textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {flatList.length > 0 ? (
              flatList.map(n => {
                const c = n.cat;
                const indent = n.depth * 22;
                const own = productCountInCat(c.id, false);
                const deep = productCountInCat(c.id, true);

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${indent}px` }}>
                        {n.depth > 0 && (
                          <span style={{ color: 'var(--muted-foreground)', marginRight: '8px', fontSize: '13px', fontFamily: 'monospace' }}>
                            └
                          </span>
                        )}
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted-foreground)' }}>{c.slug}</td>
                    <td className="num">
                      {own}
                      {deep !== own && (
                        <span style={{ color: 'var(--muted-foreground)' }}> ({deep})</span>
                      )}
                    </td>
                    <td>
                      {c.featured ? (
                        <span className="badge badge-accent">featured</span>
                      ) : (
                        <span style={{ color: 'var(--muted-foreground)' }}>&mdash;</span>
                      )}
                    </td>
                    <td>
                      {c.visible !== false ? (
                        <span className="badge badge-success">visible</span>
                      ) : (
                        <span className="badge badge-muted">hidden</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-muted'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="icon-btn" title="Move up" onClick={() => handleMove(c.id, -1)}>
                        <Icon name="arrowUp" size={14} />
                      </button>
                      <button className="icon-btn" title="Move down" onClick={() => handleMove(c.id, 1)}>
                        <Icon name="arrowDown" size={14} />
                      </button>
                      <button className="icon-btn" title="Edit" onClick={() => openEditCategoryModal(c)}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button className="icon-btn" title="Delete" onClick={() => handleDelete(c.id)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7"><div className="empty-state">{mounted ? 'No categories yet.' : 'Loading categories...'}</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <h2>{editingCat ? 'Edit category' : 'New category'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Menswear"
                    required
                  />
                </div>
                <div className="field">
                  <label>Slug</label>
                  <input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="menswear"
                    required
                  />
                </div>
                <div className="field">
                  <label>Parent category</label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  >
                    <option value="">None (top level)</option>
                    {flatList
                      .filter(n => !blockedIds.includes(n.cat.id))
                      .map(n => (
                        <option key={n.cat.id} value={n.cat.id}>
                          {'\u2014 '.repeat(n.depth)}{n.cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label>Sort order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Category image URL</label>
                  <input
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="field">
                  <label>Banner image URL</label>
                  <input
                    value={formData.banner}
                    onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="field">
                  <label>Icon</label>
                  <input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="field">
                  <label>Meta title</label>
                  <input
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Meta description</label>
                  <input
                    value={formData.metaDesc}
                    onChange={(e) => setFormData({ ...formData, metaDesc: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="checkbox-row" style={{ marginBottom: '16px' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  /> Featured category
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.visible}
                    onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                  /> Visible in navigation
                </label>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
