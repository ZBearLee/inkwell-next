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
import { NavLinks } from "@/components/nav-links";
import { auth } from "@/auth";

export async function Header() {
  // Server Component 直接读 session
  const session = await auth();

  return (
    <header className="relative z-50 shrink-0 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-bold text-lg text-zinc-900 dark:text-zinc-50"
        >
          <PenLine className="h-5 w-5 text-blue-600" />
          Inkwell
        </Link>

        {/* 导航（Client Component — 需要高亮当前路由）*/}
        <NavLinks />

        {/* 搜索框（Client Component） */}
        {/* 移动端隐藏，节省空间避免挤压 Logo / 登录注册按钮 */}
        <div className="ml-auto hidden w-full max-w-xs sm:block">
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
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              注册
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
