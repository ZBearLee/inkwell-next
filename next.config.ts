import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next/image 图片优化配置
  // 允许外部图片域名（封面图可能来自 Unsplash 等图床）
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**" }, // 开发环境：允许所有 HTTPS 图片
    ],
  },
};

export default nextConfig;
