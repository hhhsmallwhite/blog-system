// ===================================================================
// Prisma 种子数据 — RBAC 角色 + 权限矩阵
// 运行: npx prisma db seed
// ===================================================================

import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * 权限定义 — 9 个模块 × 动作 = 权限项
 * 命名规范: module:action
 */
const PERMISSION_DEFINITIONS: Array<{
  name: string;
  module: string;
  action: string;
  description: string;
}> = [
  // ---- Auth 认证模块 ----
  {
    name: 'auth:register',
    module: 'auth',
    action: 'register',
    description: '注册账号',
  },
  {
    name: 'auth:login',
    module: 'auth',
    action: 'login',
    description: '登录账号',
  },
  {
    name: 'auth:change_password',
    module: 'auth',
    action: 'change_password',
    description: '修改密码',
  },

  // ---- User 用户模块 ----
  {
    name: 'user:read_own',
    module: 'user',
    action: 'read_own',
    description: '读取自己的资料',
  },
  {
    name: 'user:update_own',
    module: 'user',
    action: 'update_own',
    description: '修改自己的资料',
  },
  {
    name: 'user:read_any',
    module: 'user',
    action: 'read_any',
    description: '读取任意用户资料',
  },

  // ---- Article 文章模块 ----
  {
    name: 'article:create',
    module: 'article',
    action: 'create',
    description: '创建文章',
  },
  {
    name: 'article:update_own',
    module: 'article',
    action: 'update_own',
    description: '编辑自己的文章',
  },
  {
    name: 'article:delete_own',
    module: 'article',
    action: 'delete_own',
    description: '删除自己的文章',
  },
  {
    name: 'article:publish',
    module: 'article',
    action: 'publish',
    description: '发布/取消发布文章',
  },
  {
    name: 'article:read_published',
    module: 'article',
    action: 'read_published',
    description: '阅读已发布文章（读者端）',
  },
  {
    name: 'article:update_any',
    module: 'article',
    action: 'update_any',
    description: '编辑任意文章（管理员）',
  },
  {
    name: 'article:delete_any',
    module: 'article',
    action: 'delete_any',
    description: '删除任意文章（管理员）',
  },

  // ---- Comment 评论模块 ----
  {
    name: 'comment:create',
    module: 'comment',
    action: 'create',
    description: '创建评论',
  },
  {
    name: 'comment:delete_own',
    module: 'comment',
    action: 'delete_own',
    description: '删除自己的评论',
  },
  {
    name: 'comment:approve',
    module: 'comment',
    action: 'approve',
    description: '审核评论（通过/拒绝）',
  },
  {
    name: 'comment:delete_any',
    module: 'comment',
    action: 'delete_any',
    description: '删除任意评论（管理员）',
  },

  // ---- Category 分类模块 ----
  {
    name: 'category:create',
    module: 'category',
    action: 'create',
    description: '创建分类',
  },
  {
    name: 'category:update_own',
    module: 'category',
    action: 'update_own',
    description: '编辑自己的分类',
  },
  {
    name: 'category:delete_own',
    module: 'category',
    action: 'delete_own',
    description: '删除自己的分类',
  },
  {
    name: 'category:read',
    module: 'category',
    action: 'read',
    description: '查看分类列表',
  },

  // ---- Tag 标签模块 ----
  {
    name: 'tag:create',
    module: 'tag',
    action: 'create',
    description: '创建标签',
  },
  {
    name: 'tag:update',
    module: 'tag',
    action: 'update',
    description: '编辑标签',
  },
  {
    name: 'tag:delete',
    module: 'tag',
    action: 'delete',
    description: '删除标签',
  },
  {
    name: 'tag:read',
    module: 'tag',
    action: 'read',
    description: '查看标签列表',
  },

  // ---- Upload 上传模块 ----
  {
    name: 'upload:upload',
    module: 'upload',
    action: 'upload',
    description: '上传文件',
  },
  {
    name: 'upload:delete_own',
    module: 'upload',
    action: 'delete_own',
    description: '删除自己的文件',
  },
  {
    name: 'upload:read_own',
    module: 'upload',
    action: 'read_own',
    description: '查看自己的媒体库',
  },

  // ---- Admin 管理模块 ----
  {
    name: 'admin:view_stats',
    module: 'admin',
    action: 'view_stats',
    description: '查看管理统计',
  },
  {
    name: 'admin:list_users',
    module: 'admin',
    action: 'list_users',
    description: '查看用户列表',
  },
  {
    name: 'admin:suspend_user',
    module: 'admin',
    action: 'suspend_user',
    description: '冻结/解冻用户',
  },
  {
    name: 'admin:change_role',
    module: 'admin',
    action: 'change_role',
    description: '修改用户角色',
  },
  {
    name: 'admin:list_articles',
    module: 'admin',
    action: 'list_articles',
    description: '查看文章管理列表',
  },
  {
    name: 'admin:list_comments',
    module: 'admin',
    action: 'list_comments',
    description: '查看评论管理列表',
  },
  {
    name: 'admin:view_logs',
    module: 'admin',
    action: 'view_logs',
    description: '查看操作日志（仅超管）',
  },

  // ---- Analytics 分析模块 ----
  {
    name: 'analytics:record_view',
    module: 'analytics',
    action: 'record_view',
    description: '记录阅读量',
  },
  {
    name: 'analytics:read_stats',
    module: 'analytics',
    action: 'read_stats',
    description: '查看阅读统计',
  },
  {
    name: 'analytics:read_trend',
    module: 'analytics',
    action: 'read_trend',
    description: '查看阅读趋势',
  },

  // ---- SEO 模块 ----
  {
    name: 'seo:view_sitemap',
    module: 'seo',
    action: 'view_sitemap',
    description: '查看 sitemap',
  },
  {
    name: 'seo:view_rss',
    module: 'seo',
    action: 'view_rss',
    description: '查看 RSS Feed',
  },
];

/**
 * 角色定义
 */
const ROLES = [
  { name: 'guest', description: '游客（未登录）' },
  { name: 'user', description: '普通用户（已登录无博客）' },
  { name: 'author', description: '作者（有博客的博主）' },
  { name: 'admin', description: '管理员' },
  { name: 'super_admin', description: '超级管理员' },
];

/**
 * 角色 → 权限名映射
 */
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  guest: [
    'article:read_published',
    'category:read',
    'tag:read',
    'auth:register',
    'auth:login',
    'analytics:record_view',
    'seo:view_sitemap',
    'seo:view_rss',
  ],
  user: [
    // 继承 guest 的全部 +
    'auth:change_password',
    'user:read_own',
    'user:update_own',
    'comment:create',
    'comment:delete_own',
    'upload:upload',
    'upload:read_own',
    'upload:delete_own',
  ],
  author: [
    // 继承 user 的全部 +
    'article:create',
    'article:update_own',
    'article:delete_own',
    'article:publish',
    'category:create',
    'category:update_own',
    'category:delete_own',
    'tag:create',
    'comment:approve',
    'analytics:read_stats',
    'analytics:read_trend',
  ],
  admin: [
    // 继承 author 的全部 +
    'user:read_any',
    'article:update_any',
    'article:delete_any',
    'comment:delete_any',
    'tag:update',
    'tag:delete',
    'admin:view_stats',
    'admin:list_users',
    'admin:suspend_user',
    'admin:list_articles',
    'admin:list_comments',
  ],
  super_admin: [
    // 拥有所有权限
    ...PERMISSION_DEFINITIONS.map((p) => p.name),
  ],
};

async function main() {
  console.log('🌱 开始播种种子数据...\n');

  // ---- 1. 创建角色 ----
  console.log('📋 创建 5 个角色...');
  const roles: Record<string, { id: number }> = {};
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description },
    });
    roles[roleDef.name] = role;
    console.log(`  ✓ ${role.name}`);
  }

  // ---- 2. 创建权限 ----
  console.log('\n🔐 创建权限项...');
  const permissions: Record<string, { id: number }> = {};
  for (const permDef of PERMISSION_DEFINITIONS) {
    const perm = await prisma.permission.upsert({
      where: { name: permDef.name },
      update: {
        module: permDef.module,
        action: permDef.action,
        description: permDef.description,
      },
      create: {
        name: permDef.name,
        module: permDef.module,
        action: permDef.action,
        description: permDef.description,
      },
    });
    permissions[permDef.name] = perm;
  }
  console.log(`  ✓ 共计 ${Object.keys(permissions).length} 个权限项`);

  // ---- 3. 角色-权限关联 ----
  console.log('\n🔗 关联角色权限...');
  let mappingCount = 0;
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = roles[roleName];
    if (!role) continue;

    for (const permName of permNames) {
      const perm = permissions[permName];
      if (!perm) {
        console.warn(`  ⚠ 权限未找到: ${permName}`);
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
      mappingCount++;
    }
  }
  console.log(`  ✓ 共计 ${mappingCount} 条角色-权限关联`);

  // ---- 4. 创建示例作者用户 ----
  console.log('\n👤 创建示例用户...');
  const passwordHash = await bcrypt.hash('Demo@2026', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@blog.com' },
    update: {},
    create: {
      email: 'demo@blog.com',
      username: 'demo_author',
      passwordHash,
      blogName: '示例博客',
      bio: '这是一个演示用博客账号，用于开发和测试。',
      status: UserStatus.active,
    },
  });
  console.log(`  ✓ ${demoUser.username} (${demoUser.email})`);

  // 分配 author 角色
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: demoUser.id,
        roleId: roles.author.id,
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      roleId: roles.author.id,
    },
  });

  // ---- 5. 创建示例分类 ----
  console.log('\n📁 创建示例分类...');
  const demoCategories = ['技术', '生活', '读书笔记', '开源项目'];
  for (const catName of demoCategories) {
    await prisma.category.create({
      data: {
        userId: demoUser.id,
        name: catName,
        slug: catName.toLowerCase(),
      },
    });
  }
  console.log(`  ✓ ${demoCategories.length} 个分类`);

  // ---- 6. 创建示例标签 ----
  console.log('\n🏷️ 创建示例标签...');
  const demoTags = [
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'NestJS',
    'PostgreSQL',
    'Docker',
    '前端',
    '后端',
    '全栈',
  ];
  for (const tagName of demoTags) {
    await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: {
        name: tagName,
        slug: tagName.toLowerCase(),
        usageCount: 0,
      },
    });
  }
  console.log(`  ✓ ${demoTags.length} 个标签`);

  console.log('\n✅ 种子数据播种完成！');
  console.log('   - 5 个角色 (guest / user / author / admin / super_admin)');
  console.log(`   - ${Object.keys(permissions).length} 个权限项`);
  console.log(`   - ${mappingCount} 条角色-权限映射`);
  console.log('   - 1 个示例用户 (demo@blog.com / Demo@2026)');
  console.log('   - 4 个示例分类');
  console.log('   - 10 个示例标签');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ 种子数据执行失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
