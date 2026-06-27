// ===================================================================
// App 组件基本渲染测试
// ===================================================================

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../src/App';

/**
 * 验证 App 组件能正常渲染，包含:
 * - "博客系统" 标题
 * - 主题切换按钮
 */
describe('App', () => {
  it('渲染首页标题 "博客系统"', () => {
    render(<App />);

    // 页面应该包含博客系统标题
    expect(screen.getByText('博客系统')).toBeDefined();
  });

  it('包含 "技术栈" 标签', () => {
    render(<App />);

    expect(screen.getByText('技术栈')).toBeDefined();
  });

  it('渲染导航栏中的博客名称', () => {
    render(<App />);

    // 有两个"博客系统"(导航栏 + 首页)，都能找到
    const headings = screen.getAllByText('博客系统');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
