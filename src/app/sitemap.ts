// src/app/sitemap.ts
// 站点地图（Next.js 文件约定）
//
// ==================== 为什么需要 sitemap? ====================
//
// 1. SEO 标配：搜索引擎爬虫通过 sitemap 发现所有页面
// 2. 告诉爬虫哪些页面重要、更新频率、最后更新时间
// 3. Next.js 文件约定：放 app/sitemap.ts 自动生成 /sitemap.xml
//
// ==================== 生成的内容 ====================
//
// /sitemap.xml 会包含：
//   - 静态页面：首页、搜索页、登录/注册页
//   - 文章详情页：/posts/[slug]（所有已发布文章）
//   - 分类页：/category/[slug]（所有分类）
//   - 标签页：/tag/[slug]（所有标签）
//   - 用户主页：/u/[username]（有已发布文章的用户）
//
// ==================== 和 generateStaticParams 的区别 ====================
//
// generateStaticParams：构建时预生成 HTML（性能优化）
// sitemap.ts：告诉搜索引擎有哪些 URL（SEO 优化）
// 两者互补：sitemap 帮爬虫发现页面，SSG 帮爬虫拿到完整 HTML

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPublishedPostsForFeed } from "@/lib/post";

const SITE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // CI 环境无数据库,返回空 sitemap 跳过构建时查询
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    return [];
  }

  // 并行查询所有动态路由的数据
  const [posts, categories, tags, users] = await Promise.all([
    getPublishedPostsForFeed(),
    prisma.category.findMany({ select: { slug: true, createdAt: true } }),
    prisma.tag.findMany({ select: { slug: true } }),
    prisma.user.findMany({
      where: {
        posts: { some: { status: "PUBLISHED" } },
      },
      select: { username: true },
    }),
  ]);

  // ==================== 静态页面 ====================
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/search`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  // ==================== 文章详情页 ====================
  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/posts/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // ==================== 分类页 ====================
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/category/${category.slug}`,
    lastModified: category.createdAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // ==================== 标签页 ====================
  const tagPages: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${SITE_URL}/tag/${tag.slug}`,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  // ==================== 用户主页 ====================
  const userPages: MetadataRoute.Sitemap = users.map((user) => ({
    url: `${SITE_URL}/u/${user.username}`,
    changeFrequency: "weekly",
    priority: 0.3,
  }));

  return [...staticPages, ...postPages, ...categoryPages, ...tagPages, ...userPages];
}
