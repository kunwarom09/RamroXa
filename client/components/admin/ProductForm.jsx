'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { money, slugify } from '../../services/formatters';
import { api } from '../../services/apiClient';
import { convertToWebP } from '../../services/imageProcessor';
import Icon from './Icons';
import ImageEditorModal from './ImageEditorModal';

const shortCode = (s) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
const UK_SHOE_SIZES = ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'UK 13'];

const COMMON_COLOURS = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#FFFFFF', border: true },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Olive', hex: '#65A30D' },
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Brown', hex: '#78350F' },
  { name: 'Beige', hex: '#D4B996' },
  { name: 'Cream', hex: '#FFFDD0', border: true },
  { name: 'Grey', hex: '#9CA3AF' },
  { name: 'Charcoal', hex: '#374151' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#9333EA' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Tan', hex: '#D2B48C' },
  { name: 'Khaki', hex: '#C3B091' }
];

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
  const [formErrors, setFormErrors] = useState({});

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

  const [variantGroups, setVariantGroups] = useState([
    {
      id: 'vg_1',
      name: 'Size',
      sizeType: 'UK Shoe Size',
      values: [
        {
          id: 'val_1',
          name: '',
          amount: '',
          image: '',
          stock: 0,
          sku: '',
          status: 'Draft',
          subsets: []
        }
      ]
    }
  ]);

  // Image Studio state
  const [editingImageIdx, setEditingImageIdx] = useState(null);
  const [editingVariantTarget, setEditingVariantTarget] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSaveEditedVariantImage = (editedUrl) => {
    if (!editingVariantTarget) return;
    const { vgIdx, valIdx, subIdx } = editingVariantTarget;
    if (subIdx !== null && subIdx !== undefined) {
      handleUpdateSubset(vgIdx, valIdx, subIdx, { image: editedUrl });
    } else {
      handleUpdateValue(vgIdx, valIdx, { image: editedUrl });
    }
    setEditingVariantTarget(null);
    showToast('Variant image updated');
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
            let resolvedCategoryId = target.categoryId || (cats[0]?.id || '');
            const isTargetFootwear = target.productType === 'Footwear' ||
              target.categoryId === 'c_shoes' ||
              target.categoryId === 'c_footwear' ||
              (target.name || '').toLowerCase().includes('shoe') ||
              (target.name || '').toLowerCase().includes('sneaker');

            if (isTargetFootwear) {
              const footwearCat = cats.find(c => c.slug === 'footwear' || c.id === 'c_footwear' || (c.name || '').toLowerCase() === 'footwear');
              if (footwearCat) {
                resolvedCategoryId = footwearCat.id;
              } else if (!resolvedCategoryId) {
                resolvedCategoryId = 'c_footwear';
              }
            }

            setFormData({
              name: target.name || '',
              slug: target.slug || '',
              sku: target.sku || '',
              brand: target.brand || 'Zylo',
              categoryId: resolvedCategoryId,
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

            // Populate variant groups from existing variants
            const existingVars = (target.variants || []).concat(vars.filter(v => v.productId === target.id));
            if (existingVars.length > 0) {
              const topVars = existingVars.filter(v => !v.parentVariantId);
              const subVars = existingVars.filter(v => !!v.parentVariantId);
              const subsByParent = {};
              subVars.forEach(sv => {
                if (!subsByParent[sv.parentVariantId]) subsByParent[sv.parentVariantId] = [];
                subsByParent[sv.parentVariantId].push(sv);
              });

              if (topVars.length) {
                const hasUkSizes = topVars.some(v => (v.name || '').trim().toUpperCase().startsWith('UK '));
                setVariantGroups([
                  {
                    id: 'vg_' + target.id,
                    name: 'Size',
                    sizeType: hasUkSizes ? 'UK Shoe Size' : 'Custom Size',
                    values: topVars.map(v => {
                      const cleanName = String(v.name || v.options?.Size || v.options?.['UK Size'] || '').replace(/^((Size|UK Size|Variant):\s*)+/gi, '').trim();
                      return {
                        id: v.id,
                        name: cleanName,
                        amount: v.price != null ? Math.round(v.price / 100) : '',
                        image: v.image || '',
                        stock: v.availableStock !== undefined ? v.availableStock : (v.stock !== undefined ? v.stock : 0),
                        sku: v.sku || '',
                        status: v.hidden ? 'Hidden' : (v.published ? 'Published' : (v.status === 'active' ? 'Published' : 'Draft')),
                        subsets: (subsByParent[v.id] || []).map(sv => {
                          let cleanSub = String(sv.name || sv.options?.Colour || sv.options?.Color || '').trim();
                          if (cleanSub.includes('/')) {
                            cleanSub = cleanSub.split('/').pop().trim();
                          }
                          cleanSub = cleanSub.replace(/^((Colour|Color|Sub\s*\d+):\s*)+/gi, '').trim();
                          return {
                            id: sv.id,
                            name: cleanSub,
                            amount: sv.price != null ? Math.round(sv.price / 100) : '',
                            image: sv.image || '',
                            stock: sv.availableStock !== undefined ? sv.availableStock : (sv.stock !== undefined ? sv.stock : 0),
                            sku: sv.sku || '',
                            status: sv.hidden ? 'Hidden' : (sv.published ? 'Published' : (sv.status === 'active' ? 'Published' : 'Draft'))
                          };
                        })
                      };
                    })
                  }
                ]);
              }
            }
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

      showToast(`Uploaded & converted ${processed.length} image(s) to WebP (<200KB)`);
    } catch (err) {
      alert('Image processing failed: ' + err.message);
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
  };

  const handleDeleteImage = (idx) => {
    setFormData((prev) => {
      const updated = (prev.images || []).filter((_, i) => i !== idx);
      if (updated.length && !updated.some((img) => img.isFeatured)) {
        updated[0].isFeatured = true;
      }
      return { ...prev, images: updated };
    });
  };

  const handleSaveEditedImage = (editedUrl) => {
    if (editingImageIdx === null) return;
    setFormData((prev) => {
      const updated = [...(prev.images || [])];
      if (updated[editingImageIdx]) {
        updated[editingImageIdx] = {
          ...updated[editingImageIdx],
          url: editedUrl
        };
      }
      return { ...prev, images: updated };
    });
    setEditingImageIdx(null);
    showToast('Image updated');
  };

  // Variant & SubVariant Management Handlers
  const handleAddVariantGroup = () => {
    const masterSku = formData.sku || 'SKU';
    const vgCount = variantGroups.length + 1;
    setVariantGroups(prev => [
      ...prev,
      {
        id: 'vg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: '',
        values: [
          {
            id: 'val_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: '',
            amount: '',
            image: '',
            stock: 0,
            sku: `${masterSku}-V${vgCount}`,
            status: 'Draft',
            subsets: []
          }
        ]
      }
    ]);
  };

  const handleDuplicateVariantGroup = (vgIdx) => {
    setVariantGroups(prev => {
      const target = prev[vgIdx];
      if (!target) return prev;
      const cloned = JSON.parse(JSON.stringify(target));
      cloned.id = 'vg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      cloned.name = target.name ? `${target.name} (Copy)` : 'Variant (Copy)';
      cloned.values = (cloned.values || []).map(val => ({
        ...val,
        id: 'val_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        sku: val.sku ? `${val.sku}-COPY` : '',
        subsets: (val.subsets || []).map(sub => ({
          ...sub,
          id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          sku: sub.sku ? `${sub.sku}-COPY` : ''
        }))
      }));
      const next = [...prev];
      next.splice(vgIdx + 1, 0, cloned);
      return next;
    });
    showToast('Variant duplicated');
  };

  const handleDeleteVariantGroup = (vgIdx) => {
    setVariantGroups(prev => prev.filter((_, idx) => idx !== vgIdx));
    showToast('Variant removed');
  };

  const handleUpdateVariantGroup = (vgIdx, patch) => {
    setVariantGroups(prev => {
      const next = [...prev];
      next[vgIdx] = { ...next[vgIdx], ...patch };
      return next;
    });
  };

  const handleToggleUkSize = (vgIdx, sizeName) => {
    setVariantGroups(prev => {
      const next = [...prev];
      const vg = { ...next[vgIdx] };
      const currentValues = vg.values || [];
      const existsIndex = currentValues.findIndex(v => (v.name || '').trim().toUpperCase() === sizeName.toUpperCase());

      if (existsIndex >= 0) {
        if (currentValues.length === 1) {
          vg.values = [{
            id: 'val_' + Date.now().toString(36),
            name: '',
            amount: '',
            image: '',
            stock: 0,
            sku: '',
            status: 'Draft',
            subsets: []
          }];
        } else {
          vg.values = currentValues.filter((_, i) => i !== existsIndex);
        }
      } else {
        const masterSku = formData.sku || 'SKU';
        const masterPrice = formData.price !== '' ? Number(formData.price) : '';
        const count = currentValues.length + 1;
        const newVal = {
          id: 'val_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name: sizeName,
          amount: masterPrice !== '' ? masterPrice : '',
          image: '',
          stock: 0,
          sku: `${masterSku}-V${vgIdx + 1}-${count}`,
          status: 'Draft',
          subsets: []
        };

        if (currentValues.length === 1 && !currentValues[0].name.trim() && (!currentValues[0].subsets || currentValues[0].subsets.length === 0)) {
          vg.values = [newVal];
        } else {
          vg.values = [...currentValues, newVal];
        }
      }

      next[vgIdx] = vg;
      return next;
    });
  };

  const handleAddValue = (vgIdx) => {
    setVariantGroups(prev => {
      const next = [...prev];
      const vg = { ...next[vgIdx] };
      const masterSku = formData.sku || 'SKU';
      const count = (vg.values || []).length + 1;
      const newVal = {
        id: 'val_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: '',
        amount: '',
        image: '',
        stock: 0,
        sku: `${masterSku}-V${count}`,
        status: 'Draft',
        subsets: []
      };
      vg.values = [...(vg.values || []), newVal];
      next[vgIdx] = vg;
      return next;
    });
  };

  const handleDeleteValue = (vgIdx, valIdx) => {
    setVariantGroups(prev => {
      const next = [...prev];
      const vg = { ...next[vgIdx] };
      vg.values = (vg.values || []).filter((_, i) => i !== valIdx);
      next[vgIdx] = vg;
      return next;
    });
  };

  const handleUpdateValue = (vgIdx, valIdx, patch) => {
    setVariantGroups(prev => {
      const next = [...prev];
      const vg = { ...next[vgIdx] };
      const values = [...(vg.values || [])];
      values[valIdx] = { ...values[valIdx], ...patch };
      vg.values = values;
      next[vgIdx] = vg;
      return next;
    });
  };

  const handleAddSubset = (vgIdx, valIdx) => {
    setVariantGroups(prev => {
      const next = [...prev];
      const vg = { ...next[vgIdx] };
      const values = [...(vg.values || [])];
      const val = { ...values[valIdx] };
      const parentSku = val.sku || formData.sku || 'SKU';
      const count = (val.subsets || []).length + 1;
      const newSub = {
        id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: '',
        amount: '',
        image: '',
        stock: 0,
        sku: `${parentSku}-S${count}`,
        status: 'Draft'
      };
      val.subsets = [...(val.subsets || []), newSub];
      values[valIdx] = val;
      vg.values = values;
      next[vgIdx] = vg;
      return next;
    });
  };

  const handleDeleteSubset = (vgIdx, valIdx, subIdx) => {
    setVariantGroups(prev => {
      const next = [...prev];
      const vg = { ...next[vgIdx] };
      const values = [...(vg.values || [])];
      const val = { ...values[valIdx] };
      val.subsets = (val.subsets || []).filter((_, i) => i !== subIdx);
      values[valIdx] = val;
      vg.values = values;
      next[vgIdx] = vg;
      return next;
    });
  };

  const handleUpdateSubset = (vgIdx, valIdx, subIdx, patch) => {
    setVariantGroups(prev => {
      const next = [...prev];
      const vg = { ...next[vgIdx] };
      const values = [...(vg.values || [])];
      const val = { ...values[valIdx] };
      const subsets = [...(val.subsets || [])];
      subsets[subIdx] = { ...subsets[subIdx], ...patch };
      val.subsets = subsets;
      values[valIdx] = val;
      vg.values = values;
      next[vgIdx] = vg;
      return next;
    });
  };

  const handleToggleColourSubset = (vgIdx, valIdx, colObj) => {
    setVariantGroups(prev => {
      const next = [...prev];
      const vg = { ...next[vgIdx] };
      const values = [...(vg.values || [])];
      const val = { ...values[valIdx] };
      const currentSubsets = val.subsets || [];
      const existsIndex = currentSubsets.findIndex(s => (s.name || '').trim().toLowerCase() === colObj.name.toLowerCase());

      if (existsIndex >= 0) {
        val.subsets = currentSubsets.filter((_, i) => i !== existsIndex);
      } else {
        const masterSku = formData.sku || 'SKU';
        const masterPrice = formData.price !== '' ? Number(formData.price) : 0;
        const topAmount = val.amount !== '' && val.amount != null ? Number(val.amount) : masterPrice;
        const count = currentSubsets.length + 1;
        const newSub = {
          id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name: colObj.name,
          colorHex: colObj.hex,
          amount: topAmount !== '' ? topAmount : '',
          image: '',
          stock: 0,
          sku: `${masterSku}-S${vgIdx + 1}-${valIdx + 1}-${count}`,
          status: 'Draft'
        };
        val.subsets = [...currentSubsets, newSub];
      }

      values[valIdx] = val;
      vg.values = values;
      next[vgIdx] = vg;
      return next;
    });
  };

  // Category-based configuration helpers
  const selectedCat = categories.find(c => c.id === formData.categoryId || c._id === formData.categoryId || c.slug === formData.categoryId);
  const isFootwear = selectedCat
    ? (selectedCat.slug === 'footwear' || (selectedCat.name || '').toLowerCase() === 'footwear' || selectedCat.id === 'c_footwear' || selectedCat.id === 'c_shoes')
    : (formData.categoryId === 'c_footwear' || formData.categoryId === 'c_shoes' || String(formData.categoryId).toLowerCase() === 'footwear');
  const isBottoms = selectedCat
    ? (selectedCat.slug === 'bottoms' || (selectedCat.name || '').toLowerCase() === 'bottoms' || selectedCat.id === 'c_bottoms' || selectedCat.id === 'c_pants')
    : (formData.categoryId === 'c_bottoms' || formData.categoryId === 'c_pants' || String(formData.categoryId).toLowerCase() === 'bottoms');

  // Total sellable combinations calculation
  const totalCombinations = variantGroups.reduce((acc, vg) => {
    return acc + (vg.values || []).reduce((vAcc, val) => {
      if ((val.subsets || []).length > 0) {
        const activeSubs = val.subsets.filter((s) => s.status !== 'Hidden').length;
        return vAcc + activeSubs;
      }
      return vAcc + (val.status !== 'Hidden' ? 1 : 0);
    }, 0);
  }, 0);

  const validateProductForm = () => {
    const errs = {};
    if (!formData.name || !formData.name.trim()) {
      errs.name = 'Product Name is required';
    }
    if (!formData.categoryId || !formData.categoryId.trim()) {
      errs.categoryId = 'Category is required';
    }
    if (formData.price === '' || formData.price === null || formData.price === undefined || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      errs.price = 'Price is required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMasterProduct = async (shouldPublish = false) => {
    if (!validateProductForm()) {
      showToast('Please fix required field errors.');
      return;
    }
    if (!formData.sku.trim()) {
      setFormErrors((prev) => ({ ...prev, sku: 'SKU is required' }));
      return;
    }

    const prodId = editingProd ? (editingProd.id || editingProd._id) : ('m_' + Date.now().toString(36));
    const prodSlug = (formData.slug || slugify(formData.name)).trim();

    const masterPrice = formData.price !== '' ? Number(formData.price) : 0;
    const basePricePaisa = Math.round(masterPrice * 100);

    const optionsMap = {};
    const allColoursSet = new Set();

    variantGroups.forEach(vg => {
      const vgName = (vg.name || 'Variant').trim();
      const valNames = (vg.values || []).map(v => (v.name || '').trim()).filter(Boolean);
      if (valNames.length > 0) {
        optionsMap[vgName] = valNames;
      }
      (vg.values || []).forEach(v => {
        (v.subsets || []).forEach(s => {
          if (s.name && s.name.trim()) {
            allColoursSet.add(s.name.trim());
          }
        });
      });
    });

    if (allColoursSet.size > 0) {
      optionsMap['Colour'] = Array.from(allColoursSet);
    }

    const rec = {
      id: prodId,
      name: formData.name.trim(),
      slug: prodSlug,
      sku: formData.sku.trim(),
      productType: isFootwear ? 'Footwear' : (editingProd?.productType || 'Top Wear'),
      brand: formData.brand.trim() || 'Zylo',
      categoryId: formData.categoryId || 'c_tops',
      status: shouldPublish ? 'published' : 'draft',
      gender: formData.gender.trim() || 'Unisex',
      season: formData.season.trim() || 'SS26',
      tags: formData.tags ? formData.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      options: optionsMap,
      colors: Array.from(allColoursSet),
      price: masterPrice,
      basePrice: basePricePaisa,
      mrp: formData.mrp !== '' ? Math.round(Number(formData.mrp) * 100) : 0,
      cost: formData.cost !== '' ? Math.round(Number(formData.cost) * 100) : 0,
      description: formData.description.trim(),
      labels: {
        featured: !!formData.featured,
        trending: !!formData.trending,
        newArrival: !!formData.newArrival,
        bestSelling: !!formData.bestSelling
      },
      images: (formData.images || [])
        .filter((img) => img && (typeof img === 'string' ? img.trim() : (img.url && typeof img.url === 'string' && img.url.trim())))
        .map((img, idx) => {
          if (typeof img === 'string') {
            return { url: img.trim(), alt: formData.name || 'Product', isFeatured: idx === 0, format: 'webp' };
          }
          return {
            url: img.url.trim(),
            alt: img.alt || formData.name || 'Product',
            isFeatured: img.isFeatured !== undefined ? !!img.isFeatured : idx === 0,
            format: img.format || 'webp'
          };
        })
    };

    const newVariants = [];
    const usedLocalSkus = new Set();
    const cleanMasterSku = formData.sku.trim() || 'SKU';
    usedLocalSkus.add(cleanMasterSku.toUpperCase());

    variantGroups.forEach((vg, vgIndex) => {
      (vg.values || []).forEach((val, valIndex) => {
        const topAmount = val.amount !== '' && val.amount != null ? Number(val.amount) : masterPrice;
        const topPricePaisa = Math.round(topAmount * 100);

        let valSku = (val.sku && val.sku.trim()) || `${cleanMasterSku}-V${vgIndex + 1}-${valIndex + 1}`;
        let candidateValSku = valSku.toUpperCase();
        let valCounter = 1;
        while (usedLocalSkus.has(candidateValSku)) {
          valCounter++;
          candidateValSku = `${valSku}-${valCounter}`.toUpperCase();
        }
        usedLocalSkus.add(candidateValSku);
        valSku = candidateValSku;

        const cleanValName = String(val.name || '').replace(/^((Size|UK Size|Variant):\s*)+/gi, '').trim();

        const subList = (val.subsets || []).map((sub, subIndex) => {
          const subAmt = sub.amount !== '' && sub.amount != null ? Number(sub.amount) : topAmount;
          const isHidden = sub.status === 'Hidden';

          let subSku = (sub.sku && sub.sku.trim()) || `${valSku}-S${subIndex + 1}`;
          let candidateSubSku = subSku.toUpperCase();
          let subCounter = 1;
          while (usedLocalSkus.has(candidateSubSku)) {
            subCounter++;
            candidateSubSku = `${subSku}-${subCounter}`.toUpperCase();
          }
          usedLocalSkus.add(candidateSubSku);
          subSku = candidateSubSku;

          let cleanSubName = String(sub.name || '').trim();
          if (cleanSubName.includes('/')) {
            cleanSubName = cleanSubName.split('/').pop().trim();
          }
          cleanSubName = cleanSubName.replace(/^((Colour|Color|Sub\s*\d+):\s*)+/gi, '').trim();

          return {
            id: sub.id,
            name: `${vg.name || 'Size'}: ${cleanValName || 'Standard'} / ${cleanSubName || `Colour ${subIndex + 1}`}`,
            sku: subSku,
            options: {
              [vg.name || 'Size']: cleanValName,
              Colour: cleanSubName
            },
            price: Math.round(subAmt * 100),
            amount: Math.round(subAmt * 100),
            stock: Number(sub.stock) || 0,
            image: sub.image || '',
            status: isHidden ? 'hidden' : (shouldPublish ? (sub.status === 'Published' ? 'active' : 'draft') : 'draft'),
            published: shouldPublish ? !isHidden && sub.status === 'Published' : false,
            hidden: isHidden
          };
        });

        const isValHidden = val.status === 'Hidden';
        newVariants.push({
          id: val.id,
          name: `${vg.name || 'Size'}: ${cleanValName || `Value ${valIndex + 1}`}`,
          sku: valSku,
          options: {
            [vg.name || 'Size']: cleanValName
          },
          price: topPricePaisa,
          amount: topPricePaisa,
          stock: Number(val.stock) || 0,
          image: val.image || '',
          status: isValHidden ? 'hidden' : (shouldPublish ? (val.status === 'Published' ? 'active' : 'draft') : 'draft'),
          published: shouldPublish ? !isValHidden && val.status === 'Published' : false,
          hidden: isValHidden,
          subVariants: subList
        });
      });
    });

    try {
      const apiPayload = {
        ...rec,
        variants: newVariants
      };

      let savedProduct = null;
      if (editingProd && (editingProd.id || editingProd._id)) {
        const tId = editingProd.id || editingProd._id;
        const res = await api.put(`/api/admin/products/${tId}`, apiPayload);
        savedProduct = res?.data?.product || res?.data;
      } else {
        const res = await api.post('/api/admin/products', apiPayload);
        savedProduct = res?.data?.product || res?.data;
        if (savedProduct) {
          setEditingProd(savedProduct);
        }
      }
      const successMsg = shouldPublish ? 'Product published successfully.' : 'Product saved as draft.';
      showToast(successMsg);
      router.push('/admin/products');
    } catch (apiErr) {
      const errMsg = apiErr.message || 'Error';
      const errDetails = apiErr.details ? (typeof apiErr.details === 'object' ? JSON.stringify(apiErr.details, null, 2) : String(apiErr.details)) : '';
      alert(`Failed to save product in database: ${errMsg}${errDetails ? `\n\nDetails:\n${errDetails}` : ''}`);
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
          <h2>Storefront Preview</h2>
          <p>Live storefront view of {formData.name || 'Product'}</p>
        </div>

        <div className="preview-toolbar">
          <div className="device-toggle">
            <button className={previewDevice === 'desktop' ? 'active' : ''} onClick={() => setPreviewDevice('desktop')}>
              <Icon name="desktop" size={16} /> Desktop
            </button>
            <button className={previewDevice === 'tablet' ? 'active' : ''} onClick={() => setPreviewDevice('tablet')}>
              <Icon name="tablet" size={16} /> Tablet
            </button>
            <button className={previewDevice === 'mobile' ? 'active' : ''} onClick={() => setPreviewDevice('mobile')}>
              <Icon name="mobile" size={16} /> Mobile
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm" onClick={() => window.print()}>Print / PDF</button>
            <button className="btn btn-sm" onClick={() => setPreviewMode(false)}>Back to Editor</button>
          </div>
        </div>

        <div className="preview-stage">
          <div className={`preview-frame ${previewDevice}`}>
            <div className="sf">
              <div className="sf-grid">
                <div className="sf-image">
                  {featuredImg ? (
                    <img src={featuredImg.url} alt={featuredImg.alt || 'Product preview'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                  
                  {variantGroups.length > 0 && (
                    <div className="sf-variants">
                      {variantGroups.map((vg) => (
                        (vg.values || []).map((val) => (
                          (val.subsets || []).length > 0 ? (
                            val.subsets.map((sub, sidx) => (
                              <span key={sidx} className="sf-variant">{`${vg.name || 'Variant'}: ${val.name || 'Val'} / ${sub.name || 'Sub'}`}</span>
                            ))
                          ) : (
                            <span key={val.id} className="sf-variant">{`${vg.name || 'Variant'}: ${val.name || 'Val'}`}</span>
                          )
                        ))
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
    : 'Central record. Define variants, amount, and optional subsets with frontend hide toggles.';

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
          <h2>{editTitle}</h2>
          <p>{editSub}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => router.push('/admin/products')}
          >
            Back to list
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setPreviewMode(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Icon name="eye" size={14} /> Preview
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => saveMasterProduct(false)}
          >
            Save as draft
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => saveMasterProduct(true)}
          >
            Publish master product
          </button>
        </div>
      </div>

      <div className="form-max">
        {/* Card 1: Basics */}
        <div className="card card-pad form-section">
          <h2>Basics</h2>
          <div className="form-grid-2">
            <div className="field">
              <label>Product Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                value={formData.name}
                onChange={(e) => {
                  handleNameChange(e.target.value);
                  if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. Monolith Tee"
                style={formErrors.name ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #ef4444' } : {}}
              />
              {formErrors.name && (
                <span className="field-error" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {formErrors.name}
                </span>
              )}
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
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. ZYL-TEE-00001"
                  required
                />
                <button type="button" className="btn btn-sm" onClick={handleGenSkuBtn}>
                  Auto
                </button>
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
              <label>Category <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                value={formData.categoryId}
                onChange={(e) => {
                  setFormData({ ...formData, categoryId: e.target.value });
                  if (formErrors.categoryId) setFormErrors((prev) => ({ ...prev, categoryId: undefined }));
                }}
                style={formErrors.categoryId ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #ef4444' } : {}}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {formErrors.categoryId && (
                <span className="field-error" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {formErrors.categoryId}
                </span>
              )}
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
              <select
                value={formData.gender || 'Unisex'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Unisex">Unisex</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Kids">Kids</option>
              </select>
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
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {img.sizeKB ? `${img.sizeKB} KB` : 'WebP'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
                      onClick={() => setEditingImageIdx(idx)}
                    >
                      <Icon name="wand" size={13} /> Edit Studio
                    </button>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {!img.isFeatured && (
                        <button
                          type="button"
                          className="icon-btn"
                          title="Set as featured main image"
                          onClick={() => handleSetFeaturedImage(idx)}
                        >
                          ★
                        </button>
                      )}
                      <button
                        type="button"
                        className="icon-btn"
                        title="Delete image"
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
              <label>Price (NPR) <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value });
                  if (formErrors.price) setFormErrors((prev) => ({ ...prev, price: undefined }));
                }}
                placeholder="0"
                style={formErrors.price ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px #ef4444' } : {}}
              />
              {formErrors.price && (
                <span className="field-error" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {formErrors.price}
                </span>
              )}
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

        {/* Card 5: Variants section matching exact mockup */}
        <div className="card card-pad form-section">
          <div style={{ marginBottom: '6px' }}>
            <h2 style={{ margin: 0 }}>
              Variants <span style={{ fontWeight: 'normal', color: 'var(--muted-foreground)', fontSize: '13px' }}>({totalCombinations} sellable combinations)</span>
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: '6px 0 16px', lineHeight: 1.5 }}>
              Add a primary variant (e.g. Size), then give it a value with a price &mdash; Size &rarr; Small &rarr; Rs. 250. Price inherits the Master Product price but stays editable per value. Add more values to the same variant (Medium, Large...), each with its own price and, optionally, its own Subset (Colour &rarr; Blue / Red / Yellow) &mdash; every subset value carries its own image, stock, SKU and status. Duplicate a variant to reuse its whole structure under a new name.
            </p>
          </div>

          {variantGroups.map((vg, vgIdx) => (
            <div key={vg.id || vgIdx} className="variant-card">
              <div className="variant-card-head">
                <input
                  className="input-variant-name"
                  placeholder="Variant name (e.g. Size)"
                  value={vg.name || ''}
                  onChange={(e) => handleUpdateVariantGroup(vgIdx, { name: e.target.value })}
                />
                <div className="variant-card-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => handleDuplicateVariantGroup(vgIdx)}
                    title="Duplicate Variant"
                  >
                    <Icon name="copy" size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => handleDeleteVariantGroup(vgIdx)}
                    title="Delete Variant"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>

              {/* Footwear Size Type Option */}
              {/* Unified Size Pills (Footwear UK 3-13, Apparel S-XL, etc.) */}
              {((vg.name || '').trim().toLowerCase() === 'size' || (vg.name || '').trim().toLowerCase() === 'uk size') && (
                <div style={{
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginRight: '6px' }}>
                    {isFootwear ? 'UK Size:' : 'Size:'}
                  </span>
                  {(isFootwear
                    ? ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'UK 13']
                    : (isBottoms
                      ? ['28', '30', '32', '34', '36', '38']
                      : ['XS', 'S', 'M', 'L', 'XL', 'XXL'])
                  ).map((sizeName) => {
                    const isSelected = (vg.values || []).some(v => (v.name || '').trim().toUpperCase() === sizeName.toUpperCase());
                    return (
                      <button
                        key={sizeName}
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : ''}`}
                        onClick={() => handleToggleUkSize(vgIdx, sizeName)}
                        style={{
                          minWidth: '48px',
                          fontSize: '12px',
                          fontWeight: isSelected ? 600 : 400,
                          padding: '4px 10px',
                          borderRadius: '4px'
                        }}
                      >
                        {isSelected ? `✓ ${sizeName}` : sizeName}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="variant-values-list">
                {(vg.values || []).map((val, valIdx) => {
                  const masterPrice = formData.price !== '' ? Number(formData.price) : 0;
                  const effectiveValPrice = val.amount !== '' && val.amount != null ? Number(val.amount) : masterPrice;

                  return (
                    <div key={val.id || valIdx} className="value-card">
                      <div className="value-row-1">
                        <input
                          className="val-name"
                          placeholder="Value (e.g. Small)"
                          value={val.name || ''}
                          onChange={(e) => handleUpdateValue(vgIdx, valIdx, { name: e.target.value })}
                        />
                        <div className="val-price-group">
                          <span className="val-currency-prefix">Rs.</span>
                          <input
                            className="val-amount"
                            type="number"
                            placeholder={`${masterPrice} (inherit)`}
                            value={val.amount !== undefined ? val.amount : ''}
                            onChange={(e) => handleUpdateValue(vgIdx, valIdx, { amount: e.target.value })}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-add-subset"
                          onClick={() => handleAddSubset(vgIdx, valIdx)}
                        >
                          + Add Subset
                        </button>
                        <button
                          type="button"
                          className="val-remove-btn"
                          onClick={() => handleDeleteValue(vgIdx, valIdx)}
                          title="Remove Value"
                        >
                          &times;
                        </button>
                      </div>

                      {/* 20 Common Colours Sub-Variant Selector */}
                      <div style={{
                        margin: '8px 0 10px',
                        background: 'var(--canvas)',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                            Colour Sub-Variants (Select from 20 Common Colours):
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                            Click colour to toggle
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {COMMON_COLOURS.map((col) => {
                            const isSelected = (val.subsets || []).some(s => (s.name || '').trim().toLowerCase() === col.name.toLowerCase());
                            return (
                              <button
                                key={col.name}
                                type="button"
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : ''}`}
                                onClick={() => handleToggleColourSubset(vgIdx, valIdx, col)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11.5px',
                                  fontWeight: isSelected ? 600 : 400,
                                  borderRadius: '4px'
                                }}
                                title={col.name}
                              >
                                <span
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: col.hex,
                                    border: col.border || col.hex.toLowerCase() === '#ffffff' ? '1px solid #888' : '1px solid rgba(0,0,0,0.25)',
                                    flexShrink: 0,
                                    display: 'inline-block'
                                  }}
                                />
                                <span>{col.name}</span>
                                {isSelected && <span style={{ fontSize: '10px', opacity: 0.85 }}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="value-row-2">
                        <VariantImageUploader
                          value={val.image || ''}
                          onChange={(imgUrl) => handleUpdateValue(vgIdx, valIdx, { image: imgUrl })}
                          onOpenStudio={val.image ? () => setEditingVariantTarget({ vgIdx, valIdx, subIdx: null, image: { url: val.image } }) : null}
                        />
                        <input
                          className="val-stock"
                          type="number"
                          placeholder="0"
                          value={val.stock !== undefined ? val.stock : 0}
                          onChange={(e) => handleUpdateValue(vgIdx, valIdx, { stock: e.target.value })}
                        />
                        <input
                          className="val-sku"
                          placeholder="SKU (auto)"
                          value={val.sku || ''}
                          onChange={(e) => handleUpdateValue(vgIdx, valIdx, { sku: e.target.value })}
                        />
                        <select
                          className="val-status"
                          value={val.status || 'Draft'}
                          onChange={(e) => handleUpdateValue(vgIdx, valIdx, { status: e.target.value })}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Published">Published</option>
                          <option value="Hidden">Hidden</option>
                        </select>
                      </div>

                      {(val.subsets || []).length > 0 && (
                        <div className="subsets-container">
                          {val.subsets.map((sub, subIdx) => {
                            const matchedCol = COMMON_COLOURS.find(c => c.name.toLowerCase() === (sub.name || '').trim().toLowerCase());
                            const swatchHex = sub.colorHex || (matchedCol ? matchedCol.hex : null);

                            return (
                              <div key={sub.id || subIdx} className="subset-card">
                                <div className="value-row-1" style={{ marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    {swatchHex && (
                                      <span
                                        style={{
                                          width: '16px',
                                          height: '16px',
                                          borderRadius: '50%',
                                          backgroundColor: swatchHex,
                                          border: swatchHex.toLowerCase() === '#ffffff' || swatchHex.toLowerCase() === '#fffdd0' ? '1px solid #888' : '1px solid rgba(255,255,255,0.2)',
                                          flexShrink: 0,
                                          display: 'inline-block'
                                        }}
                                        title={`Colour Swatch: ${sub.name}`}
                                      />
                                    )}
                                    <input
                                      className="sub-name"
                                      placeholder="Subset (e.g. Blue)"
                                      value={sub.name || ''}
                                      onChange={(e) => {
                                        const newName = e.target.value;
                                        const found = COMMON_COLOURS.find(c => c.name.toLowerCase() === newName.trim().toLowerCase());
                                        handleUpdateSubset(vgIdx, valIdx, subIdx, {
                                          name: newName,
                                          colorHex: found ? found.hex : sub.colorHex
                                        });
                                      }}
                                    />
                                  </div>
                                  <div className="val-price-group" style={{ height: '34px', width: '160px' }}>
                                    <span className="val-currency-prefix" style={{ fontSize: '12px' }}>Rs.</span>
                                    <input
                                      className="sub-amount"
                                      type="number"
                                      placeholder={`${effectiveValPrice} (inherit)`}
                                      value={sub.amount !== undefined ? sub.amount : ''}
                                      onChange={(e) => handleUpdateSubset(vgIdx, valIdx, subIdx, { amount: e.target.value })}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="val-remove-btn"
                                    onClick={() => handleDeleteSubset(vgIdx, valIdx, subIdx)}
                                    title="Remove Subset"
                                    style={{ width: '28px', height: '28px' }}
                                  >
                                    &times;
                                  </button>
                                </div>

                              <div className="value-row-2">
                                <VariantImageUploader
                                  value={sub.image || ''}
                                  onChange={(imgUrl) => handleUpdateSubset(vgIdx, valIdx, subIdx, { image: imgUrl })}
                                  onOpenStudio={sub.image ? () => setEditingVariantTarget({ vgIdx, valIdx, subIdx, image: { url: sub.image } }) : null}
                                />
                                <input
                                  className="sub-stock"
                                  type="number"
                                  placeholder="0"
                                  value={sub.stock !== undefined ? sub.stock : 0}
                                  onChange={(e) => handleUpdateSubset(vgIdx, valIdx, subIdx, { stock: e.target.value })}
                                />
                                <input
                                  className="sub-sku"
                                  placeholder="SKU (auto)"
                                  value={sub.sku || ''}
                                  onChange={(e) => handleUpdateSubset(vgIdx, valIdx, subIdx, { sku: e.target.value })}
                                />
                                <select
                                  className="sub-status"
                                  value={sub.status || 'Draft'}
                                  onChange={(e) => handleUpdateSubset(vgIdx, valIdx, subIdx, { status: e.target.value })}
                                >
                                  <option value="Draft">Draft</option>
                                  <option value="Published">Published</option>
                                  <option value="Hidden">Hidden</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleAddValue(vgIdx)}
                style={{ marginTop: '6px' }}
              >
                + Add Value
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn btn-sm"
            onClick={handleAddVariantGroup}
            style={{ marginTop: '12px' }}
          >
            + Add Variant
          </button>
        </div>
      </div>

      {/* Image Editor Modal for Product Images */}
      {editingImageIdx !== null && (formData.images || [])[editingImageIdx] && (
        <ImageEditorModal
          image={(formData.images || [])[editingImageIdx]}
          onSave={handleSaveEditedImage}
          onClose={() => setEditingImageIdx(null)}
        />
      )}

      {/* Image Editor Modal for Variant / Subset Images */}
      {editingVariantTarget !== null && editingVariantTarget.image && (
        <ImageEditorModal
          image={editingVariantTarget.image}
          onSave={handleSaveEditedVariantImage}
          onClose={() => setEditingVariantTarget(null)}
        />
      )}
    </div>
  );
}

function VariantImageUploader({ value, onChange, onOpenStudio }) {
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const res = await convertToWebP(file, 200);
      onChange(res.url);
    } catch (err) {
      alert('Image conversion failed: ' + err.message);
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={`variant-img-uploader ${value ? 'has-image' : ''}`}>
      <input
        type="file"
        ref={fileRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {processing ? (
        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Processing WebP...</span>
      ) : value ? (
        <>
          <img src={value} alt="Variant" className="variant-img-thumb" />
          <div className="variant-img-actions">
            {onOpenStudio && (
              <button
                type="button"
                className="variant-img-btn-sm"
                title="Edit Studio (rotate, bg removal)"
                onClick={onOpenStudio}
              >
                <Icon name="wand" size={11} /> Studio
              </button>
            )}
            <button
              type="button"
              className="variant-img-btn-sm"
              title="Change Image"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="camera" size={11} /> Change
            </button>
            <button
              type="button"
              className="variant-img-btn-remove"
              title="Remove image"
              onClick={() => onChange('')}
            >
              &times;
            </button>
          </div>
        </>
      ) : (
        <div
          className="variant-img-empty-btn"
          onClick={() => fileRef.current?.click()}
          title="Upload Variant Image (Auto WebP < 200KB)"
        >
          <Icon name="camera" size={14} />
          <span>Upload Image</span>
        </div>
      )}
    </div>
  );
}
