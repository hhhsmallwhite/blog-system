// ===================================================================
// API 客户端 — 基于 axios 的 HTTP 请求封装
// ===================================================================

import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * API 响应包装格式
 * 后端统一返回 { code, message, data }
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * API 客户端类
 *
 * 功能:
 * - 自动附加 Access Token 到 Authorization header
 * - 自动刷新 Token（401 时）
 * - 统一错误处理
 */
class ApiClient {
  private readonly baseURL: string;
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    // 从环境变量读取 API 地址
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  }

  /**
   * 设置 Access Token
   */
  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  /**
   * 获取 Access Token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * 添加刷新订阅（等待 Token 刷新完成）
   */
  private addRefreshSubscriber(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  /**
   * 执行刷新订阅（Token 刷新完成后调用）
   */
  private onRefreshed(newToken: string): void {
    this.refreshSubscribers.forEach((callback) => callback(newToken));
    this.refreshSubscribers = [];
  }

  /**
   * 刷新 Access Token
   */
  private async refreshToken(): Promise<string> {
    try {
      const response = await axios.post<ApiResponse<{ access_token: string; expires_in: number }>>(
        `${this.baseURL}/auth/refresh`,
        null,
        { withCredentials: true }, // Refresh Token 在 HttpOnly Cookie 中
      );

      const newAccessToken = response.data.data.access_token;
      this.setAccessToken(newAccessToken);
      localStorage.setItem('access_token', newAccessToken);
      return newAccessToken;
    } catch (error) {
      // 刷新失败，清除状态并跳转到登录页
      this.setAccessToken(null);
      localStorage.removeItem('access_token');
      window.location.href = '/login';
      throw error;
    }
  }

  /**
   * 发送请求
   */
  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // 附加 Access Token
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await axios.request<ApiResponse<T>>({
        ...config,
        baseURL: this.baseURL,
        headers,
        withCredentials: true, // 允许发送 Cookie（Refresh Token）
      });

      return response;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        // Access Token 过期，尝试刷新
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const newToken = await this.refreshToken();
            this.onRefreshed(newToken);
            this.isRefreshing = false;

            // 用新 Token 重试当前请求
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await axios.request<ApiResponse<T>>({
              ...config,
              baseURL: this.baseURL,
              headers,
              withCredentials: true,
            });
            return retryResponse;
          } catch (refreshError) {
            this.isRefreshing = false;
            throw refreshError;
          }
        } else {
          // 正在刷新，等待刷新完成
          return new Promise((resolve, reject) => {
            this.addRefreshSubscriber((newToken: string) => {
              headers['Authorization'] = `Bearer ${newToken}`;
              axios
                .request<ApiResponse<T>>({
                  ...config,
                  baseURL: this.baseURL,
                  headers,
                  withCredentials: true,
                })
                .then(resolve)
                .catch(reject);
            });
          });
        }
      }

      throw error;
    }
  }

  /**
   * GET 请求
   */
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * POST 请求
   */
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * PATCH 请求
   */
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * PUT 请求
   */
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * DELETE 请求
   */
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}

/**
 * 导出单例
 */
export const apiClient = new ApiClient();

// 初始化：从 localStorage 读取 Access Token
const storedToken = localStorage.getItem('access_token');
if (storedToken) {
  apiClient.setAccessToken(storedToken);
}
