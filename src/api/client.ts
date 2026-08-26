import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'greenslot_token';

export function resolveApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  const trimmed = raw?.replace(/\/$/, '') || '';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

export function getApiErrorMessage(error: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | string | undefined;
    if (typeof data === 'string' && data.trim()) return data;
    if (typeof data === 'object' && data?.message) return data.message;
    if (typeof data === 'object' && data?.error) return data.error;
    if (error.code === 'ECONNABORTED') return 'Kết nối quá thời gian. Vui lòng thử lại.';
    if (!error.response) return 'Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.';
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      await clearStoredToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
