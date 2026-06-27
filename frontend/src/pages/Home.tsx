// ===================================================================
// 首页 — S0 占位页
// ===================================================================

import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';

/**
 * S0 首页占位组件
 *
 * 展示项目名称和 Sprint 0 状态。
 * S5 替换为完整的文章列表页。
 */
export default function Home(): React.ReactElement {
  const theme = useTheme();

  return (
    <Container maxWidth="sm">
      <Stack spacing={4} alignItems="center" sx={{ py: { xs: 4, md: 8 } }}>
        {/* Logo / 标题 */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              background:
                theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)'
                  : 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            博客系统
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={400}>
            面向个人创作者的轻量级博客平台
          </Typography>
        </Box>

        {/* Sprint 0 状态 */}
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            width: '100%',
          }}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            当前阶段
          </Typography>
          <Typography
            variant="body1"
            fontWeight={600}
            sx={{ color: theme.palette.success.main }}
          >
            Sprint 0 — 基础设施搭建 ✅
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            NestJS / React / Prisma / Docker 骨架已就绪，后续 Sprint 可开始业务开发。
          </Typography>
        </Box>

        {/* 技术栈 */}
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Typography variant="overline" color="text.secondary">
            技术栈
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 1 }}
          >
            {[
              'React 18',
              'NestJS',
              'TypeScript',
              'Prisma',
              'PostgreSQL',
              'Redis',
              'RabbitMQ',
              'MUI',
              'Tailwind',
              'Docker',
            ].map((tech) => (
              <Box
                key={tech}
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  backgroundColor: theme.palette.primary.main + '14',
                  color: theme.palette.primary.main,
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                {tech}
              </Box>
            ))}
          </Stack>
        </Box>

        {/* 快速链接 */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            href="http://localhost:3000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            API 文档
          </Button>
          <Button
            variant="outlined"
            href="http://localhost:3000/api/v1/health"
            target="_blank"
            rel="noopener noreferrer"
          >
            健康检查
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
