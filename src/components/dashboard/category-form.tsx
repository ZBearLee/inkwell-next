"use client";

// src/components/dashboard/category-form.tsx
// 分类表单（Client Component，新建/编辑共用）
//
// ==================== 和 PostEditor 的对比 ====================
//
// 相同点：
//   - slug 自动生成（监听 name 变化）
//   - 受控组件（useState 管理所有字段）
//   - useTransition 处理提交 loading
//   - fieldErrors 展示 Zod 校验错误
//
// 不同点：
//   - 无自动保存（分类只有 3 个字段，手动保存就够）
//   - 无 Markdown 编辑器（只有纯文本）
//   - 无标签选择
//   - 更轻量，不需要拆分多个子组件

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { slugify } from "@/lib/slug";
import { createCategoryAction, updateCategoryAction } from "@/actions/category";
import type { CategoryFieldErrors } from "@/lib/validations/category";

interface CategoryFormProps {
  // 编辑模式传入已有数据；新建模式传 null
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
}

export function CategoryForm({ category }: CategoryFormProps) {
  const router = useRouter();
  const isEditMode = !!category;

  // ---------- 表单状态 ----------
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEditMode);
  const [description, setDescription] = useState(category?.description ?? "");

  // ---------- UI 状态 ----------
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CategoryFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  // ---------- slug 自动生成 ----------
  // 和 PostEditor 一样的逻辑：用户没手动改过 slug 时，跟随 name 变化
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  // ---------- 提交 ----------
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    startTransition(async () => {
      const formData = new FormData();
      if (isEditMode && category) {
        formData.append("id", category.id);
      }
      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("description", description);

      const action = isEditMode ? updateCategoryAction : createCategoryAction;
      const result = await action(formData);

      if (result.success) {
        router.push("/dashboard/categories");
        router.refresh();
      } else {
        setError(result.error ?? "操作失败");
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---------- 顶部操作栏 ---------- */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/categories"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          返回分类列表
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? "保存中..." : isEditMode ? "保存修改" : "创建分类"}
        </button>
      </div>

      {/* ---------- 错误提示 ---------- */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ---------- 表单字段 ---------- */}
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {/* 分类名称 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            分类名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            placeholder="如：前端开发"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
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
              setSlugEdited(true);
            }}
            placeholder="如：frontend"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          {fieldErrors.slug ? (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.slug}</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">
              访问路径：/category/{slug || "your-slug"}
            </p>
          )}
        </div>

        {/* 描述 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="分类描述（可选）..."
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-400">
            {description.length}/200 字符
          </p>
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.description}</p>
          )}
        </div>
      </div>
    </form>
  );
}
