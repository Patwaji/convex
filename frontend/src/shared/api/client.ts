import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/env';
import { triggerGlobalAlert } from '../store/globalAlertStore';

const BASE_URL = API_BASE_URL;

// Rate limit state for popup - uses "other" theme as default
let rateLimitAlertShown = false;

export const showRateLimitAlert = () => {
  if (rateLimitAlertShown) return;
  rateLimitAlertShown = true;

  triggerGlobalAlert({
    type: 'warning',
    title: 'RATE LIMIT EXCEEDED',
    message:
      'Too many requests. Please wait 15 minutes before making more requests.\n\nGeneral: 100 requests/15min\nAuth: 20 requests/15min',
    confirmText: 'OK',
    onConfirm: () => {
      rateLimitAlertShown = false;
    },
  });
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 and refresh tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const isRefreshRequest = typeof requestUrl === 'string' && requestUrl.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isRefreshRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('@refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Must use axios directly to avoid interceptor loop
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken;

        await AsyncStorage.setItem('@access_token', newAccessToken);
        await AsyncStorage.setItem('@refresh_token', newRefreshToken);

        apiClient.defaults.headers.common.Authorization = 'Bearer ' + newAccessToken;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = 'Bearer ' + newAccessToken;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear tokens and let the authStore know user needs to login
        await AsyncStorage.removeItem('@access_token');
        await AsyncStorage.removeItem('@refresh_token');
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle rate limit errors (429)
    if (error.response?.status === 429) {
      showRateLimitAlert();
    }

    return Promise.reject(error);
  }
);
