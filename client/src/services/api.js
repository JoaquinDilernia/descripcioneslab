const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// JWT token management
const TOKEN_KEY = 'dl_auth_token';

export function getJwt() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setJwt(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearJwt() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const jwt = getJwt();
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
  });
  return res.json();
}

// Auth
export function getAuthStatus() {
  return request('/auth/status');
}

export function register(name, email, password, storeId, accessToken) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, store_id: storeId, access_token: accessToken }),
  });
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return request('/auth/me');
}

export function exchangeCode(code) {
  return request('/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function saveToken(accessToken, storeId) {
  return request('/auth/token', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken, store_id: storeId }),
  });
}

// Products
export function getProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/products?${query}`);
}

export function getProduct(id) {
  return request(`/api/products/${id}`);
}

export function getProductStats() {
  return request('/api/products/stats');
}

export function getCategories() {
  return request('/api/products/categories/list');
}

// Structure & Preview
export function previewStructure(sections, productIds = [], useAi = false, font = '') {
  return request('/api/products/preview', {
    method: 'POST',
    body: JSON.stringify({ sections, product_ids: productIds, use_ai: useAi, font: font || '' }),
  });
}

export function detectStructure() {
  return request('/api/products/structure/detect', { method: 'POST' });
}

export function getDefaultStructure() {
  return request('/api/products/structure/default');
}

export function saveDefaultStructure(sections, font) {
  return request('/api/products/structure/default', {
    method: 'POST',
    body: JSON.stringify({ sections, font: font || '' }),
  });
}

// Apply
export function applyStructure(sections, scope, categoryId, productIds, useAi = false, font = '') {
  return request('/api/products/apply', {
    method: 'POST',
    body: JSON.stringify({
      sections,
      scope,
      category_id: categoryId,
      product_ids: productIds,
      use_ai: useAi,
      font: font || '',
    }),
  });
}

// Backups
export function getBackups() {
  return request('/api/products/backups/list');
}

export function rollbackBackup(backupId) {
  return request(`/api/products/backups/${backupId}/rollback`, {
    method: 'POST',
  });
}

// SEO
export function getSeoStatus() {
  return request('/api/products/seo/status');
}

export function previewSeo(productIds = [], useAi = false, scanAll = false) {
  return request('/api/products/seo/preview', {
    method: 'POST',
    body: JSON.stringify({ product_ids: productIds, use_ai: useAi, scan_all: scanAll }),
  });
}

export function applySeo(changes) {
  return request('/api/products/seo/apply', {
    method: 'POST',
    body: JSON.stringify({ changes }),
  });
}

// Tags
export function previewTags(scanAll = false) {
  return request('/api/products/tags/preview', {
    method: 'POST',
    body: JSON.stringify({ scan_all: scanAll }),
  });
}

export function applyTags(changes) {
  return request('/api/products/tags/apply', {
    method: 'POST',
    body: JSON.stringify({ changes }),
  });
}

// ALT Text
export function previewAlt(scanAll = false) {
  return request('/api/products/alt/preview', {
    method: 'POST',
    body: JSON.stringify({ scan_all: scanAll }),
  });
}

export function applyAlt(productIds = []) {
  return request('/api/products/alt/apply', {
    method: 'POST',
    body: JSON.stringify({ product_ids: productIds }),
  });
}
