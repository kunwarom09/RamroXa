'use client';
import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icons';
import {
  getMediaLibrary,
  uploadMediaFile,
  addExternalMedia
} from '../../services/mediaLibrary';

export function MediaPickerModal({ isOpen, onClose, onSelect, title = 'Choose Image from Library' }) {
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'upload' | 'url'
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setItems(getMediaLibrary());
      setSelectedItem(null);
      setCustomUrl('');
      setActiveTab('library');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['all', 'Videos', 'Hero', 'Men', 'Women', 'Kids', 'Products', 'Uploads'];

  const filteredItems = items.filter(item => {
    const matchCat = filterCategory === 'all' || item.category?.toLowerCase() === filterCategory.toLowerCase();
    const matchSearch = !searchQuery || item.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v)$/i.test(file.name);
      const newItem = await uploadMediaFile(file, isVideo ? 'Videos' : 'Uploads');
      setItems(getMediaLibrary());
      setSelectedItem(newItem);
      onSelect(newItem.url);
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    const added = addExternalMedia('External Asset', customUrl.trim(), 'General');
    onSelect(added ? added.url : customUrl.trim());
    onClose();
  };

  const handleConfirmSelection = () => {
    if (!selectedItem) return;
    onSelect(selectedItem.url);
    onClose();
  };

  return (
    <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: '820px', width: '90vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{title}</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Select an existing asset or upload a new one.</span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'library' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            Media Library
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'upload' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload File
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'url' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            External URL
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 0' }}>
          {/* TAB 1: Library */}
          {activeTab === 'library' && (
            <div>
              {/* Search & Filter bar */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '220px', height: '32px', fontSize: '12.5px' }}
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : ''}`}
                      onClick={() => setFilterCategory(cat)}
                      style={{ fontSize: '11px', height: '26px', padding: '0 8px', textTransform: 'capitalize' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted-foreground)' }}>
                  No media assets found.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '12px'
                }}>
                  {filteredItems.map(item => {
                    const isSelected = selectedItem?.id === item.id;
                    const isVid = item.type?.startsWith('video') || item.category === 'Videos' || /\.(mp4|webm|mov|ogg)$/i.test(item.url);
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        style={{
                          border: isSelected ? '2px solid var(--accent, #3b82f6)' : '1px solid var(--border)',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          background: 'var(--surface)',
                          cursor: 'pointer',
                          position: 'relative',
                          boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none'
                        }}
                      >
                        <div style={{
                          width: '100%',
                          aspectRatio: '1/1',
                          background: `url('${item.posterUrl || item.url}') center / cover no-repeat`,
                          backgroundColor: '#1a1a1a',
                          position: 'relative'
                        }}>
                          {isVid && (
                            <span style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '4px',
                              background: 'rgba(0,0,0,0.75)',
                              color: '#fff',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: '3px',
                              letterSpacing: '0.02em'
                            }}>
                              🎬 VIDEO
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '6px 8px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--primary)'
                          }} title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#3b82f6',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 800
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upload New */}
          {activeTab === 'upload' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed var(--border)',
              borderRadius: '8px',
              padding: '60px 20px',
              textAlign: 'center',
              background: 'var(--surface)'
            }}>
              <Icon name="upload" size={36} style={{ color: 'var(--muted-foreground)', marginBottom: '14px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '15px' }}>Upload Image from your Device</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--muted-foreground)', margin: '0 0 18px', maxWidth: '380px' }}>
                PNG, JPG, JPEG, WebP. High resolution images are automatically optimized for fast storefront performance.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Processing Image...' : 'Choose File to Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* TAB 3: Direct URL */}
          {activeTab === 'url' && (
            <form onSubmit={handleApplyCustomUrl} style={{ maxWidth: '520px', margin: '20px auto' }}>
              <div className="field" style={{ marginBottom: '14px' }}>
                <label>Direct Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... or /assets/..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  required
                />
              </div>
              {customUrl && (
                <div style={{ marginBottom: '14px', borderRadius: '6px', overflow: 'hidden', maxHeight: '180px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={customUrl} alt="Preview" style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary">Use This Image</button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'library' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
              {selectedItem ? `Selected: ${selectedItem.name}` : 'No image selected'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={!selectedItem}
                onClick={handleConfirmSelection}
              >
                Use Selected Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REUSABLE IMAGE PICKER FIELD COMPONENT ──────────────────────────────────
export function ImagePickerField({ label, value, onChange, placeholder = 'No image selected' }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--surface)',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid var(--border)'
      }}>
        {/* Thumbnail */}
        <div
          onClick={() => setModalOpen(true)}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '4px',
            background: value ? `url('${value}') center / cover no-repeat` : 'var(--muted)',
            backgroundColor: '#222',
            flexShrink: 0,
            cursor: 'pointer',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Click to change image"
        >
          {!value && <Icon name="image" size={18} style={{ color: 'var(--muted-foreground)' }} />}
        </div>

        {/* Info & URL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              fontSize: '12px',
              padding: '6px 10px',
              height: '30px',
              marginBottom: '4px'
            }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
              onClick={() => setModalOpen(true)}
            >
              🖼 Choose from Library / Upload
            </button>
            {value && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
                onClick={() => onChange('')}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <MediaPickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(selectedUrl) => onChange(selectedUrl)}
        title={`Select ${label || 'Image'}`}
      />
    </div>
  );
}

// ─── REUSABLE VIDEO PICKER FIELD COMPONENT ──────────────────────────────────
export function VideoPickerField({
  label = 'Video URL (.mp4 / stream)',
  value,
  onChange,
  posterValue,
  onPosterChange,
  placeholder = 'https://... or upload .mp4'
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const presets = [
    {
      name: '🎬 Ramroxa Brand Narrative Film',
      url: '/videos/ramroxa-brand-video.mp4',
      poster: '/assets/59a3737ee018272f.q.jpg'
    },
    {
      name: '👟 Everyday Motion Showcase',
      url: '/videos/sample-video.mp4',
      poster: '/assets/98eab38550301ca9.q.jpg'
    }
  ];

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setLoadError(null);
    try {
      const newItem = await uploadMediaFile(file, 'Videos');
      onChange(newItem.url);
    } catch (err) {
      console.error('Video upload failed:', err);
      alert('Failed to upload video: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="field" style={{ gridColumn: '1 / -1' }}>
      {label && (
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{label}</span>
          {value ? (
            <span style={{ fontSize: '11px', color: 'var(--success, #10b981)', fontWeight: 600 }}>✓ Video Connected</span>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>No Video Configured</span>
          )}
        </label>
      )}

      <div style={{
        background: 'var(--surface)',
        padding: '14px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Main Video Input & Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => {
              setLoadError(null);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            style={{
              flex: 1,
              fontSize: '13px',
              padding: '8px 12px',
              fontFamily: 'monospace'
            }}
          />
          <button
            type="button"
            className="btn btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Icon name="upload" size={14} />
            {uploading ? 'Uploading Video...' : '⬆ Upload .mp4'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => setModalOpen(true)}
          >
            🎬 Media Library
          </button>
          {value && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                setLoadError(null);
                onChange('');
              }}
              title="Clear video URL"
            >
              Clear
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleVideoUpload}
          />
        </div>

        {/* Video Presets Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 600 }}>⚡ Presets:</span>
          {presets.map((pr, idx) => (
            <button
              key={idx}
              type="button"
              className="btn btn-sm"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: value === pr.url ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--canvas)',
                borderColor: value === pr.url ? 'var(--accent)' : 'var(--border)'
              }}
              onClick={() => {
                setLoadError(null);
                onChange(pr.url);
                if (onPosterChange && pr.poster) onPosterChange(pr.poster);
              }}
            >
              {pr.name}
            </button>
          ))}
        </div>

        {/* Live Video Preview Box */}
        {value ? (
          <div style={{
            position: 'relative',
            borderRadius: '6px',
            overflow: 'hidden',
            background: '#0a0a0a',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ position: 'relative', width: '100%', maxHeight: '240px', background: '#000' }}>
              <video
                key={value}
                ref={videoRef}
                src={value}
                poster={posterValue || undefined}
                controls
                playsInline
                preload="metadata"
                style={{ width: '100%', maxHeight: '240px', display: 'block', margin: '0 auto', objectFit: 'contain' }}
                onError={() => setLoadError('Could not load or decode video from this source.')}
                onLoadedData={() => setLoadError(null)}
              />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 10px',
              background: 'rgba(0,0,0,0.85)',
              borderTop: '1px solid var(--border)',
              fontSize: '11px',
              color: 'var(--muted-foreground)'
            }}>
              <span>🎬 Preview Source: <code style={{ color: '#fff' }}>{value.length > 50 ? value.slice(0, 47) + '...' : value}</code></span>
              {loadError ? (
                <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ {loadError}</span>
              ) : (
                <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Video Preview Ready</span>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            padding: '20px',
            border: '1px dashed var(--border)',
            borderRadius: '6px',
            textAlign: 'center',
            background: 'var(--canvas)',
            color: 'var(--muted-foreground)'
          }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🎬</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>No Video Uploaded</div>
            <div style={{ fontSize: '12px', marginTop: '2px' }}>
              Upload a .mp4 file, select from Media Library, or click a Preset above to preview here.
            </div>
          </div>
        )}
      </div>

      <MediaPickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(selectedUrl) => {
          setLoadError(null);
          onChange(selectedUrl);
        }}
        title="Select Video from Library"
      />
    </div>
  );
}
