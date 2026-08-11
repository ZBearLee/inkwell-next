// src/components/comments/comment-section.tsx
// 评论区容器（Server Component）
//
// ==================== 为什么是 Server Component? ====================
//
// 1. 直接查数据库拿评论列表（getComments）
//    → SEO 友好：评论内容被服务端渲染到 HTML，爬虫可抓取
//    → 零客户端 JS：评论列表不需要 hydrate
// 2. 把数据传给 CommentItem（Client Component）渲染交互
//
// ==================== RSC 嵌套模式 ====================
//
// CommentSection (Server) → 负责查数据
//   ├── CommentForm (Client)   → 顶级评论表单
//   └── CommentItem (Client)   → 每条评论（含回复/删除交互）
//         └── CommentForm (Client) → 回复表单（点击回复后展开）
//
// 数据流：
//   Server 查数据 → 作为 props 传给 Client 组件
//   Client 组件交互 → 调用 Server Action → revalidatePath 刷新
//
// ==================== 登录态处理 ====================
//
// 当前模块还没接入鉴权（模块 6 才做 NextAuth）
// 这里从数据库查 author 用户作为"当前登录用户"演示
// 模块 6 完成后改为：const session = await auth(); const currentUserId = session?.user?.id

import { prisma } from "@/lib/prisma";
import { getComments } from "@/lib/post";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

interface CommentSectionProps {
  postSlug: string;
  postId: string;
}

export async function CommentSection({ postSlug, postId }: CommentSectionProps) {
  // 并行：查评论列表 + 查"当前登录用户"（演示用）
  // TODO: 模块 6 接入 NextAuth 后，从 session 获取，删除这里的查询
  const [comments, demoUser] = await Promise.all([
    getComments(postSlug),
    prisma.user.findUnique({
      where: { username: "inkwriter" },
      select: { id: true, role: true },
    }),
  ]);

  // 演示用：用 seed 中的 author 用户作为"当前登录用户"
  // 如果找不到（数据库未 seed），currentUserId 为 undefined，评论/删除按钮不显示
  const currentUserId = demoUser?.id;
  const isAdmin = demoUser?.role === "ADMIN";

  return (
    <section className="mt-16 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        评论 {comments.length > 0 && (
          <span className="ml-1 text-zinc-400">({comments.length})</span>
        )}
      </h2>

      {/* 顶级评论表单 */}
      <div className="mb-8">
        {currentUserId ? (
          <CommentForm
            postId={postId}
            postSlug={postSlug}
            authorId={currentUserId}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
            请先登录后再发表评论
          </div>
        )}
      </div>

      {/* 评论列表 */}
      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          还没有评论，来说两句吧~
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              postSlug={postSlug}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </section>
  );
}
