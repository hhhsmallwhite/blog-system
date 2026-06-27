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
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 用户资料（null 表示未登录） */
  user: UserProfile | null;
  /** 是否正在加载（初始加载 / API 请求中） */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 认证操作接口
 */
export interface AuthActions {
  /** 登录 */
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  /** 注册 */
  register: (email: string, username: string, password: string) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 获取当前用户资料 */
  fetchUserProfile: () => Promise<void>;
  /** 更新用户资料 */
  updateProfile: (data: Record<string, any>) => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
  /** 刷新 Token（内部方法） */
  refreshToken: () => Promise<boolean>;
}

/** 完整 Auth Store 类型 */
export type AuthStore = AuthState & AuthActions;

/**
 * 认证 Store（持久化 access_token）
 *
 * 持久化字段: isAuthenticated, user, (access_token 存储在 httpOnly cookie 中，这里不存储)
 * 实际项目中，AccessToken 通过 Authorization header 传递，RefreshToken 通过 HttpOnly Cookie 传递
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    immer((set, get) => ({
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
            expires_in: number;
          }>('/auth/login', { email, password, remember_me: rememberMe });

          // 存储 Access Token 到内存（实际项目中通常放到 Authorization header）
          localStorage.setItem('access_token', response.data.access_token);

          // 获取用户资料
          await get().fetchUserProfile();

          set((state) => {
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
          // 即使 API 失败，也清除本地状态
          console.error('登出 API 调用失败', error);
        } finally {
          localStorage.removeItem('access_token');
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
            // Token 过期，尝试刷新
            const refreshed = await get().refreshToken();
            if (refreshed) {
              // 刷新成功，重新获取资料
              const retryResponse = await apiClient.get<UserProfile>('/users/me');
              set((state) => {
                state.user = retryResponse.data;
                state.isAuthenticated = true;
              });
            } else {
              // 刷新失败，清除状态
              localStorage.removeItem('access_token');
              set((state) => {
                state.isAuthenticated = false;
                state.user = null;
              });
            }
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

      /**
       * 刷新 Access Token
       */
      refreshToken: async () => {
        try {
          await apiClient.post('/auth/refresh');
          return true;
        } catch (error) {
          return false;
        }
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
 *
 * 应用启动时调用，检查是否有有效的 Access Token
 */
export const initAuth = async () => {
  const token = localStorage.getItem('access_token');
  if (token) {
    try {
      await useAuthStore.getState().fetchUserProfile();
    } catch (error) {
      localStorage.removeItem('access_token');
    }
  }
};
