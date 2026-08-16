/**
 * Zylo Frontend API Client
 * Handles requests to /api with standardized error normalization and credential cookies.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiClientError extends Error {
  constructor(status, code, message, details = null, requestId = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers,
    credentials: options.credentials || 'include'
  };

  try {
    const res = await fetch(url, config);
    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      const err = data?.error || {};
      throw new ApiClientError(
        res.status,
        err.code || `HTTP_${res.status}`,
        err.message || res.statusText || 'API request failed',
        err.details || null,
        err.requestId || res.headers.get('x-request-id')
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    // Network or parse error
    throw new ApiClientError(0, 'NETWORK_ERROR', error.message || 'Network connection error');
  }
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' })
};

export default api;
