// ===================================================================
// 我的文章列表页面
// ===================================================================

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Button,
  Table,
  Badge,
  ActionIcon,
  Group,
  Text,
  LoadingOverlay,
  SegmentedControl,
  Menu,
  Paper,
  Pagination,
  TextInput,
} from '@mantine/core';
import { IconEdit, IconDots, IconTrash, IconEye, IconPlus } from '@tabler/icons-react';
import { apiClient } from '../api/api-client';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 文章状态颜色
 */
const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  published: 'green',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
};

/**
 * 我的文章列表页面
 *
 * 功能:
 * - 显示所有文章（草稿 + 已发布）
 * - 状态筛选
 * - 分页
 * - 操作：编辑 / 删除 / 取消发布
 */
export default function MyArticles() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const pageSize = 10;

  // ---- 加载文章 ----
  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get('/articles', { params });
      setArticles(res.data.data.list);
      setTotal(res.data.data.total);
    } catch (err) {
      console.error('加载文章失败', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // ---- 删除文章 ----
  const handleDelete = async (articleId: number) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      await apiClient.delete(`/articles/${articleId}`);
      loadArticles();
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  // ---- 取消发布 ----
  const handleUnpublish = async (articleId: number) => {
    try {
      await apiClient.post(`/articles/${articleId}/unpublish`);
      loadArticles();
    } catch (err) {
      console.error('取消发布失败', err);
    }
  };

  // ---- 过滤文章 ----
  const filteredArticles = articles.filter((a) => {
    if (!search) return true;
    return a.title.toLowerCase().includes(search.toLowerCase());
  });

  if (!isAuthenticated) {
    return (
      <Container size="lg" py="xl">
        <Text>请先登录</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="lg">
        <Title order={2}>我的文章</Title>
        <Button leftSection={<IconPlus size={16} />} component={Link} to="/editor">
          写文章
        </Button>
      </Group>

      {/* 搜索 + 筛选 */}
      <Paper shadow="xs" p="md" mb="md" withBorder>
        <Group>
          <TextInput
            placeholder="搜索文章..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { label: '全部', value: 'all' },
              { label: '已发布', value: 'published' },
              { label: '草稿', value: 'draft' },
            ]}
          />
        </Group>
      </Paper>

      {/* 文章表格 */}
      <Paper shadow="xs" withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>标题</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>分类</Table.Th>
              <Table.Th>更新于</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredArticles.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  <Text c="dimmed">暂无文章</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredArticles.map((article) => (
                <Table.Tr key={article.id}>
                  <Table.Td>
                    <Text fw={500} lineClamp={1}>
                      {article.title || '未命名文章'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLORS[article.status]}>
                      {STATUS_LABELS[article.status]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {article.categoryName || '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(article.updatedAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon variant="subtle" onClick={() => navigate(`/editor/${article.id}`)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <Menu shadow="md">
                        <Menu.Target>
                          <ActionIcon variant="subtle">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {article.status === 'published' ? (
                            <>
                              <Menu.Item leftSection={<IconEye size={14} />}>
                                查看
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconEdit size={14} />}
                                onClick={() => handleUnpublish(article.id)}
                              >
                                取消发布
                              </Menu.Item>
                            </>
                          ) : (
                            <Menu.Item
                              leftSection={<IconEye size={14} />}
                              onClick={() => navigate(`/editor/${article.id}/publish`)}
                            >
                              发布
                            </Menu.Item>
                          )}
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => handleDelete(article.id)}
                          >
                            删除
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        {total > pageSize && (
          <Group justify="center" p="md">
            <Pagination total={Math.ceil(total / pageSize)} value={page} onChange={setPage} />
          </Group>
        )}
      </Paper>
    </Container>
  );
}
