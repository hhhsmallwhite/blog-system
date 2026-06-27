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
  Divider,
  Anchor,
  PasswordInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconUser, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/api-client';

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
  const { user, isAuthenticated, isLoading, fetchUserProfile, updateProfile, error, clearError } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // ---- 修改密码 ----
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // ---- 表单 ----
  const form = useForm({
    initialValues: {
      blog_name: '',
      bio: '',
      avatar: '',
    },
    validate: {
      blog_name: (value) => (value.length <= 50 ? null : '博客名最多 50 位'),
      bio: (value) => (value.length <= 500 ? null : '简介最多 500 字符'),
    },
  });

  // ---- 密码表单 ----
  const passwordForm = useForm({
    initialValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      oldPassword: (value) => (value.length >= 8 ? null : '密码至少 8 位'),
      newPassword: (value) => (value.length >= 8 ? null : '密码至少 8 位'),
      confirmPassword: (value, values) =>
        value === values.newPassword ? null : '两次密码不一致',
    },
  });

  // ---- 加载用户资料 ----
  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUserProfile();
    } else if (user) {
      form.setValues({
        blog_name: user.blog_name || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
    }
  }, [isAuthenticated, user]);

  // ---- 未登录 ----
  if (!isAuthenticated) {
    return (
      <Container size={600} my={40}>
        <Alert color="yellow">
          请先<Anchor component={Link} to="/login">登录</Anchor>后查看个人中心。
        </Alert>
      </Container>
    );
  }

  // ---- 提交资料更新 ----
  const handleSubmit = async (values: typeof form.values) => {
    setIsSaving(true);
    setSaveStatus('idle');
    clearError();

    try {
      await updateProfile({
        blog_name: values.blog_name || undefined,
        bio: values.bio || undefined,
        avatar: values.avatar || undefined,
      });
      setSaveStatus('success');
      setSaveMessage('资料更新成功！');
      setIsEditing(false);
    } catch (error: any) {
      setSaveStatus('error');
      setSaveMessage(error.response?.data?.message || '更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- 提交密码修改 ----
  const handlePasswordChange = async (values: typeof passwordForm.values) => {
    setIsChangingPassword(true);
    setPasswordStatus('idle');

    try {
      await apiClient.post('/auth/change-password', {
        old_password: values.oldPassword,
        new_password: values.newPassword,
      });
      setPasswordStatus('success');
      passwordForm.reset();
    } catch (error: any) {
      setPasswordStatus('error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Container size={600} my={40}>
      <LoadingOverlay visible={isLoading || !user} />

      <Group justify="space-between" mb="xl">
        <Title order={2}>
          <IconUser size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          个人中心
        </Title>
        <Button component={Link} to="/me/articles" variant="light" size="sm">
          我的文章
        </Button>
      </Group>

      {user && (
        <Stack gap="xl">
          {/* 用户资料卡片 */}
          <Paper withBorder shadow="md" p="xl" radius="md">
            <Group gap="xl" mb="lg">
              <Avatar
                src={user.avatar}
                size={80}
                radius={40}
                color="blue"
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Text fz="xl" fw={700}>
                  {user.blog_name || user.username}
                </Text>
                <Text c="dimmed" fz="sm">
                  @{user.username}
                </Text>
                <Text c="dimried" fz="xs">
                  {user.email}
                </Text>
              </div>
            </Group>

            {user.bio && (
              <Text c="dimried" fz="sm" mb="md">
                {user.bio}
              </Text>
            )}

            <Group gap="xs">
              {user.roles.map((role) => (
                <span
                  key={role}
                  style={{
                    background: role === 'admin' ? '#228be6' : '#868e96',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {role}
                </span>
              ))}
            </Group>
          </Paper>

          {/* 编辑资料 */}
          <Paper withBorder shadow="md" p="xl" radius="md">
            <Group justify="space-between" mb="lg">
              <Title order={4}>编辑资料</Title>
              {!isEditing && (
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  编辑
                </Button>
              )}
            </Group>

            {saveStatus === 'success' && (
              <Alert color="green" mb="md" withCloseButton onClose={() => setSaveStatus('idle')}>
                {saveMessage}
              </Alert>
            )}

            {saveStatus === 'error' && (
              <Alert color="red" mb="md" withCloseButton onClose={() => setSaveStatus('idle')}>
                {saveMessage}
              </Alert>
            )}

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  label="博客名"
                  placeholder="给你的博客起个名字"
                  {...form.getInputProps('blog_name')}
                  disabled={!isEditing}
                />

                <Textarea
                  label="个人简介"
                  placeholder="介绍一下自己吧"
                  minRows={3}
                  {...form.getInputProps('bio')}
                  disabled={!isEditing}
                />

                <TextInput
                  label="头像 URL"
                  placeholder="https://example.com/avatar.jpg"
                  {...form.getInputProps('avatar')}
                  disabled={!isEditing}
                />

                {isEditing && (
                  <Group justify="flex-end">
                    <Button
                      variant="default"
                      onClick={() => {
                        setIsEditing(false);
                        form.reset();
                      }}
                    >
                      取消
                    </Button>
                    <Button type="submit" loading={isSaving}>
                      保存
                    </Button>
                  </Group>
                )}
              </Stack>
            </form>
          </Paper>

          {/* 修改密码 */}
          <Paper withBorder shadow="md" p="xl" radius="md">
            <Title order={4} mb="lg">
              修改密码
            </Title>

            {passwordStatus === 'success' && (
              <Alert color="green" mb="md" withCloseButton onClose={() => setPasswordStatus('idle')}>
                密码修改成功！请重新登录。
              </Alert>
            )}

            <form onSubmit={passwordForm.onSubmit(handlePasswordChange)}>
              <Stack gap="md">
                <PasswordInput
                  label="当前密码"
                  placeholder="输入当前密码"
                  {...passwordForm.getInputProps('oldPassword')}
                />

                <PasswordInput
                  label="新密码"
                  placeholder="至少 8 位"
                  {...passwordForm.getInputProps('newPassword')}
                />

                <PasswordInput
                  label="确认新密码"
                  placeholder="再次输入新密码"
                  {...passwordForm.getInputProps('confirmPassword')}
                />

                <Group justify="flex-end">
                  <Button type="submit" loading={isChangingPassword} color="red">
                    修改密码
                  </Button>
                </Group>
              </Stack>
            </form>
          </Paper>
        </Stack>
      )}
    </Container>
  );
}
