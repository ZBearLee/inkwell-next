// src/app/search/page.tsx
// 搜索结果页（Server Component — SSR）
//
// ==================== 渲染策略：SSR ====================
//
// 为什么用 SSR 而非 SSG + ISR?
// → 搜索结果是动态的，每次查询都不同
// → searchParams 是动态的，无法构建时预生成
// → 搜索需要实时查询数据库
//
// ==================== Next.js 16 关键点 ====================
//
// 1. searchParams 是 Promise：必须 await
// 2. Server Component 通过 Server Action 查询数据（与搜索建议保持一致）
// 3. 用 generateMetadata 动态生成标题
// 4. URL query 驱动：可分享、可后退、SEO 友好

import type { Metadata } from "next";
import Link from "next/link";
import { Search, ArrowLeft, FileSearch } from "lucide-react";
import { searchPostsAction } from "@/actions/search";
import { Pagination } from "@/components/pagination";
import { Highlight } from "@/components/highlight";
import { formatDate } from "@/lib/utils";

// 生成动态 SEO metadata
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q) {
    return { title: "搜索文章" };
  }
  return {
    title: `搜索: ${q}`,
    description: `查找包含 "${q}" 的文章`,
  };
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  // 空查询：显示提示
  if (!q.trim()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center">
          <FileSearch className="mx-auto mb-4 h-16 w-16 text-zinc-300 dark:text-zinc-700" />
          <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            搜索文章
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            在顶部搜索框输入关键词，查找你感兴趣的文章
          </p>
        </div>
      </div>
    );
  }

  // 执行搜索（通过 Server Action，参数校验在 action 层完成）
  const result = await searchPostsAction(q, pageNum);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* 返回首页 */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回首页
      </Link>

      {/* 搜索标题 */}
      <header className="mb-8">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          <Search className="h-5 w-5" />
          搜索结果
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          找到 <span className="font-semibold text-zinc-900 dark:text-zinc-50">{result.total}</span> 篇包含{" "}
          <span className="font-semibold text-blue-600 dark:text-blue-400">"{q}"</span> 的文章
        </p>
      </header>

      {/* 搜索结果列表 */}
      {result.posts.length === 0 ? (
        // 空状态
        <div className="py-16 text-center">
          <FileSearch className="mx-auto mb-4 h-16 w-16 text-zinc-300 dark:text-zinc-700" />
          <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">
            未找到相关文章
          </h2>
          <p className="mb-6 text-zinc-600 dark:text-zinc-400">
            试试用不同的关键词，或检查拼写
          </p>
          <div className="space-y-2 text-sm text-zinc-500">
            <p>搜索建议：</p>
            <ul className="mx-auto inline-block space-y-1 text-left">
              <li>• 使用更简短的关键词</li>
              <li>• 尝试相关的技术名词</li>
              <li>• 检查拼写是否正确</li>
            </ul>
          </div>
        </div>
      ) : (
        // 结果列表
        <div className="space-y-6">
          {result.posts.map((post) => (
            <article
              key={post.id}
              className="border-b border-zinc-200 pb-6 dark:border-zinc-800"
            >
              <Link href={`/posts/${post.slug}`} className="group block">
                {/* 分类 */}
                <span className="mb-2 inline-block text-xs font-medium text-blue-600 dark:text-blue-400">
                  {post.category.name}
                </span>

                {/* 标题（高亮关键词）*/}
                <h2 className="mb-2 text-xl font-semibold text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400">
                  <Highlight text={post.title} query={q} />
                </h2>

                {/* 摘要（高亮关键词）*/}
                <p className="mb-3 line-clamp-2 text-zinc-600 dark:text-zinc-400">
                  <Highlight text={post.excerpt} query={q} />
                </p>

                {/* 元信息 */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-500">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {post.author.name ?? post.author.username}
                  </span>
                  {post.publishedAt && (
                    <>
                      <span>·</span>
                      <span>{formatDate(post.publishedAt)}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{post.readTime} 分钟阅读</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}

      {/* 分页 */}
      {result.totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={result.currentPage}
            totalPages={result.totalPages}
            basePath="/search"
            searchParams={{ q }}
          />
        </div>
      )}
    </div>
  );
}
