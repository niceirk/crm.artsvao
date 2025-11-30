import axios from 'axios';
import { useAuthStore } from '../store/auth-store';
import { useConflictStore } from '../stores/conflict-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
// Базовый URL сервера без /api (для статических файлов)
export const SERVER_URL = API_URL.replace('/api', '');

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and conflict errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 409 Conflict (optimistic lock error)
    if (error.response?.status === 409) {
      const data = error.response.data;
      // Check if this is our OptimisticLockError with entity and currentData
      if (data?.entity && data?.currentData) {
        useConflictStore.getState().setConflict({
          entity: data.entity,
          entityId: data.entityId,
          expectedVersion: data.expectedVersion,
          currentVersion: data.currentVersion,
          serverData: data.currentData,
        });
        // Don't show standard toast for conflict errors
        return Promise.reject(error);
      }
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken, user } = response.data;

        // Update tokens in Zustand store
        useAuthStore.getState().setAuth(user, accessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
