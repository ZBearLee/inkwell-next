// src/app/page.tsx
// 博客首页（Server Component — SSR）
//
// 渲染策略：SSR（每次请求都查数据库）
// 为什么用 SSR 而非 SSG？
// → 博客文章频繁更新，SSR 保证用户每次访问都看到最新内容
// → SSG 需要重新构建才能更新，不适合频繁变化的内容
//
// Streaming + Suspense：
// → 主内容（最新文章）先渲染直出
// → 侧边栏（分类/标签聚合查询）用 <Suspense> 包裹，异步流式加载
// → 用户无需等待侧边栏查询完成就能看到文章列表

import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { getLatestPosts } from "@/lib/post";
import { PostCard } from "@/components/post-card";
import { Sidebar, SidebarSkeleton } from "@/components/sidebar";

export default async function Home() {
  // 查询最新文章（首页展示 6 篇）
  const posts = await getLatestPosts(6);

  return (
    <>
      {/* ===== Hero 区 ===== */}
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:py-20">
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl md:text-5xl">
            探索 <span className="text-blue-600">Next.js</span> 的全栈实践
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
            从 React Server Components 到 Server Actions，从 SSG 到 ISR ——
            一个用 Next.js 16 构建的技术博客 CMS，深度实践现代 Web 开发。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <BookOpen className="h-4 w-4" />
              浏览文章
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 主体内容：最新文章 + 侧边栏 ===== */}
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          {/* 最新文章列表 */}
          <div>
            <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">最新文章</h2>

            {posts.length > 0 ? (
              <div className="space-y-6">
                {/* 第一篇用 featured 样式（大卡片），priority 标记为 LCP 立即加载 */}
                {posts[0] && <PostCard post={posts[0]} featured priority />}
                {/* 其余用普通卡片，双列网格 */}
                {posts.slice(1).length > 0 && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {posts.slice(1).map((post) => (
                      <PostCard key={post.id} post={post} showCover={false} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
                暂无文章，敬请期待。
              </div>
            )}
          </div>

          {/* 侧边栏：用 Suspense 包裹，实现流式渲染 */}
          <div>
            <div className="lg:sticky lg:top-6">
              <Suspense fallback={<SidebarSkeleton />}>
                <Sidebar />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
