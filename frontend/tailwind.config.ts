// ===================================================================
// Tailwind CSS 配置
// ===================================================================

import type { Config } from 'tailwindcss';

/**
 * Tailwind 配置
 *
 * 与 MUI 主题协同工作:
 * - MUI 管理组件样式 (按钮、卡片、表单等)
 * - Tailwind 管理布局样式 (Flex/Grid、间距、响应式)
 * - darkMode: "class" 与 MUI 的暗色模式通过 CSS 类同步
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 与 MUI Design System 对齐
        primary: {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          dark: '#1D4ED8',
          contrast: '#FFFFFF',
        },
        // 管理后台侧边栏色
        sidebar: '#0F172A',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'monospace'],
      },
      spacing: {
        // 4px 间距基线系统
        '4.5': '1.125rem',
        '13': '3.25rem',
        '18': '4.5rem',
      },
      maxWidth: {
        // 文章内容区宽度
        'article': '720px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
