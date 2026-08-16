import { loadDB, saveDB } from './dataStore';

export function getProducts() {
  const db = loadDB();
  return db.products || [];
}

export function getProductById(id) {
  const db = loadDB();
  return (db.products || []).find(p => p.id === id || p.slug === id) || null;
}

export function getCategories() {
  const db = loadDB();
  return db.categories || [];
}

export function saveProduct(product) {
  const db = loadDB();
  const index = (db.products || []).findIndex(p => p.id === product.id);
  if (index >= 0) {
    db.products[index] = { ...db.products[index], ...product };
  } else {
    db.products.push(product);
  }
  saveDB(db);
  return product;
}

export function deleteProduct(id) {
  const db = loadDB();
  db.products = (db.products || []).filter(p => p.id !== id);
  saveDB(db);
}
