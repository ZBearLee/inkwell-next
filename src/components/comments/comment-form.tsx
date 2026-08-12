"use client";

// src/components/comments/comment-form.tsx
// 评论表单（Client Component）
//
// ==================== 为什么是 Client Component? ====================
//
// 需要：
// 1. useState：管理输入内容、loading 状态、错误提示
// 2. 事件处理：onChange、onSubmit
// 3. 调用 Server Action：createCommentAction
//
// ==================== useTransition 的作用 ====================
//
// 评论提交是"非紧急更新"：
// - 用户可以继续操作页面，不被阻塞
// - isPending 状态显示 loading
// - 提交完成后表单清空
//
// ==================== 回复模式 ====================
//
// 本组件复用于两种场景：
// 1. 顶级评论：parentId 为 undefined
// 2. 回复评论：parentId 传入父评论 id，UI 更紧凑

import { useState, useTransition, useRef, useEffect } from "react";
import { createCommentAction } from "@/actions/comment";

interface CommentFormProps {
  postId: string;
  postSlug: string;
  parentId?: string;
  isReply?: boolean;        // 是否回复模式（UI 更紧凑）
  onSubmitted?: () => void; // 回复模式提交后回调（关闭回复框）
  autoFocus?: boolean;      // 是否自动聚焦
}

export function CommentForm({
  postId,
  postSlug,
  parentId,
  isReply = false,
  onSubmitted,
  autoFocus = false,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 回复模式自动聚焦
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isPending) return;

    setError("");

    startTransition(async () => {
      // authorId 不再传：Server Action 内部从 session 取
      const result = await createCommentAction(
        postId,
        postSlug,
        content,
        parentId,
      );

      if (result.success) {
        setContent("");        // 清空输入
        onSubmitted?.();        // 回调（关闭回复框）
      } else {
        setError(result.error ?? "评论失败");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className={isReply ? "" : "space-y-3"}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isReply ? "写下你的回复..." : "写下你的评论..."}
        rows={isReply ? 2 : 4}
        disabled={isPending}
        className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 disabled:opacity-50"
        maxLength={2000}
      />

      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          {content.length}/2000
        </span>
        <div className="flex gap-2">
          {/* 回复模式有取消按钮 */}
          {isReply && (
            <button
              type="button"
              onClick={onSubmitted}
              disabled={isPending}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || isPending}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "提交中..." : isReply ? "回复" : "发表评论"}
          </button>
        </div>
      </div>
    </form>
  );
}
