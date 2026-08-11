// src/app/posts/[slug]/page.tsx
// 文章详情页（Server Component — SSG + ISR）
//
// ==================== 渲染策略：SSG + ISR ====================
//
// 为什么用 SSG + ISR 而非 SSR？
// → 单篇文章内容相对稳定，不像列表页那样频繁更新
// → SSG 构建时预生成 HTML，首屏最快（< 100ms）
// → ISR（revalidate = 60）兼顾新内容：60 秒后访问会后台重新生成
//
// ==================== Next.js 16 关键点 ====================
//
// 1. params 是 Promise：必须 await
// 2. generateStaticParams：构建时返回所有 slug，预生成静态页
// 3. revalidate：ISR 间隔时间（秒）
// 4. generateMetadata：动态 SEO
// 5. notFound()：文章不存在时返回 404

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Clock, Eye, MessageCircle, Heart, Bookmark } from "lucide-react";
import {
  getPostBySlug,
  getAllPostSlugs,
  getPostNeighbors,
  getRelatedPosts,
} from "@/lib/post";
import { renderMarkdown, extractToc } from "@/lib/markdown";
import { PostCard } from "@/components/post-card";
import { Toc } from "@/components/toc";
import { CopyButton } from "@/components/copy-button";
import { CommentSection } from "@/components/comments/comment-section";
import { formatDate } from "@/lib/utils";

// ==================== ISR 配置 ====================
// 60 秒内用缓存，过期后下次请求触发后台重新生成
// 期间用户看到的仍是旧缓存（stale-while-revalidate）
export const revalidate = 60;

// ==================== generateStaticParams ====================
// 构建时预生成所有已发布文章的静态 HTML
// 好处：
// 1. 首屏最快（直接返回 HTML，无需查数据库）
// 2. 可部署到 CDN（Vercel Edge Network）
// 3. SEO 友好（爬虫拿到完整 HTML）
export async function generateStaticParams() {
  const posts = await getAllPostSlugs();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// ==================== generateMetadata ====================
// 动态生成 SEO metadata
// 标题会通过 layout.tsx 的 title.template 拼成 "xxx | Inkwell-next"
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "文章不存在",
      description: "您访问的文章不存在或已被删除",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.name ?? post.author.username],
      tags: post.tags.map((t) => t.tag.name),
      ...(post.coverImage && { images: [{ url: post.coverImage }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

// ==================== 页面组件 ====================
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // 文章不存在 → 404
  if (!post) notFound();

  // 并行：渲染 Markdown + 提取 TOC + 查上一篇/下一篇 + 查相关文章
  const [html, toc, neighbors, related] = await Promise.all([
    renderMarkdown(post.content),
    extractToc(post.content),
    getPostNeighbors(post.publishedAt!),
    getRelatedPosts(post.id, post.categoryId, 3),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* 返回列表 */}
      <Link
        href="/posts"
        className="mb-8 inline-flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回文章列表
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_220px]">
        {/* ==================== 文章主体 ==================== */}
        <article className="min-w-0">
          {/* 文章头部 */}
          <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
            {/* 分类 + 标签 */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/category/${post.category.slug}`}
                className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                {post.category.name}
              </Link>
              {post.tags.map(({ tag }) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>

            {/* 标题 */}
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
              {post.title}
            </h1>

            {/* 摘要 */}
            <p className="mb-4 text-lg text-zinc-600 dark:text-zinc-400">{post.excerpt}</p>

            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {post.author.name ?? post.author.username}
                </span>
              </span>
              {post.publishedAt && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(post.publishedAt)}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readTime} 分钟阅读
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {post.views} 次浏览
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {post._count.comments} 评论
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {post._count.likes}
              </span>
              <span className="inline-flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5" />
                {post._count.bookmarks}
              </span>
            </div>
          </header>

          {/* 文章正文（Markdown 渲染）*/}
          <div
            className="prose prose-zinc max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* 注入代码块复制按钮（Client Component）*/}
          <CopyButton />

          {/* ==================== 上一篇/下一篇 ==================== */}
          {(neighbors.previous || neighbors.next) && (
            <nav className="mt-12 grid grid-cols-1 gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800 sm:grid-cols-2">
              {neighbors.previous ? (
                <Link
                  href={`/posts/${neighbors.previous.slug}`}
                  className="group flex flex-col rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <span className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
                    <ArrowLeft className="h-3 w-3" />
                    上一篇
                  </span>
                  <span className="font-medium text-zinc-900 group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400">
                    {neighbors.previous.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {neighbors.next ? (
                <Link
                  href={`/posts/${neighbors.next.slug}`}
                  className="group flex flex-col rounded-lg border border-zinc-200 p-4 text-right transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <span className="mb-1 flex items-center justify-end gap-1 text-xs text-zinc-500">
                    下一篇
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="font-medium text-zinc-900 group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400">
                    {neighbors.next.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </nav>
          )}

          {/* ==================== 相关文章 ==================== */}
          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                相关文章
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {related.map((p) => (
                  <PostCard key={p.id} post={p} showCover={false} />
                ))}
              </div>
            </section>
          )}

          {/* ==================== 评论区 ==================== */}
          {/* Server Component，跟随页面 ISR 缓存（revalidate = 60）
              评论提交/删除时，Server Action 内调用 revalidatePath 失效缓存，
              新评论会在下次请求时立即显示 */}
          <CommentSection postSlug={post.slug} postId={post.id} />
        </article>

        {/* ==================== 侧边栏：TOC ==================== */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <Toc items={toc} />
          </div>
        </aside>
      </div>
    </div>
  );
}
