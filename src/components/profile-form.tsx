"use client";

// src/components/profile-form.tsx
// 个人资料编辑表单（Client Component）
//
// ==================== 为什么是 Client Component? ====================
//
// 需要：
// 1. useState：管理输入值、loading、成功/错误提示
// 2. 表单事件处理：onChange、onSubmit
// 3. 调用 Server Action：updateProfileAction
//
// ==================== 受控 vs 非受控 ====================
//
// 这里用 defaultValue + ref 的非受控模式（useRef 读值）
// 而非 useState 受控模式，原因：
//   → 表单字段多时受控模式代码冗长
//   → 非受控性能更好（每次按键不触发 re-render）
//   → 提交时直接 new FormData(form) 一次性拿所有值
//
// 但用 useState 管理"提交状态"（loading/success/error）

import { useState, useTransition } from "react";
import { updateProfileAction } from "@/actions/profile";

interface ProfileFormProps {
  initialName: string;
  initialBio: string;
  initialImage: string;
}

export function ProfileForm({ initialName, initialBio, initialImage }: ProfileFormProps) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result.success) {
        setSuccess(true);
        // 3 秒后隐藏成功提示
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error ?? "更新失败");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 昵称 */}
      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          昵称
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={initialName}
          disabled={isPending}
          maxLength={50}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition-all placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50"
          placeholder="你的昵称（可为中文）"
        />
        <p className="mt-1 text-xs text-zinc-400">显示在评论和文章作者位置，最多 50 字符</p>
      </div>

      {/* 头像 URL */}
      <div>
        <label
          htmlFor="image"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          头像 URL
        </label>
        <input
          id="image"
          name="image"
          type="url"
          defaultValue={initialImage}
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition-all placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50"
          placeholder="https://example.com/avatar.jpg"
        />
        <p className="mt-1 text-xs text-zinc-400">留空则使用首字母头像</p>
      </div>

      {/* 个人简介 */}
      <div>
        <label
          htmlFor="bio"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          个人简介
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={initialBio}
          disabled={isPending}
          maxLength={200}
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition-all placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50"
          placeholder="一句话介绍自己..."
        />
        <p className="mt-1 text-xs text-zinc-400">最多 200 字符</p>
      </div>

      {/* 提示信息 */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          资料已更新 ✓
        </p>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "保存中..." : "保存资料"}
      </button>
    </form>
  );
}
