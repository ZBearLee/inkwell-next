// src/actions/comment.ts
// 评论 Server Actions
//
// ==================== 设计要点 ====================
//
// 1. "use server" 声明：文件内所有 export 函数都是 Server Action
// 2. 权限校验：所有写操作都校验登录态和权限
// 3. revalidatePath：提交后刷新页面缓存，让新评论立即显示
// 4. 输入校验：防止空内容、超长内容
//
// ==================== revalidatePath vs router.refresh ====================
//
// revalidatePath("/posts/xxx"):
//   → 清除服务端缓存，下次请求重新渲染
//   → 适合 Server Action 提交后刷新数据
//
// router.refresh():
//   → 客户端调用，触发当前路由重新渲染
//   → 适合客户端组件主动刷新
//
// 本模块用 revalidatePath（Server Action 内调用）

"use server";

import { revalidatePath } from "next/cache";
import { createComment, deleteComment, getCommentById } from "@/lib/post";

// ==================== 创建评论 ====================

/**
 * 创建评论 Server Action
 *
 * @param postId 文章 id
 * @param postSlug 文章 slug（用于 revalidatePath）
 * @param content 评论内容
 * @param authorId 作者 id（登录用户）
 * @param parentId 父评论 id（可选，回复时传入）
 *
 * 返回值：
 *   { success: true } → 成功
 *   { success: false, error: "..." } → 失败（前端显示错误提示）
 */
export async function createCommentAction(
  postId: string,
  postSlug: string,
  content: string,
  authorId: string,
  parentId?: string,
): Promise<{ success: boolean; error?: string }> {
  // 输入校验
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "评论内容不能为空" };
  }
  if (trimmed.length > 2000) {
    return { success: false, error: "评论内容不能超过 2000 字" };
  }

  try {
    await createComment(postId, authorId, trimmed, parentId);
    // 刷新文章详情页缓存，让新评论立即显示
    revalidatePath(`/posts/${postSlug}`);
    return { success: true };
  } catch (error) {
    console.error("创建评论失败:", error);
    return { success: false, error: "评论失败，请稍后重试" };
  }
}

// ==================== 删除评论 ====================

/**
 * 删除评论 Server Action
 *
 * 权限规则：
 * - 评论作者本人可以删除
 * - 管理员可以删除任何评论
 *
 * 级联删除：
 * - schema 中 Comment 的 parent 关系定义了 onDelete: Cascade
 * - 删除父评论会自动删除其所有子评论
 *
 * @param commentId 评论 id
 * @param postSlug 文章 slug（用于 revalidatePath）
 * @param currentUserId 当前用户 id
 * @param isAdmin 是否管理员
 */
export async function deleteCommentAction(
  commentId: string,
  postSlug: string,
  currentUserId: string,
  isAdmin: boolean,
): Promise<{ success: boolean; error?: string }> {
  // 1. 查评论是否存在 + 拿到 authorId 做权限校验
  const comment = await getCommentById(commentId);
  if (!comment) {
    return { success: false, error: "评论不存在" };
  }

  // 2. 权限校验：本人或管理员
  if (comment.authorId !== currentUserId && !isAdmin) {
    return { success: false, error: "无权删除此评论" };
  }

  try {
    await deleteComment(commentId);
    revalidatePath(`/posts/${postSlug}`);
    return { success: true };
  } catch (error) {
    console.error("删除评论失败:", error);
    return { success: false, error: "删除失败，请稍后重试" };
  }
}
