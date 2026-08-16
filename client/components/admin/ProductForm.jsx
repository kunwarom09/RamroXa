'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { money, slugify } from '../../services/formatters';
import { api } from '../../services/apiClient';
import { convertToWebP } from '../../services/imageProcessor';
import Icon from './Icons';
import ImageEditorModal from './ImageEditorModal';

const VARIANT_STATUSES = ['active', 'draft', 'disabled', 'discontinued', 'archived'];
const VARIANT_STATUS_LABEL = {
  active: 'Active',
  draft: 'Draft',
  disabled: 'Disabled',
  discontinued: 'Discontinued',
  archived: 'Archived'
};

const shortCode = (s) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();

const variantSkuFor = (masterSku, combo, names) => {
  const parts = [masterSku];
  (names || Object.keys(combo || {})).forEach((n) => {
    if (combo[n]) parts.push(shortCode(combo[n]));
  });
  return parts.join('-');
};

const variantCombos = (opts) => {
  const names = Object.keys(opts || {});
  if (!names.length) return [{}];
  let combos = [{}];
  names.forEach((n) => {
    const next = [];
    const vals = opts[n] || [];
    combos.forEach((base) => {
      vals.forEach((v) => {
        next.push({ ...base, [n]: v });
      });
    });
    combos = next;
  });
  return combos;
};

const variantLabel = (v) => {
  const parts = Object.values(v.options || {});
  return parts.join(' / ') || 'Default';
};

export default function ProductForm({ productId = null }) {
  const router = useRouter();
  const routeParams = useParams();
  const activeProductId = productId || routeParams?.id || null;

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [editingProd, setEditingProd] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [toastMsg, setToastMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    brand: 'Zylo',
    categoryId: '',
    status: 'draft',
    gender: '',
    season: '',
    tags: '',
    price: '',
    mrp: '',
    cost: '',
    description: '',
    featured: false,
    trending: false,
    newArrival: false,
    bestSelling: false,
    images: []
  });
  const [draftOptions, setDraftOptions] = useState({ Colour: ['Black'], Size: ['One size'] });
  const [matrixState, setMatrixState] = useState({});

  // Image Studio state
  const [editingImageIdx, setEditingImageIdx] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const generateMasterSku = (catId) => {
    const cat = categories.find((c) => c.id === (catId || formData.categoryId));
    const code = (cat ? cat.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() : 'GEN').padEnd(3, 'X');
    const count = (products || []).filter((p) => (p.sku || '').startsWith(`ZYL-${code}`)).length + 1;
    return `ZYL-${code}-${String(count).padStart(5, '0')}`;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/api/categories'),
          api.get('/api/admin/products')
        ]);

        const cats = catRes.data || [];
        const prods = prodRes.data?.products || prodRes.data || [];
        setCategories(cats);
        setProducts(prods);

        let vars = [];
        prods.forEach(p => {
          if (p.variants && p.variants.length) {
            vars = [...vars, ...p.variants.map(v => ({ ...v, productId: p.id || String(p._id) }))];
          }
        });
        setVariants(vars);

        if (activeProductId && activeProductId !== 'new') {
          const decodedId = decodeURIComponent(String(activeProductId)).trim();
          const target = prods.find(p => p.id === activeProductId || String(p._id) === activeProductId || p.slug === activeProductId || p.id === decodedId);
          if (target) {
            setEditingProd(target);
            const labels = target.labels || {};
            setFormData({
              name: target.name || '',
              slug: target.slug || '',
              sku: target.sku || '',
              brand: target.brand || 'Zylo',
              categoryId: target.categoryId || (cats[0]?.id || ''),
              status: target.status || 'draft',
              gender: target.gender || '',
              season: target.season || '',
              tags: Array.isArray(target.tags) ? target.tags.join(', ') : (target.tags || ''),
              price: target.basePrice ? Math.round(target.basePrice / 100) : (target.price != null ? target.price : ''),
              mrp: target.mrp ? Math.round(target.mrp / 100) : '',
              cost: target.cost ? Math.round(target.cost / 100) : '',
              description: target.description || '',
              featured: !!labels.featured,
              trending: !!labels.trending,
              newArrival: !!labels.newArrival,
              bestSelling: !!labels.bestSelling,
              images: Array.isArray(target.images) ? target.images : []
            });

            if (target.options && Object.keys(target.options).length > 0) {
              setDraftOptions(JSON.parse(JSON.stringify(target.options)));
            }

            const existingVars = (target.variants || []).concat(vars.filter(v => v.productId === target.id));
            const matrix = {};
            existingVars.forEach((v) => {
              const entry = {
                barcode: v.barcode || '',
                price: v.price != null ? Math.round(v.price / 100) : '',
                status: v.status || 'active',
                published: v.published !== false,
                selected: false
              };
              if (v.sku) matrix[v.sku] = entry;
              if (v.options) {
                const genSku = variantSkuFor(target.sku || '', v.options, Object.keys(v.options));
                matrix[genSku] = entry;
              }
            });
            setMatrixState(matrix);
          }
        } else {
          const catId = cats[0]?.id || '';
          const cat = cats.find((c) => c.id === catId);
          const code = (cat ? cat.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() : 'GEN').padEnd(3, 'X');
          const newSku = `ZYL-${code}-${String(prods.length + 1).padStart(5, '0')}`;
          setFormData(prev => ({ ...prev, sku: newSku, categoryId: catId }));
        }
      } catch (err) {
        console.error('Failed to load product form data:', err);
      }
    }
    loadData();
  }, [activeProductId]);

  const handleNameChange = (val) => {
    const autoSlug = slugify(val);
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: editingProd ? prev.slug : autoSlug
    }));
  };

  const handleGenSkuBtn = () => {
    setFormData((prev) => ({ ...prev, sku: generateMasterSku(prev.categoryId) }));
  };

  // Multiple image upload & auto WebP (<200KB)
  const handleBatchImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImages(true);

    try {
      const processed = await Promise.all(
        files.map((file) => convertToWebP(file, 200))
      );

      const newImages = processed.map((p, idx) => ({
        url: p.url,
        alt: formData.name || 'Product Image',
        caption: '',
        isFeatured: (formData.images || []).length === 0 && idx === 0,
        sizeKB: p.sizeKB,
        format: 'webp'
      }));

      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...newImages]
      }));

      showToast(`Uploaded ${files.length} image(s) in WebP format (<200KB)`);
    } catch (err) {
      console.error(err);
      alert('Error processing images. Please try again.');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetFeaturedImage = (idx) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).map((img, i) => ({
        ...img,
        isFeatured: i === idx
      }))
    }));
    showToast('Featured hero image set');
  };

  const handleDeleteImage = (idx) => {
    setFormData((prev) => {
      const copy = (prev.images || []).filter((_, i) => i !== idx);
      if (copy.length > 0 && !copy.some((img) => img.isFeatured)) {
        copy[0].isFeatured = true;
      }
      return { ...prev, images: copy };
    });
  };

  const handleUpdateImageDetails = (idx, field, val) => {
    setFormData((prev) => {
      const copy = [...(prev.images || [])];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, images: copy };
    });
  };

  const handleSaveEditedImage = (updatedImg) => {
    if (editingImageIdx === null) return;
    setFormData((prev) => {
      const copy = [...(prev.images || [])];
      copy[editingImageIdx] = updatedImg;
      return { ...prev, images: copy };
    });
    showToast('Image transformed and saved in WebP');
  };

  // Options helpers
  const handleAddOptionSet = () => {
    let base = 'Option', i = 1;
    while (draftOptions[`${base} ${i}`]) i++;
    setDraftOptions((prev) => ({ ...prev, [`${base} ${i}`]: [] }));
  };

  const handleRenameOption = (oldName, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed || trimmed === oldName || draftOptions[trimmed]) return;
    setDraftOptions((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        next[k === oldName ? trimmed : k] = prev[k];
      });
      return next;
    });
  };

  const handleSetOptionValues = (name, csv) => {
    const vals = csv.split(',').map((s) => s.trim()).filter(Boolean);
    setDraftOptions((prev) => ({ ...prev, [name]: vals }));
  };

  const handleRemoveOption = (name) => {
    setDraftOptions((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const combos = variantCombos(draftOptions);
  const names = Object.keys(draftOptions);

  const matrixRows = combos.map((combo) => {
    const sku = variantSkuFor(formData.sku || 'SKU', combo, names);
    const existingState = matrixState[sku] || {};
    return {
      sku,
      combo,
      label: variantLabel({ options: combo }),
      barcode: existingState.barcode !== undefined ? existingState.barcode : '',
      price: existingState.price !== undefined ? existingState.price : '',
      status: existingState.status !== undefined ? existingState.status : (formData.status === 'published' ? 'active' : 'draft'),
      published: existingState.published !== undefined ? existingState.published : (formData.status === 'published'),
      selected: !!existingState.selected
    };
  });

  const updateMatrixRow = (sku, patch) => {
    setMatrixState((prev) => ({
      ...prev,
      [sku]: { ...(prev[sku] || {}), ...patch }
    }));
  };

  const handleSelectAllMatrix = (checked) => {
    const next = {};
    matrixRows.forEach((r) => {
      next[r.sku] = { ...(matrixState[r.sku] || {}), selected: checked };
    });
    setMatrixState((prev) => ({ ...prev, ...next }));
  };

  const handleBulkMatrixAction = (action) => {
    const selectedRows = matrixRows.filter((r) => r.selected);
    if (!selectedRows.length) {
      showToast('Select at least one variant');
      return;
    }
    const next = {};
    selectedRows.forEach((r) => {
      if (action === 'publish') {
        next[r.sku] = { ...(matrixState[r.sku] || {}), published: true, status: 'active' };
      } else if (action === 'unpublish') {
        next[r.sku] = { ...(matrixState[r.sku] || {}), published: false };
      }
    });
    setMatrixState((prev) => ({ ...prev, ...next }));
    showToast(`Updated ${selectedRows.length} variant(s)`);
  };

  const saveMasterProduct = async (shouldPublish = false) => {
    if (!formData.name.trim()) { alert('Name is required'); return; }
    if (!formData.sku.trim()) { alert('SKU is required'); return; }

    const prodId = editingProd ? (editingProd.id || editingProd._id) : ('m_' + Date.now().toString(36));
    const prodSlug = (formData.slug || slugify(formData.name)).trim();

    const rec = {
      id: prodId,
      name: formData.name.trim(),
      slug: prodSlug,
      sku: formData.sku.trim(),
      brand: formData.brand.trim() || 'Zylo',
      categoryId: formData.categoryId || 'c_tops',
      status: shouldPublish ? 'published' : formData.status || 'published',
      gender: formData.gender.trim() || 'Unisex',
      season: formData.season.trim() || 'SS26',
      tags: formData.tags ? formData.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      price: formData.price !== '' ? Number(formData.price) : 0,
      basePrice: formData.price !== '' ? Math.round(Number(formData.price) * 100) : 0,
      mrp: formData.mrp !== '' ? Math.round(Number(formData.mrp) * 100) : 0,
      cost: formData.cost !== '' ? Math.round(Number(formData.cost) * 100) : 0,
      description: formData.description.trim(),
      labels: {
        featured: !!formData.featured,
        trending: !!formData.trending,
        newArrival: !!formData.newArrival,
        bestSelling: !!formData.bestSelling
      },
      options: draftOptions,
      images: formData.images || []
    };

    const newVariants = [];
    matrixRows.forEach((row, i) => {
      const vId = editingProd
        ? (variants.find((v) => v.productId === prodId && v.sku === row.sku)?.id || ('v_' + prodId + '_' + i))
        : ('v_' + prodId + '_' + i);

      const variantRec = {
        id: vId,
        productId: prodId,
        sku: row.sku,
        options: row.combo,
        price: row.price !== '' ? Math.round(Number(row.price) * 100) : rec.basePrice,
        barcode: row.barcode || '',
        stock: Number(row.stock || 10),
        status: shouldPublish ? 'active' : row.status || 'active',
        published: shouldPublish ? true : row.published !== false
      };
      newVariants.push(variantRec);
    });

    // 1. Send to Backend REST API
    try {
      const apiPayload = {
        ...rec,
        variants: newVariants
      };

      if (editingProd && (editingProd.id || editingProd._id)) {
        const tId = editingProd.id || editingProd._id;
        await api.put(`/api/admin/products/${tId}`, apiPayload);
      } else {
        await api.post('/api/admin/products', apiPayload);
      }
      showToast('Product saved successfully in MongoDB');
      router.push('/admin/products');
    } catch (apiErr) {
      alert('Failed to save product in database: ' + (apiErr.message || 'Error'));
    }
  };

  const pPrice = Number(formData.price) || 0;
  const pMrp = Number(formData.mrp) || 0;
  const pCost = Number(formData.cost) || 0;
  const calcParts = [];
  if (pMrp > pPrice && pPrice > 0) calcParts.push(`Discount: ${Math.round(((pMrp - pPrice) / pMrp) * 100)}% off MRP`);
  if (pCost > 0 && pPrice > 0) calcParts.push(`Margin: ${Math.round(((pPrice - pCost) / pPrice) * 100)}%`);

  const featuredImg = (formData.images || []).find((img) => img.isFeatured) || (formData.images || [])[0];

  if (previewMode) {
    return (
      <div className="page">
        <div className="page-head">
          <h1>Storefront Preview</h1>
          <p>Live storefront view of {formData.name || 'Product'}</p>
        </div>

        <div className="preview-toolbar">
          <div className="device-toggle">
            <button className={previewDevice === 'desktop' ? 'active' : ''} onClick={() => setPreviewDevice('desktop')}>
              <Icon name="desktop" size={16} />
            </button>
            <button className={previewDevice === 'tablet' ? 'active' : ''} onClick={() => setPreviewDevice('tablet')}>
              <Icon name="tablet" size={16} />
            </button>
            <button className={previewDevice === 'mobile' ? 'active' : ''} onClick={() => setPreviewDevice('mobile')}>
              <Icon name="mobile" size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-primary" onClick={() => setPreviewMode(false)}>
              Back to editor
            </button>
          </div>
        </div>

        <div className="preview-stage">
          <div className={`preview-frame ${previewDevice}`}>
            <div className="sf">
              <div className="sf-grid">
                <div className="sf-image" style={{ padding: featuredImg ? 0 : '40px', overflow: 'hidden' }}>
                  {featuredImg ? (
                    <img
                      src={featuredImg.url}
                      alt={featuredImg.alt || formData.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    'No image yet'
                  )}
                  <div className="sf-badges">
                    {formData.newArrival && <span className="sf-badge">New</span>}
                    {formData.featured && <span className="sf-badge">Featured</span>}
                  </div>
                </div>
                <div>
                  <div className="sf-eyebrow">{categories.find((c) => c.id === formData.categoryId)?.name || 'Apparel'}</div>
                  <h2 className="sf-title">{formData.name || 'Untitled Product'}</h2>
                  <div className="sf-price-row">
                    <span className="sf-price">{money(pPrice)}</span>
                    {pMrp > pPrice && <span className="sf-mrp">{money(pMrp)}</span>}
                    {pMrp > pPrice && <span className="sf-off">{Math.round(((pMrp - pPrice) / pMrp) * 100)}% off</span>}
                  </div>
                  <p className="sf-desc">{formData.description || 'No description provided.'}</p>
                  
                  {combos.length > 0 && (
                    <div className="sf-variants">
                      {combos.map((c, i) => (
                        <span key={i} className="sf-variant">{variantLabel({ options: c })}</span>
                      ))}
                    </div>
                  )}

                  <div className="sf-cta-row">
                    <span className="sf-cta primary">Add to cart</span>
                    <span className="sf-cta outline">Buy now (COD)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const editTitle = editingProd ? 'Edit master product' : 'New master product';
  const editSub = editingProd
    ? `${formData.name || editingProd.name} · ${(variants || []).filter((v) => editingProd && v.productId === editingProd.id).length} variant(s)`
    : 'Central record. Define options, then publish the variants you want live.';

  return (
    <div className="page">
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', background: 'var(--primary)',
          color: 'var(--primary-foreground)', padding: '10px 18px', borderRadius: '8px',
          fontSize: '13px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toastMsg}
        </div>
      )}

      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ marginBottom: '8px' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => router.push('/admin/products')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ← Back to master products
            </button>
          </div>
          <h1>{editTitle}</h1>
          <p>{editSub}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" className="btn btn-sm" onClick={() => setPreviewMode(true)}>
            <Icon name="eye" size={15} /> Preview
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => saveMasterProduct(false)}>
            Save product
          </button>
        </div>
      </div>

      <div className="form-max">
        {/* Card 1: Basics */}
        <div className="card card-pad form-section">
          <h2>Basics</h2>
          <div className="form-grid-2">
            <div className="field">
              <label>Name</label>
              <input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Monolith Tee"
                required
              />
            </div>
            <div className="field">
              <label>Slug</label>
              <input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Master SKU</label>
              <div className="sku-row">
                <input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
                <button type="button" className="btn btn-sm" onClick={handleGenSkuBtn}>Generate</button>
              </div>
            </div>
            <div className="field">
              <label>Brand</label>
              <input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="field">
              <label>Gender</label>
              <input
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                placeholder="e.g. Unisex"
              />
            </div>
            <div className="field">
              <label>Season</label>
              <input
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                placeholder="e.g. SS26"
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: '12px' }}>
            <label>Tags (comma separated)</label>
            <input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g. tee, core"
            />
          </div>

          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              />
              Featured
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.trending}
                onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
              />
              Trending
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.newArrival}
                onChange={(e) => setFormData({ ...formData, newArrival: e.target.checked })}
              />
              New arrival
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.bestSelling}
                onChange={(e) => setFormData({ ...formData, bestSelling: e.target.checked })}
              />
              Best selling
            </label>
          </div>
        </div>

        {/* Card 2: Product Images & Studio */}
        <div className="card card-pad form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: 0 }}>Product Images &amp; Studio</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
              {(formData.images || []).length} image(s) &middot; Auto WebP &lt; 200KB
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: '0 0 14px' }}>
            Upload multiple images at once. Uploaded images are automatically converted to WebP under 200KB. Use Edit Studio to rotate, flip, and remove backgrounds.
          </p>

          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: '10px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--canvas)',
              marginBottom: '16px'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="camera" size={28} />
            <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '8px' }}>
              {uploadingImages ? 'Processing & converting to WebP...' : 'Click or drop multiple images here'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              Select multiple files &middot; Auto converted to WebP &le; 200KB
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBatchImageUpload}
          />

          {(formData.images || []).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px', marginTop: '12px' }}>
              {(formData.images || []).map((img, idx) => (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: '10px',
                    position: 'relative',
                    border: img.isFeatured ? '2px solid var(--accent)' : '1px solid var(--border)'
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '140px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1f1f1f 0% 50%) 50% / 14px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px'
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || 'Product thumbnail'}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />

                    {img.isFeatured && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          background: 'var(--accent)',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        ★ FEATURED
                      </div>
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {img.sizeKB || 0} KB
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                    <input
                      placeholder="Alt text"
                      value={img.alt || ''}
                      onChange={(e) => handleUpdateImageDetails(idx, 'alt', e.target.value)}
                      style={{ fontSize: '11px', height: '26px', padding: '0 6px' }}
                    />
                    <input
                      placeholder="Caption"
                      value={img.caption || ''}
                      onChange={(e) => handleUpdateImageDetails(idx, 'caption', e.target.value)}
                      style={{ fontSize: '11px', height: '26px', padding: '0 6px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${img.isFeatured ? 'btn-primary' : ''}`}
                      style={{ fontSize: '11px', height: '26px', padding: '0 8px' }}
                      onClick={() => handleSetFeaturedImage(idx)}
                    >
                      {img.isFeatured ? '★ Featured' : 'Set featured'}
                    </button>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ fontSize: '11px', height: '26px', padding: '0 8px' }}
                        onClick={() => setEditingImageIdx(idx)}
                      >
                        Edit Studio
                      </button>
                      <button
                        type="button"
                        className="icon-btn btn-danger"
                        style={{ width: '26px', height: '26px' }}
                        onClick={() => handleDeleteImage(idx)}
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: Pricing */}
        <div className="card card-pad form-section">
          <h2>Pricing (NPR)</h2>
          <div className="form-grid-3">
            <div className="field">
              <label>Price</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="field">
              <label>Compare-at / MRP</label>
              <input
                type="number"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="field">
              <label>Cost price</label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          
          {calcParts.length > 0 && (
            <div className="calc-line">
              {calcParts.map((p, i) => (
                <span key={i} style={{ marginRight: '16px' }} dangerouslySetInnerHTML={{ __html: p.replace(/(\d+%\s*off\s*MRP|\d+%) /g, '<strong>$1</strong> ') }} />
              ))}
            </div>
          )}
        </div>

        {/* Card 4: Description */}
        <div className="card card-pad form-section">
          <h2>Description</h2>
          <div className="field" style={{ marginBottom: 0 }}>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product description..."
            />
          </div>
        </div>

        {/* Card 5: Options */}
        <div className="card card-pad form-section">
          <h2>Options</h2>
          {names.length > 0 ? (
            names.map((n) => (
              <div key={n} style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  value={n}
                  onChange={(e) => handleRenameOption(n, e.target.value)}
                  placeholder="Option name"
                />
                <input
                  value={(draftOptions[n] || []).join(', ')}
                  onChange={(e) => handleSetOptionValues(n, e.target.value)}
                  placeholder="Values, comma separated"
                />
                <button type="button" className="icon-btn" onClick={() => handleRemoveOption(n)}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
              No options &mdash; this product will have a single default variant.
            </p>
          )}

          <button className="btn btn-sm" type="button" onClick={handleAddOptionSet} style={{ marginTop: '8px' }}>
            + Add option set
          </button>
        </div>

        {/* Card 6: Variant matrix */}
        <div className="card card-pad form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <h2 style={{ margin: 0 }}>Variant matrix ({matrixRows.length})</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-sm" type="button" onClick={() => handleSelectAllMatrix(true)}>Select all</button>
              <button className="btn btn-sm" type="button" onClick={() => handleSelectAllMatrix(false)}>Clear</button>
              <button className="btn btn-sm" type="button" onClick={() => handleBulkMatrixAction('publish')}>Publish selected</button>
              <button className="btn btn-sm" type="button" onClick={() => handleBulkMatrixAction('unpublish')}>Unpublish selected</button>
            </div>
          </div>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '32px' }}>
                    <input
                      type="checkbox"
                      checked={matrixRows.length > 0 && matrixRows.every((r) => r.selected)}
                      onChange={(e) => handleSelectAllMatrix(e.target.checked)}
                    />
                  </th>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th className="num">Price</th>
                  <th>Status</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Publish</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.length > 0 ? (
                  matrixRows.map((v) => (
                    <tr key={v.sku}>
                      <td>
                        <input
                          type="checkbox"
                          checked={v.selected}
                          onChange={(e) => updateMatrixRow(v.sku, { selected: e.target.checked })}
                        />
                      </td>
                      <td style={{ fontWeight: 500 }}>{v.label}</td>
                      <td style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}><code>{v.sku}</code></td>
                      <td>
                        <input
                          value={v.barcode}
                          onChange={(e) => updateMatrixRow(v.sku, { barcode: e.target.value })}
                          placeholder="-"
                          style={{ height: '30px', fontSize: '12px', padding: '0 8px', width: '100px' }}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          value={v.price}
                          onChange={(e) => updateMatrixRow(v.sku, { price: e.target.value })}
                          placeholder="inherit"
                          style={{ height: '30px', fontSize: '12px', padding: '0 8px', width: '90px', textAlign: 'right' }}
                        />
                      </td>
                      <td>
                        <select
                          value={v.status}
                          onChange={(e) => updateMatrixRow(v.sku, { status: e.target.value })}
                          style={{ height: '30px', fontSize: '12px', padding: '0 6px' }}
                        >
                          {VARIANT_STATUSES.map((s) => (
                            <option key={s} value={s}>{VARIANT_STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={v.published}
                          onChange={(e) => updateMatrixRow(v.sku, { published: e.target.checked })}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7"><div className="empty-state">Add option values to build matrix.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px', marginBottom: '40px' }}>
          <button className="btn btn-primary" onClick={() => saveMasterProduct(false)}>Save master product</button>
          <button className="btn" onClick={() => saveMasterProduct(true)}>Publish + all variants</button>
          <button className="btn" onClick={() => setPreviewMode(true)}>Preview</button>
          <button className="btn" onClick={() => router.push('/admin/products')}>Back to list</button>
        </div>
      </div>

      {/* Image Editor Modal */}
      {editingImageIdx !== null && (formData.images || [])[editingImageIdx] && (
        <ImageEditorModal
          image={(formData.images || [])[editingImageIdx]}
          onSave={handleSaveEditedImage}
          onClose={() => setEditingImageIdx(null)}
        />
      )}
    </div>
  );
}
