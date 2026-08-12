// src/app/profile/page.tsx
// 用户中心页面（Server Component）
//
// ==================== 为什么是 Server Component? ====================
//
// 1. 需要查数据库拿完整用户信息（bio 不在 JWT 里）
// 2. 需要查统计数据（文章数、评论数等）
// 3. 需要读 session 判断登录态
// → 这些都是服务端能力，Server Component 天然适合
//
// ==================== 页面结构 ====================
//
// ┌─────────────────────────────────────┐
// │  用户信息卡片                        │
// │  [头像] 昵称 (@username)             │
// │  邮箱 | 角色 | 注册时间              │
// │  简介                                │
// ├─────────────────────────────────────┤
// │  统计数据                            │
// │  文章 | 评论                          │
// ├─────────────────────────────────────┤
// │  编辑资料表单（Client Component）    │
// │  昵称 / 头像 / 简介                  │
// └─────────────────────────────────────┘
//
// ==================== 路由保护 ====================
//
// proxy.ts 已配置 /profile 为受保护路径
// 未登录访问会被重定向到 /login?redirect=/profile
// 但作为安全兜底，这里再检查一次 session

import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, MessageCircle, Calendar, ExternalLink } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile-form";
import { formatDate, roleLabel } from "@/lib/utils";

// 受保护页面，禁用静态渲染
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  // 1. 读 session（proxy.ts 已保护，这里兜底）
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?redirect=/profile");
  }

  // 2. 并行查询：完整用户信息 + 各项统计
  // session.user 只有 id/email/name/username/role/image
  // bio 和 createdAt 需要从数据库取
  const [user, postCount, commentCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    }),
    // 该用户写的文章数（含草稿）
    prisma.post.count({ where: { authorId: session.user.id } }),
    // 该用户发的评论数
    prisma.comment.count({ where: { authorId: session.user.id } }),
  ]);

  // 理论上 user 一定存在（session 有效说明用户在库里）
  // 但防御性编程：万一用户被删了但 JWT 还没过期
  if (!user) {
    redirect("/login");
  }

  // 头像首字母
  const displayName = user.name || user.username;
  const initials = displayName.charAt(0).toUpperCase();

  // 统计数据数组（方便循环渲染）
  const stats = [
    { label: "文章", value: postCount, icon: FileText, href: `/u/${user.username}` },
    { label: "评论", value: commentCount, icon: MessageCircle },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        个人中心
      </h1>

      {/* ==================== 用户信息卡片 ==================== */}
      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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

          {/* 基本信息 */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {displayName}
              </h2>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {roleLabel(user.role)}
            </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              @{user.username}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {user.email}
            </p>
            <p className="flex items-center gap-1 text-xs text-zinc-400">
              <Calendar className="h-3 w-3" />
              注册于 {formatDate(user.createdAt)}
            </p>
          </div>

          {/* 查看公开主页 */}
          <Link
            href={`/u/${user.username}`}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            公开主页
          </Link>
        </div>

        {/* 简介 */}
        {user.bio && (
          <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            {user.bio}
          </p>
        )}
      </div>

      {/* ==================== 统计数据 ==================== */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const content = (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <Icon className="mx-auto mb-2 h-5 w-5 text-zinc-400" />
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stat.value}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            </div>
          );
          // 有链接的统计项可点击跳转
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {content}
            </Link>
          ) : (
            <div key={stat.label}>{content}</div>
          );
        })}
      </div>

      {/* ==================== 编辑资料表单 ==================== */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
          编辑资料
        </h2>
        <ProfileForm
          initialName={user.name ?? ""}
          initialBio={user.bio ?? ""}
          initialImage={user.image ?? ""}
        />
      </div>
    </div>
  );
}
