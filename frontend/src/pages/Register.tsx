// ===================================================================
// 注册页面
// ===================================================================

import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Anchor,
  Stack,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 注册页面
 *
 * 功能:
 * - 邮箱 + 用户名 + 密码注册
 * - 注册成功跳转邮箱验证提示页
 * - 显示表单验证错误
 */
export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  // ---- 表单 ----
  const form = useForm({
    initialValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '邮箱格式不正确'),
      username: (value) =>
        value.length >= 3 && value.length <= 20 ? null : '用户名 3-20 位',
      password: (value) =>
        value.length >= 8 ? null : '密码至少 8 位',
      confirmPassword: (value, values) =>
        value === values.password ? null : '两次密码不一致',
    },
  });

  // ---- 提交 ----
  const handleSubmit = async (values: typeof form.values) => {
    clearError();
    try {
      await register(values.email, values.username, values.password);
      // 注册成功，跳转邮箱验证提示页
      navigate('/verify-email');
    } catch (error) {
      console.error('注册失败', error);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900} fz={28} mb={5}>
        创建账号
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
        已有账号？{' '}
        <Anchor size="sm" component={Link} to="/login">
          立即登录
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

            <TextInput
              required
              label="用户名"
              placeholder="3-20 位字符"
              {...form.getInputProps('username')}
              disabled={isLoading}
            />

            <PasswordInput
              required
              label="密码"
              placeholder="至少 8 位"
              {...form.getInputProps('password')}
              disabled={isLoading}
            />

            <PasswordInput
              required
              label="确认密码"
              placeholder="再次输入密码"
              {...form.getInputProps('confirmPassword')}
              disabled={isLoading}
            />

            <Button type="submit" fullWidth mt="xl" loading={isLoading}>
              注册
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
