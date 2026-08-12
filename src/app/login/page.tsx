"use client";

// src/app/login/page.tsx
// 登录页（Client Component）
//
// ==================== 为什么登录页是 Client Component? ====================
//
// 需要：
// 1. useState：管理 loading 状态、错误信息
// 2. 表单事件处理：onSubmit
// 3. 调用 Server Action：loginAction
//
// 为什么不用 Server Component + form action?
//   → Server Component 的 form action 提交后页面会刷新
//   → 想要无刷新 + loading 状态 + 错误提示，必须用 Client Component
//
// ==================== searchParams 处理 ====================
//
// 登录页可能被以下场景跳转过来：
//   /login                  → 普通登录
//   /login?registered=true  → 注册成功，提示去登录
//   /login?redirect=/profile → 登录后跳回原页面（proxy.ts 跳过来的）
//
// 在 Client Component 里读 searchParams 要用 useSearchParams
// 注意：用 useSearchParams 的组件必须包在 <Suspense> 里（Next.js 16 要求）
// 所以这里拆成 LoginPage（外壳）+ LoginForm（实际内容）

import { useState, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { loginAction } from "@/actions/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "true";
  const redirectTo = searchParams.get("redirect") || "/";

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setError("");
    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result.success) {
        setError(result.error ?? "登录失败");
      }
      // 成功时 loginAction 内部会 redirect，不会走到这里
    });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
          <LogIn className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          登录
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          登录后可以评论文章、发布内容
        </p>
      </div>

      {/* 注册成功提示 */}
      {isRegistered && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
          注册成功！请使用刚注册的账号登录
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 隐藏字段：登录后跳转地址 */}
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={isPending}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition-all placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            disabled={isPending}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition-all placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50"
            placeholder="••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "登录中..." : "登录"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        还没有账号？{" "}
        <Link href="/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          注册
        </Link>
      </p>

      {/* 账号提示（开发用，生产删除）*/}
      <div className="mt-8 rounded-lg border border-dashed border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <p className="mb-1 font-medium">默认账号：</p>
        <p>用户：author@inkwell.dev / author123</p>
        <p>管理员：admin@inkwell.dev / admin123</p>
      </div>
    </div>
  );
}

// 默认导出：用 Suspense 包裹 LoginForm
// useSearchParams 要求组件在 Suspense 边界内，否则 build 时报错
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
