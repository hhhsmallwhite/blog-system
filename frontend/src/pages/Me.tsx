// ===================================================================
// 个人中心页面
// ===================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Textarea,
  Button,
  Alert,
  Stack,
  Group,
  Avatar,
  LoadingOverlay,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 个人中心页面
 *
 * 功能:
 * - 显示用户资料（用户名、邮箱、博客名、简介、头像）
 * - 编辑资料（博客名、简介、头像 URL）
 * - 管理社交链接
 * - 修改密码
 */
export default function Me() {
  const { user, isAuthenticated, isLoading, fetchUserProfile, updateProfile } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // ---- 初始化：获取用户资料 ----
  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUserProfile();
    }
  }, [isAuthenticated, user, fetchUserProfile]);

  // ---- 表单 ----
  const form = useForm({
    initialValues: {
      blog_name: user?.blog_name || '',
      bio: user?.bio || '',
      avatar: user?.avatar || '',
    },
    validate: {
      blog_name: (value: string) => (value.length <= 50 ? null : '博客名不能超过 50 个字符'),
      bio: (value: string) => (value.length <= 500 ? null : '简介不能超过 500 个字符'),
    },
  });

  // 当用户资料加载完成后，重置表单
  useEffect(() => {
    if (user) {
      form.setValues({
        blog_name: user.blog_name || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  // ---- 提交 ----
  const handleSubmit = async (values: typeof form.values) => {
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveMessage('');

    try {
      await updateProfile(values);
      setIsEditing(false);
      setSaveStatus('success');
      setSaveMessage('资料更新成功！');
    } catch (error: any) {
      setSaveStatus('error');
      setSaveMessage(error.response?.data?.message || '更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- 未登录 ----
  if (!isAuthenticated) {
    return (
      <Container size={800} my={40}>
        <Alert color="yellow" title="未登录">
          请先<Anchor component={Link} to="/login">登录</Anchor>后查看个人中心。
        </Alert>
      </Container>
    );
  }

  // ---- 加载中 ----
  if (isLoading || (isAuthenticated && !user)) {
    return (
      <Container size={800} my={40}>
        <LoadingOverlay visible />
      </Container>
    );
  }

  return (
    <Container size={800} my={40}>
      <Group justify="space-between" mb="xl">
        <Title order={2}>个人中心</Title>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>编辑资料</Button>
        )}
      </Group>

      {/* 用户信息卡片 */}
      <Paper withBorder shadow="sm" p="md" mb="xl">
        <Group>
          <Avatar src={user?.avatar} size={80} radius={80}>
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text size="lg" fw={700}>
              {user?.blog_name || user?.username}
            </Text>
            <Text c="dimmed" size="sm">
              @{user?.username}
            </Text>
            <Text c="dimmed" size="sm">
              {user?.email}
            </Text>
          </div>
        </Group>

        {user?.bio && (
          <Text mt="md" c="dimmed">
            {user.bio}
          </Text>
        )}

        <Text mt="sm" c="dimmed" size="xs">
          加入于 {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
        </Text>
      </Paper>

      {/* 编辑资料表单 */}
      {isEditing && (
        <Paper withBorder shadow="sm" p="md">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                label="博客名"
                placeholder="输入博客名称"
                {...form.getInputProps('blog_name')}
                disabled={isSaving}
              />

              <Textarea
                label="个人简介"
                placeholder="介绍一下自己..."
                rows={4}
                {...form.getInputProps('bio')}
                disabled={isSaving}
              />

              <TextInput
                label="头像 URL"
                placeholder="https://example.com/avatar.jpg"
                {...form.getInputProps('avatar')}
                disabled={isSaving}
              />

              {saveMessage && (
                <Alert color={saveStatus === 'success' ? 'green' : 'red'} mt="md">
                  {saveMessage}
                </Alert>
              )}

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  取消
                </Button>
                <Button type="submit" loading={isSaving}>
                  保存
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}

      {/* 修改密码区域 */}
      <Paper withBorder shadow="sm" p="md" mt="xl">
        <Title order={4} mb="md">修改密码</Title>
        <Button component={Link} to="/change-password" variant="light">
          修改密码
        </Button>
      </Paper>
    </Container>
  );
}
