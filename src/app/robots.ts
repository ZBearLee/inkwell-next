// src/app/robots.ts
// 爬虫规则（Next.js 文件约定）
//
// ==================== 为什么需要 robots.txt? ====================
//
// 1. 告诉搜索引擎哪些路径可以爬、哪些不能爬
// 2. 指向 sitemap.xml（帮爬虫发现所有页面）
// 3. Next.js 文件约定：放 app/robots.ts 自动生成 /robots.txt
//
// ==================== 规则说明 ====================
//
// Allow: /              → 允许爬取所有公开页面
// Disallow: /dashboard/  → 禁止爬取后台（私人页面，不需要 SEO）
// Disallow: /profile     → 禁止爬取用户中心（私人页面）
// Disallow: /api/        → 禁止爬取 API（API 不是给爬虫用的）
//
// 和 proxy.ts 路由保护的区别：
//   proxy.ts：未登录用户不能访问（安全层面）
//   robots.ts：搜索引擎不要爬取（SEO 层面）
//   两者互补：robots.txt 是"君子协定"，真正的保护靠 proxy.ts

import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*", // 所有爬虫
      allow: "/",
      disallow: ["/dashboard/", "/profile", "/api/", "/login", "/register"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
