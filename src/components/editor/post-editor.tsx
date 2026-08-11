"use client";

// src/components/editor/post-editor.tsx
// 文章编辑器主组件（元信息表单 + Markdown 编辑器 + 自动保存）
//
// ==================== 组件结构 ====================
//
// PostEditor (Client Component)
// ├── 元信息表单（标题、slug、分类、标签、封面、摘要）
// ├── MarkdownEditor（输入 + 预览双栏）
// ├── 状态栏（自动保存提示 + 字数统计）
// └── 操作按钮（保存草稿 / 发布）
//
// ==================== 自动保存机制 ====================
//
// 1. 监听 title/content/excerpt 变化
// 2. debounce 5 秒后触发 autoSavePostAction
// 3. 只在"已有 postId"（编辑模式）时自动保存
// 4. 新建模式不自动保存（还没入库，没有 id）
// 5. 手动保存/发布时不触发自动保存（避免冲突）
//
// ==================== 状态管理 ====================
//
// 所有字段用 useState 管理（受控组件）
// 因为：
//   1. 自动保存需要读当前值
//   2. slug 自动生成需要监听 title 变化
//   3. 表单校验需要实时访问所有字段

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Send, ArrowLeft, CheckCircle } from "lucide-react";
import { MarkdownEditor } from "./markdown-editor";
import { generateSlug } from "@/lib/slug";
import {
  createPostAction,
  updatePostAction,
  autoSavePostAction,
} from "@/actions/post";
import type { FieldErrors } from "@/lib/validations/post";

// ==================== Props 类型 ====================
interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface TagOption {
  id: string;
  name: string;
  slug: string;
}

interface PostEditorProps {
  // 编辑模式时传入已有文章数据；新建模式传 null
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    coverImage: string | null;
    status: string;
    categoryId: string;
    tags: { tag: { id: string; name: string; slug: string } }[];
  } | null;
  categories: CategoryOption[];
  tags: TagOption[];
}

// ==================== 组件实现 ====================
export function PostEditor({ post, categories, tags }: PostEditorProps) {
  const router = useRouter();
  const isEditMode = !!post; // 是否编辑模式

  // ---------- 表单状态 ----------
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEditMode); // 用户是否手动编辑过 slug
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    post?.tags.map((t) => t.tag.id) ?? [],
  );
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    (post?.status as "DRAFT" | "PUBLISHED") ?? "DRAFT",
  );

  // ---------- UI 状态 ----------
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>(""); // "已保存于 14:30"

  // ---------- 自动保存相关 ----------
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({ title, content, excerpt });

  // ==================== slug 自动生成 ====================
  // 标题变化时，如果用户没手动编辑过 slug，自动生成
  useEffect(() => {
    if (!slugEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugEdited]);

  // ==================== 自动保存（debounce 5 秒）====================
  useEffect(() => {
    // 只在编辑模式自动保存（新建模式没有 postId）
    if (!isEditMode || !post) return;

    // 检查内容是否有变化
    const hasChanges =
      title !== lastSavedRef.current.title ||
      content !== lastSavedRef.current.content ||
      excerpt !== lastSavedRef.current.excerpt;

    if (!hasChanges) return;

    // 清除上一次的定时器（debounce 效果）
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 5 秒后自动保存
    autoSaveTimerRef.current = setTimeout(async () => {
      const result = await autoSavePostAction(post.id, {
        title,
        content,
        excerpt,
      });

      if (result.success && result.savedAt) {
        setAutoSaveStatus(`已自动保存于 ${result.savedAt}`);
        lastSavedRef.current = { title, content, excerpt };
      } else {
        setAutoSaveStatus("自动保存失败");
      }
    }, 5000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, excerpt, isEditMode, post]);

  // ==================== 标签切换 ====================
  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      if (prev.length >= 5) {
        setError("最多选择 5 个标签");
        return prev;
      }
      return [...prev, tagId];
    });
  };

  // ==================== 构建 FormData ====================
  const buildFormData = (submitStatus: "DRAFT" | "PUBLISHED"): FormData => {
    const formData = new FormData();
    if (isEditMode && post) {
      formData.append("id", post.id);
    }
    formData.append("title", title);
    formData.append("slug", slug);
    formData.append("excerpt", excerpt);
    formData.append("content", content);
    formData.append("coverImage", coverImage);
    formData.append("categoryId", categoryId);
    // tags 是多值字段
    selectedTags.forEach((tagId) => formData.append("tags", tagId));
    formData.append("status", submitStatus);
    return formData;
  };

  // ==================== 保存草稿 ====================
  const handleSaveDraft = () => {
    setError("");
    setFieldErrors({});
    setStatus("DRAFT");

    startTransition(async () => {
      const formData = buildFormData("DRAFT");
      const action = isEditMode ? updatePostAction : createPostAction;
      const result = await action(formData);

      if (result.success) {
        if (!isEditMode && result.postId) {
          // 新建成功后跳转到编辑页（之后可以自动保存）
          router.push(`/dashboard/posts/${result.postId}/edit`);
        } else {
          setAutoSaveStatus("草稿已保存");
        }
      } else {
        setError(result.error ?? "保存失败");
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  };

  // ==================== 发布 ====================
  const handlePublish = () => {
    setError("");
    setFieldErrors({});

    // 前端基础校验（Server Action 会做权威校验）
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }
    if (!categoryId) {
      setError("请选择分类");
      return;
    }

    startTransition(async () => {
      const formData = buildFormData("PUBLISHED");
      const action = isEditMode ? updatePostAction : createPostAction;
      const result = await action(formData);

      if (result.success) {
        // 发布成功后跳转到文章列表
        router.push("/dashboard/posts");
      } else {
        setError(result.error ?? "发布失败");
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  };

  // ==================== 渲染 ====================
  return (
    <div className="space-y-6">
      {/* ---------- 顶部操作栏 ---------- */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/posts"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>

        <div className="flex items-center gap-3">
          {/* 自动保存状态 */}
          {autoSaveStatus && (
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <CheckCircle className="h-3 w-3" />
              {autoSaveStatus}
            </span>
          )}

          {/* 保存草稿 */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Save className="h-4 w-4" />
            保存草稿
          </button>

          {/* 发布 */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {status === "PUBLISHED" ? "更新文章" : "发布文章"}
          </button>
        </div>
      </div>

      {/* ---------- 错误提示 ---------- */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ---------- 元信息表单 ---------- */}
      <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-2">
        {/* 标题 */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="文章标题..."
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            URL Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true); // 用户手动编辑了 slug
            }}
            placeholder="url-friendly-slug"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          {fieldErrors.slug ? (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.slug}</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">
              访问路径：/posts/{slug || "your-slug"}
            </p>
          )}
        </div>

        {/* 分类 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            分类 <span className="text-red-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">请选择分类...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.categoryId}</p>
          )}
        </div>

        {/* 封面图 URL */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            封面图 URL
          </label>
          <input
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://example.com/cover.jpg"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        {/* 摘要 */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            摘要 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="文章摘要（显示在列表卡片上）..."
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-400">
            {excerpt.length}/500 字符
          </p>
          {fieldErrors.excerpt && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.excerpt}</p>
          )}
        </div>

        {/* 标签 */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            标签（最多 5 个）
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- Markdown 编辑器 ---------- */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          正文内容 <span className="text-red-500">*</span>
        </label>
        <MarkdownEditor value={content} onChange={setContent} />
        {fieldErrors.content && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.content}</p>
        )}
      </div>
    </div>
  );
}
