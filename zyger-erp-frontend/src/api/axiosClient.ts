import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('zyger-access-token') || sessionStorage.getItem('zyger-access-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    // FRS §5.1: Auto-unwrap { data, meta } envelope if present
    const body = response.data;
    if (body && typeof body === 'object' && 'data' in body && (body as Record<string, unknown>).data !== undefined) {
      const envelope = body as { data: unknown; meta?: Record<string, unknown> };
      // For list endpoints: merge data (content array) with meta fields so existing code still works
      if (envelope.meta && Array.isArray(envelope.data)) {
        response.data = {
          content: envelope.data,
          totalElements: envelope.meta.totalElements ?? (envelope.data as unknown[]).length,
          totalPages: envelope.meta.totalPages ?? 1,
          number: envelope.meta.page ?? 0,
          size: envelope.meta.size ?? 8,
          _meta: envelope.meta,
        };
      } else {
        // For single-doc endpoints: unwrap data
        response.data = envelope.data;
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    const isAuthRequest = config?.url?.includes('/auth/');
    const status = error.response?.status;
    const hasToken = localStorage.getItem('zyger-access-token') || sessionStorage.getItem('zyger-access-token');

    if ((status === 401 || (status === 403 && !hasToken)) && !isAuthRequest) {
      localStorage.removeItem('zyger-access-token');
      localStorage.removeItem('zyger-user');
      sessionStorage.removeItem('zyger-access-token');
      sessionStorage.removeItem('zyger-user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
      return Promise.reject(new Error('Session expired. Please sign in again.'));
    }

    if (status === 403) {
      const data = error.response?.data as Record<string, unknown> | undefined;
      const message = (data?.detail as string) || "You don't have permission for this action.";
      return Promise.reject(new Error(message));
    }

    if (status === 409) {
      const data = error.response?.data as Record<string, unknown> | undefined;
      const code = data?.code as string;
      if (code === 'VERSION_CONFLICT') {
        return Promise.reject(new Error('CONFLICT:' + ((data?.detail as string) || 'This document was modified by another user.')));
      }
      const message = (data?.detail as string) || (data?.message as string) || 'Conflict detected.';
      return Promise.reject(new Error(message));
    }

    if (config && !error.response?.status?.toString().startsWith('4')) {
      const retries = config._retryCount ?? 0;
      if (retries < MAX_RETRIES) {
        config._retryCount = retries + 1;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (retries + 1)));
        return apiClient(config);
      }
    }

    if (error.response) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const message = (data?.detail as string) || (data?.message as string) || 'An unexpected error occurred.';
      return Promise.reject(new Error(message));
    }
    return Promise.reject(new Error('Network Error. Please check your connection.'));
  }
);

export default apiClient;
