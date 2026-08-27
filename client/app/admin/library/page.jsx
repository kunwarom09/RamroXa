'use client';
import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/admin/Icons';
import {
  getMediaLibrary,
  uploadMediaFile,
  addExternalMedia,
  deleteMediaItem
} from '../../../services/mediaLibrary';

export default function MediaLibraryPage() {
  const [items, setItems] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [newUrlData, setNewUrlData] = useState({ name: '', url: '', category: 'General' });

  const fileInputRef = useRef(null);

  useEffect(() => {
    setItems(getMediaLibrary());

    const handleUpdate = (e) => {
      setItems(e.detail || getMediaLibrary());
    };
    window.addEventListener('rmx-media-library-updated', handleUpdate);
    return () => window.removeEventListener('rmx-media-library-updated', handleUpdate);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadMediaFile(file, 'Uploads');
      }
      setItems(getMediaLibrary());
      showToast(`✓ Uploaded ${files.length} asset(s) successfully!`);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = (e) => {
    e.preventDefault();
    if (!newUrlData.url.trim()) return;
    addExternalMedia(newUrlData.name, newUrlData.url, newUrlData.category);
    setItems(getMediaLibrary());
    setUrlModalOpen(false);
    setNewUrlData({ name: '', url: '', category: 'General' });
    showToast('✓ Media asset added successfully!');
  };

  const handleDelete = (id) => {
    if (!confirm('Are you sure you want to delete this media asset?')) return;
    const updated = deleteMediaItem(id);
    setItems(updated);
    if (selectedItem?.id === id) setSelectedItem(null);
    showToast('Media asset removed.');
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    showToast('✓ Image URL copied to clipboard!');
  };

  const categories = ['all', 'Hero', 'Men', 'Women', 'Kids', 'Products', 'Uploads'];

  const filteredItems = items.filter(item => {
    const matchCat = filterCategory === 'all' || item.category?.toLowerCase() === filterCategory.toLowerCase();
    const matchSearch = !searchQuery || item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || item.url?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div>
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#16a34a',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '13.5px',
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMsg}
        </div>
      )}

      <div className="page-head">
        <div>
          <h1>Media Library</h1>
          <p>Manage, upload, and organize images and assets for your storefront and CMS builder.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '260px' }}>
          <input
            type="text"
            placeholder="Search media files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '32px' }}
          />
          <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted-foreground)' }}>
            <Icon name="search" size={14} />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : ''}`}
              onClick={() => setFilterCategory(cat)}
              style={{ textTransform: 'capitalize' }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="spacer" />

        {/* Upload Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-sm" onClick={() => setUrlModalOpen(true)}>
            + Add by URL
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Processing...' : '⬆ Upload Media'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Media Grid */}
      <div className="card card-pad">
        {filteredItems.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Icon name="image" size={40} style={{ color: 'var(--muted-foreground)', marginBottom: '12px' }} />
            <h3>No media assets found</h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', margin: '4px 0 16px' }}>
              Upload new images or adjust your category filter to see available assets.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
              Upload Image
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px'
          }}>
            {filteredItems.map(item => (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s'
                }}
                onClick={() => setSelectedItem(item)}
              >
                <div style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  background: `url('${item.url}') center / cover no-repeat`,
                  backgroundColor: '#222',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {item.category || 'Media'}
                  </span>
                </div>

                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--primary)'
                  }} title={item.name}>
                    {item.name}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted-foreground)' }}>
                    <span>{item.size}</span>
                    <span>{item.date}</span>
                  </div>
                </div>

                <div style={{
                  padding: '6px 8px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--canvas)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(item.url); }}
                  >
                    Copy Link
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ width: '24px', height: '24px', padding: 0 }}
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Preview Modal */}
      {selectedItem && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setSelectedItem(null); }}>
          <div className="modal" style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px' }}>{selectedItem.name}</h2>
              <button type="button" className="icon-btn" onClick={() => setSelectedItem(null)}>
                <Icon name="close" size={16} />
              </button>
            </div>

            <div style={{
              width: '100%',
              maxHeight: '360px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <img src={selectedItem.url} alt={selectedItem.name} style={{ maxWidth: '100%', maxHeight: '360px', objectFit: 'contain' }} />
            </div>

            <div className="form-grid-2" style={{ marginBottom: '16px' }}>
              <div className="field">
                <label>Asset URL</label>
                <input value={selectedItem.url} readOnly />
              </div>
              <div className="field">
                <label>Category</label>
                <input value={selectedItem.category || 'General'} readOnly />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-danger" onClick={() => handleDelete(selectedItem.id)}>
                Delete Asset
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => copyToClipboard(selectedItem.url)}>
                  Copy URL
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setSelectedItem(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add External URL Modal */}
      {urlModalOpen && (
        <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) setUrlModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <h2>Add Media Asset by URL</h2>
            <form onSubmit={handleAddUrl}>
              <div className="field" style={{ marginBottom: '12px' }}>
                <label>Asset Name / Title</label>
                <input
                  value={newUrlData.name}
                  onChange={(e) => setNewUrlData({ ...newUrlData, name: e.target.value })}
                  placeholder="e.g. Summer Banner 2026"
                  required
                />
              </div>

              <div className="field" style={{ marginBottom: '12px' }}>
                <label>Direct Image URL</label>
                <input
                  value={newUrlData.url}
                  onChange={(e) => setNewUrlData({ ...newUrlData, url: e.target.value })}
                  placeholder="https://images.unsplash.com/... or /assets/..."
                  required
                />
              </div>

              <div className="field" style={{ marginBottom: '16px' }}>
                <label>Category</label>
                <select
                  value={newUrlData.category}
                  onChange={(e) => setNewUrlData({ ...newUrlData, category: e.target.value })}
                >
                  <option value="Hero">Hero</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Kids">Kids</option>
                  <option value="Products">Products</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => setUrlModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save to Library</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
