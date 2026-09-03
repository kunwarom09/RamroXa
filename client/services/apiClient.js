/**
 * Zylo Frontend API Client
 * Handles requests to /api with standardized error normalization,
 * automatic Bearer token passing, CSRF token handling, and credential cookies.
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

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  try {
    const local = localStorage.getItem('zylo_access_token') || localStorage.getItem('zylo_admin_token');
    if (local) return local;

    if (document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)zylo_access_token=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
  } catch (e) {
    // Ignore localStorage access errors
  }
  return null;
}

function getStoredCsrfToken() {
  if (typeof window === 'undefined') return null;
  try {
    const local = localStorage.getItem('zylo_csrf_token');
    if (local) return local;

    if (document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)(?:XSRF-TOKEN|xsrf-token)=([^;]+)/i);
      if (match) return decodeURIComponent(match[1]);
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

function persistTokens(data) {
  if (typeof window === 'undefined' || !data) return;
  try {
    const token = data?.data?.accessToken || data?.accessToken;
    if (token) {
      localStorage.setItem('zylo_access_token', token);
      localStorage.setItem('zylo_admin_token', token);
      document.cookie = `zylo_access_token=${token}; path=/; max-age=86400; SameSite=Lax;`;
    }

    const csrfToken = data?.data?.csrfToken || data?.csrfToken;
    if (csrfToken) {
      localStorage.setItem('zylo_csrf_token', csrfToken);
      document.cookie = `XSRF-TOKEN=${csrfToken}; path=/; max-age=86400; SameSite=Lax;`;
    }

    const user = data?.data?.user || data?.user;
    if (user) {
      localStorage.setItem('zylo_user', JSON.stringify(user));
    }
  } catch (e) {
    // Ignore storage errors
  }
}

export async function apiRequest(endpoint, options = {}, isRetry = false) {
  let url = endpoint;
  if (!url.startsWith('http')) {
    const rawBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
    if (rawBase && !rawBase.endsWith('/api')) {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      url = `${rawBase}${cleanEndpoint}`;
    } else {
      // Ensure exactly one leading slash and no duplicate /api
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      url = cleanEndpoint.replace(/^\/api\/api\//, '/api/');
      if (!url.startsWith('/api/') && url !== '/api') {
        url = `/api${url}`;
      }
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Attach Bearer token if present
  const token = getStoredToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach CSRF token for mutating methods
  const csrfToken = getStoredCsrfToken();
  const method = (options.method || 'GET').toUpperCase();
  if (csrfToken && !headers['x-csrf-token'] && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['x-csrf-token'] = csrfToken;
  }

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

    // If ANY endpoint returned tokens or user data, persist them immediately
    if (res.ok && data) {
      if (data?.data?.accessToken || data?.accessToken || data?.data?.user || data?.user || endpoint.includes('/auth/')) {
        persistTokens(data);
      }
    }

    if (!res.ok) {
      // Handle 401 Unauthorized with automatic single retry via refresh token if not already an auth endpoint
      if (res.status === 401 && !isRetry && !endpoint.includes('/auth/')) {
        try {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            persistTokens(refreshData);
            return await apiRequest(endpoint, options, true);
          }
        } catch (refreshErr) {
          // Fall through to throw original 401
        }
      }

      let errorMsg = null;
      let errorCode = `HTTP_${res.status}`;
      let errorDetails = null;

      if (data && typeof data === 'object') {
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMsg = data.error;
          } else if (typeof data.error === 'object') {
            errorMsg = data.error.message;
            errorCode = data.error.code || errorCode;
            errorDetails = data.error.details || null;
          }
        } else if (typeof data.message === 'string') {
          errorMsg = data.message;
        }

        if (!errorMsg && data.details && typeof data.details === 'object') {
          const detailVals = Object.values(data.details).filter(Boolean);
          if (detailVals.length) errorMsg = detailVals.join(', ');
        }
      } else if (typeof data === 'string' && data.trim()) {
        errorMsg = data.trim();
      }

      if (!errorMsg) {
        if (res.status === 409) {
          errorMsg = 'An account with this email already exists.';
        } else if (res.status === 400) {
          errorMsg = 'Please verify your information and try again.';
        } else if (res.status === 429) {
          errorMsg = 'Too many attempts. Please wait a moment before trying again.';
        } else if (res.status === 500) {
          errorMsg = 'Server encountered a temporary issue. Please try again shortly.';
        } else {
          errorMsg = res.statusText || 'Unable to complete request. Please try again.';
        }
      }

      throw new ApiClientError(
        res.status,
        errorCode,
        errorMsg,
        errorDetails,
        data?.error?.requestId || res.headers.get('x-request-id')
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Direct localhost backend fallback if relative /api route failed in dev browser
    if (!isRetry && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      if (url.startsWith('/api/')) {
        try {
          const directBackendUrl = `http://127.0.0.1:5000${url}`;
          return await apiRequest(directBackendUrl, options, true);
        } catch (fallbackErr) {
          if (fallbackErr instanceof ApiClientError) throw fallbackErr;
        }
      }
    }

    // Network or connection error
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Network connection error. Please ensure the backend server is running and try again.');
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
