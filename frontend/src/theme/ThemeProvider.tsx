// ===================================================================
// MUI 主题 Provider — 明暗主题切换
// ===================================================================

import React, { useMemo } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { darkPalette, lightPalette } from './palette';
import { useThemeStore } from '../store/useThemeStore';

/**
 * 主题上下文 Provider
 *
 * 功能:
 * - 根据 Zustand store 中的主题模式切换 Light/Dark
 * - 响应系统偏好设置 (prefers-color-scheme)
 * - MUI 主题变量: Inter + Noto Sans SC 字体, 4px 间距基线
 *
 * @param props.children - 子组件
 */
export function ThemeContextProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { resolvedMode } = useThemeStore();

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: resolvedMode,
          ...(resolvedMode === 'light' ? lightPalette : darkPalette),
        },
        typography: {
          fontFamily: [
            'Inter',
            'Noto Sans SC',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            'sans-serif',
          ].join(','),
          // Tailwind 风格字体大小
          h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 },
          h2: { fontSize: '1.875rem', fontWeight: 600, lineHeight: 1.3 },
          h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
          h4: { fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.4 },
          body1: { fontSize: '1rem', lineHeight: 1.6 },
          body2: { fontSize: '0.875rem', lineHeight: 1.6 },
        },
        spacing: 4, // 4px 间距基线
        shape: {
          borderRadius: 8,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow:
                  '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
              },
            },
          },
        },
      }),
    [resolvedMode],
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
