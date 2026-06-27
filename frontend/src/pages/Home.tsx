// ===================================================================
// 首页 — 文章列表
// ===================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Badge,
  SimpleGrid,
  LoadingOverlay,
  Avatar,
} from '@mantine/core';
import { apiClient } from '../api/api-client';

/**
 * 首页
 *
 * 显示已发布文章列表（卡片布局），展示标题、摘要、标签、作者信息。
 */
export default function Home() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/articles', { params: { status: 'published', pageSize: 12 } })
      .then((res: any) => {
        setArticles(res.data.data.list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">
        博客
      </Title>

      {articles.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          还没有文章，敬请期待...
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {articles.map((article) => (
            <Card
              key={article.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              component={Link}
              to={`/articles/${article.slug}`}
              style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s' }}
              className="article-card"
            >
              {article.coverImage && (
                <Card.Section>
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    style={{ height: 160, width: '100%', objectFit: 'cover' }}
                  />
                </Card.Section>
              )}

              <Group mt="md" mb="xs">
                {article.categoryName && (
                  <Badge variant="light" size="sm">
                    {article.categoryName}
                  </Badge>
                )}
              </Group>

              <Text fw={700} size="lg" lineClamp={2}>
                {article.title}
              </Text>

              {article.summary && (
                <Text size="sm" c="dimmed" mt="xs" lineClamp={3}>
                  {article.summary}
                </Text>
              )}

              <Group mt="md" justify="space-between">
                <Group gap={4}>
                  <Avatar src={article.authorAvatar} size={20} radius="xl">
                    {article.authorName?.charAt(0)}
                  </Avatar>
                  <Text size="xs" c="dimmed">
                    {article.publishedAt
                      ? new Date(article.publishedAt).toLocaleDateString()
                      : ''}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {article.wordCount || 0} 字
                </Text>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
