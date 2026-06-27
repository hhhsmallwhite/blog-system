# 博客系统 REST API 设计文档

**文档版本：** v1.0  
**撰写日期：** 2026-06-27  
**撰写人：** 架构师 · 高见远  
**文档状态：** 待评审  
**依赖文档：** PRD-博客系统-v1.0.md / Architecture-博客系统-v1.0.md / Database-博客系统-v1.0.md  

---

## 目录

1. [通用规范](#1-通用规范)
2. [Auth — 认证模块](#2-auth--认证模块)
3. [User — 用户模块](#3-user--用户模块)
4. [Article — 文章模块](#4-article--文章模块)
5. [Comment — 评论模块](#5-comment--评论模块)
6. [Category — 分类模块](#6-category--分类模块)
7. [Tag — 标签模块](#7-tag--标签模块)
8. [Upload — 上传模块](#8-upload--上传模块)
9. [Admin — 管理后台模块](#9-admin--管理后台模块)
10. [Analytics — 分析统计模块](#10-analytics--分析统计模块)
11. [SEO — 搜索引擎优化模块](#11-seo--搜索引擎优化模块)
12. [全局错误码表](#12-全局错误码表)
13. [API 总览表](#13-api-总览表)

---

## 1. 通用规范

### 1.1 API 基础路径

```
https://{domain}/api/v1
```

### 1.2 认证方式

- **JWT 双 Token 策略**
- Access Token 有效期：**2 小时**
- Refresh Token 有效期：**7 天**（勾选"记住我"延长至 30 天）
- Access Token 通过请求头传递：`Authorization: Bearer {access_token}`
- Refresh Token 通过 HttpOnly Cookie 传递（Secure, SameSite=Strict）

### 1.3 统一响应格式

**成功响应 — 单对象**

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

**成功响应 — 分页列表**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "per_page": 10
  }
}
```

**错误响应**

```json
{
  "code": 40001,
  "message": "邮箱格式不正确",
  "errors": [
    { "field": "email", "message": "邮箱格式不正确" }
  ]
}
```

### 1.4 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码（≥ 1） |
| per_page | integer | 10 | 每页条数（1-50） |

### 1.5 权限层级

| 权限 | 说明 |
|------|------|
| Public | 无需认证，任何人可访问 |
| Authenticated | 需要登录（携带有效 JWT） |
| Owner | 需要是资源所有者本人 |
| Admin | 需要管理员权限（role=admin 或 super_admin） |
| SuperAdmin | 仅超级管理员可操作 |

### 1.6 HTTP 状态码约定

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无返回体） |
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 请求体校验错误 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

---

## 2. Auth — 认证模块

### 2.1 注册

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/auth/register` |
| **Method** | POST |
| **权限** | Public |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 邮箱地址（5-255字，有效邮箱格式） |
| password | string | ✅ | 密码（≥8位，含字母+数字） |
| username | string | ✅ | 用户名（3-20位，字母数字下划线，注册后不可改） |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"zhou@example.com","password":"Tech2026!","username":"zhoujinbu"}'
```

**示例响应（201）**

```json
{
  "code": 0,
  "message": "注册成功，验证邮件已发送",
  "data": {
    "id": 1,
    "email": "zhou@example.com",
    "username": "zhoujinbu",
    "status": "pending_verification",
    "created_at": "2026-06-27T14:00:00Z"
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 201 | 注册成功 |
| 409 | 邮箱已被注册（40901）/ 用户名已被占用（40902） |
| 422 | 密码不符合强度（42201）/ 用户名格式不合法（42202）/ 邮箱格式不正确（42203） |
| 429 | 注册频率超限（42901，同一IP每小时最多5次） |

---

### 2.2 验证邮箱

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/auth/verify-email` |
| **Method** | POST |
| **权限** | Public |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | ✅ | 验证邮件中的 Token |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"verify_token_abc123"}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "邮箱验证成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZn...",
    "expires_in": 7200,
    "user": {
      "id": 1,
      "email": "zhou@example.com",
      "username": "zhoujinbu",
      "status": "active",
      "avatar": null,
      "blog_name": null,
      "bio": null
    }
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 验证成功（同时返回 JWT，免二次登录） |
| 400 | Token 无效或已过期（40001） |
| 404 | 用户不存在（40401） |
| 409 | 邮箱已验证（40903） |

---

### 2.3 登录

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/auth/login` |
| **Method** | POST |
| **权限** | Public |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 邮箱地址 |
| password | string | ✅ | 密码 |
| remember_me | boolean | ❌ | 是否延长 Refresh Token 有效期（默认 false → 7天，true → 30天） |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"zhou@example.com","password":"Tech2026!","remember_me":true}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZn...",
    "expires_in": 7200,
    "user": {
      "id": 1,
      "email": "zhou@example.com",
      "username": "zhoujinbu",
      "status": "active",
      "avatar": "https://cdn.blog.com/avatars/1.jpg",
      "blog_name": "周进步的技术博客",
      "bio": "后端工程师，专注分布式系统",
      "roles": ["author"]
    }
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 登录成功 |
| 401 | 邮箱或密码错误（40101） |
| 401 | 邮箱未验证（40102） |
| 401 | 账号已被冻结（40103） |
| 429 | 登录失败超过5次，锁定15分钟（42902） |

---

### 2.4 刷新 Token

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/auth/refresh` |
| **Method** | POST |
| **权限** | Authenticated（通过 Refresh Token Cookie） |

**请求参数（Cookie）**

| 字段 | 位置 | 必填 | 说明 |
|------|------|------|------|
| refresh_token | Cookie | ✅ | HttpOnly Cookie 自动携带 |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/auth/refresh \
  -H "Cookie: refresh_token=dGhpcyBpcyBhIHJlZn..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "Token 刷新成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 7200
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 刷新成功 |
| 401 | Refresh Token 无效或已过期（40104） |
| 401 | Refresh Token 已被撤销（40105） |

---

### 2.5 登出

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/auth/logout` |
| **Method** | POST |
| **权限** | Authenticated |

**请求参数**：无（通过 JWT + Cookie 识别用户和 Token）

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "登出成功",
  "data": null
}
```

> 说明：登出时撤销当前 Refresh Token，清除 Cookie，但 Access Token 在过期前仍有效（短期窗口可接受）。

---

### 2.6 忘记密码（发送重置邮件）

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/auth/forgot-password` |
| **Method** | POST |
| **权限** | Public |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 注册邮箱 |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"zhou@example.com"}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "密码重置邮件已发送（如邮箱存在）",
  "data": null
}
```

> **安全注意**：无论邮箱是否存在，都返回 200，防止邮箱枚举攻击。

---

### 2.7 重置密码

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/auth/reset-password` |
| **Method** | POST |
| **权限** | Public（通过重置 Token 验证身份） |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | ✅ | 重置邮件中的 Token（有效期1小时） |
| password | string | ✅ | 新密码（≥8位，含字母+数字） |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"reset_token_xyz789","password":"NewPass2026!"}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "密码重置成功",
  "data": null
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 重置成功（同时撤销所有 Refresh Token） |
| 400 | Token 无效或已过期（40002） |
| 422 | 密码不符合强度要求（42201） |

---

### 2.8 修改密码（已登录用户）

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/auth/change-password` |
| **Method** | POST |
| **权限** | Authenticated |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| old_password | string | ✅ | 当前密码 |
| new_password | string | ✅ | 新密码（≥8位，含字母+数字） |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"old_password":"Tech2026!","new_password":"Better2026!"}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "密码修改成功，请重新登录",
  "data": null
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 修改成功（同时撤销所有 Refresh Token，需重新登录） |
| 401 | 当前密码错误（40106） |
| 422 | 新密码不符合强度要求（42201） |

---

## 3. User — 用户模块

### 3.1 获取当前用户信息

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/users/me` |
| **Method** | GET |
| **权限** | Authenticated |

**请求参数**：无（通过 JWT 获取用户身份）

**示例请求**

```bash
curl https://api.blog.com/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "email": "zhou@example.com",
    "username": "zhoujinbu",
    "blog_name": "周进步的技术博客",
    "bio": "后端工程师，4年经验，专注分布式系统",
    "avatar": "https://cdn.blog.com/avatars/1.jpg",
    "social_links": [
      { "platform": "github", "url": "https://github.com/zhoujinbu", "display_name": null, "sort_order": 0 },
      { "platform": "twitter", "url": "https://twitter.com/zhoujinbu", "display_name": null, "sort_order": 1 }
    ],
    "roles": ["author"],
    "status": "active",
    "post_count": 12,
    "created_at": "2026-06-27T10:00:00Z",
    "updated_at": "2026-06-27T12:30:00Z"
  }
}
```

---

### 3.2 更新用户资料

| 项目 | 值 |
|------|-----|
| **URL** | `PATCH /api/v1/users/me` |
| **Method** | PATCH |
| **权限** | Authenticated |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| blog_name | string | ❌ | 博客名称（5-50字） |
| bio | string | ❌ | 个人简介（≤200字） |
| avatar | string | ❌ | 头像 URL（通过 Upload 模块获取） |
| social_links | array | ❌ | 社交链接数组（最多5个，整体替换） |

**social_links 对象结构**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| platform | string | ✅ | github / twitter / weibo / zhihu / linkedin / custom |
| url | string | ✅ | 链接 URL |
| display_name | string | ❌ | 自定义名称（仅 platform=custom 时有效） |

**示例请求**

```bash
curl -X PATCH https://api.blog.com/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"blog_name":"周进步的技术博客","bio":"后端工程师，专注分布式系统","social_links":[{"platform":"github","url":"https://github.com/zhoujinbu"},{"platform":"custom","url":"https://my-site.com","display_name":"My Site"}]}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "资料更新成功",
  "data": {
    "id": 1,
    "username": "zhoujinbu",
    "blog_name": "周进步的技术博客",
    "bio": "后端工程师，专注分布式系统",
    "avatar": "https://cdn.blog.com/avatars/1.jpg",
    "social_links": [
      { "platform": "github", "url": "https://github.com/zhoujinbu", "display_name": null, "sort_order": 0 },
      { "platform": "custom", "url": "https://my-site.com", "display_name": "My Site", "sort_order": 1 }
    ],
    "updated_at": "2026-06-27T13:00:00Z"
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 更新成功 |
| 422 | blog_name 长度不合规（42204）/ bio 超200字（42205）/ social_links 超5个（42206） |

---

### 3.3 获取用户公开主页

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/users/{username}` |
| **Method** | GET |
| **权限** | Public |

**请求参数（Path）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名 |

**示例请求**

```bash
curl https://api.blog.com/api/v1/users/zhoujinbu
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "username": "zhoujinbu",
    "blog_name": "周进步的技术博客",
    "bio": "后端工程师，专注分布式系统",
    "avatar": "https://cdn.blog.com/avatars/1.jpg",
    "social_links": [
      { "platform": "github", "url": "https://github.com/zhoujinbu", "display_name": null }
    ],
    "post_count": 12,
    "created_at": "2026-06-27T10:00:00Z"
  }
}
```

> 说明：公开主页不暴露 email、status、roles 等敏感信息。

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 成功 |
| 404 | 用户不存在（40402） |

---

### 3.4 获取用户公开文章列表（读者端）

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/users/{username}/articles` |
| **Method** | GET |
| **权限** | Public |

**请求参数（Path + Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username (path) | string | ✅ | 博主用户名 |
| page | integer | ❌ | 页码（默认1） |
| per_page | integer | ❌ | 每页条数（默认10） |
| category_slug | string | ❌ | 按分类筛选 |
| tag | string | ❌ | 按标签筛选 |
| sort | string | ❌ | 排序：published_at（默认）/ view_count |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/users/zhoujinbu/articles?page=1&per_page=5&sort=published_at"
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 101,
        "slug": "distributed-system-2026",
        "title": "分布式系统设计笔记",
        "summary": "关于分布式系统设计的关键概念总结...",
        "cover_image": "https://cdn.blog.com/covers/101.jpg",
        "category": { "id": 3, "name": "技术", "slug": "tech" },
        "tags": ["分布式", "系统设计", "后端"],
        "view_count": 128,
        "comment_count": 5,
        "like_count": 12,
        "word_count": 3200,
        "published_at": "2026-06-27T15:30:00Z",
        "author": {
          "id": 1,
          "username": "zhoujinbu",
          "avatar": "https://cdn.blog.com/avatars/1.jpg",
          "blog_name": "周进步的技术博客"
        }
      }
    ],
    "total": 12,
    "page": 1,
    "per_page": 5
  }
}
```

> 说明：仅返回 status=published 的文章。读者端使用 Keyset 分页（基于 published_at）以获得稳定的分页结果。

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 成功 |
| 404 | 用户不存在（40402） |

---

## 4. Article — 文章模块

### 4.1 创建草稿

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/articles` |
| **Method** | POST |
| **权限** | Authenticated |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 文章标题（≤200字） |
| content | string | ✅ | Markdown 正文内容 |
| category_id | integer | ❌ | 分类 ID（草稿态可空，发布时必填） |
| tags | string[] | ❌ | 标签名称列表（最多5个，不存在自动创建） |
| cover_image | string | ❌ | 封面图 URL |
| summary | string | ❌ | 摘要（≤300字，空时自动截取前200字） |
| slug | string | ❌ | 自定义 URL Slug（空时发布自动生成） |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"title":"分布式系统设计笔记","content":"# 概述\n\n这是一篇关于分布式系统的技术笔记...","tags":["分布式","系统设计","后端"]}'
```

**示例响应（201）**

```json
{
  "code": 0,
  "message": "草稿创建成功",
  "data": {
    "id": 101,
    "slug": null,
    "title": "分布式系统设计笔记",
    "content": "# 概述\n\n这是一篇关于分布式系统的技术笔记...",
    "summary": null,
    "cover_image": null,
    "status": "draft",
    "category_id": null,
    "category_name": null,
    "tags": ["分布式", "系统设计", "后端"],
    "word_count": 320,
    "version": 1,
    "created_at": "2026-06-27T14:00:00Z",
    "updated_at": "2026-06-27T14:00:00Z",
    "published_at": null
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 201 | 创建成功 |
| 422 | title 为空或超长（42207）/ content 为空（42208）/ tags 超5个（42209） |

---

### 4.2 自动保存草稿

| 项目 | 值 |
|------|-----|
| **URL** | `PUT /api/v1/articles/{id}/autosave` |
| **Method** | PUT |
| **权限** | Owner |

**请求参数（Path + Body）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id (path) | integer | ✅ | 文章 ID |
| content | string | ❌ | 更新的 Markdown 正文 |
| title | string | ❌ | 更新的标题 |

> 说明：自动保存是轻量更新，仅保存 title/content，不触发版本号递增，不触发 slug 重新生成。

**示例请求**

```bash
curl -X PUT https://api.blog.com/api/v1/articles/101/autosave \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"content":"# 概述\n\n更新后的内容...","title":"分布式系统设计笔记（更新）"}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "自动保存成功",
  "data": {
    "id": 101,
    "title": "分布式系统设计笔记（更新）",
    "content": "# 概述\n\n更新后的内容...",
    "word_count": 350,
    "updated_at": "2026-06-27T14:30:00Z"
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 保存成功 |
| 403 | 不是文章作者（40301） |
| 404 | 文章不存在（40403） |
| 422 | 文章已发布不可自动保存（42211，已发布文章用 PATCH 更新） |

---

### 4.3 更新文章（完整更新）

| 项目 | 值 |
|------|-----|
| **URL** | `PATCH /api/v1/articles/{id}` |
| **Method** | PATCH |
| **权限** | Owner |

**请求参数（Path + Body）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id (path) | integer | ✅ | 文章 ID |
| title | string | ❌ | 文章标题 |
| content | string | ❌ | Markdown 正文 |
| category_id | integer | ❌ | 分类 ID |
| tags | string[] | ❌ | 标签列表（整体替换） |
| cover_image | string | ❌ | 封面图 URL |
| summary | string | ❌ | 摘要 |
| slug | string | ❌ | 自定义 Slug（仅草稿态可修改） |
| allow_comment | boolean | ❌ | 是否允许评论（默认 true） |

**示例请求**

```bash
curl -X PATCH https://api.blog.com/api/v1/articles/101 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"category_id":3,"summary":"关于分布式系统设计的关键概念总结","slug":"distributed-system-2026"}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "文章更新成功",
  "data": {
    "id": 101,
    "slug": "distributed-system-2026",
    "title": "分布式系统设计笔记（更新）",
    "content": "# 概述\n\n更新后的内容...",
    "summary": "关于分布式系统设计的关键概念总结",
    "cover_image": null,
    "status": "draft",
    "category_id": 3,
    "category_name": "技术",
    "tags": ["分布式", "系统设计", "后端"],
    "allow_comment": true,
    "word_count": 350,
    "version": 1,
    "updated_at": "2026-06-27T15:00:00Z"
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 更新成功 |
| 403 | 不是文章作者（40301） |
| 404 | 文章不存在（40403） |
| 409 | slug 已被占用（40903） |
| 422 | 已发布文章不允许修改 slug（42212） |

---

### 4.4 发布文章

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/articles/{id}/publish` |
| **Method** | POST |
| **权限** | Owner |

**请求参数（Path）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id (path) | integer | ✅ | 文章 ID |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/articles/101/publish \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "文章发布成功",
  "data": {
    "id": 101,
    "slug": "distributed-system-2026",
    "title": "分布式系统设计笔记（更新）",
    "status": "published",
    "version": 2,
    "published_at": "2026-06-27T15:30:00Z",
    "url": "https://blog.com/zhoujinbu/distributed-system-2026"
  }
}
```

> 说明：发布时自动生成 slug（若为空），版本号递增，触发异步任务（ES 索引更新 + sitemap 更新 + RSS 更新）。

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 发布成功 |
| 403 | 不是文章作者（40301） |
| 404 | 文章不存在（40403） |
| 409 | slug 与其他已发布文章冲突（40903） |
| 422 | 缺少 category_id（42210）/ 标题或内容为空（42207, 42208） |

---

### 4.5 取消发布（回退为草稿）

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/articles/{id}/unpublish` |
| **Method** | POST |
| **权限** | Owner |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/articles/101/unpublish \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "文章已取消发布",
  "data": {
    "id": 101,
    "status": "draft",
    "published_at": "2026-06-27T15:30:00Z"
  }
}
```

> 说明：取消发布后文章对读者不可见，但 published_at 时间保留（重新发布时更新）。触发异步任务（ES 索引删除 + sitemap 更新）。

---

### 4.6 删除文章

| 项目 | 值 |
|------|-----|
| **URL** | `DELETE /api/v1/articles/{id}` |
| **Method** | DELETE |
| **权限** | Owner |

**示例请求**

```bash
curl -X DELETE https://api.blog.com/api/v1/articles/101 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（204）**：无返回体

> 说明：软删除（设置 deleted_at），触发异步任务（ES 索引删除 + sitemap 更新 + 关联图片清理标记）。

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 204 | 删除成功 |
| 403 | 不是文章作者（40301） |
| 404 | 文章不存在（40403） |

---

### 4.7 获取文章列表（管理端 — 我的文章）

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/articles` |
| **Method** | GET |
| **权限** | Authenticated |

**请求参数（Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | ❌ | 页码（默认1） |
| per_page | integer | ❌ | 每页条数（默认10） |
| status | string | ❌ | 筛选状态：draft / published / archived / all（默认all） |
| category_id | integer | ❌ | 按分类筛选 |
| tag | string | ❌ | 按标签筛选 |
| keyword | string | ❌ | 搜索标题关键词 |
| sort | string | ❌ | 排序字段：updated_at / created_at / published_at（默认updated_at） |
| order | string | ❌ | 排序方向：desc / asc（默认desc） |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/articles?page=1&per_page=10&status=draft&sort=updated_at&order=desc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 101,
        "slug": "distributed-system-2026",
        "title": "分布式系统设计笔记",
        "status": "draft",
        "category": { "id": 3, "name": "技术", "slug": "tech" },
        "tags": ["分布式", "系统设计"],
        "cover_image": "https://cdn.blog.com/covers/101.jpg",
        "summary": "关于分布式系统设计的关键概念总结...",
        "word_count": 320,
        "view_count": 0,
        "comment_count": 0,
        "like_count": 0,
        "created_at": "2026-06-27T14:00:00Z",
        "updated_at": "2026-06-27T15:00:00Z",
        "published_at": null
      }
    ],
    "total": 5,
    "page": 1,
    "per_page": 10
  }
}
```

> 说明：管理端只返回当前用户的文章（Owner 自动过滤）。管理端使用 OFFSET 分页。

---

### 4.8 获取单篇文章（管理端 — 按 ID）

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/articles/{id}` |
| **Method** | GET |
| **权限** | Owner |

**示例请求**

```bash
curl https://api.blog.com/api/v1/articles/101 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 101,
    "slug": "distributed-system-2026",
    "title": "分布式系统设计笔记",
    "content": "# 概述\n\n完整 Markdown 内容...",
    "summary": "关于分布式系统设计的关键概念总结",
    "cover_image": "https://cdn.blog.com/covers/101.jpg",
    "status": "draft",
    "category_id": 3,
    "category": { "id": 3, "name": "技术", "slug": "tech" },
    "tags": ["分布式", "系统设计", "后端"],
    "allow_comment": true,
    "word_count": 3200,
    "version": 1,
    "view_count": 0,
    "comment_count": 0,
    "like_count": 0,
    "created_at": "2026-06-27T14:00:00Z",
    "updated_at": "2026-06-27T15:00:00Z",
    "published_at": null
  }
}
```

---

### 4.9 获取公开文章详情（读者端 — 按 slug）

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/articles/{slug}` |
| **Method** | GET |
| **权限** | Public |

**请求参数（Path）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| slug | string | ✅ | 文章 URL Slug |

**示例请求**

```bash
curl https://api.blog.com/api/v1/articles/distributed-system-2026
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 101,
    "slug": "distributed-system-2026",
    "title": "分布式系统设计笔记",
    "content": "# 概述\n\n完整 Markdown 内容...",
    "summary": "关于分布式系统设计的关键概念总结",
    "cover_image": "https://cdn.blog.com/covers/101.jpg",
    "category": { "id": 3, "name": "技术", "slug": "tech" },
    "tags": ["分布式", "系统设计", "后端"],
    "view_count": 128,
    "comment_count": 5,
    "like_count": 12,
    "word_count": 3200,
    "allow_comment": true,
    "published_at": "2026-06-27T15:30:00Z",
    "author": {
      "id": 1,
      "username": "zhoujinbu",
      "avatar": "https://cdn.blog.com/avatars/1.jpg",
      "blog_name": "周进步的技术博客"
    }
  }
}
```

> 说明：读者端只返回 status=published 的文章。访问时自动记录阅读量（Redis INCR + 异步持久化）。

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 成功 |
| 404 | 文章不存在或未发布（40403） |

---

### 4.10 归档页面数据

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/users/{username}/archives` |
| **Method** | GET |
| **权限** | Public |

**请求参数（Path）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username (path) | string | ✅ | 博主用户名 |

**示例请求**

```bash
curl https://api.blog.com/api/v1/users/zhoujinbu/archives
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "years": [
      {
        "year": 2026,
        "months": [
          {
            "month": 6,
            "count": 3,
            "articles": [
              {
                "id": 101,
                "slug": "distributed-system-2026",
                "title": "分布式系统设计笔记",
                "published_at": "2026-06-27T15:30:00Z"
              }
            ]
          }
        ],
        "total": 3
      }
    ]
  }
}
```

---

## 5. Comment — 评论模块

### 5.1 创建评论

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/articles/{slug}/comments` |
| **Method** | POST |
| **权限** | Public（游客可评论）/ Authenticated（登录用户评论） |

**请求参数（Path + Body）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| slug (path) | string | ✅ | 文章 Slug |
| content | string | ✅ | 评论内容（Markdown，≤1000字） |
| parent_id | integer | ❌ | 回复评论 ID（空=顶层评论） |
| nickname | string | ❌ | 游客昵称（未登录时必填，≤50字） |
| guest_email | string | ❌ | 游客邮箱（未登录时必填，不公开显示） |

> 说明：登录用户通过 JWT 识别，无需 nickname/guest_email。游客评论默认 status=pending 需审核，博主可配置自动通过。

**示例请求（登录用户）**

```bash
curl -X POST https://api.blog.com/api/v1/articles/distributed-system-2026/comments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"content":"很好的文章，受益匪浅！","parent_id":null}'
```

**示例请求（游客）**

```bash
curl -X POST https://api.blog.com/api/v1/articles/distributed-system-2026/comments \
  -H "Content-Type: application/json" \
  -d '{"content":"写得不错！","nickname":"路人甲","guest_email":"guest@example.com"}'
```

**示例响应（201）**

```json
{
  "code": 0,
  "message": "评论提交成功，等待审核",
  "data": {
    "id": 201,
    "content": "很好的文章，受益匪浅！",
    "status": "pending",
    "author": {
      "id": 1,
      "username": "zhoujinbu",
      "avatar": "https://cdn.blog.com/avatars/1.jpg"
    },
    "nickname": null,
    "parent_id": null,
    "created_at": "2026-06-27T16:00:00Z"
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 201 | 评论创建成功 |
| 403 | 文章不允许评论（40302） |
| 404 | 文章不存在（40403） |
| 422 | content 为空或超1000字（42213）/ 游客缺少 nickname 或 guest_email（42214） |
| 429 | 评论频率超限（42903，同一IP每小时最多10条） |

---

### 5.2 获取文章评论列表

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/articles/{slug}/comments` |
| **Method** | GET |
| **权限** | Public |

**请求参数（Path + Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| slug (path) | string | ✅ | 文章 Slug |
| page | integer | ❌ | 页码（默认1） |
| per_page | integer | ❌ | 每页条数（默认20） |
| sort | string | ❌ | 排序：created_at（默认） / oldest |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/articles/distributed-system-2026/comments?page=1&per_page=20&sort=created_at"
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 201,
        "content": "很好的文章，受益匪浅！",
        "status": "approved",
        "author": {
          "id": 1,
          "username": "linreader",
          "avatar": "https://cdn.blog.com/avatars/2.jpg"
        },
        "nickname": null,
        "parent_id": null,
        "replies": [
          {
            "id": 202,
            "content": "谢谢支持！",
            "author": {
              "id": 1,
              "username": "zhoujinbu",
              "avatar": "https://cdn.blog.com/avatars/1.jpg"
            },
            "parent_id": 201,
            "created_at": "2026-06-27T17:00:00Z"
          }
        ],
        "created_at": "2026-06-27T16:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "per_page": 20
  }
}
```

> 说明：读者端只返回 status=approved 的评论。采用树状嵌套结构（顶层评论 + replies 数组）。

---

### 5.3 审核评论（博主/管理员）

| 项目 | 值 |
|------|-----|
| **URL** | `PATCH /api/v1/comments/{id}/status` |
| **Method** | PATCH |
| **权限** | Owner（文章作者）/ Admin |

**请求参数（Path + Body）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id (path) | integer | ✅ | 评论 ID |
| status | string | ✅ | 新状态：approved / rejected / spam |

**示例请求**

```bash
curl -X PATCH https://api.blog.com/api/v1/comments/201/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "评论已通过审核",
  "data": {
    "id": 201,
    "status": "approved",
    "updated_at": "2026-06-27T18:00:00Z"
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 200 | 审核成功 |
| 403 | 不是文章作者且非管理员（40303） |
| 404 | 评论不存在（40404） |

---

### 5.4 删除评论

| 项目 | 值 |
|------|-----|
| **URL** | `DELETE /api/v1/comments/{id}` |
| **Method** | DELETE |
| **权限** | Owner（文章作者）/ Admin |

**示例请求**

```bash
curl -X DELETE https://api.blog.com/api/v1/comments/201 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（204）**：无返回体

> 说明：软删除。删除后该评论的所有回复也标记删除。

---

### 5.5 获取评论列表（管理端）

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/comments` |
| **Method** | GET |
| **权限** | Owner / Admin |

**请求参数（Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | ❌ | 页码 |
| per_page | integer | ❌ | 每页条数 |
| status | string | ❌ | 筛选状态：pending / approved / rejected / spam / all |
| article_id | integer | ❌ | 按文章筛选 |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/comments?status=pending&page=1&per_page=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 203,
        "content": "垃圾评论...",
        "status": "pending",
        "article": { "id": 101, "title": "分布式系统设计笔记", "slug": "distributed-system-2026" },
        "author": null,
        "nickname": "spammer",
        "guest_email": "spam@spam.com",
        "ip_address": "1.2.3.4",
        "parent_id": null,
        "created_at": "2026-06-27T19:00:00Z"
      }
    ],
    "total": 3,
    "page": 1,
    "per_page": 20
  }
}
```

---

## 6. Category — 分类模块

### 6.1 创建分类

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/categories` |
| **Method** | POST |
| **权限** | Authenticated |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 分类名称（≤50字，同一用户下不重复） |
| description | string | ❌ | 分类描述（≤200字） |
| sort_order | integer | ❌ | 排序序号（默认0） |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/categories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"技术","description":"技术相关文章","sort_order":0}'
```

**示例响应（201）**

```json
{
  "code": 0,
  "message": "分类创建成功",
  "data": {
    "id": 3,
    "name": "技术",
    "slug": "tech",
    "description": "技术相关文章",
    "sort_order": 0,
    "post_count": 0,
    "created_at": "2026-06-27T20:00:00Z",
    "updated_at": "2026-06-27T20:00:00Z"
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 201 | 创建成功 |
| 409 | 同名分类已存在（40904） |

---

### 6.2 获取分类列表

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/categories` |
| **Method** | GET |
| **权限** | Authenticated |

> 说明：返回当前用户的分类列表，含每分类下的文章数（post_count）。

**示例请求**

```bash
curl https://api.blog.com/api/v1/categories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 3,
        "name": "技术",
        "slug": "tech",
        "description": "技术相关文章",
        "sort_order": 0,
        "post_count": 5,
        "created_at": "2026-06-27T20:00:00Z",
        "updated_at": "2026-06-27T20:00:00Z"
      },
      {
        "id": 4,
        "name": "生活",
        "slug": "life",
        "description": "生活随笔",
        "sort_order": 1,
        "post_count": 3,
        "created_at": "2026-06-27T20:10:00Z",
        "updated_at": "2026-06-27T20:10:00Z"
      }
    ]
  }
}
```

---

### 6.3 获取公开分类列表（读者端）

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/users/{username}/categories` |
| **Method** | GET |
| **权限** | Public |

**示例请求**

```bash
curl https://api.blog.com/api/v1/users/zhoujinbu/categories
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      { "id": 3, "name": "技术", "slug": "tech", "post_count": 5 },
      { "id": 4, "name": "生活", "slug": "life", "post_count": 3 }
    ]
  }
}
```

---

### 6.4 更新分类

| 项目 | 值 |
|------|-----|
| **URL** | `PATCH /api/v1/categories/{id}` |
| **Method** | PATCH |
| **权限** | Owner |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ❌ | 分类名称 |
| description | string | ❌ | 分类描述 |
| sort_order | integer | ❌ | 排序序号 |

**示例请求**

```bash
curl -X PATCH https://api.blog.com/api/v1/categories/3 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"技术笔记","description":"后端技术相关文章"}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "分类更新成功",
  "data": {
    "id": 3,
    "name": "技术笔记",
    "slug": "tech",
    "description": "后端技术相关文章",
    "sort_order": 0,
    "post_count": 5,
    "updated_at": "2026-06-27T21:00:00Z"
  }
}
```

---

### 6.5 删除分类

| 项目 | 值 |
|------|-----|
| **URL** | `DELETE /api/v1/categories/{id}` |
| **Method** | DELETE |
| **权限** | Owner |

**示例请求**

```bash
curl -X DELETE https://api.blog.com/api/v1/categories/3 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（204）**：无返回体

> 说明：删除分类时，其下文章的 category_id 被置为 NULL（SET NULL 策略）。

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 204 | 删除成功 |
| 403 | 不是分类所有者（40304） |
| 404 | 分类不存在（40405） |

---

## 7. Tag — 标签模块

### 7.1 获取标签列表

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/tags` |
| **Method** | GET |
| **权限** | Public |

**请求参数（Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | ❌ | 页码（默认1） |
| per_page | integer | ❌ | 每页条数（默认50） |
| keyword | string | ❌ | 搜索标签名关键词 |
| sort | string | ❌ | 排序：usage_count（默认）/ name / created_at |
| order | string | ❌ | 方向：desc（默认）/ asc |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/tags?sort=usage_count&order=desc&per_page=50"
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      { "id": 1, "name": "分布式", "slug": "distributed", "usage_count": 15 },
      { "id": 2, "name": "系统设计", "slug": "system-design", "usage_count": 12 },
      { "id": 3, "name": "后端", "slug": "backend", "usage_count": 8 }
    ],
    "total": 50,
    "page": 1,
    "per_page": 50
  }
}
```

---

### 7.2 获取用户关联标签列表

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/users/{username}/tags` |
| **Method** | GET |
| **权限** | Public |

**示例请求**

```bash
curl https://api.blog.com/api/v1/users/zhoujinbu/tags
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      { "id": 1, "name": "分布式", "slug": "distributed", "usage_count": 5 },
      { "id": 2, "name": "系统设计", "slug": "system-design", "usage_count": 4 }
    ]
  }
}
```

> 说明：返回该用户所有已发布文章中使用过的标签，按 usage_count 排序。

---

### 7.3 获取标签下的文章列表

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/tags/{slug}/articles` |
| **Method** | GET |
| **权限** | Public |

**请求参数（Path + Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| slug (path) | string | ✅ | 标签 Slug |
| page | integer | ❌ | 页码 |
| per_page | integer | ❌ | 每页条数 |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/tags/distributed/articles?page=1&per_page=10"
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 101,
        "slug": "distributed-system-2026",
        "title": "分布式系统设计笔记",
        "summary": "关于分布式系统设计的关键概念总结...",
        "cover_image": "https://cdn.blog.com/covers/101.jpg",
        "published_at": "2026-06-27T15:30:00Z",
        "author": {
          "id": 1,
          "username": "zhoujinbu",
          "avatar": "https://cdn.blog.com/avatars/1.jpg",
          "blog_name": "周进步的技术博客"
        }
      }
    ],
    "total": 15,
    "page": 1,
    "per_page": 10
  }
}
```

---

## 8. Upload — 上传模块

### 8.1 上传图片

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/uploads` |
| **Method** | POST |
| **权限** | Authenticated |
| **Content-Type** | multipart/form-data |

**请求参数（Body - multipart）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | ✅ | 图片文件（JPG/PNG/GIF/WebP，≤5MB） |
| type | string | ❌ | 用途标记：article / avatar / cover（默认 article） |

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/uploads \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -F "file=@/path/to/image.jpg" \
  -F "type=article"
```

**示例响应（201）**

```json
{
  "code": 0,
  "message": "上传成功",
  "data": {
    "id": 50,
    "url": "https://cdn.blog.com/uploads/1/2026/06/abc123.jpg",
    "thumbnail_url": "https://cdn.blog.com/uploads/1/2026/06/abc123_thumb.jpg",
    "original_name": "image.jpg",
    "mime_type": "image/jpeg",
    "file_size": 1024000,
    "width": 1920,
    "height": 1080,
    "type": "image",
    "created_at": "2026-06-27T22:00:00Z"
  }
}
```

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 201 | 上传成功 |
| 422 | 文件格式不支持（42215）/ 文件大小超限（42216，≤5MB） |
| 429 | 上传频率超限（42904，同一用户每分钟最多10次） |

---

### 8.2 获取媒体库列表

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/uploads` |
| **Method** | GET |
| **权限** | Authenticated |

**请求参数（Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | ❌ | 页码 |
| per_page | integer | ❌ | 每页条数（默认20） |
| type | string | ❌ | 筛选类型：image / all |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/uploads?page=1&per_page=20&type=image" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 50,
        "url": "https://cdn.blog.com/uploads/1/2026/06/abc123.jpg",
        "thumbnail_url": "https://cdn.blog.com/uploads/1/2026/06/abc123_thumb.jpg",
        "original_name": "image.jpg",
        "mime_type": "image/jpeg",
        "file_size": 1024000,
        "width": 1920,
        "height": 1080,
        "type": "image",
        "created_at": "2026-06-27T22:00:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "per_page": 20
  }
}
```

---

### 8.3 删除上传文件

| 项目 | 值 |
|------|-----|
| **URL** | `DELETE /api/v1/uploads/{id}` |
| **Method** | DELETE |
| **权限** | Owner |

**示例请求**

```bash
curl -X DELETE https://api.blog.com/api/v1/uploads/50 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（204）**：无返回体

> 说明：软删除（设置 deleted_at），OSS 文件异步清理（通过 MQ 触发）。

**HTTP 状态码**

| 状态码 | 场景 |
|--------|------|
| 204 | 删除成功 |
| 403 | 不是文件所有者（40305） |
| 404 | 文件不存在（40406） |

---

## 9. Admin — 管理后台模块

### 9.1 管理端统计概览

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/admin/stats` |
| **Method** | GET |
| **权限** | Owner / Admin |

**示例请求**

```bash
curl https://api.blog.com/api/v1/admin/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total_articles": 12,
    "published_articles": 10,
    "draft_articles": 2,
    "total_comments": 25,
    "pending_comments": 3,
    "total_views_today": 128,
    "total_views_month": 3200,
    "total_likes": 45,
    "recent_articles": [
      { "id": 101, "title": "分布式系统设计笔记", "status": "published", "published_at": "2026-06-27T15:30:00Z" }
    ]
  }
}
```

---

### 9.2 管理端文章列表（管理员视角）

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/admin/articles` |
| **Method** | GET |
| **权限** | Admin |

**请求参数（Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | ❌ | 页码 |
| per_page | integer | ❌ | 每页条数 |
| status | string | ❌ | 筛选状态 |
| author_id | integer | ❌ | 按作者筛选 |
| keyword | string | ❌ | 搜索标题关键词 |

> 说明：管理员可查看所有用户的文章，普通作者只能看自己的（通过 /api/v1/articles）。

---

### 9.3 管理端评论列表

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/admin/comments` |
| **Method** | GET |
| **权限** | Admin |

> 说明：管理员可查看所有用户的评论，含 IP 和 UA 信息。同 5.5 节接口但权限为 Admin。

---

### 9.4 管理端用户列表（仅超级管理员）

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/admin/users` |
| **Method** | GET |
| **权限** | SuperAdmin |

**请求参数（Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | ❌ | 页码 |
| per_page | integer | ❌ | 每页条数 |
| status | string | ❌ | 筛选状态：active / suspended / pending_verification / all |
| keyword | string | ❌ | 搜索用户名或邮箱 |
| role | string | ❌ | 按角色筛选 |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/admin/users?page=1&per_page=20&status=active" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "email": "zhou@example.com",
        "username": "zhoujinbu",
        "blog_name": "周进步的技术博客",
        "avatar": "https://cdn.blog.com/avatars/1.jpg",
        "roles": ["author"],
        "status": "active",
        "post_count": 12,
        "last_login_at": "2026-06-27T10:00:00Z",
        "created_at": "2026-06-27T10:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "per_page": 20
  }
}
```

---

### 9.5 冻结/解冻用户

| 项目 | 值 |
|------|-----|
| **URL** | `PATCH /api/v1/admin/users/{id}/status` |
| **Method** | PATCH |
| **权限** | SuperAdmin |

**请求参数（Path + Body）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id (path) | integer | ✅ | 用户 ID |
| status | string | ✅ | 新状态：suspended / active |
| reason | string | ❌ | 操作原因（冻结时建议填写） |

**示例请求**

```bash
curl -X PATCH https://api.blog.com/api/v1/admin/users/2/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended","reason":"发布违规内容"}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "用户已冻结",
  "data": {
    "id": 2,
    "status": "suspended",
    "updated_at": "2026-06-27T23:00:00Z"
  }
}
```

> 说明：冻结用户时同时撤销所有 Refresh Token（强制登出）。

---

### 9.6 修改用户角色

| 项目 | 值 |
|------|-----|
| **URL** | `PATCH /api/v1/admin/users/{id}/roles` |
| **Method** | PATCH |
| **权限** | SuperAdmin |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roles | string[] | ✅ | 角色名称列表（如 ["author", "admin"]），整体替换 |

**示例请求**

```bash
curl -X PATCH https://api.blog.com/api/v1/admin/users/2/roles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"roles":["author","admin"]}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "角色更新成功",
  "data": {
    "id": 2,
    "roles": ["author", "admin"]
  }
}
```

---

## 10. Analytics — 分析统计模块

### 10.1 记录文章阅读

| 项目 | 值 |
|------|-----|
| **URL** | `POST /api/v1/analytics/views` |
| **Method** | POST |
| **权限** | Public |

**请求参数（Body - JSON）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| article_id | integer | ✅ | 文章 ID |
| slug | string | ❌ | 文章 Slug（article_id 和 slug 二选一） |

> 说明：读者访问文章详情页时前端自动调用。后端通过 Redis INCR 计数 + IP+UA 去重判断独立访客。每日凌晨 MQ 任务将 Redis 数据写入 PG article_view_daily 表。

**示例请求**

```bash
curl -X POST https://api.blog.com/api/v1/analytics/views \
  -H "Content-Type: application/json" \
  -d '{"article_id":101}'
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "阅读量已记录",
  "data": null
}
```

---

### 10.2 获取文章阅读统计

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/articles/{id}/stats` |
| **Method** | GET |
| **权限** | Owner |

**请求参数（Path + Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id (path) | integer | ✅ | 文章 ID |
| period | string | ❌ | 统计周期：7d / 30d / 90d / all（默认30d） |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/articles/101/stats?period=30d" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "article_id": 101,
    "total_views": 1280,
    "unique_visitors": 950,
    "daily_stats": [
      { "date": "2026-06-27", "view_count": 128, "unique_visitor_count": 95 },
      { "date": "2026-06-26", "view_count": 110, "unique_visitor_count": 80 }
    ],
    "period": "30d"
  }
}
```

---

### 10.3 获取整体统计趋势

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/analytics/trends` |
| **Method** | GET |
| **权限** | Owner |

**请求参数（Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| period | string | ❌ | 统计周期：7d / 30d / 90d（默认30d） |
| metric | string | ❌ | 指标类型：views / visitors / comments（默认views） |

**示例请求**

```bash
curl "https://api.blog.com/api/v1/analytics/trends?period=30d&metric=views" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**示例响应（200）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "period": "30d",
    "metric": "views",
    "total": 3200,
    "daily": [
      { "date": "2026-06-27", "value": 128 },
      { "date": "2026-06-26", "value": 110 },
      { "date": "2026-06-25", "value": 95 }
    ]
  }
}
```

---

## 11. SEO — 搜索引擎优化模块

### 11.1 获取 Sitemap

| 项目 | 值 |
|------|-----|
| **URL** | `GET /sitemap.xml` |
| **Method** | GET |
| **权限** | Public |
| **Content-Type** | application/xml |

> 说明：不在 /api/v1 路径下，直接作为站点根路径的资源。自动生成，包含所有已发布文章 + 分类页 + 标签页 + 用户主页。每次文章发布/取消发布时通过 MQ 异步更新。

---

### 11.2 获取 RSS Feed

| 项目 | 值 |
|------|-----|
| **URL** | `GET /feed.xml` |
| **Method** | GET |
| **权限** | Public |
| **Content-Type** | application/rss+xml |

> 说明：RSS 2.0 格式，包含最近 50 篇已发布文章。按 published_at 降序排列。

---

### 11.3 获取用户 RSS Feed

| 项目 | 值 |
|------|-----|
| **URL** | `GET /api/v1/users/{username}/feed.xml` |
| **Method** | GET |
| **权限** | Public |
| **Content-Type** | application/rss+xml |

> 说明：指定用户的 RSS Feed，只包含该用户的已发布文章。

---

## 12. 全局错误码表

### 12.1 通用错误码（1xx）

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 0 | 200/201 | 成功 |
| 10001 | 500 | 服务器内部错误 |
| 10002 | 503 | 服务暂时不可用（维护中） |

### 12.2 参数校验错误码（4xx - 422类）

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 42201 | 422 | 密码不符合强度要求 |
| 42202 | 422 | 用户名格式不合法 |
| 42203 | 422 | 邮箱格式不正确 |
| 42204 | 422 | blog_name 长度不合规 |
| 42205 | 422 | bio 超过200字 |
| 42206 | 422 | social_links 超过5个 |
| 42207 | 422 | 文章标题为空或超长 |
| 42208 | 422 | 文章内容为空 |
| 42209 | 422 | 标签数量超过5个 |
| 42210 | 422 | 发布时缺少 category_id |
| 42211 | 422 | 已发布文章不可自动保存 |
| 42212 | 422 | 已发布文章不允许修改 slug |
| 42213 | 422 | 评论内容为空或超1000字 |
| 42214 | 422 | 游客评论缺少 nickname 或 guest_email |
| 42215 | 422 | 上传文件格式不支持 |
| 42216 | 422 | 上传文件大小超限 |

### 12.3 认证/授权错误码（4xx - 401/403类）

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 40101 | 401 | 邮箱或密码错误 |
| 40102 | 401 | 邮箱未验证 |
| 40103 | 401 | 账号已被冻结 |
| 40104 | 401 | Refresh Token 无效或已过期 |
| 40105 | 401 | Refresh Token 已被撤销 |
| 40106 | 401 | 当前密码错误（修改密码时） |
| 40301 | 403 | 不是文章作者 |
| 40302 | 403 | 文章不允许评论 |
| 40303 | 403 | 不是文章作者且非管理员（评论审核） |
| 40304 | 403 | 不是分类所有者 |
| 40305 | 403 | 不是文件所有者 |

### 12.4 资源不存在错误码（4xx - 404类）

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 40401 | 404 | 用户不存在（验证邮箱时） |
| 40402 | 404 | 用户不存在（公开主页） |
| 40403 | 404 | 文章不存在或未发布 |
| 40404 | 404 | 评论不存在 |
| 40405 | 404 | 分类不存在 |
| 40406 | 404 | 上传文件不存在 |

### 12.5 资源冲突错误码（4xx - 409类）

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 40901 | 409 | 邮箱已被注册 |
| 40902 | 409 | 用户名已被占用 |
| 40903 | 409 | slug 已被其他已发布文章占用 |
| 40904 | 409 | 同名分类已存在 |

### 12.6 Token 错误码（4xx - 400类）

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 40001 | 400 | 验证 Token 无效或已过期 |
| 40002 | 400 | 重置 Token 无效或已过期 |

### 12.7 频率限制错误码（4xx - 429类）

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 42901 | 429 | 注册频率超限（同一IP每小时5次） |
| 42902 | 429 | 登录失败超过5次，账户锁定15分钟 |
| 42903 | 429 | 评论频率超限（同一IP每小时10条） |
| 42904 | 429 | 上传频率超限（同一用户每分钟10次） |

---

## 13. API 总览表

### 13.1 按模块汇总

| 模块 | API 数量 | 端点列表 |
|------|---------|---------|
| **Auth** | 8 | register, verify-email, login, refresh, logout, forgot-password, reset-password, change-password |
| **User** | 4 | GET /users/me, PATCH /users/me, GET /users/{username}, GET /users/{username}/articles |
| **Article** | 10 | POST /articles, PUT /articles/{id}/autosave, PATCH /articles/{id}, POST /articles/{id}/publish, POST /articles/{id}/unpublish, DELETE /articles/{id}, GET /articles, GET /articles/{id}, GET /articles/{slug}, GET /users/{username}/archives |
| **Comment** | 5 | POST /articles/{slug}/comments, GET /articles/{slug}/comments, PATCH /comments/{id}/status, DELETE /comments/{id}, GET /comments |
| **Category** | 5 | POST /categories, GET /categories, GET /users/{username}/categories, PATCH /categories/{id}, DELETE /categories/{id} |
| **Tag** | 3 | GET /tags, GET /users/{username}/tags, GET /tags/{slug}/articles |
| **Upload** | 3 | POST /uploads, GET /uploads, DELETE /uploads/{id} |
| **Admin** | 6 | GET /admin/stats, GET /admin/articles, GET /admin/comments, GET /admin/users, PATCH /admin/users/{id}/status, PATCH /admin/users/{id}/roles |
| **Analytics** | 3 | POST /analytics/views, GET /articles/{id}/stats, GET /analytics/trends |
| **SEO** | 3 | GET /sitemap.xml, GET /feed.xml, GET /users/{username}/feed.xml |
| **合计** | **49** | — |

### 13.2 按权限层级汇总

| 权限 | API 数量 | 说明 |
|------|---------|------|
| Public | 18 | 验证邮箱、登录、注册、忘记/重置密码、公开主页、公开文章列表/详情、评论创建(游客)、评论列表(读者)、分类列表(读者)、标签列表、标签文章、归档、阅读记录、Sitemap、RSS |
| Authenticated | 8 | 创建草稿、自动保存、更新文章、发布/取消/删除、我的文章列表、创建分类、获取分类、上传图片、媒体库、统计概览、趋势、修改密码、登出、更新资料、我的信息 |
| Owner | 4 | 管理端文章详情、文章阅读统计、评论审核(作者)、评论删除(作者) |
| Admin | 3 | 管理端所有文章、管理端所有评论、评论审核 |
| SuperAdmin | 2 | 用户列表、冻结/修改角色 |

---

### 13.3 接口限流策略总览

| 接口类型 | 限流策略 | 说明 |
|---------|---------|------|
| 注册 | 同一IP 5次/小时 | 防止批量注册 |
| 登录 | 同一账号 5次/15分钟 | 防止暴力破解 |
| 评论 | 同一IP 10次/小时 | 防止刷评论 |
| 上传 | 同一用户 10次/分钟 | 防止恶意上传 |
| 通用API | 同一用户 100次/分钟 | 通用限流兜底 |
| 阅读记录 | 同一IP 1次/文章/天 | 防止刷阅读量 |
