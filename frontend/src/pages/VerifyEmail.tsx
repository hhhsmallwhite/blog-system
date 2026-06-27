// ===================================================================
// 邮箱验证提示页面
// ===================================================================

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Alert,
  Group,
  ThemeIcon,
  LoadingOverlay,
} from '@mantine/core';
import { IconMail, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiClient } from '../api/api-client';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 邮箱验证提示页面
 *
 * 功能:
 * - 注册后提示用户查收验证邮件
 * - 支持点击链接中的 token 自动验证
 * - 支持重新发送验证邮件
 */
export default function VerifyEmail() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  // ---- 如果 URL 中有 token，自动验证 ----
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      verifyEmail(token);
    }
  }, [location]);

  // ---- 验证邮箱 ----
  const verifyEmail = async (token: string) => {
    setStatus('verifying');
    try {
      await apiClient.post('/auth/verify-email', { token });
      setStatus('success');
      setMessage('邮箱验证成功！您现在可以正常使用所有功能。');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.message || '验证链接无效或已过期');
    }
  };

  // ---- 重新发送验证邮件 ----
  const handleResend = async () => {
    if (!user?.email) return;

    setIsResending(true);
    try {
      await apiClient.post('/auth/resend-verification', { email: user.email });
      setMessage('验证邮件已重新发送，请查收');
    } catch (error: any) {
      setMessage(error.response?.data?.message || '发送失败，请稍后重试');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <LoadingOverlay visible={status === 'verifying'} />

      <Title ta="center" fw={900} fz={28} mb={5}>
        邮箱验证
      </Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md" pos="relative">
        {/* 等待验证状态 */}
        {status === 'pending' && (
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius={40} variant="light" color="blue">
              <IconMail size={40} />
            </ThemeIcon>

            <Text ta="center" fz="lg" fw={500}>
              验证邮件已发送
            </Text>

            <Text c="dimmed" ta="center" fz="sm">
              我们已向您的邮箱发送了一封验证邮件，请查收并点击其中的链接完成验证。
              <br />
              如果您没有收到邮件，请检查垃圾邮件文件夹。
            </Text>

            {isAuthenticated && user?.email && (
              <Button
                variant="light"
                loading={isResending}
                onClick={handleResend}
              >
                重新发送验证邮件
              </Button>
            )}

            <Button component={Link} to="/login" variant="subtle" mt="md">
              返回登录
            </Button>
          </Stack>
        )}

        {/* 验证成功 */}
        {status === 'success' && (
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius={40} variant="light" color="green">
              <IconCheck size={40} />
            </ThemeIcon>

            <Text ta="center" fz="lg" fw={500} c="green">
              验证成功！
            </Text>

            <Text c="dimmed" ta="center" fz="sm">
              {message}
            </Text>

            <Button component={Link} to="/me" mt="md">
              进入个人中心
            </Button>
          </Stack>
        )}

        {/* 验证失败 */}
        {status === 'error' && (
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius={40} variant="light" color="red">
              <IconAlertCircle size={40} />
            </ThemeIcon>

            <Text ta="center" fz="lg" fw={500} c="red">
              验证失败
            </Text>

            <Alert color="red" w="100%">
              {message}
            </Alert>

            <Group>
              {isAuthenticated && user?.email && (
                <Button
                  variant="light"
                  loading={isResending}
                  onClick={handleResend}
                >
                  重新发送验证邮件
                </Button>
              )}
              <Button component={Link} to="/login" variant="subtle">
                返回登录
              </Button>
            </Group>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
