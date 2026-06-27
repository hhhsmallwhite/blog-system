// ===================================================================
// 登录页面
// ===================================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Alert,
  Anchor,
  Group,
  Stack,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 登录页面
 *
 * 功能:
 * - 邮箱 + 密码登录
 * - 记住我（延长 Refresh Token 有效期到 30 天）
 * - 登录失败显示错误信息
 * - 登录成功跳转首页或个人中心
 */
export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [rememberMe, setRememberMe] = useState(false);

  // ---- 表单 ----
  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '邮箱格式不正确'),
      password: (value) => (value.length >= 8 ? null : '密码至少 8 位'),
    },
  });

  // ---- 提交 ----
  const handleSubmit = async (values: typeof form.values) => {
    clearError();
    try {
      await login(values.email, values.password, rememberMe);
      // 登录成功，跳转到个人中心
      navigate('/me');
    } catch (error) {
      // 错误已经在 store 中设置，这里不需要额外处理
      console.error('登录失败', error);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900} fz={28} mb={5}>
        欢迎回来
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
        还没有账号？{' '}
        <Anchor size="sm" component={Link} to="/register">
          立即注册
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {/* 错误提示 */}
        {error && (
          <Alert color="red" mb="md" onClose={clearError} withCloseButton>
            {error}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              required
              label="邮箱"
              placeholder="your@email.com"
              {...form.getInputProps('email')}
              disabled={isLoading}
            />

            <PasswordInput
              required
              label="密码"
              placeholder="至少 8 位"
              {...form.getInputProps('password')}
              disabled={isLoading}
            />

            <Group justify="space-between" mt="xs">
              <Checkbox
                label="记住我"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.currentTarget.checked)}
                disabled={isLoading}
              />
              <Anchor size="sm" component={Link} to="/forgot-password">
                忘记密码？
              </Anchor>
            </Group>

            <Button type="submit" fullWidth mt="xl" loading={isLoading}>
              登录
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
