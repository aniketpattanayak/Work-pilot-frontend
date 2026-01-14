import axios from 'axios';

const API = axios.create({
  // Automatically uses AWS URL from .env or fallbacks to localhost
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// REQUEST INTERCEPTOR: Automatically attach Auth Token if it exists
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR: Global Data Normalizer
 * This prevents '.map is not a function' errors by ensuring 
 * components always receive the specific data array they expect.
 */
API.interceptors.response.use(
  (response) => {
    // 1. If backend sends { success: true, data: [...] }, unwrap it to [...]
    if (response.data && !Array.isArray(response.data) && response.data.data) {
      response.data = response.data.data;
    }
    
    // 2. If backend sends { employees: [...] }, unwrap it to [...]
    else if (response.data && !Array.isArray(response.data) && response.data.employees) {
        response.data = response.data.employees;
    }

    // 3. If backend sends { tasks: [...] }, unwrap it to [...]
    else if (response.data && !Array.isArray(response.data) && response.data.tasks) {
        response.data = response.data.tasks;
    }

    return response;
  },
  (error) => {
    // Global Error Handling (Useful for AWS timeouts or 401 Unauthorized)
    if (error.response?.status === 401) {
       console.warn("Session expired. Redirecting to login...");
       // Optional: localStorage.clear(); window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default API;