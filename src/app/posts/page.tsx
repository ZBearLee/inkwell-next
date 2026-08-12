// src/app/posts/page.tsx
// 文章列表页（Server Component — SSR）
//
// Next.js 16 关键变化：
// → searchParams 是 Promise，必须 await（Next.js 15+ 的破坏性变更）
// → 用法：const searchParams = await searchParams prop
//
// 分页驱动：URL query ?page=2
// → 每次翻页都是一次服务端请求，SSR 渲染对应页码的文章
// → URL 可分享、可后退、SEO 友好

import type { Metadata } from "next";
import { Suspense } from "react";
import { getPosts } from "@/lib/post";
import { PostCard } from "@/components/post-card";
import { Pagination } from "@/components/pagination";
import { Sidebar, SidebarSkeleton } from "@/components/sidebar";

// 每页文章数
const PAGE_SIZE = 6;

// Next.js 16：searchParams 是 Promise
interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export const metadata: Metadata = {
  title: "全部文章",
  description: "浏览 Inkwell-next 的全部技术文章",
};

export default async function PostsPage({ searchParams }: PageProps) {
  // 解析 query 参数
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  // 查询文章列表（分页）
  const { posts, totalPages, currentPage } = await getPosts({
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* 页面标题 */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">全部文章</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">探索技术文章，涵盖前端、后端与开发实践</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        {/* 文章列表 */}
        <div>
          {posts.length > 0 ? (
            <>
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} showCover={false} />
                ))}
              </div>

              {/* 分页 */}
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath="/posts"
                  searchParams={{ page: pageStr }}
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
              暂无文章。
            </div>
          )}
        </div>

        {/* 侧边栏：Suspense 流式渲染 */}
        <div>
          <div className="lg:sticky lg:top-6">
            <Suspense fallback={<SidebarSkeleton />}>
              <Sidebar />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
