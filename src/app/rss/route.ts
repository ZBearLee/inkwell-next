// src/app/rss/route.ts
// RSS feed Route Handler
//
// ==================== 为什么用 Route Handler? ====================
//
// RSS feed 是动态内容（文章不断更新），不能静态生成
// Route Handler 在服务端运行，每次请求时查数据库生成最新 RSS XML
//
// ==================== RSS 2.0 规范 ====================
//
// RSS 2.0 是最广泛支持的 feed 格式，结构：
//   <rss version="2.0">
//     <channel>
//       <title>站点名</title>
//       <link>站点 URL</link>
//       <description>站点描述</description>
//       <item>
//         <title>文章标题</title>
//         <link>文章 URL</link>
//         <description>文章摘要</description>
//         <pubDate>发布时间（RFC 822 格式）</pubDate>
//         <guid>唯一标识（通常用 URL）</guid>
//       </item>
//     </channel>
//   </rss>
//
// ==================== 缓存策略 ====================
//
// RSS feed 不需要实时性，用 1 小时缓存（3600 秒）
// 减少数据库查询，提高响应速度

import { NextResponse } from "next/server";
import { getPublishedPostsForFeed } from "@/lib/post";

const SITE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// 缓存 1 小时（秒）
export const revalidate = 3600;

// ==================== XML 转义 ====================
// RSS XML 中 & < > 等字符需要转义，否则 XML 解析失败
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // CI 环境无数据库,返回空 RSS 避免构建失败
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    return new Response("", { headers: { "Content-Type": "application/xml" } });
  }

  const posts = await getPublishedPostsForFeed();

  // ==================== 生成 RSS XML ====================
  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/posts/${post.slug}`;
      const author = post.author.name ?? post.author.username;
      const pubDate = post.publishedAt
        ? post.publishedAt.toUTCString() // RFC 822 格式
        : post.updatedAt.toUTCString();

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <author>${escapeXml(author)}</author>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Inkwell-next — 技术博客 CMS</title>
    <link>${SITE_URL}</link>
    <description>基于 Next.js 16 构建的技术博客 CMS，探索 RSC、渲染策略与全栈实践</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // 缓存 1 小时，之后重新生成
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
