// ─── RAMROXA MEDIA LIBRARY SERVICE ──────────────────────────────────────────
import { convertToWebP } from './imageProcessor';

const STORAGE_KEY = 'rmx-media-library';
const DB_NAME = 'rmx_media_storage_v1';
const STORE_NAME = 'blobs';

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
  },
  {
    id: 'med_vid_local_1',
    name: 'Ramroxa Brand Narrative Film',
    url: '/videos/ramroxa-brand-video.mp4',
    posterUrl: '/assets/59a3737ee018272f.q.jpg',
    category: 'Videos',
    size: '1.1 MB (Local)',
    date: '2026-08-30',
    type: 'video/mp4'
  },
  {
    id: 'med_vid_local_2',
    name: 'Sample Motion Video',
    url: '/videos/sample-video.mp4',
    posterUrl: '/assets/98eab38550301ca9.q.jpg',
    category: 'Videos',
    size: '1.1 MB (Local)',
    date: '2026-08-30',
    type: 'video/mp4'
  }
];

// Helper: format bytes into clean KB/MB
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// In-memory cache for IndexedDB object URLs across the session
const objectUrlMap = new Map();

// Helper: Open IndexedDB for offline / client storage fallback
function openMediaDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
}

async function saveBlobToDB(id, blob, mimeType) {
  try {
    const db = await openMediaDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, data: blob, type: mimeType, updated: Date.now() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

async function getBlobFromDB(id) {
  try {
    const db = await openMediaDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function deleteBlobFromDB(id) {
  try {
    const db = await openMediaDB();
    if (!db) return;
    const tx = db.transaction([STORE_NAME], 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
  } catch (e) {}
}

// Generate thumbnail snapshot from video file or URL
export function generateVideoThumbnail(fileOrUrl) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      let tempUrl = null;
      if (typeof fileOrUrl === 'string') {
        video.src = fileOrUrl;
      } else {
        tempUrl = URL.createObjectURL(fileOrUrl);
        video.src = tempUrl;
      }

      const cleanUp = () => {
        if (tempUrl) URL.revokeObjectURL(tempUrl);
      };

      video.onloadeddata = () => {
        video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = Math.min(video.videoWidth || 360, 480);
          const height = Math.min(video.videoHeight || 200, 270);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, width, height);
          const poster = canvas.toDataURL('image/jpeg', 0.7);
          cleanUp();
          resolve(poster);
        } catch (err) {
          cleanUp();
          resolve(null);
        }
      };

      video.onerror = () => {
        cleanUp();
        resolve(null);
      };

      // 4-second timeout guard
      setTimeout(() => {
        cleanUp();
        resolve(null);
      }, 4000);
    } catch (e) {
      resolve(null);
    }
  });
}

// Rehydrate Blob URLs from IndexedDB for any items marked with hasIndexedBlob
let isHydrating = false;
async function rehydrateBlobs(items) {
  if (isHydrating || typeof window === 'undefined') return;
  isHydrating = true;
  let hasChanges = false;

  for (const item of items) {
    if (item.hasIndexedBlob && (!item.url || item.url.startsWith('blob:'))) {
      if (!objectUrlMap.has(item.id)) {
        const blob = await getBlobFromDB(item.id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          objectUrlMap.set(item.id, url);
          item.url = url;
          hasChanges = true;
        }
      } else {
        item.url = objectUrlMap.get(item.id);
      }
    }
  }

  isHydrating = false;
  if (hasChanges) {
    window.dispatchEvent(new CustomEvent('rmx-media-library-updated', { detail: items }));
  }
}

export function getMediaLibrary() {
  if (typeof window === 'undefined') return DEFAULT_MEDIA_ASSETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MEDIA_ASSETS));
      return DEFAULT_MEDIA_ASSETS;
    }
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MEDIA_ASSETS;

    // Attach in-memory object URLs if available
    items.forEach(item => {
      if (item.hasIndexedBlob && objectUrlMap.has(item.id)) {
        item.url = objectUrlMap.get(item.id);
      }
    });

    // Rehydrate any missing blobs in the background
    rehydrateBlobs(items);

    return items;
  } catch (e) {
    console.error('Failed to load media library from localStorage:', e);
    return DEFAULT_MEDIA_ASSETS;
  }
}

export function saveMediaLibrary(items) {
  if (typeof window === 'undefined') return;
  try {
    // Sanitize items: DO NOT save large base64 data URLs in localStorage (limit 20KB per field)
    const sanitized = items.map(item => {
      const copy = { ...item };
      if (copy.url && copy.url.startsWith('data:') && copy.url.length > 25000) {
        // Strip large dataUrl to avoid localStorage 5MB quota exhaustion
        copy.hasIndexedBlob = true;
        copy.url = '';
      }
      return copy;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent('rmx-media-library-updated', { detail: items }));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(sanitized) }));
  } catch (e) {
    console.warn('LocalStorage save failed, attempting compact metadata:', e);
    try {
      const lightweight = items.slice(0, 30).map(item => ({
        id: item.id,
        name: item.name,
        url: item.url?.startsWith('data:') ? '' : item.url,
        posterUrl: item.posterUrl?.length < 30000 ? item.posterUrl : undefined,
        category: item.category,
        size: item.size,
        date: item.date,
        type: item.type,
        hasIndexedBlob: item.hasIndexedBlob
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
      window.dispatchEvent(new CustomEvent('rmx-media-library-updated', { detail: items }));
    } catch (innerErr) {
      console.error('Critical media storage quota error:', innerErr);
    }
  }
}

export async function uploadMediaFile(file, category = 'Uploads') {
  const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v)$/i.test(file.name);
  const mediaType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');
  const sizeStr = formatBytes(file.size);
  const id = 'med_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  let finalUrl = '';
  let posterUrl = null;
  let hasIndexedBlob = false;

  // 1. Generate video thumbnail frame if it is a video
  if (isVideo) {
    try {
      posterUrl = await generateVideoThumbnail(file);
    } catch (e) {
      console.warn('Could not generate video poster:', e);
    }
  }

  // 2. Try uploading via Server API (/api/upload) for a permanent static URL
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        finalUrl = data.url;
      }
    }
  } catch (netErr) {
    console.warn('Server upload route unavailable, using local store:', netErr);
  }

  // 3. Fallback to IndexedDB + Object URL if server API route is not available
  if (!finalUrl) {
    try {
      await saveBlobToDB(id, file, mediaType);
      const objUrl = URL.createObjectURL(file);
      objectUrlMap.set(id, objUrl);
      finalUrl = objUrl;
      hasIndexedBlob = true;
    } catch (idbErr) {
      console.warn('IndexedDB fallback failed:', idbErr);
      // Final fallback: data URL if not too large
      if (!isVideo || file.size < 3 * 1024 * 1024) {
        finalUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
    }
  }

  // 4. For images, if not uploaded to server, optimize with WebP converter
  if (!isVideo && !finalUrl.startsWith('/uploads/')) {
    try {
      const result = await convertToWebP(file, 200);
      if (result && (result.url || result)) {
        finalUrl = result.url || result;
      }
    } catch (err) {
      console.warn('WebP converter notice:', err);
    }
  }

  const targetCategory = isVideo && (category === 'all' || category === 'Uploads') ? 'Videos' : category;

  const newItem = {
    id,
    name: (file.name || (isVideo ? 'Uploaded Video' : 'Uploaded Asset')).replace(/\.[^/.]+$/, ''),
    url: finalUrl,
    posterUrl: posterUrl || undefined,
    category: targetCategory,
    size: sizeStr,
    date: new Date().toISOString().split('T')[0],
    type: mediaType,
    hasIndexedBlob
  };

  const current = getMediaLibrary();
  const updated = [newItem, ...current];
  saveMediaLibrary(updated);
  return newItem;
}

export function addExternalMedia(name, url, category = 'General') {
  if (!url) return null;
  const isVideo = /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(url) || category === 'Videos';
  const targetCategory = isVideo && category === 'General' ? 'Videos' : category;

  const newItem = {
    id: 'med_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name || (isVideo ? 'External Video' : 'External Asset'),
    url: url.trim(),
    category: targetCategory,
    size: isVideo ? 'Video Link' : 'Web Link',
    date: new Date().toISOString().split('T')[0],
    type: isVideo ? 'video/mp4' : 'image/external'
  };

  const current = getMediaLibrary();
  const updated = [newItem, ...current];
  saveMediaLibrary(updated);
  return newItem;
}

export function deleteMediaItem(id) {
  if (objectUrlMap.has(id)) {
    try {
      URL.revokeObjectURL(objectUrlMap.get(id));
    } catch (e) {}
    objectUrlMap.delete(id);
  }
  deleteBlobFromDB(id);

  const current = getMediaLibrary();
  const updated = current.filter(item => item.id !== id);
  saveMediaLibrary(updated);
  return updated;
}
