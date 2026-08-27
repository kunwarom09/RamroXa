'use client';
import React, { useState, useEffect } from 'react';
import { today } from '../../../services/formatters';
import Icon from '../../../components/admin/Icons';
import {
  SECTION_WIDGET_TYPES,
  DEFAULT_HOMEPAGE_CONFIG,
  loadHomepageConfig,
  saveHomepageConfig,
  resetHomepageConfig
} from '../../../services/homepageCms';

export default function AdminCmsPage() {
  // Static content pages
  const [pages, setPages] = useState([
    { id: 'pg_about', title: 'About Ramroxa', slug: '/about', status: 'published', updated: today() },
    { id: 'pg_shipping', title: 'Shipping & Delivery', slug: '/shipping', status: 'published', updated: today() },
    { id: 'pg_returns', title: 'Returns & Exchanges', slug: '/returns', status: 'published', updated: today() },
    { id: 'pg_privacy', title: 'Privacy Policy', slug: '/privacy', status: 'published', updated: today() }
  ]);

  // Dynamic Homepage Sections State
  const [sections, setSections] = useState([]);
  const [expandedSectionId, setExpandedSectionId] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  // Page modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [formData, setFormData] = useState({ title: '', slug: '', status: 'published', meta: '', content: '' });

  useEffect(() => {
    const config = loadHomepageConfig();
    setSections(config.sections || DEFAULT_HOMEPAGE_CONFIG.sections);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Section Reordering
  const moveSection = (index, direction) => {
    const nextSections = [...sections];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= nextSections.length) return;
    const temp = nextSections[index];
    nextSections[index] = nextSections[targetIndex];
    nextSections[targetIndex] = temp;
    setSections(nextSections);
  };

  // Section Toggle
  const toggleSectionEnabled = (id) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  // Widget Type Change
  const handleWidgetTypeChange = (id, newWidgetType) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, widgetType: newWidgetType } : s));
  };

  // Section Config Field Change
  const handleConfigChange = (sectionId, fieldPath, value) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const newConfig = { ...sec.config };
      
      if (fieldPath.includes('.')) {
        const parts = fieldPath.split('.');
        if (parts.length === 2) {
          newConfig[parts[0]] = { ...(newConfig[parts[0]] || {}), [parts[1]]: value };
        } else if (parts.length === 3) {
          // e.g. items.0.title
          const [arrayKey, indexStr, itemKey] = parts;
          const idx = parseInt(indexStr, 10);
          const newArray = [...(newConfig[arrayKey] || [])];
          if (newArray[idx]) {
            newArray[idx] = { ...newArray[idx], [itemKey]: value };
            newConfig[arrayKey] = newArray;
          }
        }
      } else {
        newConfig[fieldPath] = value;
      }

      return { ...sec, config: newConfig };
    }));
  };

  // Save Homepage Configuration
  const handleSaveHomepage = () => {
    saveHomepageConfig({ sections });
    showToast('✓ Homepage section layout and widget types saved successfully!');
  };

  // Reset to Defaults
  const handleResetHomepage = () => {
    if (!confirm('Reset all homepage sections and widget layouts to default?')) return;
    const defaultConfig = resetHomepageConfig();
    setSections(defaultConfig.sections);
    showToast('✓ Homepage sections reset to default layout.');
  };

  // Page modal actions
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
    const slug = formData.slug.trim() || ('/' + formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    
    if (editingPage) {
      setPages(prev => prev.map(p => p.id === editingPage.id ? { ...p, ...formData, slug, updated: today() } : p));
    } else {
      const newP = {
        id: 'pg' + Date.now(),
        ...formData,
        slug,
        updated: today()
      };
      setPages(prev => [...prev, newP]);
    }
    setModalOpen(false);
  };

  const handleDeletePage = (id) => {
    if (!confirm('Delete this page?')) return;
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const badgeClass = { published: 'badge-success', draft: 'badge-muted', scheduled: 'badge-accent' };

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
        <h1>CMS Page &amp; Storefront Section Builder</h1>
        <p>Manage dynamic homepage sections, choose layout widget types, and edit content pages.</p>
      </div>

      {/* ─── HOMEPAGE SECTION BUILDER ────────────────────────────────────────── */}
      <div className="card card-pad" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>Homepage Section Builder</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--muted-foreground)', margin: '4px 0 0' }}>
              Reorder sections, select widget layout styles, and customize content blocks.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm" onClick={() => window.open('/', '_blank')}>
              ↗ Preview Storefront
            </button>
            <button type="button" className="btn btn-sm btn-danger" onClick={handleResetHomepage}>
              Reset to Defaults
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveHomepage}>
              💾 Save Homepage Layout
            </button>
          </div>
        </div>

        {/* Section List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sections.map((sec, idx) => {
            const isExpanded = expandedSectionId === sec.id;
            const availableWidgets = SECTION_WIDGET_TYPES[sec.type] || [];

            return (
              <div
                key={sec.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  background: sec.enabled ? 'var(--surface)' : 'var(--muted)',
                  opacity: sec.enabled ? 1 : 0.75,
                  overflow: 'hidden',
                  transition: 'background 0.15s, border-color 0.15s'
                }}
              >
                {/* Section Header Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  {/* Left: Reorder & Status Toggle & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: '22px', height: '22px', padding: 0 }}
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, -1)}
                        title="Move Up"
                      >
                        <Icon name="arrowUp" size={13} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: '22px', height: '22px', padding: 0 }}
                        disabled={idx === sections.length - 1}
                        onClick={() => moveSection(idx, 1)}
                        title="Move Down"
                      >
                        <Icon name="arrowDown" size={13} />
                      </button>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '13px', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={() => toggleSectionEnabled(sec.id)}
                      />
                      <span>{sec.name}</span>
                    </label>

                    <span style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                      fontWeight: 600
                    }}>
                      {sec.type}
                    </span>
                  </div>

                  {/* Right: Widget Type Selector & Expand Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: 0 }}>Widget Type:</label>
                      <select
                        value={sec.widgetType}
                        onChange={(e) => handleWidgetTypeChange(sec.id, e.target.value)}
                        style={{
                          height: '30px',
                          padding: '0 8px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--canvas)',
                          color: 'var(--primary)',
                          fontWeight: 500
                        }}
                      >
                        {availableWidgets.map(w => (
                          <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setExpandedSectionId(isExpanded ? null : sec.id)}
                      style={{ fontSize: '11.5px', height: '28px', padding: '0 10px' }}
                    >
                      {isExpanded ? '▲ Close' : '▼ Configure'}
                    </button>
                  </div>
                </div>

                {/* Section Configuration Panel */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    padding: '16px',
                    background: 'var(--canvas)'
                  }}>
                    {/* ─── Hero Config ─── */}
                    {sec.type === 'hero' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div className="form-grid-2">
                          <div className="field">
                            <label>Autoplay</label>
                            <select
                              value={sec.config?.autoplay ? 'true' : 'false'}
                              onChange={(e) => handleConfigChange(sec.id, 'autoplay', e.target.value === 'true')}
                            >
                              <option value="true">Enabled</option>
                              <option value="false">Disabled</option>
                            </select>
                          </div>
                          <div className="field">
                            <label>Slide Duration (ms)</label>
                            <input
                              type="number"
                              value={sec.config?.slideDuration || 6000}
                              onChange={(e) => handleConfigChange(sec.id, 'slideDuration', Number(e.target.value))}
                            />
                          </div>
                        </div>

                        {(sec.config?.slides || []).map((slide, sIdx) => (
                          <div key={slide.id || sIdx} style={{ padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                              Slide #{sIdx + 1}
                            </span>
                            <div className="form-grid-2">
                              <div className="field">
                                <label>Eyebrow Tag</label>
                                <input
                                  value={slide.eyebrow || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `slides.${sIdx}.eyebrow`, e.target.value)}
                                  placeholder="e.g. Footwear"
                                />
                              </div>
                              <div className="field">
                                <label>Image URL / Asset</label>
                                <input
                                  value={slide.image || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `slides.${sIdx}.image`, e.target.value)}
                                  placeholder="/hero-slide-1.jpg"
                                />
                              </div>
                            </div>
                            <div className="field" style={{ marginTop: '8px' }}>
                              <label>Heading (Use newline for 2-line title)</label>
                              <textarea
                                rows="2"
                                value={slide.heading || ''}
                                onChange={(e) => handleConfigChange(sec.id, `slides.${sIdx}.heading`, e.target.value)}
                                placeholder="Premium wear&#10;for modern living"
                              />
                            </div>
                            <div className="field" style={{ marginTop: '8px' }}>
                              <label>Description Copy</label>
                              <input
                                value={slide.description || ''}
                                onChange={(e) => handleConfigChange(sec.id, `slides.${sIdx}.description`, e.target.value)}
                                placeholder="Discover our new range..."
                              />
                            </div>
                            <div className="form-grid-2" style={{ marginTop: '8px' }}>
                              <div className="field">
                                <label>Primary Button Label &amp; URL</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <input
                                    value={slide.primaryCta || ''}
                                    onChange={(e) => handleConfigChange(sec.id, `slides.${sIdx}.primaryCta`, e.target.value)}
                                    placeholder="See all collections"
                                  />
                                  <input
                                    value={slide.primaryCtaUrl || ''}
                                    onChange={(e) => handleConfigChange(sec.id, `slides.${sIdx}.primaryCtaUrl`, e.target.value)}
                                    placeholder="/shop"
                                  />
                                </div>
                              </div>
                              <div className="field">
                                <label>Secondary Button Label &amp; URL</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <input
                                    value={slide.secondaryCta || ''}
                                    onChange={(e) => handleConfigChange(sec.id, `slides.${sIdx}.secondaryCta`, e.target.value)}
                                    placeholder="Contact us"
                                  />
                                  <input
                                    value={slide.secondaryCtaUrl || ''}
                                    onChange={(e) => handleConfigChange(sec.id, `slides.${sIdx}.secondaryCtaUrl`, e.target.value)}
                                    placeholder="/contact"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ─── Featured / Best Sellers Config ─── */}
                    {(sec.type === 'featured' || sec.type === 'bestsellers') && (
                      <div className="form-grid-2">
                        <div className="field">
                          <label>Section Eyebrow</label>
                          <input
                            value={sec.config?.eyebrow || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'eyebrow', e.target.value)}
                            placeholder="e.g. Top Picks"
                          />
                        </div>
                        <div className="field">
                          <label>Section Heading</label>
                          <input
                            value={sec.config?.title || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'title', e.target.value)}
                            placeholder="e.g. Best Sellers"
                          />
                        </div>
                        <div className="field">
                          <label>Max Products to Display</label>
                          <input
                            type="number"
                            value={sec.config?.limit || 4}
                            onChange={(e) => handleConfigChange(sec.id, 'limit', Number(e.target.value))}
                          />
                        </div>
                        <div className="field">
                          <label>Filter Tag / Rule</label>
                          <input
                            value={sec.config?.tag || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'tag', e.target.value)}
                            placeholder="e.g. bestSelling or featured"
                          />
                        </div>
                      </div>
                    )}

                    {/* ─── Categories Spotlight Config ─── */}
                    {sec.type === 'categories' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="form-grid-2">
                          <div className="field">
                            <label>Section Eyebrow</label>
                            <input
                              value={sec.config?.eyebrow || 'Collections'}
                              onChange={(e) => handleConfigChange(sec.id, 'eyebrow', e.target.value)}
                            />
                          </div>
                          <div className="field">
                            <label>Section Heading</label>
                            <input
                              value={sec.config?.title || 'Shop by Categories'}
                              onChange={(e) => handleConfigChange(sec.id, 'title', e.target.value)}
                            />
                          </div>
                        </div>

                        {(sec.config?.items || []).map((cat, cIdx) => (
                          <div key={cat.id || cIdx} style={{ padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                              Card {cIdx + 1}: {cat.title || 'Category'}
                            </span>
                            <div className="form-grid-2">
                              <div className="field">
                                <label>Pill Tag (e.g. MEN / WOMEN / KIDS)</label>
                                <input
                                  value={cat.title || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `items.${cIdx}.title`, e.target.value)}
                                />
                              </div>
                              <div className="field">
                                <label>Card Heading</label>
                                <input
                                  value={cat.heading || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `items.${cIdx}.heading`, e.target.value)}
                                />
                              </div>
                              <div className="field">
                                <label>Button CTA</label>
                                <input
                                  value={cat.cta || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `items.${cIdx}.cta`, e.target.value)}
                                />
                              </div>
                              <div className="field">
                                <label>Image URL</label>
                                <input
                                  value={cat.image || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `items.${cIdx}.image`, e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ─── Video Narrative Config ─── */}
                    {sec.type === 'video' && (
                      <div className="form-grid-2">
                        <div className="field">
                          <label>Video URL (.mp4 / stream)</label>
                          <input
                            value={sec.config?.videoUrl || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'videoUrl', e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="field">
                          <label>Poster Image</label>
                          <input
                            value={sec.config?.posterImage || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'posterImage', e.target.value)}
                            placeholder="/assets/..."
                          />
                        </div>
                        <div className="field">
                          <label>Heading</label>
                          <input
                            value={sec.config?.heading || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'heading', e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>Button Label &amp; URL</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              value={sec.config?.cta || ''}
                              onChange={(e) => handleConfigChange(sec.id, 'cta', e.target.value)}
                              placeholder="Explore Collection"
                            />
                            <input
                              value={sec.config?.ctaUrl || ''}
                              onChange={(e) => handleConfigChange(sec.id, 'ctaUrl', e.target.value)}
                              placeholder="/shop"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── Community / Newsletter Config ─── */}
                    {sec.type === 'community' && (
                      <div className="form-grid-2">
                        <div className="field">
                          <label>Heading</label>
                          <input
                            value={sec.config?.heading || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'heading', e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>Subheading (Italic text)</label>
                          <input
                            value={sec.config?.subheading || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'subheading', e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>Description</label>
                          <input
                            value={sec.config?.description || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'description', e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>CTA Button Label</label>
                          <input
                            value={sec.config?.cta || ''}
                            onChange={(e) => handleConfigChange(sec.id, 'cta', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button type="button" className="btn" onClick={handleResetHomepage}>
            Reset to Defaults
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSaveHomepage}>
            💾 Save Homepage Layout
          </button>
        </div>
      </div>

      {/* ─── CONTENT PAGES TABLE ─────────────────────────────────────────────── */}
      <div className="card table-wrap" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 700 }}>Custom Content Pages</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Static policies and informative pages</span>
          </div>
          <button className="btn btn-sm btn-primary" onClick={openNewPageModal}>
            + New page
          </button>
        </div>

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

      {/* Edit/New Page Modal */}
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
