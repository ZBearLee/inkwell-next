// src/components/header.tsx
// 站点头部导航（Server Component）
// 后续加鉴权后，这里会根据登录状态显示「登录/用户头像」

import Link from "next/link";
import { PenLine } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-zinc-900 dark:text-zinc-50">
          <PenLine className="h-5 w-5 text-blue-600" />
          Inkwell
        </Link>

        {/* 导航 */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            首页
          </Link>
          <Link href="/posts" className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            文章
          </Link>
        </nav>
      </div>
    </header>
  );
}
