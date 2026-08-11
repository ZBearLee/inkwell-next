"use client";

// src/components/comments/comment-item.tsx
// 评论项组件（Client Component）
//
// ==================== 为什么是 Client Component? ====================
//
// 需要：
// 1. useState：管理回复框开关、删除确认
// 2. useTransition：删除操作的非紧急更新
// 3. 事件处理：点击"回复"、"删除"
// 4. 调用 Server Action：deleteCommentAction
//
// ==================== 楼中楼回复的层级控制 ====================
//
// 本项目限制最多 2 级评论：
// - 顶级评论（parentId = null）
// - 子评论（parentId = 顶级评论 id）
//
// 子评论不能再被回复（避免无限嵌套导致 UI 复杂）
// 通过 isReplyLevel 参数控制是否显示"回复"按钮

import { useState, useTransition } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { CommentForm } from "./comment-form";
import { deleteCommentAction } from "@/actions/comment";
import type { CommentWithRelations } from "@/lib/post";
import { formatDate } from "@/lib/utils";

interface CommentItemProps {
  comment: CommentWithRelations;
  postId: string;
  postSlug: string;
  currentUserId?: string;      // 当前登录用户 id（未登录则 undefined）
  isAdmin?: boolean;           // 是否管理员
  isReplyLevel?: boolean;      // 是否是子评论层级（控制是否显示"回复"按钮）
}

export function CommentItem({
  comment,
  postId,
  postSlug,
  currentUserId,
  isAdmin = false,
  isReplyLevel = false,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 是否能删除：本人或管理员
  const canDelete = currentUserId && (comment.author.id === currentUserId || isAdmin);
  // 是否能回复：登录 + 顶级评论（子评论不能再回复，避免无限嵌套）
  const canReply = currentUserId && !isReplyLevel;

  const handleDelete = () => {
    if (!confirm("确认删除这条评论？删除后不可恢复。")) return;

    startTransition(async () => {
      await deleteCommentAction(comment.id, postSlug, currentUserId!, isAdmin);
    });
  };

  return (
    <div className={isReplyLevel ? "ml-12" : ""}>
      <div className="flex gap-3">
        {/* 头像 */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          {comment.author.name?.[0]?.toUpperCase() ?? comment.author.username[0]?.toUpperCase() ?? "?"}
        </div>

        <div className="flex-1 space-y-1">
          {/* 作者 + 时间 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {comment.author.name ?? comment.author.username}
            </span>
            <span className="text-xs text-zinc-500">
              {formatDate(comment.createdAt)}
            </span>
          </div>

          {/* 评论内容 */}
          <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
            {comment.content}
          </div>

          {/* 操作栏 */}
          <div className="flex items-center gap-3 pt-1">
            {canReply && (
              <button
                type="button"
                onClick={() => setShowReplyForm((v) => !v)}
                className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                回复
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isPending ? "删除中..." : "删除"}
              </button>
            )}
          </div>

          {/* 回复表单（点击"回复"后展开）*/}
          {showReplyForm && currentUserId && (
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <CommentForm
                postId={postId}
                postSlug={postSlug}
                authorId={currentUserId}
                parentId={comment.id}
                isReply
                autoFocus
                onSubmitted={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* 子评论（楼中楼）— 递归渲染 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4 border-l-2 border-zinc-100 pl-4 dark:border-zinc-800">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  postSlug={postSlug}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isReplyLevel  // 标记为子评论层级，不再显示"回复"按钮
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
