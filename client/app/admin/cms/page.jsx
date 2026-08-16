'use client';
import React, { useState, useEffect } from 'react';
import { loadDB, saveDB, today } from '../../../services/dataStore';
import Icon from '../../../components/admin/Icons';

export default function AdminCmsPage() {
  const [pages, setPages] = useState([]);
  const [homepageSections, setHomepageSections] = useState([
    'Hero banner',
    'Featured products',
    'New arrivals',
    'Category spotlight',
    'Newsletter signup'
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [formData, setFormData] = useState({ title: '', slug: '', status: 'published', meta: '', content: '' });

  const refreshData = () => {
    const db = loadDB();
    setPages(db.pages || []);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const moveSection = (index, direction) => {
    const newSections = [...homepageSections];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setHomepageSections(newSections);
  };

  const openNewPageModal = () => {
    setEditingPage(null);
    setFormData({ title: '', slug: '', status: 'published', meta: '', content: '' });
    setModalOpen(true);
  };

  const openEditPageModal = (p) => {
    setEditingPage(p);
    setFormData({
      title: p.title || '',
      slug: p.slug || '',
      status: p.status || 'published',
      meta: p.meta || '',
      content: p.content || ''
    });
    setModalOpen(true);
  };

  const handleSavePage = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    const db = loadDB();
    const list = db.pages || [];
    const slug = formData.slug.trim() || ('/' + formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    
    if (editingPage) {
      const idx = list.findIndex(p => p.id === editingPage.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...formData, slug, updated: today() };
      }
    } else {
      const newP = {
        id: 'pg' + Date.now(),
        ...formData,
        slug,
        updated: today()
      };
      list.push(newP);
    }
    db.pages = list;
    saveDB(db);
    setModalOpen(false);
    refreshData();
  };

  const handleDeletePage = (id) => {
    if (!confirm('Delete this page?')) return;
    const db = loadDB();
    db.pages = (db.pages || []).filter(p => p.id !== id);
    saveDB(db);
    refreshData();
  };

  const badgeClass = { published: 'badge-success', draft: 'badge-muted', scheduled: 'badge-accent' };

  return (
    <div>
      <div className="page-head">
        <h1>CMS Page Manager</h1>
        <p>Website content pages and homepage section arrangement builder.</p>
      </div>

      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={openNewPageModal}>
          + New page
        </button>
      </div>

      <div className="card table-wrap" style={{ marginBottom: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>Page Title</th>
              <th>URL Slug</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.length > 0 ? (
              pages.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong></td>
                  <td><code>{p.slug}</code></td>
                  <td><span className={`badge ${badgeClass[p.status] || 'badge-muted'}`}>{p.status}</span></td>
                  <td>{p.updated || p.lastUpdated || today()}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm" onClick={() => openEditPageModal(p)}>Edit</button>{' '}
                    <button className="icon-btn" title="Delete" onClick={() => handleDeletePage(p.id)}><Icon name="trash" size={15} /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5"><div className="empty-state">No content pages defined yet.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card card-pad form-max">
        <div className="section-title">Homepage Section Builder</div>
        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: '0 0 14px' }}>
          Re-order storefront homepage component blocks.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {homepageSections.map((sec, idx) => (
            <div key={idx} className="hb-row">
              <span style={{ fontWeight: 500 }}>{sec}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={idx === 0}
                  onClick={() => moveSection(idx, -1)}
                  title="Move Up"
                >
                  <Icon name="arrowUp" size={14} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={idx === homepageSections.length - 1}
                  onClick={() => moveSection(idx, 1)}
                  title="Move Down"
                >
                  <Icon name="arrowDown" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <h2>{editingPage ? 'Edit Page' : 'New Page'}</h2>
            <form onSubmit={handleSavePage}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Title</label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: formData.slug || ('/' + e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')) })}
                    placeholder="e.g. Terms of Service"
                    required
                  />
                </div>
                <div className="field">
                  <label>URL Slug</label>
                  <input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="/terms"
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field">
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                <div className="field">
                  <label>Meta Description (SEO)</label>
                  <input
                    value={formData.meta}
                    onChange={(e) => setFormData({ ...formData, meta: e.target.value })}
                    placeholder="SEO meta description..."
                  />
                </div>
              </div>

              <div className="field">
                <label>Content</label>
                <textarea
                  rows="6"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Page content HTML / markdown..."
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save page</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

