import { api } from './apiClient';

export async function fetchProducts(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = `/api/products${query ? `?${query}` : ''}`;
    const res = await api.get(url);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.products)) return res.products;
    return [];
  } catch (err) {
    console.error('Failed to fetch products from API:', err.message);
    return [];
  }
}

export async function fetchProductBySlug(slug) {
  try {
    const res = await api.get(`/api/products/${slug}`);
    return res?.data || res?.product || res || null;
  } catch (err) {
    console.error('Failed to fetch product by slug from API:', err.message);
    return null;
  }
}

export async function fetchCategories() {
  try {
    const res = await api.get('/api/categories');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.categories)) return res.categories;
    return [];
  } catch (err) {
    console.error('Failed to fetch categories from API:', err.message);
    return [];
  }
}

export async function getProducts() {
  return fetchProducts();
}

export async function getProductById(id) {
  return fetchProductBySlug(id);
}

export async function getCategories() {
  return fetchCategories();
}

export async function saveProduct(product) {
  if (product.id || product._id) {
    const id = product.id || product._id;
    const res = await api.put(`/api/admin/products/${id}`, product);
    return res.data?.product || res.data;
  }
  const res = await api.post('/api/admin/products', product);
  return res.data?.product || res.data;
}

export async function deleteProduct(productId) {
  const res = await api.delete(`/api/admin/products/${productId}`);
  return res.data;
}

// ── Review Services ──
export async function fetchProductReviews(productIdOrSlug, params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = `/api/products/${productIdOrSlug}/reviews${query ? `?${query}` : ''}`;
    const res = await api.get(url);
    return res;
  } catch (err) {
    console.error('Failed to fetch product reviews:', err.message);
    return { data: [], summary: { ratingAvg: 0, ratingCount: 0, distribution: {}, percentages: {} } };
  }
}

export async function submitProductReview(productIdOrSlug, reviewData) {
  const url = `/api/products/${productIdOrSlug}/reviews`;
  const res = await api.post(url, reviewData);
  return res;
}

export async function deleteMyReview(productIdOrSlug) {
  const url = `/api/products/${productIdOrSlug}/reviews/mine`;
  const res = await api.delete(url);
  return res;
}

// ── Admin Review Moderation ──
export async function fetchAdminReviews(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = `/api/admin/reviews${query ? `?${query}` : ''}`;
    const res = await api.get(url);
    return res;
  } catch (err) {
    console.error('Failed to fetch admin reviews:', err.message);
    return { data: [], pagination: { total: 0 } };
  }
}

export async function updateAdminReviewStatus(reviewId, status) {
  const url = `/api/admin/reviews/${reviewId}/status`;
  const res = await api.patch(url, { status });
  return res;
}

export async function deleteAdminReview(reviewId) {
  const url = `/api/admin/reviews/${reviewId}`;
  const res = await api.delete(url);
  return res;
}

