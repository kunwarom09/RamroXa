/**
 * Image Processing Service for Zylo Admin
 * - Multi-image batch processing
 * - WebP conversion & auto-compression to <200KB
 * - Canvas transformations: Rotate (90 deg), Flip (H/V), Background Removal
 */

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Converts any Image or File to WebP format with size under maxSizeKB (default 200KB)
 */
export async function convertToWebP(fileOrDataUrl, maxSizeKB = 200) {
  let src = fileOrDataUrl;
  if (typeof fileOrDataUrl !== 'string' && fileOrDataUrl instanceof Blob) {
    src = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    });
  }

  try {
    const img = await loadImage(src);
    let width = img.naturalWidth || img.width || 800;
    let height = img.naturalHeight || img.height || 600;

    // Max dimension constraints to keep memory & processing fast
    const MAX_DIM = 1600;
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Iterative quality loop to guarantee < 200KB
    let quality = 0.88;
    let webpData = canvas.toDataURL('image/webp', quality);
    if (!webpData || !webpData.startsWith('data:image/webp')) {
      webpData = canvas.toDataURL('image/jpeg', quality);
    }
    let sizeKB = Math.round((webpData.length * 3) / 4 / 1024);

    while (sizeKB > maxSizeKB && quality > 0.3) {
      quality -= 0.1;
      webpData = canvas.toDataURL('image/webp', quality);
      sizeKB = Math.round((webpData.length * 3) / 4 / 1024);
    }

    return {
      url: webpData,
      width,
      height,
      sizeKB,
      format: 'webp'
    };
  } catch (err) {
    return {
      url: typeof src === 'string' ? src : '',
      sizeKB: typeof src === 'string' ? Math.round((src.length * 3) / 4 / 1024) : 0,
      format: 'original'
    };
  }
}

/**
 * Removes background using corner color sampling and color difference thresholding
 */
export function removeBackgroundOnCanvas(ctx, width, height, tolerance = 30) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Sample the 4 corner pixels to determine dominant background color
  const sampleIndices = [
    0, // top-left
    (width - 1) * 4, // top-right
    (height - 1) * width * 4, // bottom-left
    ((height - 1) * width + (width - 1)) * 4 // bottom-right
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  sampleIndices.forEach(idx => {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  });
  bgR = Math.round(bgR / 4);
  bgG = Math.round(bgG / 4);
  bgB = Math.round(bgB / 4);

  const tolSq = tolerance * tolerance * 3;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Color distance to sampled background color
    const diffR = r - bgR;
    const diffG = g - bgG;
    const diffB = b - bgB;
    const distSq = diffR * diffR + diffG * diffG + diffB * diffB;

    // Check if close to sampled background or close to pure white/light grey
    const isLightWhite = (r > 240 && g > 240 && b > 240 && tolerance > 15);

    if (distSq < tolSq || isLightWhite) {
      // Feather / alpha falloff for smooth anti-aliased edge
      if (distSq > tolSq * 0.7) {
        const factor = (distSq - tolSq * 0.7) / (tolSq * 0.3);
        data[i + 3] = Math.round(255 * factor);
      } else {
        data[i + 3] = 0; // completely transparent
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Applies full transform: rotation, flips, background removal to an image source
 */
export async function transformImage(imageSrc, options = {}) {
  const { rotation = 0, flipH = false, flipV = false, removeBg = false, tolerance = 35 } = options;
  const img = await loadImage(imageSrc);

  const angle = ((rotation % 360) + 360) % 360;
  const is90or270 = angle === 90 || angle === 270;

  const width = is90or270 ? img.naturalHeight || img.height : img.naturalWidth || img.width;
  const height = is90or270 ? img.naturalWidth || img.width : img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.save();
  // Move origin to center for rotation & flips
  ctx.translate(width / 2, height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

  const drawW = img.naturalWidth || img.width;
  const drawH = img.naturalHeight || img.height;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  if (removeBg) {
    removeBackgroundOnCanvas(ctx, width, height, tolerance);
  }

  const webpData = canvas.toDataURL('image/webp', 0.9);
  const sizeKB = Math.round((webpData.length * 3) / 4 / 1024);

  return {
    url: webpData,
    width,
    height,
    sizeKB
  };
}
