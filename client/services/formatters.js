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

export function formatDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function formatDateTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const dateStr = formatDate(d);
  const timeStr = formatTime(d);
  return timeStr ? `${dateStr} ${timeStr}` : dateStr;
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

export function docSubtotal(doc) {
  if (!doc) return 0;
  if (doc.subtotal != null) return Number(doc.subtotal) || 0;
  if (doc.taxable != null) return Number(doc.taxable) || 0;
  if (doc.items && Array.isArray(doc.items) && doc.items.length) {
    return doc.items.reduce((sum, i) => sum + (Number(i.qty || 0) * Number(i.rate || 0)), 0);
  }
  return Number(doc.total || doc.grandTotal || 0);
}

export function docVat(doc, vatRate = 13) {
  if (!doc) return 0;
  if (doc.vat != null) return Number(doc.vat) || 0;
  if (doc.vatAmount != null) return Number(doc.vatAmount) || 0;
  if (doc.vatTotal != null) return Math.round(doc.vatTotal / 100);
  if (doc.vatable === false) return 0;
  const rate = Number(vatRate) || 13;
  return Math.round((docSubtotal(doc) * rate) / 100);
}

export function docTotal(doc, vatRate = 13) {
  if (!doc) return 0;
  if (doc.total != null) return Number(doc.total) || 0;
  if (doc.totalAmount != null) return Number(doc.totalAmount) || 0;
  if (doc.grandTotal != null) return Math.round(doc.grandTotal / 100);
  return docSubtotal(doc) + docVat(doc, vatRate);
}

export default {
  money,
  moneyNpr,
  fromPaisa,
  slugify,
  today,
  offsetDate,
  getProductThumbnail,
  docSubtotal,
  docVat,
  docTotal,
  formatDate,
  formatTime,
  formatDateTime
};
