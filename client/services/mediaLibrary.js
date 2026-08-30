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
  },
  {
    id: 'med_vid_1',
    name: 'Neon Streetwear & Urban Glow (Brand Film)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-neon-illuminated-city-43644-large.mp4',
    posterUrl: '/assets/59a3737ee018272f.q.jpg',
    category: 'Videos',
    size: '1.8 MB (Stream)',
    date: '2026-08-30',
    type: 'video/mp4'
  },
  {
    id: 'med_vid_2',
    name: 'Sneakers In Motion (Footwear Showcase)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-feet-of-a-person-walking-in-sneakers-42930-large.mp4',
    posterUrl: '/assets/98eab38550301ca9.q.jpg',
    category: 'Videos',
    size: '1.2 MB (Stream)',
    date: '2026-08-30',
    type: 'video/mp4'
  },
  {
    id: 'med_vid_3',
    name: 'Artisan Workshop & Fabric Crafting',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-cutting-fabric-in-a-tailoring-workshop-43759-large.mp4',
    posterUrl: '/assets/44312e50fe56c782.q.jpg',
    category: 'Videos',
    size: '1.5 MB (Stream)',
    date: '2026-08-30',
    type: 'video/mp4'
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
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MEDIA_ASSETS;
  } catch (e) {
    console.error('Failed to load media library from localStorage:', e);
    return DEFAULT_MEDIA_ASSETS;
  }
}

export function saveMediaLibrary(items) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('rmx-media-library-updated', { detail: items }));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(items) }));
  } catch (e) {
    console.error('Failed to save media library, attempting cleanup:', e);
    // If quota exceeded, retain default assets plus the 10 most recent uploads
    try {
      const trimmed = items.slice(0, 15);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      window.dispatchEvent(new CustomEvent('rmx-media-library-updated', { detail: trimmed }));
    } catch (innerErr) {
      console.error('Critical storage quota error:', innerErr);
    }
  }
}

export async function uploadMediaFile(file, category = 'Uploads') {
  let url = '';
  let sizeStr = `${Math.round(file.size / 1024)} KB`;
  const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v)$/i.test(file.name);
  const mediaType = isVideo ? (file.type || 'video/mp4') : 'image/webp';

  if (isVideo) {
    // Read video directly as DataURL or Object URL
    url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } else {
    try {
      // Process image to optimized WebP (<200KB)
      const result = await convertToWebP(file, 200);
      url = result.url || result;
      if (result.sizeKB) {
        sizeStr = `${result.sizeKB} KB`;
      }
    } catch (err) {
      console.warn('WebP converter notice, using standard reader:', err);
      url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }

  const newItem = {
    id: 'med_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: (file.name || (isVideo ? 'Uploaded Video' : 'Uploaded Asset')).replace(/\.[^/.]+$/, ''),
    url,
    category: isVideo && category === 'Uploads' ? 'Videos' : category,
    size: sizeStr,
    date: new Date().toISOString().split('T')[0],
    type: mediaType
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
