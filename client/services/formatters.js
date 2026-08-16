export function money(n) {
  if (n === null || n === undefined) return 'Rs 0';
  const val = Number(n);
  if (isNaN(val)) return 'Rs 0';
  return 'Rs ' + Math.round(val).toLocaleString('en-IN');
}

export function moneyNpr(amount) {
  return money(amount);
}

export function fromPaisa(paisa) {
  if (paisa === null || paisa === undefined) return 0;
  const val = Number(paisa);
  if (isNaN(val)) return 0;
  return Math.round(val / 100);
}

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getProductThumbnail(p) {
  if (!p) return '/assets/98eab38550301ca9.q.jpg';
  if (p.images && p.images.length) {
    const featured = p.images.find(img => img.isFeatured) || p.images[0];
    if (featured && (featured.url || featured.src)) return featured.url || featured.src;
  }
  if (p.img1) return p.img1.startsWith('http') || p.img1.startsWith('/') ? p.img1 : `/assets/${p.img1}.q.jpg`;
  return '/assets/98eab38550301ca9.q.jpg';
}
