// ===================================================================
// App 根组件 — 组合 ThemeProvider + Router
// ===================================================================

import { CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';

import AppRouter from './router';
import { ThemeContextProvider } from './theme/ThemeProvider';

/**
 * App 根组件
 *
 * 层级结构:
 *   ThemeContextProvider (MUI Theme + 暗色模式)
 *     └── CssBaseline (MUI 全局样式重置)
 *       └── BrowserRouter (React Router)
 *         └── AppRouter
 */
export default function App(): React.ReactElement {
  return (
    <ThemeContextProvider>
      <CssBaseline />
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ThemeContextProvider>
  );
}
