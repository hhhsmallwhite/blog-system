// ===================================================================
// React 应用入口
// ===================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

/**
 * 挂载 React 应用到 #root 元素
 *
 * 严格模式在开发环境启用，帮助检测潜在问题。
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
