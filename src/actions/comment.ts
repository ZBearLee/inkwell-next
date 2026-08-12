// src/actions/comment.ts
// 评论 Server Actions
//
// ==================== 设计要点 ====================
//
// 1. "use server" 声明：文件内所有 export 函数都是 Server Action
// 2. 权限校验：所有写操作都从 auth() 取真实 session
//    → 绝不能信任前端传来的 currentUserId / isAdmin / authorId
//    → 前端参数可被任意伪造，Server Action 必须自己重新校验
// 3. revalidatePath：提交后刷新页面缓存，让新评论立即显示
// 4. 输入校验：防止空内容、超长内容
//
// ==================== 为什么把 authorId 等参数去掉 ====================
//
// 早期版本让前端传 authorId / currentUserId / isAdmin：
//   createCommentAction(postId, slug, content, authorId, parentId)
//   deleteCommentAction(commentId, slug, currentUserId, isAdmin)
//
// 这有严重安全漏洞：任何人都可以直接调用 Server Action 并伪造这些参数。
// 例如把 isAdmin 改为 true，就能删除任何评论。
//
// 修复后：
//   createCommentAction(postId, slug, content, parentId)
//   deleteCommentAction(commentId, slug)
//   → Server Action 内部 await auth() 取真实 session.user.id 和 role
//   → 客户端 UI 仍然需要 currentUserId/isAdmin 决定按钮显示，
//     但这些值只用于"是否渲染按钮"，不传给 Server Action
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
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ==================== 创建评论 ====================

/**
 * 创建评论 Server Action
 *
 * 权限：必须登录（从 session 取真实 authorId，不接受前端传参）
 *
 * @param postId 文章 id
 * @param postSlug 文章 slug（用于 revalidatePath）
 * @param content 评论内容
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
  parentId?: string,
): Promise<{ success: boolean; error?: string }> {
  // 1. 权限校验：必须登录，从 session 取真实作者 id
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "请先登录" };
  }

  // 2. 输入校验
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "评论内容不能为空" };
  }
  if (trimmed.length > 2000) {
    return { success: false, error: "评论内容不能超过 2000 字" };
  }

  // 3. 写入数据库（authorId 来自 session，不是前端参数）
  try {
    await prisma.comment.create({
      data: {
        postId,
        authorId: session.user.id,
        content: trimmed,
        parentId: parentId || null,
      },
    });
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
 * 权限规则（从 session 取，不信任前端参数）：
 * - 评论作者本人可以删除
 * - 管理员（session.user.role === "ADMIN"）可以删除任何评论
 *
 * 级联删除：
 * - schema 中 Comment 的 parent 关系定义了 onDelete: Cascade
 * - 删除父评论会自动删除其所有子评论
 *
 * @param commentId 评论 id
 * @param postSlug 文章 slug（用于 revalidatePath）
 */
export async function deleteCommentAction(
  commentId: string,
  postSlug: string,
): Promise<{ success: boolean; error?: string }> {
  // 1. 权限校验：必须登录
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "请先登录" };
  }

  // 2. 查评论是否存在 + 拿到 authorId 做权限校验
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true },
  });
  if (!comment) {
    return { success: false, error: "评论不存在" };
  }

  // 3. 权限校验：本人或管理员（角色从 session 取）
  const isOwner = comment.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { success: false, error: "无权删除此评论" };
  }

  try {
    await prisma.comment.delete({ where: { id: commentId } });
    revalidatePath(`/posts/${postSlug}`);
    return { success: true };
  } catch (error) {
    console.error("删除评论失败:", error);
    return { success: false, error: "删除失败，请稍后重试" };
  }
}
