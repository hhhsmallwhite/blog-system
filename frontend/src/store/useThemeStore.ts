// ===================================================================
// 主题状态管理 — Zustand Store
// ===================================================================

import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * 主题模式
 * - light: 亮色模式
 * - dark: 暗色模式
 * - system: 跟随系统偏好
 */
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  /** 用户选择的主题模式 */
  mode: ThemeMode;
  /** 最终解析后的模式 (light | dark)，考虑系统偏好后 */
  resolvedMode: 'light' | 'dark';

  /** 设置主题模式 */
  setMode: (mode: ThemeMode) => void;
  /** 循环切换 light → dark → system → light */
  toggleMode: () => void;
}

/**
 * 从 localStorage 读取持久化的主题模式
 */
function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem('theme-mode');
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

/**
 * 解析最终主题模式（考虑系统偏好）
 */
function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  }
  return mode;
}

/**
 * 主题状态 Store
 *
 * 持久化到 localStorage，支持跟随系统偏好。
 * 同步 <html> 元素的 dark class 用于 Tailwind 暗色模式。
 */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: getInitialMode(),
  resolvedMode: resolveThemeMode(getInitialMode()),

  setMode: (mode: ThemeMode) => {
    const resolved = resolveThemeMode(mode);
    localStorage.setItem('theme-mode', mode);
    // 同步 Tailwind 暗色模式
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ mode, resolvedMode: resolved });
  },

  toggleMode: () => {
    set((state) => {
      const modes: ThemeMode[] = ['light', 'dark', 'system'];
      const currentIndex = modes.indexOf(state.mode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      const resolved = resolveThemeMode(nextMode);
      localStorage.setItem('theme-mode', nextMode);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { mode: nextMode, resolvedMode: resolved };
    });
  },
}));

/**
 * Hook: 监听系统主题偏好变化
 *
 * 当 mode === 'system' 且用户改变了系统偏好时自动更新。
 * 在 App 根组件中调用一次即可。
 */
export function useSystemThemeListener(): void {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setMode('system');

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode, setMode]);
}
