import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 站点元数据：影响浏览器标签页标题、SEO、社交分享卡片
export const metadata: Metadata = {
  title: {
    default: "Inkwell-next — 技术博客 CMS",
    template: "%s | Inkwell-next",  // 子页面用：子页面 title 会变成 "xxx | Inkwell-next"
  },
  description: "基于 Next.js 16 构建的技术博客 CMS，探索 RSC、渲染策略与全栈实践",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}