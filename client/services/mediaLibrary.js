// ─── RAMROXA MEDIA LIBRARY SERVICE ──────────────────────────────────────────
import { convertToWebP } from './imageProcessor';

const STORAGE_KEY = 'rmx-media-library';

export const DEFAULT_MEDIA_ASSETS = [
  {
    id: 'med_hero_1',
    name: 'Hero Lifestyle Sneaker 1',
    url: '/hero-slide-1.jpg',
    category: 'Hero',
    size: '184 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_hero_2',
    name: 'Hero Lifestyle Sneaker 2',
    url: '/hero-slide-2.jpg',
    category: 'Hero',
    size: '192 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_men_1',
    name: 'Model Men - Denim Streetwear',
    url: '/assets/44312e50fe56c782.q.jpg',
    category: 'Men',
    size: '142 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_men_2',
    name: 'Model Men - Lifestyle Blazer',
    url: '/assets/dbacea851225e2bf.q.jpg',
    category: 'Men',
    size: '128 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_women_1',
    name: 'Model Women - Activewear Minimal',
    url: '/assets/7f7ad2764f25606b.q.jpg',
    category: 'Women',
    size: '156 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_women_2',
    name: 'Model Women - Casual Beige',
    url: '/assets/ed11bf6e660fdaa2.q.jpg',
    category: 'Women',
    size: '138 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_women_3',
    name: 'Model Women - Studio Look',
    url: '/assets/78948356fa487da5.q.jpg',
    category: 'Women',
    size: '149 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_kids_1',
    name: 'Model Kids - Adventure Jacket',
    url: '/assets/0ffbe14d4cba1d4a.q.jpg',
    category: 'Kids',
    size: '124 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_kids_2',
    name: 'Model Kids - Outdoor Play',
    url: '/assets/c2dbe0a9de9b2d4c.q.jpg',
    category: 'Kids',
    size: '131 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_kids_3',
    name: 'Model Kids - Core Tee',
    url: '/assets/0ca944ebbae726b8.q.jpg',
    category: 'Kids',
    size: '115 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_prod_1',
    name: 'Minimal Canvas Sneaker',
    url: '/assets/59a3737ee018272f.q.jpg',
    category: 'Products',
    size: '160 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  },
  {
    id: 'med_prod_2',
    name: 'Everyday Runner Sneaker',
    url: '/assets/98eab38550301ca9.q.jpg',
    category: 'Products',
    size: '175 KB',
    date: '2026-08-27',
    type: 'image/jpeg'
  }
];

export function getMediaLibrary() {
  if (typeof window === 'undefined') return DEFAULT_MEDIA_ASSETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MEDIA_ASSETS));
      return DEFAULT_MEDIA_ASSETS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_MEDIA_ASSETS;
  } catch (e) {
    console.error('Failed to get media library:', e);
    return DEFAULT_MEDIA_ASSETS;
  }
}

export function saveMediaLibrary(items) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('rmx-media-library-updated', { detail: items }));
  } catch (e) {
    console.error('Failed to save media library:', e);
  }
}

export async function uploadMediaFile(file, category = 'Uploads') {
  let url = '';
  try {
    // Process image to optimized WebP
    const webpBlob = await convertToWebP(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.88 });
    url = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(webpBlob);
    });
  } catch {
    url = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  const newItem = {
    id: 'med_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: file.name.replace(/\.[^/.]+$/, ''),
    url,
    category,
    size: `${Math.round(file.size / 1024)} KB`,
    date: new Date().toISOString().split('T')[0],
    type: file.type || 'image/webp'
  };

  const current = getMediaLibrary();
  const updated = [newItem, ...current];
  saveMediaLibrary(updated);
  return newItem;
}

export function addExternalMedia(name, url, category = 'General') {
  if (!url) return null;
  const newItem = {
    id: 'med_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name || 'Image Asset',
    url,
    category,
    size: 'Web Link',
    date: new Date().toISOString().split('T')[0],
    type: 'image/external'
  };
  const current = getMediaLibrary();
  const updated = [newItem, ...current];
  saveMediaLibrary(updated);
  return newItem;
}

export function deleteMediaItem(id) {
  const current = getMediaLibrary();
  const updated = current.filter(item => item.id !== id);
  saveMediaLibrary(updated);
  return updated;
}
