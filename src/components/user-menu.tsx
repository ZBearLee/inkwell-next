"use client";

// src/components/user-menu.tsx
// 用户菜单（Client Component）
//
// ==================== 为什么是 Client Component? ====================
//
// 需要：
// 1. useState：管理下拉菜单开关
// 2. 调用 signOut：登出操作（signOut 是 client 端函数）
// 3. 点击外部关闭：useEffect + 事件监听
//
// ==================== props 数据来自哪里? ====================
//
// user 对象由 Header（Server Component）传入
// Header 用 await auth() 拿到 session.user，作为 props 传给本组件
// 这是 RSC 嵌套模式：Server 查数据 → props 传 Client

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, Settings, FileText } from "lucide-react";
import { signOutAction } from "@/actions/auth";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    username?: string;
    image?: string | null;
    role?: string;
  };
}

// signOutAction 是 Server Action（定义在 actions/auth.ts）
// Client Component 通过 form action 调用，不能直接 await

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 显示名：优先 name，其次 username，最后 email
  const displayName = user.name || user.username || user.email || "用户";
  // 头像首字母
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div ref={menuRef} className="relative shrink-0">
      {/* 头像按钮 */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
        aria-label="用户菜单"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {/* 用户信息 */}
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {displayName}
            </p>
            {user.email && (
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {user.email}
              </p>
            )}
            {user.role && user.role !== "USER" && (
              <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {user.role === "ADMIN" ? "管理员" : user.role === "AUTHOR" ? "作者" : user.role}
              </span>
            )}
          </div>

          {/* 菜单项 */}
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <User className="h-4 w-4" />
            个人中心
          </Link>

          <Link
            href={`/u/${user.username}`}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <FileText className="h-4 w-4" />
            我的主页
          </Link>

          {(user.role === "ADMIN" || user.role === "AUTHOR") && (
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Settings className="h-4 w-4" />
              后台管理
            </Link>
          )}

          {/* 分隔线 */}
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

          {/* 登出（用 form action 调用 Server Action）*/}
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <LogOut className="h-4 w-4" />
              登出
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
