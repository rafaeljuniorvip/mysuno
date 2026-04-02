import axios from 'axios';

const baseURL = import.meta.env.PROD
  ? 'https://api.mysn.vipte.co/api'
  : '/api';

const api = axios.create({ baseURL });

// Add token from localStorage on init
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config.url?.includes('/auth/')) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

const API_ORIGIN = import.meta.env.PROD ? 'https://api.mysn.vipte.co' : '';

// Resolve media URLs: /media/... → full URL, external URLs pass through
export function resolveMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('/media/')) return `${API_ORIGIN}${url}`;
  return url;
}

export default api;
