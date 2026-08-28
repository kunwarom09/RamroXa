'use client';
import React, { useState, useEffect, useRef } from 'react';
import { today } from '../../../services/formatters';
import Icon from '../../../components/admin/Icons';
import {
  SECTION_WIDGET_TYPES,
  DEFAULT_HOMEPAGE_CONFIG,
  MAX_HERO_SECTIONS,
  MAX_HERO_SLIDES,
  createDefaultHeroSection,
  createDefaultHeroSlide,
  loadHomepageConfig,
  saveHomepageConfig,
  resetHomepageConfig
} from '../../../services/homepageCms';
import { ImagePickerField, MediaPickerModal } from '../../../components/admin/MediaPickerModal';
import { uploadMediaFile } from '../../../services/mediaLibrary';

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

  const initialLoadedRef = useRef(false);

  useEffect(() => {
    const config = loadHomepageConfig();
    setSections(config.sections || DEFAULT_HOMEPAGE_CONFIG.sections);
  }, []);

  // Automatically save and broadcast changes in real-time
  useEffect(() => {
    if (!initialLoadedRef.current) {
      if (sections.length > 0) {
        initialLoadedRef.current = true;
      }
      return;
    }
    if (sections && sections.length > 0) {
      saveHomepageConfig({ sections });
    }
  }, [sections]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const heroSectionsCount = sections.filter(s => s.type === 'hero').length;

  // Add a new Hero Banner section (Up to 5)
  const handleAddHeroSection = () => {
    const currentHeroCount = sections.filter(s => s.type === 'hero').length;
    if (currentHeroCount >= MAX_HERO_SECTIONS) {
      alert(`Maximum of ${MAX_HERO_SECTIONS} Hero Banner sections reached.`);
      return;
    }

    const newHeroSec = createDefaultHeroSection(currentHeroCount + 1);
    // Insert after the last hero section or at top
    const lastHeroIndex = sections.reduce((acc, s, idx) => s.type === 'hero' ? idx : acc, -1);
    const nextSections = [...sections];
    if (lastHeroIndex !== -1) {
      nextSections.splice(lastHeroIndex + 1, 0, newHeroSec);
    } else {
      nextSections.unshift(newHeroSec);
    }

    setSections(nextSections);
    setExpandedSectionId(newHeroSec.id);
    showToast(`✓ Added "${newHeroSec.name}" (${currentHeroCount + 1}/${MAX_HERO_SECTIONS})`);
  };

  // Section Deletion
  const handleDeleteSection = (sectionId, sectionName) => {
    const isHero = sections.find(s => s.id === sectionId)?.type === 'hero';
    const heroCount = sections.filter(s => s.type === 'hero').length;
    if (isHero && heroCount <= 1) {
      if (!confirm(`Are you sure you want to remove the last Hero banner section?`)) return;
    } else {
      if (!confirm(`Delete "${sectionName || 'this section'}" from the homepage?`)) return;
    }

    setSections(prev => prev.filter(s => s.id !== sectionId));
    if (expandedSectionId === sectionId) setExpandedSectionId(null);
    showToast(`✓ Section removed.`);
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

  // Section Title Rename
  const handleSectionNameChange = (id, newName) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
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
          // e.g. items.0.title or slides.0.heading
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

  // Add Slide to Hero Section (Up to 5)
  const handleAddSlide = (sectionId) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const currentSlides = sec.config?.slides || [];
      if (currentSlides.length >= MAX_HERO_SLIDES) {
        alert(`Maximum ${MAX_HERO_SLIDES} slides allowed per Hero Banner.`);
        return sec;
      }
      const newSlide = createDefaultHeroSlide(currentSlides.length + 1);
      return {
        ...sec,
        config: {
          ...sec.config,
          slides: [...currentSlides, newSlide]
        }
      };
    }));
    showToast(`✓ Added slide to Hero section.`);
  };

  // Delete Slide from Hero Section
  const handleDeleteSlide = (sectionId, slideIdx) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const currentSlides = sec.config?.slides || [];
      if (currentSlides.length <= 1) {
        alert('A Hero Banner must contain at least one slide.');
        return sec;
      }
      const nextSlides = currentSlides.filter((_, i) => i !== slideIdx);
      return {
        ...sec,
        config: {
          ...sec.config,
          slides: nextSlides
        }
      };
    }));
    showToast(`✓ Slide removed.`);
  };

  // Move Slide inside Hero Section
  const handleMoveSlide = (sectionId, slideIdx, direction) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const currentSlides = [...(sec.config?.slides || [])];
      const targetIdx = slideIdx + direction;
      if (targetIdx < 0 || targetIdx >= currentSlides.length) return sec;
      const temp = currentSlides[slideIdx];
      currentSlides[slideIdx] = currentSlides[targetIdx];
      currentSlides[targetIdx] = temp;
      return {
        ...sec,
        config: {
          ...sec.config,
          slides: currentSlides
        }
      };
    }));
  };

  // Community multiple image upload & management state
  const [uploadingCommunity, setUploadingCommunity] = useState(false);
  const [communityPickerSecId, setCommunityPickerSecId] = useState(null);

  const handleCommunityMultipleUpload = async (sectionId, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingCommunity(true);
    try {
      const uploadedItems = [];
      for (const file of files) {
        const newItem = await uploadMediaFile(file, 'Community');
        uploadedItems.push({
          id: 'ci-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          src: newItem.url,
          url: '/shop'
        });
      }

      setSections(prev => prev.map(sec => {
        if (sec.id !== sectionId) return sec;
        const currentImages = Array.isArray(sec.config?.images) ? sec.config.images : [];
        return {
          ...sec,
          config: {
            ...sec.config,
            images: [...currentImages, ...uploadedItems]
          }
        };
      }));
      showToast(`✓ Uploaded ${uploadedItems.length} community photos successfully!`);
    } catch (err) {
      console.error('Community photos upload error:', err);
      showToast('⚠️ Some photos failed to upload. Please try again.');
    } finally {
      setUploadingCommunity(false);
      e.target.value = '';
    }
  };

  const handleRemoveCommunityImage = (sectionId, indexToRemove) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const currentImages = Array.isArray(sec.config?.images) ? [...sec.config.images] : [];
      currentImages.splice(indexToRemove, 1);
      return {
        ...sec,
        config: {
          ...sec.config,
          images: currentImages
        }
      };
    }));
  };

  const handleMoveCommunityImage = (sectionId, fromIdx, toIdx) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const currentImages = Array.isArray(sec.config?.images) ? [...sec.config.images] : [];
      if (toIdx < 0 || toIdx >= currentImages.length) return sec;
      const [moved] = currentImages.splice(fromIdx, 1);
      currentImages.splice(toIdx, 0, moved);
      return {
        ...sec,
        config: {
          ...sec.config,
          images: currentImages
        }
      };
    }));
  };

  const handleAddCommunityFromLibrary = (sectionId, selectedUrl) => {
    if (!selectedUrl) return;
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const currentImages = Array.isArray(sec.config?.images) ? sec.config.images : [];
      const newImg = {
        id: 'ci-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        src: selectedUrl,
        url: '/shop'
      };
      return {
        ...sec,
        config: {
          ...sec.config,
          images: [...currentImages, newImg]
        }
      };
    }));
    showToast('✓ Photo added to Community Gallery');
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
        <h2 style={{ fontWeight: 300, fontSize: '22px', margin: '0 0 4px', letterSpacing: '-0.02em' }}>CMS Page &amp; Storefront Section Builder</h2>
        <p>Manage dynamic homepage sections, create multiple Hero banners (up to {MAX_HERO_SECTIONS}), customize widgets, and edit content pages.</p>
      </div>

      {/* ─── HOMEPAGE SECTION BUILDER ────────────────────────────────────────── */}
      <div className="card card-pad" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 300, letterSpacing: '-0.01em' }}>Homepage Section Builder</h2>
              <span className="badge badge-accent" style={{ fontSize: '11px' }}>
                Hero Banners: {heroSectionsCount}/{MAX_HERO_SECTIONS}
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--muted-foreground)', margin: '4px 0 0' }}>
              Reorder sections, create up to {MAX_HERO_SECTIONS} Hero banner sections, select widget layout styles, and customize content blocks.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={heroSectionsCount >= MAX_HERO_SECTIONS}
              onClick={handleAddHeroSection}
              style={{
                background: heroSectionsCount >= MAX_HERO_SECTIONS ? 'var(--muted)' : undefined,
                color: heroSectionsCount >= MAX_HERO_SECTIONS ? 'var(--muted-foreground)' : undefined,
                cursor: heroSectionsCount >= MAX_HERO_SECTIONS ? 'not-allowed' : 'pointer'
              }}
              title={heroSectionsCount >= MAX_HERO_SECTIONS ? `Maximum of ${MAX_HERO_SECTIONS} Hero Banner sections created` : 'Add another Hero Banner section to the homepage'}
            >
              + Add Hero Banner Section ({heroSectionsCount}/{MAX_HERO_SECTIONS})
            </button>
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
            const isHero = sec.type === 'hero';
            const slidesCount = sec.config?.slides?.length || 0;

            return (
              <div
                key={sec.id}
                style={{
                  border: isHero ? '1px solid rgba(var(--primary-rgb, 59, 130, 246), 0.35)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  background: sec.enabled ? 'var(--surface)' : 'var(--muted)',
                  opacity: sec.enabled ? 1 : 0.75,
                  overflow: 'hidden',
                  boxShadow: isHero ? '0 1px 4px rgba(0,0,0,0.03)' : 'none',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', minWidth: '240px' }}>
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

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={() => toggleSectionEnabled(sec.id)}
                      />
                    </label>

                    <input
                      type="text"
                      value={sec.name}
                      onChange={(e) => handleSectionNameChange(sec.id, e.target.value)}
                      style={{
                        border: '1px solid transparent',
                        background: 'transparent',
                        fontWeight: 600,
                        fontSize: '13.5px',
                        color: 'var(--primary)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        maxWidth: '220px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--border)'}
                      onBlur={(e) => e.target.style.borderColor = 'transparent'}
                      title="Click to rename section"
                    />

                    <span style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: isHero ? 'rgba(59, 130, 246, 0.12)' : 'var(--muted)',
                      color: isHero ? '#2563eb' : 'var(--muted-foreground)',
                      fontWeight: 700
                    }}>
                      {sec.type} {isHero && `• ${slidesCount} slide${slidesCount === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  {/* Right: Widget Type Selector & Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: 0 }}>Widget:</label>
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

                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: '28px', height: '28px', color: '#ef4444' }}
                      title="Delete section"
                      onClick={() => handleDeleteSection(sec.id, sec.name)}
                    >
                      <Icon name="trash" size={14} />
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>
                            Hero Settings &amp; Slides ({slidesCount}/{MAX_HERO_SLIDES})
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleAddSlide(sec.id)}
                            disabled={slidesCount >= MAX_HERO_SLIDES}
                            style={{
                              fontSize: '12px',
                              height: '28px',
                              background: slidesCount >= MAX_HERO_SLIDES ? 'var(--muted)' : undefined,
                              color: slidesCount >= MAX_HERO_SLIDES ? 'var(--muted-foreground)' : undefined,
                              cursor: slidesCount >= MAX_HERO_SLIDES ? 'not-allowed' : 'pointer'
                            }}
                            title={slidesCount >= MAX_HERO_SLIDES ? `Max ${MAX_HERO_SLIDES} slides reached` : 'Add another slide to this hero banner'}
                          >
                            + Add Slide ({slidesCount}/{MAX_HERO_SLIDES})
                          </button>
                        </div>

                        <div className="form-grid-2">
                          <div className="field">
                            <label>Autoplay</label>
                            <select
                              value={sec.config?.autoplay ? 'true' : 'false'}
                              onChange={(e) => handleConfigChange(sec.id, 'autoplay', e.target.value === 'true')}
                            >
                              <option value="true">Enabled (Auto-transition slides)</option>
                              <option value="false">Disabled (Manual only)</option>
                            </select>
                          </div>
                          <div className="field">
                            <label>Slide Duration (ms)</label>
                            <input
                              type="number"
                              value={sec.config?.slideDuration || 6000}
                              onChange={(e) => handleConfigChange(sec.id, 'slideDuration', Number(e.target.value))}
                              placeholder="6000"
                            />
                          </div>
                        </div>

                        {/* Slide Cards */}
                        {(sec.config?.slides || []).map((slide, sIdx) => (
                          <div key={slide.id || sIdx} style={{ padding: '14px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12.5px', fontWeight: 700 }}>
                                  Slide #{sIdx + 1}
                                </span>
                                {slide.image && (
                                  <div style={{
                                    width: '32px',
                                    height: '20px',
                                    borderRadius: '3px',
                                    backgroundImage: `url('${slide.image}')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    border: '1px solid var(--border)'
                                  }} title="Slide image preview" />
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '24px', height: '24px', padding: 0 }}
                                  disabled={sIdx === 0}
                                  onClick={() => handleMoveSlide(sec.id, sIdx, -1)}
                                  title="Move slide up"
                                >
                                  <Icon name="arrowUp" size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '24px', height: '24px', padding: 0 }}
                                  disabled={sIdx === (sec.config?.slides || []).length - 1}
                                  onClick={() => handleMoveSlide(sec.id, sIdx, 1)}
                                  title="Move slide down"
                                >
                                  <Icon name="arrowDown" size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '24px', height: '24px', color: '#ef4444', marginLeft: '6px' }}
                                  title="Delete slide"
                                  onClick={() => handleDeleteSlide(sec.id, sIdx)}
                                >
                                  <Icon name="trash" size={13} />
                                </button>
                              </div>
                            </div>

                            <div className="form-grid-2">
                              <div className="field">
                                <label>Eyebrow Tag</label>
                                <input
                                  value={slide.eyebrow || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `slides.${sIdx}.eyebrow`, e.target.value)}
                                  placeholder="e.g. Footwear or Summer Drop"
                                />
                              </div>
                              <ImagePickerField
                                label="Slide Image"
                                value={slide.image || ''}
                                onChange={(val) => handleConfigChange(sec.id, `slides.${sIdx}.image`, val)}
                                placeholder="Choose slide image from library..."
                              />
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
                                placeholder="Discover our new range of soft clothes..."
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                          <div key={cat.id || cIdx} style={{ padding: '14px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                              Card #{cIdx + 1}: {cat.title || 'Category'}
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
                            </div>
                            <div className="form-grid-2" style={{ marginTop: '8px' }}>
                              <div className="field">
                                <label>Button CTA Label</label>
                                <input
                                  value={cat.cta || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `items.${cIdx}.cta`, e.target.value)}
                                />
                              </div>
                              <ImagePickerField
                                label="Card Background Image"
                                value={cat.image || ''}
                                onChange={(val) => handleConfigChange(sec.id, `items.${cIdx}.image`, val)}
                                placeholder="Choose category image..."
                              />
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
                        <ImagePickerField
                          label="Video Poster Image"
                          value={sec.config?.posterImage || ''}
                          onChange={(val) => handleConfigChange(sec.id, 'posterImage', val)}
                          placeholder="Choose poster image..."
                        />
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

                    {/* ─── Editorial Story Blocks Config ─── */}
                    {sec.type === 'editorial' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {(sec.config?.items || []).map((ed, edIdx) => (
                          <div key={ed.id || edIdx} style={{ padding: '14px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                              Editorial Block #{edIdx + 1}
                            </span>
                            <div className="form-grid-2">
                              <div className="field">
                                <label>Eyebrow Tag</label>
                                <input
                                  value={ed.eyebrow || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `items.${edIdx}.eyebrow`, e.target.value)}
                                  placeholder="e.g. PREMIUM COLLECTION"
                                />
                              </div>
                              <div className="field">
                                <label>Heading</label>
                                <input
                                  value={ed.heading || ''}
                                  onChange={(e) => handleConfigChange(sec.id, `items.${edIdx}.heading`, e.target.value)}
                                  placeholder="e.g. Modern essentials for him"
                                />
                              </div>
                            </div>
                            <div className="field" style={{ marginTop: '8px' }}>
                              <label>Description</label>
                              <textarea
                                rows="2"
                                value={ed.description || ''}
                                onChange={(e) => handleConfigChange(sec.id, `items.${edIdx}.description`, e.target.value)}
                              />
                            </div>
                            <div className="form-grid-2" style={{ marginTop: '8px' }}>
                              <div className="field">
                                <label>Button CTA Label &amp; Link</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <input
                                    value={ed.primaryCta || ''}
                                    onChange={(e) => handleConfigChange(sec.id, `items.${edIdx}.primaryCta`, e.target.value)}
                                    placeholder="Explore Men"
                                  />
                                  <input
                                    value={ed.primaryCtaUrl || ''}
                                    onChange={(e) => handleConfigChange(sec.id, `items.${edIdx}.primaryCtaUrl`, e.target.value)}
                                    placeholder="/shop?gender=men"
                                  />
                                </div>
                              </div>
                              <ImagePickerField
                                label="Story Image"
                                value={ed.image || ''}
                                onChange={(val) => handleConfigChange(sec.id, `items.${edIdx}.image`, val)}
                                placeholder="Choose story image..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ─── Community / Newsletter Config ─── */}
                    {sec.type === 'community' && (
                      <div>
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

                        {/* Community Gallery Photos Manager */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--foreground)' }}>
                                Community Gallery Photos ({(sec.config?.images || []).length})
                              </h4>
                              <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)' }}>
                                Upload multiple photos directly from your computer or choose from the Media Library.
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {/* Direct Multiple File Upload */}
                              <label
                                className="btn btn-sm btn-primary"
                                style={{ cursor: uploadingCommunity ? 'not-allowed' : 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Icon name="upload" size={14} />
                                <span>{uploadingCommunity ? 'Uploading Photos...' : '⬆ Upload Multiple Images'}</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  disabled={uploadingCommunity}
                                  onChange={(e) => handleCommunityMultipleUpload(sec.id, e)}
                                />
                              </label>
                              {/* Pick from Media Library */}
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setCommunityPickerSecId(sec.id)}
                              >
                                🖼 Pick from Library
                              </button>
                            </div>
                          </div>

                          {/* Image Preview Grid */}
                          {(!sec.config?.images || sec.config.images.length === 0) ? (
                            <div style={{
                              border: '2px dashed var(--border)',
                              borderRadius: '8px',
                              padding: '36px 20px',
                              textAlign: 'center',
                              background: 'rgba(255,255,255,0.02)'
                            }}>
                              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                                No community photos added yet. Upload multiple lookbook / customer photos below.
                              </p>
                              <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <Icon name="upload" size={14} />
                                <span>Choose Images to Upload</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleCommunityMultipleUpload(sec.id, e)}
                                />
                              </label>
                            </div>
                          ) : (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                              gap: '12px',
                              marginTop: '10px'
                            }}>
                              {sec.config.images.map((imgItem, imgIdx) => {
                                const src = typeof imgItem === 'string' ? imgItem : (imgItem?.src || imgItem?.url || '');
                                return (
                                  <div
                                    key={imgItem.id || imgIdx}
                                    style={{
                                      border: '1px solid var(--border)',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      background: 'var(--surface)',
                                      position: 'relative',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                  >
                                    <div style={{
                                      width: '100%',
                                      height: '140px',
                                      background: `url('${src}') center / cover no-repeat`,
                                      backgroundColor: '#1a1a1a'
                                    }} />
                                    <div style={{
                                      padding: '6px 8px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      background: 'rgba(0,0,0,0.65)',
                                      borderTop: '1px solid rgba(255,255,255,0.08)'
                                    }}>
                                      <span style={{ fontSize: '11px', color: '#bbb', fontWeight: 600 }}>#{imgIdx + 1}</span>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        {imgIdx > 0 && (
                                          <button
                                            type="button"
                                            title="Move Left"
                                            onClick={() => handleMoveCommunityImage(sec.id, imgIdx, imgIdx - 1)}
                                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px', padding: '2px 4px' }}
                                          >
                                            ◀
                                          </button>
                                        )}
                                        {imgIdx < sec.config.images.length - 1 && (
                                          <button
                                            type="button"
                                            title="Move Right"
                                            onClick={() => handleMoveCommunityImage(sec.id, imgIdx, imgIdx + 1)}
                                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px', padding: '2px 4px' }}
                                          >
                                            ▶
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          title="Remove Photo"
                                          onClick={() => handleRemoveCommunityImage(sec.id, imgIdx)}
                                          style={{ background: '#dc2626', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontSize: '12px', padding: '2px 6px', lineHeight: 1 }}
                                        >
                                          &times;
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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

      {/* Community Gallery Media Picker Modal */}
      <MediaPickerModal
        isOpen={Boolean(communityPickerSecId)}
        onClose={() => setCommunityPickerSecId(null)}
        onSelect={(selectedUrl) => {
          if (communityPickerSecId) {
            handleAddCommunityFromLibrary(communityPickerSecId, selectedUrl);
          }
        }}
        title="Select Community Gallery Photo"
      />
    </div>
  );
}
