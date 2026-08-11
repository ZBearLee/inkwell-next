// src/app/dashboard/posts/page.tsx
// 我的文章列表（Server Component）
//
// ==================== 为什么是 Server Component? ====================
//
// 1. 直接查数据库拿文章列表（getMyPosts）
// 2. 需要读 session 判断登录态 + 获取 userId
// 3. SEO 不重要（后台页面），但 SSR 保证数据实时
//
// ==================== 数据流 ====================
//
// Page (Server) → 查 getMyPosts(session.user.id)
//   → 渲染表格 + 传 props 给 PostListActions (Client)
//     → 用户点击删除/发布 → Server Action → revalidatePath 刷新

import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, MessageCircle, Heart, Eye } from "lucide-react";
import { auth } from "@/auth";
import { getMyPosts } from "@/lib/post";
import { PostListActions } from "@/components/dashboard/post-list-actions";
import { formatDate, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyPostsPage() {
  // 1. 读 session
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?redirect=/dashboard/posts");
  }

  // 2. 权限校验：只有作者/管理员能访问后台
  if (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            需要作者权限才能访问文章管理后台
          </p>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
            当前角色：{session.user.role}（请联系管理员升级为作者）
          </p>
        </div>
      </div>
    );
  }

  // 3. 查询我的文章（含草稿）
  const posts = await getMyPosts(session.user.id);

  // 统计数据
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;
  const draftCount = posts.filter((p) => p.status === "DRAFT").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* ---------- 页头 ---------- */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            我的文章
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            共 {posts.length} 篇（已发布 {publishedCount}，草稿 {draftCount}）
          </p>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          写文章
        </Link>
      </div>

      {/* ---------- 文章列表 ---------- */}
      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <FileText className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            还没有文章，点击"写文章"开始创作吧
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full">
            {/* 表头 */}
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">标题</th>
                <th className="hidden px-4 py-3 md:table-cell">分类</th>
                <th className="hidden px-4 py-3 sm:table-cell">状态</th>
                <th className="hidden px-4 py-3 lg:table-cell">数据</th>
                <th className="hidden px-4 py-3 sm:table-cell">更新时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            {/* 表体 */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  {/* 标题 */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {post.title}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      /posts/{post.slug}
                    </div>
                  </td>

                  {/* 分类 */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {post.category.name}
                    </span>
                  </td>

                  {/* 状态 */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {post.status === "PUBLISHED" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        已发布
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        草稿
                      </span>
                    )}
                  </td>

                  {/* 数据统计 */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-0.5" title="阅读量">
                        <Eye className="h-3 w-3" />
                        {post.views}
                      </span>
                      <span className="flex items-center gap-0.5" title="评论数">
                        <MessageCircle className="h-3 w-3" />
                        {post._count.comments}
                      </span>
                      <span className="flex items-center gap-0.5" title="点赞数">
                        <Heart className="h-3 w-3" />
                        {post._count.likes}
                      </span>
                    </div>
                  </td>

                  {/* 更新时间 */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-zinc-500" title={formatDate(post.updatedAt)}>
                      {relativeTime(post.updatedAt)}
                    </span>
                  </td>

                  {/* 操作 */}
                  <td className="px-4 py-3 text-right">
                    <PostListActions
                      postId={post.id}
                      postSlug={post.slug}
                      status={post.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
