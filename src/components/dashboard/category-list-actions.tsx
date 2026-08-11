"use client";

// src/components/dashboard/category-list-actions.tsx
// 分类列表操作按钮（Client Component）
//
// ==================== 和 PostListActions 的区别 ====================
//
// 1. 删除保护：分类下有文章时禁用删除按钮（postCount > 0）
//    → PostListActions 总是允许删除（因为只能删自己的文章）
//    → 分类删除影响全局，前端先拦截，后端再兜底
//
// 2. 无"发布/取消发布"切换：分类没有状态字段
//    → 文章有 DRAFT/PUBLISHED 状态，分类没有

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { deleteCategoryAction } from "@/actions/category";

interface CategoryListActionsProps {
  categoryId: string;
  categorySlug: string;
  postCount: number; // 该分类下的文章数（用于禁用删除）
}

export function CategoryListActions({
  categoryId,
  categorySlug,
  postCount,
}: CategoryListActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const canDelete = postCount === 0; // 有文章时禁止删除

  const handleDelete = () => {
    if (!canDelete) return; // 前端兜底（后端也有保护）

    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await deleteCategoryAction(categoryId);
      if (!result.success) {
        setError(result.error ?? "删除失败");
        setConfirmDelete(false);
      }
    });
  };

  return (
    <div className="flex items-center gap-1">
      {/* 编辑 */}
      <Link
        href={`/dashboard/categories/${categoryId}/edit`}
        className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800"
        title="编辑"
      >
        <Pencil className="h-4 w-4" />
      </Link>

      {/* 查看分类页 */}
      <Link
        href={`/category/${categorySlug}`}
        className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800"
        title="查看分类页"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>

      {/* 删除（二次确认 + 有文章时禁用） */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending || !canDelete}
        className={`rounded p-1.5 transition-colors disabled:opacity-30 ${
          confirmDelete
            ? "bg-red-100 text-red-600 dark:bg-red-950"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
        }`}
        title={
          !canDelete
            ? `分类下有 ${postCount} 篇文章，无法删除`
            : confirmDelete
              ? "再点一次确认删除"
              : "删除"
        }
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* 错误提示 */}
      {error && (
        <span className="ml-2 text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}
