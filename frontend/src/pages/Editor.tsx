// ===================================================================
// 编辑器页面
// ===================================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  TextInput,
  Paper,
  Group,
  Button,
  LoadingOverlay,
} from '@mantine/core';
import MarkdownEditor from '../components/editor/MarkdownEditor';
import { apiClient } from '../api/api-client';

/**
 * 编辑器页面
 *
 * 路由:
 * - /editor     → 新建文章
 * - /editor/:id → 编辑已有文章
 */
export default function EditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [initialTitle, setInitialTitle] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedArticleId, setSavedArticleId] = useState<number | undefined>(id ? Number(id) : undefined);

  // 如果是编辑模式，加载文章数据
  useEffect(() => {
    if (id) {
      setLoading(true);
      apiClient
        .get(`/articles/${id}`)
        .then((res: any) => {
          const article = res.data.data;
          setInitialTitle(article.title);
          setInitialContent(article.content);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [id]);

  const handleSave = (data: { title: string; content: string }) => {
    if (!savedArticleId) {
      // 如果是新建文章，需要获取 autosave 返回的 ID
      apiClient
        .post('/articles/autosave', { title: data.title, content: data.content })
        .then((res: any) => {
          const newId = res.data.data.id;
          setSavedArticleId(newId);
          // 更新 URL（不刷新页面）
          window.history.replaceState(null, '', `/editor/${newId}`);
        });
    }
  };

  const handlePublish = async () => {
    if (!savedArticleId) {
      // 先保存
      await apiClient.post('/articles/autosave', { title: initialTitle || '未命名', content: initialContent });
    }
    navigate(`/editor/${savedArticleId}/publish`);
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  return (
    <Container size="lg" py="md">
      {/* 顶部栏：标题 + 操作按钮 */}
      <Paper shadow="xs" p="md" mb="md" withBorder>
        <Group justify="space-between" align="flex-end">
          <TextInput
            placeholder="输入文章标题..."
            value={initialTitle}
            onChange={(e) => setInitialTitle(e.currentTarget.value)}
            variant="unstyled"
            size="xl"
            fw={700}
            style={{ flex: 1 }}
            styles={{
              input: {
                fontSize: 24,
                fontWeight: 700,
                padding: 0,
              },
            }}
          />
          <Group>
            <Button variant="default" onClick={() => navigate('/')}>
              返回
            </Button>
            <Button variant="light" onClick={handlePublish}>
              发布
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Markdown 编辑器 */}
      <MarkdownEditor
        initialContent={initialContent}
        initialTitle={initialTitle}
        articleId={savedArticleId}
        onSave={handleSave}
      />
    </Container>
  );
}
