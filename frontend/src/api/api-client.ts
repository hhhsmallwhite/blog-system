// ===================================================================
// API 客户端 — 基于 axios 的 HTTP 请求封装
// ===================================================================

import axios, { isAxiosError } from 'axios';
import type { AxiosResponse } from 'axios';

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
 * 创建 axios 实例
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 允许发送 Cookie（Refresh Token）
});

/**
 * 请求拦截器：自动附加 Access Token 到 Authorization header
 */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers!.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 响应拦截器：解包 ApiResponse<T> 为 T + 处理 401 自动刷新 Token
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data as Record<string, any>;

    // 如果是标准 ApiResponse 格式，解包（让 response.data = body.data）
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      if (body.code !== 200) {
        // 业务错误，拒绝 promise
        return Promise.reject({
          response: {
            ...response,
            data: body,
          },
        });
      }

      // 解包：让 response.data 等于 body.data (T)
      (response as any).data = body.data;
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 且不是刷新 Token 的请求，尝试刷新
    if (isAxiosError(error) && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${apiClient.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { access_token, refresh_token } = response.data.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          originalRequest.headers!.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient };
