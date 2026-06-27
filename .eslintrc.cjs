/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
  },
  extends: ['eslint:recommended', 'prettier'],
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.husky',
    'docker',
  ],
  overrides: [
    {
      // Backend TypeScript 文件 — 由 backend/.eslintrc.js 处理
      files: ['backend/**/*.ts'],
      extends: [],
    },
    {
      // Frontend TypeScript/TSX 文件 — 由 frontend/.eslintrc.cjs 处理
      files: ['frontend/**/*.{ts,tsx}'],
      extends: [],
    },
    {
      // 根级 JS 配置文件
      files: ['*.js', '*.cjs', '*.mjs'],
      rules: {
        'no-undef': 'off',
      },
    },
    {
      // JSON / Markdown / YAML 文件 — 仅 Prettier 格式化
      files: ['*.json', '*.md', '*.yml', '*.yaml'],
      rules: {},
    },
  ],
};
