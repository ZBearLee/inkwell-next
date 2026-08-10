import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";

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
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          <p>Inkwell-next — 基于 Next.js 16 的技术博客 CMS</p>
        </footer>
      </body>
    </html>
  );
}