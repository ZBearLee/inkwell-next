"use client";

// src/components/dashboard/post-list-actions.tsx
// 文章列表操作按钮（Client Component）
//
// ==================== 为什么单独抽出来? ====================
//
// 列表页是 Server Component（直接查数据库）
// 但删除/发布切换需要交互（onClick + 确认弹窗）
// → 把交互部分抽成 Client Component，作为 Server Component 的子组件
//
// 这是 RSC 的常见模式：
//   Server Component 查数据 → 传 props 给 Client Component 做交互

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { deletePostAction, togglePostStatusAction } from "@/actions/post";

interface PostListActionsProps {
  postId: string;
  postSlug: string;
  status: "DRAFT" | "PUBLISHED";
}

export function PostListActions({ postId, postSlug, status }: PostListActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // 3 秒后自动取消确认状态
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    startTransition(async () => {
      await deletePostAction(postId);
    });
  };

  const handleToggleStatus = () => {
    startTransition(async () => {
      await togglePostStatusAction(postId);
    });
  };

  return (
    <div className="flex items-center gap-1">
      {/* 编辑 */}
      <Link
        href={`/dashboard/posts/${postId}/edit`}
        className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800"
        title="编辑"
      >
        <Pencil className="h-4 w-4" />
      </Link>

      {/* 发布/取消发布切换 */}
      <button
        type="button"
        onClick={handleToggleStatus}
        disabled={isPending}
        className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-green-600 disabled:opacity-50 dark:hover:bg-zinc-800"
        title={status === "PUBLISHED" ? "取消发布" : "发布"}
      >
        {status === "PUBLISHED" ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>

      {/* 查看公开页面（仅已发布）*/}
      {status === "PUBLISHED" && (
        <Link
          href={`/posts/${postSlug}`}
          className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800"
          title="查看文章"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      )}

      {/* 删除（二次确认）*/}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className={`rounded p-1.5 transition-colors disabled:opacity-50 ${
          confirmDelete
            ? "bg-red-100 text-red-600 dark:bg-red-950"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
        }`}
        title={confirmDelete ? "再点一次确认删除" : "删除"}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
