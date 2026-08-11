"use client";

// src/app/register/page.tsx
// 注册页（Client Component）
//
// ==================== 为什么注册页是 Client Component? ====================
//
// 和登录页同样的原因：
// 1. useState：管理 loading + 错误
// 2. 表单事件处理
// 3. 调用 Server Action：registerAction
//
// ==================== 客户端校验 vs 服务端校验 ====================
//
// 客户端校验（HTML required + pattern）：
//   → 快速反馈，不耗服务端资源
//   → 可被绕过（开发者工具改 HTML）
//
// 服务端校验（registerAction 里的 zod）：
//   → 安全可信，必须做
//   → 校验失败返回错误信息
//
// 两层都要做：客户端改善体验，服务端保证安全

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { registerAction } from "@/actions/auth";
import { registerSchema } from "@/lib/validations/auth";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // 客户端 zod 校验（和服务端用同一个 schema）
    const parsed = registerSchema.safeParse({
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    setFieldErrors({});
    setError("");

    if (!parsed.success) {
      // 把 zod 错误转成 field -> message 的映射
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const result = await registerAction(formData);
      if (!result.success) {
        setError(result.error ?? "注册失败");
      }
      // 成功时 registerAction 内部会 redirect 到 /login
    });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
          <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          注册
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          创建账号，开始你的写作之旅
        </p>
      </div>

      {/* 全局错误提示 */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            用户名
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={2}
            maxLength={20}
            pattern="[a-zA-Z0-9_-]+"
            disabled={isPending}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition-all placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50"
            placeholder="inkwriter"
          />
          {fieldErrors.username && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.username}</p>
          )}
        </div>

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
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
          )}
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
            minLength={6}
            maxLength={72}
            autoComplete="new-password"
            disabled={isPending}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition-all placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50"
            placeholder="至少 6 个字符"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "注册中..." : "注册"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        已有账号？{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          登录
        </Link>
      </p>
    </div>
  );
}
