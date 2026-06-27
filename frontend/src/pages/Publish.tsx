// ===================================================================
// 文章发布页面
// ===================================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Select,
  TagsInput,
  Switch,
  Alert,
  LoadingOverlay,
  Text,
} from '@mantine/core';
import { apiClient } from '../api/api-client';

/**
 * 文章发布页面
 *
 * 路由: /editor/:id/publish
 * 功能: 设置分类、标签、slug、摘要、封面、SEO 信息，然后发布文章
 */
export default function PublishPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // ---- 文章数据 ----
  const [articleTitle, setArticleTitle] = useState('');
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  // ---- 表单 ----
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [allowComment, setAllowComment] = useState(true);

  // ---- 加载数据 ----
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载文章
        const artRes = await apiClient.get(`/articles/${id}`);
        const article = artRes.data.data;
        setArticleTitle(article.title);
        setSlug(article.slug || '');
        setSummary(article.summary || '');
        setCoverImage(article.coverImage || '');
        setMetaTitle(article.metaTitle || '');
        setMetaDescription(article.metaDescription || '');
        setAllowComment(article.allowComment ?? true);
        if (article.category?.id) setCategoryId(String(article.category.id));
        if (article.tags) setTags(article.tags.map((t: any) => t.name));

        // 加载分类
        const catRes = await apiClient.get('/categories');
        const catList = catRes.data.data || [];
        setCategories(
          catList.map((c: any) => ({ value: String(c.id), label: c.name })),
        );

        setLoading(false);
      } catch (err) {
        setError('加载文章数据失败');
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // ---- 更新文章信息 ----
  const handleUpdate = async () => {
    try {
      await apiClient.patch(`/articles/${id}`, {
        categoryId: categoryId ? Number(categoryId) : null,
        tags,
        slug: slug || undefined,
        summary: summary || undefined,
        coverImage: coverImage || undefined,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        allowComment,
      });
    } catch (err) {
      throw err;
    }
  };

  // ---- 发布 ----
  const handlePublish = async () => {
    setPublishing(true);
    setError('');

    try {
      // 先更新文章信息
      await handleUpdate();
      // 再发布
      await apiClient.post(`/articles/${id}/publish`);
      navigate(`/articles/${slug || id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '发布失败');
      setPublishing(false);
    }
  };

  // ---- 保存草稿 ----
  const handleSaveDraft = async () => {
    setPublishing(true);
    setError('');

    try {
      await handleUpdate();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <Container size="sm" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="lg">发布文章</Title>
      <Text c="dimmed" mb="xl">&ldquo;{articleTitle}&rdquo;</Text>

      <Paper withBorder shadow="sm" p="xl">
        <Stack>
          {error && <Alert color="red">{error}</Alert>}

          {/* 分类 */}
          <Select
            label="分类"
            placeholder="选择文章分类"
            data={categories}
            value={categoryId}
            onChange={setCategoryId}
            clearable
            searchable
          />

          {/* 标签 */}
          <TagsInput
            label="标签"
            placeholder="输入标签后回车（最多5个）"
            value={tags}
            onChange={(vals) => setTags(vals.slice(0, 5))}
            maxTags={5}
          />

          {/* 自定义 Slug */}
          <TextInput
            label="自定义 URL Slug"
            placeholder="my-article-slug"
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
          />

          {/* 摘要 */}
          <Textarea
            label="摘要"
            placeholder="文章摘要（300 字以内）"
            value={summary}
            onChange={(e) => setSummary(e.currentTarget.value)}
            maxLength={300}
            rows={3}
          />

          {/* 封面 */}
          <TextInput
            label="封面图片 URL"
            placeholder="https://example.com/cover.jpg"
            value={coverImage}
            onChange={(e) => setCoverImage(e.currentTarget.value)}
          />

          {/* SEO */}
          <TextInput
            label="SEO 标题"
            placeholder="搜索引擎显示的标题"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.currentTarget.value)}
          />

          <Textarea
            label="SEO 描述"
            placeholder="搜索引擎显示的描述（300 字以内）"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.currentTarget.value)}
            maxLength={300}
            rows={2}
          />

          {/* 允许评论 */}
          <Switch
            label="允许评论"
            checked={allowComment}
            onChange={(e) => setAllowComment(e.currentTarget.checked)}
          />

          {/* 操作按钮 */}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => navigate(`/editor/${id}`)}>
              返回编辑
            </Button>
            <Button variant="light" onClick={handleSaveDraft} loading={publishing}>
              保存草稿
            </Button>
            <Button onClick={handlePublish} loading={publishing}>
              发布文章
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
