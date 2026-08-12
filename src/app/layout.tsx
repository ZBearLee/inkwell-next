import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { ScrollReset } from "@/components/scroll-reset";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 站点元数据：影响浏览器标签页标题、SEO、社交分享卡片
//
// metadataBase：OG/Twitter 卡片里的图片 URL 需要绝对路径
//   → 设置 metadataBase 后，相对路径会自动拼接成绝对 URL
//   → 不设的话社交分享卡片图片可能显示不出来
//
// openGraph：全局默认配置，子页面可通过 generateMetadata 覆盖
// twitter：Twitter 卡片配置，card 类型决定展示样式
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Inkwell-next — 技术博客 CMS",
    template: "%s | Inkwell-next",  // 子页面用：子页面 title 会变成 "xxx | Inkwell-next"
  },
  description: "基于 Next.js 16 构建的技术博客 CMS，探索 RSC、渲染策略与全栈实践",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Inkwell-next",
    title: "Inkwell-next — 技术博客 CMS",
    description: "基于 Next.js 16 构建的技术博客 CMS，探索 RSC、渲染策略与全栈实践",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inkwell-next — 技术博客 CMS",
    description: "基于 Next.js 16 构建的技术博客 CMS，探索 RSC、渲染策略与全栈实践",
  },
  alternates: {
    // RSS 订阅链接，搜索引擎和 RSS 阅读器会自动发现
    types: {
      "application/rss+xml": "/rss",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-screen overflow-hidden flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <ScrollReset />
        <Header />
        <main id="main-scroll" className="flex-1 overflow-y-auto">{children}</main>
        {/* <footer className="shrink-0 border-t border-zinc-200 py-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          <p>Inkwell-next — 基于 Next.js 16 的技术博客 CMS</p>
        </footer> */}
      </body>
    </html>
  );
}