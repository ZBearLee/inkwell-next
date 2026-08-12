// src/app/u/[username]/page.tsx
// 用户公开主页（Server Component — SSG + ISR）
//
// ==================== 渲染策略：SSG + ISR ====================
//
// 和文章详情页一样的策略：
//   - generateStaticParams：构建时预生成有文章的用户主页
//   - revalidate = 60：60 秒 ISR，兼顾新内容
//
// 为什么不用 force-dynamic?
//   → 用户主页内容变化不频繁（改名字/简介才变）
//   → SSG 首屏最快，SEO 友好
//   → ISR 自动更新，不需要每次请求都查库
//
// ==================== 和 /profile 的区别 ====================
//
// /profile          → 私人中心（仅自己可见，有编辑表单，force-dynamic）
// /u/[username]     → 公开主页（所有人可见，只读，SSG+ISR）
//
// 类似 GitHub：
//   /settings/profile  vs  /github/username

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, MessageCircle, Calendar } from "lucide-react";
import { getUserProfile, getUserPosts, getAllUsernames } from "@/lib/user";
import { PostCard } from "@/components/post-card";
import { formatDate, roleLabel } from "@/lib/utils";

// ==================== ISR 配置 ====================
export const revalidate = 60;

// ==================== generateStaticParams ====================
// 构建时预生成所有"有已发布文章"的用户主页
// 没有文章的用户不预生成（运行时按需渲染）
export async function generateStaticParams() {
  const users = await getAllUsernames();
  return users;
}

// ==================== generateMetadata ====================
// 动态 SEO：标题用用户昵称，描述用 bio
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserProfile(username);

  if (!user) {
    return {
      title: "用户不存在",
      description: "该用户不存在或已注销",
    };
  }

  const displayName = user.name || user.username;
  return {
    title: `${displayName} 的主页`,
    description: user.bio || `${displayName} 在 Inkwell-next 发布的文章`,
    openGraph: {
      title: `${displayName} 的主页`,
      description: user.bio || `查看 ${displayName} 发布的所有文章`,
      type: "profile",
    },
  };
}

// ==================== 页面组件 ====================
interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;

  // 并行查询：用户资料 + 文章列表
  const [user, posts] = await Promise.all([
    getUserProfile(username),
    getUserPosts(username, 20),
  ]);

  // 用户不存在 → 404
  if (!user) notFound();

  const displayName = user.name || user.username;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* ==================== 用户信息头部 ==================== */}
      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* 头像 */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={displayName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          {/* 信息 */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {displayName}
              </h1>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {roleLabel(user.role)}
            </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              @{user.username}
            </p>
            {user.bio && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {user.bio}
              </p>
            )}
            <p className="flex items-center gap-1 text-xs text-zinc-400">
              <Calendar className="h-3 w-3" />
              注册于 {formatDate(user.createdAt)}
            </p>
          </div>

          {/* 统计 */}
          <div className="flex gap-4 sm:flex-col sm:gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {user._count.posts}
              </p>
              <p className="text-xs text-zinc-500">
                <FileText className="mr-1 inline h-3 w-3" />
                文章
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {user._count.comments}
              </p>
              <p className="text-xs text-zinc-500">
                <MessageCircle className="mr-1 inline h-3 w-3" />
                评论
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 文章列表 ==================== */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
          发布的文章
          {posts.length > 0 && (
            <span className="ml-1 text-zinc-400">({posts.length})</span>
          )}
        </h2>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <FileText className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              该用户还没有发布文章
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} showCover={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
