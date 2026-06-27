// ===================================================================
// MUI 主题调色板 — Design System Primary #2563EB
// ===================================================================

import type { PaletteOptions } from '@mui/material';

/**
 * Light 模式调色板
 *
 * Primary: #2563EB (蓝)
 * Secondary: 中性灰
 */
export const lightPalette: PaletteOptions = {
  primary: {
    main: '#2563EB',
    light: '#3B82F6',
    dark: '#1D4ED8',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#64748B',
    light: '#94A3B8',
    dark: '#475569',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F8FAFC',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
  },
  divider: '#E2E8F0',
  error: {
    main: '#EF4444',
  },
  warning: {
    main: '#F59E0B',
  },
  success: {
    main: '#10B981',
  },
  info: {
    main: '#3B82F6',
  },
};

/**
 * Dark 模式调色板
 */
export const darkPalette: PaletteOptions = {
  primary: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#94A3B8',
    light: '#CBD5E1',
    dark: '#64748B',
    contrastText: '#0F172A',
  },
  background: {
    default: '#0F172A',
    paper: '#1E293B',
  },
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
  },
  divider: '#334155',
  error: {
    main: '#F87171',
  },
  warning: {
    main: '#FBBF24',
  },
  success: {
    main: '#34D399',
  },
  info: {
    main: '#60A5FA',
  },
};
