import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// REQUEST INTERCEPTOR: Attach JWT token if present
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Prevent multiple simultaneous redirects
let redirecting = false;

// RESPONSE INTERCEPTOR
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (redirecting) return Promise.reject(error);

    const status = error.response?.status;
    const code   = error.response?.data?.code;
    const path   = window.location.pathname;
    const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';

    // 401 handling — clear token and redirect, never reload (reload causes blink loop)
    if (status === 401) {
      if (!redirecting) {
        redirecting = true;
        // Clear all auth data
        localStorage.removeItem('token');
        localStorage.removeItem('isSuperAdmin');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantId');
        setTimeout(() => {
          redirecting = false;
          // SuperAdmin goes to root (shows login), regular users go to /login
          window.location.href = isSuperAdmin ? '/' : '/login';
        }, 300);
      }
      return Promise.reject(error);
    }

    // Subscription paused
    if (status === 403 && code === 'SUBSCRIPTION_PAUSED' && path !== '/suspended') {
      redirecting = true;
      sessionStorage.setItem('suspendedReason',   error.response.data.reason   || '');
      sessionStorage.setItem('suspendedPausedAt', error.response.data.pausedAt || '');
      setTimeout(() => {
        redirecting = false;
        window.location.href = '/suspended';
      }, 100);
    }

    return Promise.reject(error);
  }
);

export default API;
