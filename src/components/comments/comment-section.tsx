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
// 用 auth() 读 session，获取当前登录用户的 id 和 role
//   const session = await auth()
//   const currentUserId = session?.user?.id
//   const isAdmin = session?.user?.role === "ADMIN"
//
// 未登录时 currentUserId 为 undefined：
//   → 不显示评论表单（提示"请先登录"）
//   → 不显示回复/删除按钮
//
// ==================== ISR 注意事项 ====================
//
// auth() 内部调用 cookies() 读 session cookie
// 这会让文章详情页从 SSG+ISR 变为动态渲染（SSR）
// 代价：失去静态缓存，每次请求都重新渲染
// 收益：评论按钮根据登录态个性化显示
// 如需保留 ISR，可把评论区拆到单独的 dynamic 路由段（未来优化）

import Link from "next/link";
import { auth } from "@/auth";
import { getComments } from "@/lib/post";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

interface CommentSectionProps {
  postSlug: string;
  postId: string;
}

export async function CommentSection({ postSlug, postId }: CommentSectionProps) {
  // 并行：查评论列表 + 读当前登录用户 session
  // auth() 读 cookie 拿 JWT，不查数据库（session.user.id/role 已在 JWT 里）
  const [comments, session] = await Promise.all([
    getComments(postSlug),
    auth(),
  ]);

  // 从 session 提取用户信息
  // 未登录时 session 为 null，currentUserId 为 undefined
  const currentUserId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";

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
            <Link
              href={`/login?redirect=/posts/${postSlug}`}
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              登录
            </Link>
            后发表评论
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
