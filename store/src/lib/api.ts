import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/** Strip accidental HTTP method prefixes and duplicate /api segments from paths. */
function normalizeApiPath(url: string): string {
  let path = url.trim().replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, '');
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      // keep path as-is if URL parsing fails
    }
  }
  if (API_URL.replace(/\/$/, '').endsWith('/api') && path.startsWith('/api/')) {
    path = path.slice(4);
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

function getTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  return {
    access: localStorage.getItem('accessToken'),
    refresh: localStorage.getItem('refreshToken'),
  };
}

export { getTokens };

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

apiClient.interceptors.request.use((config) => {
  const { access } = getTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;
  try {
    const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${API_URL}/auth/refresh`,
      { refreshToken: refresh },
    );
    const { accessToken, refreshToken } = res.data.data;
    setTokens(accessToken, refreshToken);
    return accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
      clearTokens();
      const { useAuthStore } = await import('@/stores/auth-store');
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        const { openAuthSheetForPageAccess } = await import('@/stores/pending-auth-store');
        openAuthSheetForPageAccess(
          `${window.location.pathname}${window.location.search}`,
        );
      }
    }
    return Promise.reject(error);
  },
);

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<ApiResponse<T>>(normalizeApiPath(url), { params });
  return res.data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<ApiResponse<T>>(normalizeApiPath(url), body);
  return res.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.put<ApiResponse<T>>(normalizeApiPath(url), body);
  return res.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch<ApiResponse<T>>(normalizeApiPath(url), body);
  return res.data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await apiClient.delete<ApiResponse<T>>(normalizeApiPath(url));
  return res.data.data;
}

export async function apiUpload<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post<ApiResponse<T>>(normalizeApiPath(url), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
