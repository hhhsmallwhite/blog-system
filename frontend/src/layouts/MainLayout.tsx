// ===================================================================
// 主布局 — 响应式 Header + Content + Light/Dark 切换
// ===================================================================

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';

import { useThemeStore } from '../store/useThemeStore';

/**
 * 图标映射 — 主题模式 → MUI 图标
 */
const THEME_ICONS: Record<string, React.ReactElement> = {
  light: <LightModeIcon />,
  dark: <DarkModeIcon />,
  system: <SettingsBrightnessIcon />,
};

/**
 * 标签映射 — 主题模式 → 中文描述
 */
const THEME_LABELS: Record<string, string> = {
  light: '亮色模式',
  dark: '暗色模式',
  system: '跟随系统',
};

/**
 * 主布局组件
 *
 * 包含:
 * - 顶部导航栏 (AppBar): 博客名称 + 主题切换按钮
 * - 内容区域 (Container): Outlet 渲染子路由
 *
 * 响应式设计: Container maxWidth 自适应断点
 */
export default function MainLayout(): React.ReactElement {
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode, toggleMode } = useThemeStore();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ---- 顶部导航栏 ---- */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor:
            theme.palette.mode === 'light'
              ? 'rgba(255,255,255,0.8)'
              : 'rgba(15,23,42,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
          {/* 博客名称 — 点击返回首页 */}
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              cursor: 'pointer',
              color: theme.palette.text.primary,
            }}
            onClick={() => navigate('/')}
          >
            博客系统
          </Typography>

          {/* 主题切换按钮 */}
          <IconButton
            onClick={toggleMode}
            size="small"
            aria-label={`切换主题: 当前为 ${THEME_LABELS[mode]}`}
            title={THEME_LABELS[mode]}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': { color: theme.palette.primary.main },
            }}
          >
            {THEME_ICONS[mode]}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* ---- 内容区域 ---- */}
      <Container
        component="main"
        maxWidth="lg"
        sx={{
          flexGrow: 1,
          py: 4,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Outlet />
      </Container>

      {/* ---- 页脚 ---- */}
      <Box
        component="footer"
        sx={{
          py: 3,
          textAlign: 'center',
          color: theme.palette.text.secondary,
          fontSize: '0.875rem',
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="body2">
          &copy; {new Date().getFullYear()} 博客系统 · 让创作更简单
        </Typography>
      </Box>
    </Box>
  );
}
