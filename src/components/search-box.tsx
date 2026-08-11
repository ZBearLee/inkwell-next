"use client";

// src/components/search-box.tsx
// 搜索输入框组件（Client Component）
//
// ==================== 为什么是 Client Component? ====================
//
// 需要以下客户端能力：
// 1. useState：管理输入值、搜索建议、loading 状态
// 2. useEffect：防抖定时器
// 3. 事件处理：onChange、onClick、键盘事件
// 4. 调用 Server Action：searchSuggestionsAction
//
// ==================== 防抖 vs 节流 ====================
//
// 防抖（debounce）：连续输入时只在停止后触发一次
//   适合搜索：用户输入 "React" 时，只在停止输入后触发一次查询
//
// 节流（throttle）：固定时间间隔触发一次
//   适合滚动：滚动事件中每 200ms 最多触发一次
//
// 搜索场景选防抖：避免每次按键都查询数据库
//
// ==================== useTransition ====================
//
// 用 useTransition 把搜索建议查询标记为非紧急更新：
// - 输入框响应是紧急更新（高优先级）
// - 搜索建议是非紧急更新（可被中断）
// - 用户快速输入时，旧的查询会被取消，避免结果错乱

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";
import { searchSuggestionsAction } from "@/actions/search";

interface Suggestion {
  slug: string;
  title: string;
  excerpt: string;
}

export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ==================== 防抖搜索建议 ====================
  useEffect(() => {
    // 清除上一次的定时器（防抖核心：取消未执行的调用）
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const q = query.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // 300ms 防抖：用户停止输入 300ms 后才触发查询
    debounceTimer.current = setTimeout(() => {
      // 用 startTransition 包裹，标记为非紧急更新
      startTransition(async () => {
        const results = await searchSuggestionsAction(q);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      });
    }, 300);

    // 清理函数：组件卸载时清除定时器
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  // ==================== 点击外部关闭下拉 ====================
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==================== 提交搜索（跳转结果页）====================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  // ==================== 清空输入 ====================
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder="搜索文章..."
            // 边框策略：只用单层 border，聚焦时改色 + box-shadow 光晕（不用 ring 避免和 border 叠加）
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-9 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-500"
            aria-label="搜索文章"
          />
          {/* loading 指示器 */}
          {isPending && (
            <Loader2 className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
          )}
          {/* 清空按钮 */}
          {query && !isPending && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="清空"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* ==================== 搜索建议下拉 ==================== */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {suggestions.map((s) => (
            <Link
              key={s.slug}
              href={`/posts/${s.slug}`}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {s.title}
              </div>
              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {s.excerpt}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
