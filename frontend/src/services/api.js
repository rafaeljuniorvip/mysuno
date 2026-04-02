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

const TZ = 'America/Sao_Paulo';

export function formatDate(val) {
  if (!val) return '--';
  return new Date(val).toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(val) {
  if (!val) return '--';
  return new Date(val).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDateShort(val) {
  if (!val) return '--';
  return new Date(val).toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatTime(val) {
  if (!val) return '--';
  return new Date(val).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

export default api;
