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

    // 401 handling
    if (status === 401) {
      // SuperAdmin pages: just clear the token and reload once — don't redirect to /
      if (isSuperAdmin || path === '/') {
        if (!redirecting) {
          redirecting = true;
          localStorage.removeItem('token');
          localStorage.removeItem('isSuperAdmin');
          localStorage.removeItem('user');
          setTimeout(() => {
            redirecting = false;
            window.location.reload();
          }, 300);
        }
        return Promise.reject(error);
      }

      // Regular users: redirect to login
      if (!['/login', '/suspended'].includes(path)) {
        redirecting = true;
        localStorage.removeItem('token');
        setTimeout(() => {
          redirecting = false;
          window.location.href = '/';
        }, 300);
      }
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