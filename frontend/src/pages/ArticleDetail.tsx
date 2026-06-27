// ===================================================================
// 文章详情页（读者端）
// ===================================================================

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Prism from 'prismjs';
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Badge,
  Avatar,
  Box,
  LoadingOverlay,
} from '@mantine/core';
import { apiClient } from '../api/api-client';

/**
 * 文章详情页
 *
 * 路由: /articles/:slug
 * 功能: 通过 slug 访问已发布文章，包含阅读进度条、TOC 目录
 */
export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  // ---- 加载文章 ----
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiClient
      .get(`/articles/slug/${slug}`)
      .then((res: any) => {
        setArticle(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        setError('文章不存在或未发布');
        setLoading(false);
      });
  }, [slug]);

  // ---- 代码高亮 ----
  useEffect(() => {
    if (article) Prism.highlightAll();
  }, [article]);

  // ---- 阅读进度 ----
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <Container size={720} py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  if (error || !article) {
    return (
      <Container size={720} py="xl">
        <Paper p="xl" withBorder>
          <Text ta="center" c="dimmed">{error || '文章不存在'}</Text>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      {/* 阅读进度条 */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 3,
          width: `${scrollProgress}%`,
          background: 'var(--mantine-color-blue-6)',
          zIndex: 1000,
          transition: 'width 0.1s linear',
        }}
      />

      <Container size={720} py="xl">
        {/* 文章头部 */}
        <header style={{ marginBottom: '2rem' }}>
          {article.categoryName && (
            <Badge mb="sm" variant="light">
              {article.categoryName}
            </Badge>
          )}

          <Title order={1} mb="md">
            {article.title}
          </Title>

          <Group gap="sm" mb="lg">
            <Avatar src={article.authorAvatar} size={36} radius="xl">
              {article.authorName?.charAt(0)}
            </Avatar>
            <div>
              <Text size="sm" fw={500}>{article.authorName}</Text>
              <Text size="xs" c="dimmed">
                {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}
                {' · '}
                {article.wordCount || 0} 字
                {' · '}
                {Math.max(1, Math.ceil((article.wordCount || 0) / 400))} 分钟阅读
              </Text>
            </div>
          </Group>

          {article.tags && article.tags.length > 0 && (
            <Group gap={4} mb="md">
              {article.tags.map((tag: any) => (
                <Badge key={tag.id} variant="outline" size="sm">
                  {tag.name}
                </Badge>
              ))}
            </Group>
          )}

          {article.coverImage && (
            <img
              src={article.coverImage}
              alt={article.title}
              style={{
                width: '100%',
                maxHeight: 400,
                objectFit: 'cover',
                borderRadius: 12,
                marginTop: '1rem',
              }}
            />
          )}
        </header>

        {/* 文章内容 */}
        <Paper p={0} style={{ fontSize: 16, lineHeight: 1.9 }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <Title order={1} mt="xl" mb="md">{children}</Title>,
              h2: ({ children }) => <Title order={2} mt="xl" mb="md">{children}</Title>,
              h3: ({ children }) => <Title order={3} mt="lg" mb="sm">{children}</Title>,
              p: ({ children }) => <Text mb="md" style={{ lineHeight: 1.9 }}>{children}</Text>,
              img: ({ src, alt }: any) => (
                <img
                  src={src}
                  alt={alt || ''}
                  style={{ maxWidth: '100%', borderRadius: 8, margin: '1rem 0' }}
                />
              ),
              a: ({ href, children }: any) => (
                <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)' }}>
                  {children}
                </a>
              ),
              code({ className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <pre style={{ borderRadius: 8, padding: '1rem', overflow: 'auto', background: '#f5f5f5' }}>
                    <code className={className} {...props}>{children}</code>
                  </pre>
                ) : (
                  <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }} {...props}>
                    {children}
                  </code>
                );
              },
              blockquote: ({ children }: any) => (
                <blockquote style={{ borderLeft: '4px solid var(--mantine-color-blue-4)', paddingLeft: '1rem', margin: '1rem 0', color: 'var(--mantine-color-dimmed)' }}>
                  {children}
                </blockquote>
              ),
            }}
          >
            {article.content}
          </ReactMarkdown>
        </Paper>

        {/* 文章底部 */}
        <footer style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <Group justify="center">
            <Text size="sm" c="dimmed">
              — END —
            </Text>
          </Group>
        </footer>
      </Container>
    </>
  );
}
