import { api } from './apiClient';

export async function fetchProducts(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = `/api/products${query ? `?${query}` : ''}`;
    const res = await api.get(url);
    return res.data || [];
  } catch (err) {
    console.error('Failed to fetch products from API:', err.message);
    return [];
  }
}

export async function fetchProductBySlug(slug) {
  try {
    const res = await api.get(`/api/products/${slug}`);
    return res.data || null;
  } catch (err) {
    console.error('Failed to fetch product by slug from API:', err.message);
    return null;
  }
}

export async function fetchCategories() {
  try {
    const res = await api.get('/api/categories');
    return res.data || [];
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
