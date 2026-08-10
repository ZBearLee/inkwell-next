// src/components/post-card.tsx
// 文章卡片组件（Server Component）
// 展示：封面图 + 分类 + 标题 + 摘要 + 作者 + 阅读时长 + 标签
// 用途：首页最新文章流、文章列表页、分类/标签筛选页
//
// 为什么是 Server Component？
// → 纯展示组件，无需交互状态，不打包到客户端 bundle，零 JS 开销

import Link from "next/link";
import { Clock, User } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { PostWithRelations } from "@/lib/post";

interface PostCardProps {
  post: PostWithRelations;
  // 是否展示封面图（首页最新文章可隐藏，列表页展示）
  showCover?: boolean;
  // 是否高亮（首页第一篇可特殊处理）
  featured?: boolean;
}

export function PostCard({ post, showCover = true, featured = false }: PostCardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
        featured && "md:flex-row",
      )}
    >
      {/* 封面图 */}
      {showCover && post.coverImage && (
        <Link
          href={`/posts/${post.slug}`}
          className={cn(
            "relative block aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800",
            featured && "md:aspect-auto md:w-1/2",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
      )}

      {/* 内容区 */}
      <div className={cn("flex flex-1 flex-col p-5", featured && "md:p-8")}>
        {/* 分类 + 标签 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/category/${post.category.slug}`}
            className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            {post.category.name}
          </Link>
          {post.tags.map(({ tag }) => (
            <Link
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              #{tag.name}
            </Link>
          ))}
        </div>

        {/* 标题 */}
        <h3
          className={cn(
            "mb-2 font-semibold tracking-tight text-zinc-900 dark:text-zinc-50",
            featured ? "text-2xl md:text-3xl" : "text-xl",
          )}
        >
          <Link href={`/posts/${post.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            <span className="absolute inset-0 z-10" aria-hidden="true" />
            {post.title}
          </Link>
        </h3>

        {/* 摘要 */}
        <p
          className={cn(
            "mb-4 line-clamp-2 text-zinc-600 dark:text-zinc-400",
            featured ? "text-base md:line-clamp-3" : "text-sm",
          )}
        >
          {post.excerpt}
        </p>

        {/* 元信息：作者 · 阅读时长 · 发布日期 */}
        <div className="mt-auto flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {post.author.name ?? post.author.username}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readTime} 分钟
          </span>
          {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>}
        </div>
      </div>
    </article>
  );
}
