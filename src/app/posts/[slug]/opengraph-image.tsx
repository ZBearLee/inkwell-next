// src/app/posts/[slug]/opengraph-image.tsx
// 动态生成文章 OG 图（Next.js 文件约定）
//
// ==================== 什么是 opengraph-image? ====================
//
// Next.js 文件约定：在路由目录下放 opengraph-image.tsx
// → 自动在该路由的 metadata 中注入 og:image
// → 用户在社交平台分享链接时，显示这张自动生成的图
//
// ==================== 为什么用 ImageResponse? ====================
//
// 1. 不需要设计工具手动做图
// 2. 每篇文章自动生成带标题的 OG 图
// 3. 用 JSX + CSS 画图，服务端渲染成 PNG
//
// ==================== 和 coverImage 的关系 ====================
//
// 文章有 coverImage 时：generateMetadata 里的 openGraph.images 用 coverImage
// 这个 opengraph-image.tsx 作为 fallback（无封面图时）
// 或者覆盖 generateMetadata（文件约定优先级更高）
//
// 实际使用：如果文章有 coverImage，generateMetadata 已设了 images
// Next.js 会优先用文件约定的 opengraph-image
// 这里生成的 OG 图包含标题+作者+站点名，信息更完整

import { ImageResponse } from "next/og";
import { getPostBySlug, getAllPostSlugs } from "@/lib/post";

// OG 图尺寸（社交平台推荐 1200x630）
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ISR：和文章详情页一致的缓存策略
export const revalidate = 60;

// 构建时预生成所有文章的 OG 图
export async function generateStaticParams() {
  const posts = await getAllPostSlugs();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function ImageOG({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    // 文章不存在时返回一个默认 OG 图
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "#0a0a0a",
            color: "#fafafa",
            padding: "60px",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>Inkwell-next</div>
          <div style={{ display: "flex", fontSize: 24, color: "#a1a1aa", marginTop: 16 }}>
            文章不存在
          </div>
        </div>
      ),
      size,
    );
  }

  const author = post.author.name ?? post.author.username;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0a0a 0%, #18181b 100%)",
          color: "#fafafa",
          padding: "80px",
          justifyContent: "space-between",
        }}
      >
        {/* 顶部：站点名 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 700,
              color: "#3b82f6",
            }}
          >
            Inkwell-next
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#71717a" }}>技术博客 CMS</div>
        </div>

        {/* 中间：文章标题 */}
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: 1000,
          }}
        >
          {post.title}
        </div>

        {/* 底部：作者 + 分类 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 28,
            color: "#a1a1aa",
          }}
        >
          <div style={{ display: "flex" }}>作者：{author}</div>
          <div style={{ display: "flex" }}>|</div>
          <div style={{ display: "flex" }}>{post.category.name}</div>
        </div>
      </div>
    ),
    size,
  );
}
