import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },
      clearAuth: () => {
        // Also clean up old localStorage keys
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
      setUser: (user) => set({ user }),
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        // Migration: if tokens exist in old localStorage format, migrate them
        if (typeof window !== 'undefined') {
          if (state) {
            const oldAccessToken = localStorage.getItem('accessToken');
            const oldRefreshToken = localStorage.getItem('refreshToken');

            // If we have user/isAuthenticated but no tokens in state, but tokens exist in old format
            if (state.isAuthenticated && !state.accessToken && oldAccessToken && oldRefreshToken) {
              state.accessToken = oldAccessToken;
              state.refreshToken = oldRefreshToken;

              // Clean up old keys
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
            }

            // Mark as hydrated
            state._hasHydrated = true;
          }
        }
      },
    }
  )
);
