import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export function getAdminTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  return {
    access: localStorage.getItem('adminAccessToken'),
    refresh: localStorage.getItem('adminRefreshToken'),
  };
}

export function setAdminTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('adminAccessToken', accessToken);
  localStorage.setItem('adminRefreshToken', refreshToken);
}

export function clearAdminTokens() {
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminRefreshToken');
}

apiClient.interceptors.request.use((config) => {
  const { access } = getAdminTokens();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const { refresh } = getAdminTokens();
      if (refresh) {
        refreshPromise = refreshPromise ?? axios
          .post(`${API_URL}/auth/refresh`, { refreshToken: refresh })
          .then((res) => {
            const { accessToken, refreshToken } = res.data.data;
            setAdminTokens(accessToken, refreshToken);
            return accessToken;
          })
          .catch(() => {
            clearAdminTokens();
            return null;
          });
        const token = await refreshPromise;
        refreshPromise = null;
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        }
      }
      clearAdminTokens();
      const { useAdminAuth } = await import('@/stores/auth-store');
      useAdminAuth.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<{ data: T }>(url, { params });
  return res.data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<{ data: T }>(url, body);
  return res.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.put<{ data: T }>(url, body);
  return res.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch<{ data: T }>(url, body);
  return res.data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await apiClient.delete<{ data: T }>(url);
  return res.data.data;
}

export async function apiUpload<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post<{ data: T }>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
