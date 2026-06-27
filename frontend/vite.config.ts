// ===================================================================
// Vite 配置 — React + Tailwind + 路径别名
// ===================================================================

import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

/**
 * Vite 构建配置
 *
 * - 路径别名: @ → src/
 * - 开发服务器: 端口 5173，代理 /api 到后端 3000
 * - 测试: jsdom 环境
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
});
