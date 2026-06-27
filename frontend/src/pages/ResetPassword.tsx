// ===================================================================
// 重置密码页面
// ===================================================================

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  Text,
  PasswordInput,
  Button,
  Alert,
  Stack,
  Box,
  LoadingOverlay,
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { apiClient } from '../api/api-client';

/**
 * 重置密码页面
 *
 * 功能:
 * - 从 URL 中提取 token (?token=xxx)
 * - 提交新密码
 * - 重置成功后提示跳转登录
 */
export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // ---- 从 URL 提取 token ----
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
    } else {
      setStatus('error');
      setMessage('重置链接无效，缺少 Token');
    }
  }, [location]);

  // ---- 表单 ----
  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) => (value.length >= 8 ? null : '密码至少 8 位'),
      confirmPassword: (value, values) =>
        value === values.password ? null : '两次密码不一致',
    },
  });

  // ---- 提交 ----
  const handleSubmit = async (values: typeof form.values) => {
    if (!token) return;

    setStatus('submitting');
    setMessage('');

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: values.password,
      });
      setStatus('success');
      setMessage('密码重置成功！您现在可以使用新密码登录。');
      // 3 秒后自动跳转到登录页
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.message || '重置失败，链接可能已过期');
    }
  };

  return (
    <Container size={420} my={40}>
      <LoadingOverlay visible={status === 'submitting'} />

      <Title ta="center" fw={900} fz={28} mb={5}>
        重置密码
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
        记得密码？{' '}
        <Link to="/login" className="anchor">
          立即登录
        </Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md" pos="relative">
        {/* 错误状态：无 token 或重置失败 */}
        {(status === 'error' || (status === 'idle' && !token)) && (
          <Stack align="center" gap="md">
            <Box c="red">
              <IconAlertCircle size={80} stroke={1.5} />
            </Box>

            <Text ta="center" fz="lg" fw={500} c="red">
              链接无效
            </Text>

            <Alert color="red" w="100%">
              {message || '重置链接无效或已过期，请重新发起密码重置。'}
            </Alert>

            <Button component={Link} to="/forgot-password" variant="light" mt="md">
              重新发送重置邮件
            </Button>
          </Stack>
        )}

        {/* 空闲状态：显示表单 */}
        {status === 'idle' && token && (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <PasswordInput
                required
                label="新密码"
                placeholder="至少 8 位"
                {...form.getInputProps('password')}
              />

              <PasswordInput
                required
                label="确认新密码"
                placeholder="再次输入新密码"
                {...form.getInputProps('confirmPassword')}
              />

              <Button type="submit" fullWidth mt="xl" loading={status === 'submitting'}>
                重置密码
              </Button>
            </Stack>
          </form>
        )}

        {/* 成功状态 */}
        {status === 'success' && (
          <Stack align="center" gap="md">
            <Box c="green">
              <IconCheck size={80} stroke={1.5} />
            </Box>

            <Text ta="center" fz="lg" fw={500} c="green">
              重置成功！
            </Text>

            <Text c="dimmed" ta="center" fz="sm">
              {message}
            </Text>

            <Button component={Link} to="/login" mt="md">
              前往登录
            </Button>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
