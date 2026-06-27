// ===================================================================
// 认证状态管理 (Zustand)
// ===================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { apiClient } from '../api/api-client';

/**
 * 用户资料接口
 */
export interface UserProfile {
  id: number;
  email: string;
  username: string;
  blog_name: string | null;
  bio: string | null;
  avatar: string | null;
  social_links: SocialLink[];
  roles: string[];
  status: string;
  post_count: number;
  created_at: string;
  updated_at: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  display_name: string | null;
  sort_order: number;
}

/**
 * 认证状态接口
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 认证操作接口
 */
export interface AuthActions {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  updateProfile: (data: Record<string, any>) => Promise<void>;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

/**
 * 认证 Store
 */
export const useAuthStore = create<AuthStore>()(
  persist(
  immer((set) => ({
      // ---- 初始状态 ----
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,

      // ---- 操作 ----

      /**
       * 登录
       */
      login: async (email: string, password: string, rememberMe = false) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await apiClient.post<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
          }>('/auth/login', { email, password, remember_me: rememberMe });

          // 存储 Token 到 localStorage
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);

          // 获取用户资料
          const profileResponse = await apiClient.get<UserProfile>('/users/me');
          set((state) => {
            state.user = profileResponse.data;
            state.isAuthenticated = true;
            state.isLoading = false;
          });
        } catch (error: any) {
          set((state) => {
            state.isLoading = false;
            state.error = error.response?.data?.message || '登录失败，请重试';
          });
          throw error;
        }
      },

      /**
       * 注册
       */
      register: async (email: string, username: string, password: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          await apiClient.post('/auth/register', {
            email,
            username,
            password,
          });

          set((state) => {
            state.isLoading = false;
          });
        } catch (error: any) {
          set((state) => {
            state.isLoading = false;
            state.error = error.response?.data?.message || '注册失败，请重试';
          });
          throw error;
        }
      },

      /**
       * 登出
       */
      logout: async () => {
        set((state) => {
          state.isLoading = true;
        });

        try {
          await apiClient.post('/auth/logout');
        } catch (error) {
          console.error('登出 API 调用失败', error);
        } finally {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set((state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.isLoading = false;
          });
        }
      },

      /**
       * 获取当前用户资料
       */
      fetchUserProfile: async () => {
        try {
          const response = await apiClient.get<UserProfile>('/users/me');
          set((state) => {
            state.user = response.data;
            state.isAuthenticated = true;
          });
        } catch (error: any) {
          if (error.response?.status === 401) {
            // Token 过期，清除状态
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            set((state) => {
              state.isAuthenticated = false;
              state.user = null;
            });
          }
        }
      },

      /**
       * 更新用户资料
       */
      updateProfile: async (data: Record<string, any>) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await apiClient.patch<UserProfile>('/users/me', data);
          set((state) => {
            state.user = response.data;
            state.isLoading = false;
          });
        } catch (error: any) {
          set((state) => {
            state.isLoading = false;
            state.error = error.response?.data?.message || '更新失败，请重试';
          });
          throw error;
        }
      },

      /**
       * 清除错误
       */
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },
    })),
    {
      name: 'blog-auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
);

/**
 * 初始化认证状态
 */
export const initAuth = async () => {
  const token = localStorage.getItem('access_token');
  if (token) {
    try {
      await useAuthStore.getState().fetchUserProfile();
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }
};
