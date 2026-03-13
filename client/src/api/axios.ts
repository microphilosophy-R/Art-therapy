import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

const getTokenExpiryMs = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    if (typeof payload?.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { data } = await refreshClient.post('/auth/refresh', {});
      const auth = useAuthStore.getState();
      const nextUser = data?.user ?? auth.user;
      const nextToken = data?.accessToken as string | undefined;
      if (!nextUser || !nextToken) {
        auth.clearAuth();
        return null;
      }
      auth.setAuth(nextUser, nextToken);
      return nextToken;
    } catch {
      useAuthStore.getState().clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

api.interceptors.request.use(async (config) => {
  const auth = useAuthStore.getState();
  let token = auth.accessToken;
  if (!token && auth.isAuthenticated) {
    token = await refreshAccessToken();
  }

  if (token) {
    const expiryMs = getTokenExpiryMs(token);
    const expiresSoon = expiryMs !== null && expiryMs <= Date.now() + 5000;
    if (expiresSoon) {
      token = await refreshAccessToken();
    }
  }

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url ?? '');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isRefreshRequest) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      useAuthStore.getState().clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
