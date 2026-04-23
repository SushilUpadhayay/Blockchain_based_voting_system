import axios from 'axios';

// Base URL — reads from Vite env var, falls back to local backend
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const API = axios.create({
  baseURL: BASE_URL,
});

// ── Request Interceptor ───────────────────────────────────────────────────────
// Automatically attach the JWT token from localStorage to every request.
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

// ── Response Interceptor ──────────────────────────────────────────────────────
// On 401 Unauthorized, clear auth state and redirect to login.
// This handles expired / invalidated tokens gracefully.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only auto-redirect if the request was NOT to an auth endpoint
      // (to avoid an infinite redirect loop on the login/verify-otp pages)
      const url = error.config?.url ?? '';
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/verify-otp') ||
        url.includes('/auth/register');

      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
