// ===================================================================
// 忘记密码页面
// ===================================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  LoadingOverlay,
  Box,
} from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { apiClient } from '../api/api-client';

/**
 * 忘记密码页面
 *
 * 功能:
 * - 输入注册邮箱
 * - 提交后发送密码重置邮件
 * - 安全设计：无论邮箱是否存在都显示成功
 */
export default function ForgotPassword() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // ---- 表单 ----
  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '邮箱格式不正确'),
    },
  });

  // ---- 提交 ----
  const handleSubmit = async (values: typeof form.values) => {
    setStatus('loading');
    setMessage('');

    try {
      await apiClient.post('/auth/forgot-password', { email: values.email });
      // 安全设计：无论是否成功，都显示成功（防止邮箱枚举）
      setStatus('success');
      setMessage(`如果该邮箱已注册且状态正常，我们已经发送了密码重置邮件到 ${values.email}，请查收。`);
    } catch (error: any) {
      // 即使 API 失败，也显示成功（安全设计）
      setStatus('success');
      setMessage(`如果该邮箱已注册且状态正常，我们已经发送了密码重置邮件到 ${values.email}，请查收。`);
    }
  };

  return (
    <Container size={420} my={40}>
      <LoadingOverlay visible={status === 'loading'} />

      <Title ta="center" fw={900} fz={28} mb={5}>
        忘记密码
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
        记得密码？{' '}
        <Link to="/login" className="anchor">
          立即登录
        </Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md" pos="relative">
        {/* 空闲状态：显示表单 */}
        {status === 'idle' && (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <Text size="sm" c="dimmed">
                请输入您注册时使用的邮箱地址，我们将向该邮箱发送密码重置链接。
              </Text>

              <TextInput
                required
                label="邮箱"
                placeholder="your@email.com"
                {...form.getInputProps('email')}
                disabled={status === 'loading'}
              />

              <Button type="submit" fullWidth mt="xl" loading={status === 'loading'}>
                发送重置邮件
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
              邮件已发送
            </Text>

            <Text c="dimmed" ta="center" fz="sm">
              {message}
            </Text>

            <Text c="dimmed" ta="center" fz="xs" mt="md">
              如果没有收到邮件，请检查垃圾邮件文件夹。
            </Text>

            <Button component={Link} to="/login" variant="light" mt="md">
              返回登录
            </Button>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
