// src/components/header.tsx
// 站点头部导航（Server Component）
// 包含 Logo、导航链接、搜索框
// 搜索框是 Client Component，作为子组件嵌入（RSC 可包含 CC）

import Link from "next/link";
import { PenLine } from "lucide-react";
import { SearchBox } from "@/components/search-box";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-bold text-lg text-zinc-900 dark:text-zinc-50"
        >
          <PenLine className="h-5 w-5 text-blue-600" />
          Inkwell
        </Link>

        {/* 导航 */}
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link
            href="/"
            className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            首页
          </Link>
          <Link
            href="/posts"
            className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            文章
          </Link>
        </nav>

        {/* 搜索框（Client Component）*/}
        <div className="ml-auto w-full max-w-xs">
          <SearchBox />
        </div>
      </div>
    </header>
  );
}
