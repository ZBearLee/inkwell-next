// src/components/header.tsx
// 站点头部导航（Server Component）
// 包含 Logo、导航链接、搜索框、用户菜单
//
// ==================== Server Component 读 session ====================
//
// Header 是 Server Component，直接 await auth() 读 session
// 不需要 SessionProvider（那是给 Client Component 的 useSession 用的）
//
// 对比：
//   Server Component: const session = await auth()  ← 直接调用
//   Client Component: const { data: session } = useSession()  ← 需要 Provider
//
// 登出按钮是 Client Component（UserMenu），因为 signOut 要在 client 触发

import Link from "next/link";
import { PenLine } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { UserMenu } from "@/components/user-menu";
import { auth } from "@/auth";

export async function Header() {
  // Server Component 直接读 session
  const session = await auth();

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

        {/* 用户菜单 */}
        {/* 已登录：显示头像 + 下拉菜单（Client Component，因为要 signOut） */}
        {/* 未登录：显示登录/注册按钮（纯 Link，可以 Server Component） */}
        {session?.user ? (
          <UserMenu user={session.user} />
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              注册
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
