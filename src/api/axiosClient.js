import axios from 'axios';
import { getAuthToken, removeAuthToken } from '../utils/auth';

// In dev, Vite's proxy forwards '/api' to the local backend (see vite.config.js), so the
// relative path just works. In production there is no such proxy — the web app and API are
// on different domains (e.g. Vercel + Render) — so a real base URL must be supplied via env.
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api`
  : '/api';

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeAuthToken();
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
