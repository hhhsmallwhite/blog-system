// ===================================================================
// MarkdownEditor — 核心编辑器组件
// ===================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Prism from 'prismjs';

// Prism.js 语言（按需加载）
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';

import {
  Box,
  Textarea,
  Button,
  Group,
  Paper,
  Text,
  Tooltip,
  ActionIcon,
  LoadingOverlay,
  SegmentedControl,
} from '@mantine/core';
import {
  IconBold,
  IconItalic,
  IconLink,
  IconCode,
  IconList,
  IconBlockquote,
  IconHeading,
  IconPhoto,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { apiClient } from '../../api/api-client';

/**
 * MarkdownEditor — 左右分栏 Markdown 编辑器
 *
 * 特性:
 * - 桌面端：左编辑/右预览分栏
 * - 平板端：Tab 切换（编辑/预览）
 * - 手机端：纯源码模式
 * - 工具栏：加粗/斜体/链接/代码/列表/引用/标题/图片
 * - 拖拽上传图片
 * - 字数统计 + 阅读时间
 * - 自动保存（30 秒）
 */

interface MarkdownEditorProps {
  /** 初始内容 */
  initialContent?: string;
  /** 初始标题 */
  initialTitle?: string;
  /** 文章 ID（有则更新，无则新建） */
  articleId?: number;
  /** 保存回调 */
  onSave?: (data: { title: string; content: string }) => void;
}

type ViewMode = 'split' | 'edit' | 'preview';

export default function MarkdownEditor({
  initialContent = '',
  initialTitle = '',
  articleId,
  onSave,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  // title 来自 props，不需要本地状态
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ---- 字数统计 ----
  const wordCount = content.replace(/\s/g, '').length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 400)); // 400 字/分钟

  // ---- 代码高亮 ----
  useEffect(() => {
    Prism.highlightAll();
  }, [content, viewMode]);

  // ---- 自动保存（30 秒） ----
  useEffect(() => {
    if (!initialTitle && !content) return;

    const timer = setTimeout(() => {
      handleAutosave();
    }, 30000);

    return () => clearTimeout(timer);
  }, [initialTitle, content]);

  // ---- 工具栏操作 ----
  const insertMarkdown = useCallback((syntax: string, placeholder = 'text') => {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;
    const newText =
      content.substring(0, start) +
      syntax.replace('$1', selectedText) +
      content.substring(end);

    setContent(newText);

    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + syntax.indexOf('$1');
      textarea.setSelectionRange(cursorPos, cursorPos + selectedText.length);
    }, 0);
  }, [content]);

  const toolbarActions = [
    { icon: IconBold, label: '加粗', action: () => insertMarkdown('**$1**', '加粗文字') },
    { icon: IconItalic, label: '斜体', action: () => insertMarkdown('_$1_', '斜体文字') },
    { icon: IconHeading, label: '标题', action: () => insertMarkdown('\n## $1\n', '标题') },
    { icon: IconLink, label: '链接', action: () => insertMarkdown('[$1](url)', '链接文字') },
    { icon: IconCode, label: '代码块', action: () => insertMarkdown('\n```\n$1\n```\n', '代码') },
    { icon: IconList, label: '无序列表', action: () => insertMarkdown('- $1', '列表项') },
    { icon: IconBlockquote, label: '引用', action: () => insertMarkdown('> $1', '引用文字') },
  ];

  // ---- 拖拽上传图片 ----
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = response.data.url;
        insertMarkdown(`![${file.name}](${url})`, file.name);
      }
    } catch (err) {
      console.error('图片上传失败', err);
    } finally {
      setIsUploading(false);
    }
  }, [insertMarkdown]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // ---- 图片点击上传 ----
  const handleImageUpload = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files) return;
      setIsUploading(true);
      try {
        for (const file of Array.from(input.files)) {
          const formData = new FormData();
          formData.append('file', file);
          const response = await apiClient.post('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const url = response.data.url;
          insertMarkdown(`![${file.name}](${url})`, file.name);
        }
      } catch (err) {
        console.error('图片上传失败', err);
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  }, [insertMarkdown]);

  // ---- 自动保存 ----
  const handleAutosave = useCallback(async () => {
    if (!initialTitle && !content) return;
    try {
      await apiClient.post('/articles/autosave', {
        title: initialTitle || '未命名文章',
        content,
        articleId,
      });
      onSave?.({ title: initialTitle || '未命名文章', content });
    } catch (err) {
      console.error('自动保存失败', err);
    }
  }, [initialTitle, content, articleId, onSave]);

  // ---- 手动保存 ----
  const handleManualSave = useCallback(async () => {
    setSaving(true);
    try {
      await handleAutosave();
    } finally {
      setSaving(false);
    }
  }, [handleAutosave]);

  // ---- 渲染编辑器 ----
  const renderEditor = () => (
    <Textarea
      className="editor-textarea"
      value={content}
      onChange={(e) => setContent(e.currentTarget.value)}
      placeholder="开始写作...（支持 Markdown 语法）"
      minRows={20}
      autosize
      styles={{
        input: {
          fontFamily: '"Fira Code", "Consolas", monospace',
          fontSize: 14,
          lineHeight: 1.8,
          minHeight: '60vh',
          border: 'none',
          resize: 'none',
        },
      }}
    />
  );

  // ---- 渲染预览 ----
  const renderPreview = () => (
    <Box
      className="markdown-preview"
      style={{
        padding: '1rem',
        minHeight: '60vh',
        overflowY: 'auto',
        fontSize: 15,
        lineHeight: 1.8,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const inline = !match;
            return !inline ? (
              <pre style={{ borderRadius: 8, padding: '1rem', overflow: 'auto' }}>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }} {...props}>
                {children}
              </code>
            );
          },
          img({ src, alt }: any) {
            return (
              <img
                src={src}
                alt={alt || ''}
                style={{ maxWidth: '100%', borderRadius: 8, margin: '1rem 0' }}
              />
            );
          },
        }}
      >
        {content || '*暂无内容，在左侧开始写作...*'}
      </ReactMarkdown>
    </Box>
  );

  return (
    <Box style={{ position: 'relative' }}>
      <LoadingOverlay visible={isUploading || saving} />

      {/* ---- 工具栏 ---- */}
      <Paper shadow="xs" p="xs" mb="sm" withBorder>
        <Group justify="space-between">
          <Group gap={4}>
            {toolbarActions.map(({ icon: Icon, label, action }) => (
              <Tooltip key={label} label={label}>
                <ActionIcon variant="subtle" size="lg" onClick={action}>
                  <Icon size={18} />
                </ActionIcon>
              </Tooltip>
            ))}
            <Tooltip label="插入图片">
              <ActionIcon variant="subtle" size="lg" onClick={handleImageUpload}>
                <IconPhoto size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Group gap="xs">
            {/* 视图切换 */}
            <SegmentedControl
              size="xs"
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              data={[
                { label: '分栏', value: 'split' },
                { label: '编辑', value: 'edit' },
                { label: '预览', value: 'preview' },
              ]}
            />

            <Tooltip label="手动保存">
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDeviceFloppy size={14} />}
                onClick={handleManualSave}
                loading={saving}
              >
                保存
              </Button>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* ---- 编辑区域 ---- */}
      <Paper
        ref={dropZoneRef}
        shadow="xs"
        withBorder
        style={{ overflow: 'hidden' }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {viewMode === 'split' ? (
          <Box style={{ display: 'flex', minHeight: '60vh' }}>
            <Box style={{ flex: 1, borderRight: '1px solid #eee' }}>
              {renderEditor()}
            </Box>
            <Box style={{ flex: 1, background: '#fafafa' }}>
              {renderPreview()}
            </Box>
          </Box>
        ) : viewMode === 'edit' ? (
          renderEditor()
        ) : (
          renderPreview()
        )}
      </Paper>

      {/* ---- 状态栏 ---- */}
      <Paper shadow="xs" p="xs" mt="sm" withBorder>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            字数: {wordCount} | 阅读时间: ~{readingTime} 分钟
          </Text>
          <Text size="xs" c="dimmed">
            每 30 秒自动保存
          </Text>
        </Group>
      </Paper>
    </Box>
  );
}
