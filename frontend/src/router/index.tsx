// ===================================================================
// 路由配置 — React Router v6
// ===================================================================

import type { RouteObject } from 'react-router-dom';
import { useRoutes } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import Home from '../pages/Home';

// S1: 认证与用户体系
import Login from '../pages/Login';
import Register from '../pages/Register';
import VerifyEmail from '../pages/VerifyEmail';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Me from '../pages/Me';

// S3: 编辑器
import Editor from '../pages/Editor';

// S4: 发布流程与文章管理
import Publish from '../pages/Publish';
import MyArticles from '../pages/MyArticles';

/**
 * 路由定义
 *
 * S0: 首页占位
 * S1: 认证与用户体系 (登录/注册/邮箱验证/忘记密码/重置密码/个人中心)
 * S2-S9: 后续 Sprint 逐步添加
 */
const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // ---- S0: 首页 ----
      { index: true, element: <Home /> },

      // ---- S1: 认证与用户体系 ----
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'verify-email', element: <VerifyEmail /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'me', element: <Me /> },

      // ---- S3: 编辑器 ----
      { path: 'editor', element: <Editor /> },
      { path: 'editor/:id', element: <Editor /> },

      // ---- S4: 发布流程与文章管理 ----
      { path: 'editor/:id/publish', element: <Publish /> },
      { path: 'my-articles', element: <MyArticles /> },

      // TODO: S5-S9 添加
      // { path: 'articles/:slug', element: <ArticleDetail /> },
      // { path: ':username', element: <UserProfile /> },
      // { path: 'admin/*', element: <AdminLayout /> },
    ],
  },
  // 404 页面
  {
    path: '*',
    element: <MainLayout />,
    children: [
      {
        path: '*',
        element: (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <h2>404 — 页面未找到</h2>
            <p>您访问的页面不存在</p>
          </div>
        ),
      },
    ],
  },
];

/**
 * App 路由组件
 */
export default function AppRouter(): React.ReactElement | null {
  return useRoutes(routes);
}
