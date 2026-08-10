// src/app/category/[slug]/page.tsx
// 分类页（Server Component — SSR）
// 展示某个分类下的所有已发布文章，支持分页
//
// Next.js 16：params 和 searchParams 都是 Promise，需要 await

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPosts, getCategoryBySlug } from "@/lib/post";
import { PostCard } from "@/components/post-card";
import { Pagination } from "@/components/pagination";
import { Sidebar, SidebarSkeleton } from "@/components/sidebar";

const PAGE_SIZE = 6;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

// 动态生成 SEO metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "分类不存在" };
  return {
    title: `分类: ${category.name}`,
    description: category.description ?? `浏览「${category.name}」分类下的全部文章`,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  // 并行查询：分类信息 + 文章列表
  const [category, result] = await Promise.all([
    getCategoryBySlug(slug),
    getPosts({ page, pageSize: PAGE_SIZE, category: slug }),
  ]);

  // 分类不存在 → 404
  if (!category) notFound();

  const { posts, totalPages, currentPage } = result;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* 分类头部 */}
      <header className="mb-8">
        <p className="mb-1 text-sm text-zinc-500">分类</p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{category.description}</p>
        )}
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
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath={`/category/${slug}`}
                  searchParams={{ page: pageStr }}
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
              该分类下暂无文章。
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="lg:sticky lg:top-20 lg:h-fit">
          <Suspense fallback={<SidebarSkeleton />}>
            <Sidebar />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
