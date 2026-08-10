// src/components/pagination.tsx
// 分页组件（Server Component）
// 设计要点：
// 1. URL query 驱动（?page=2）→ 可分享、可后退、SEO 友好
// 2. 用 <Link> 而非 onClick → 服务端渲染直出，无需客户端 JS
// 3. 保留现有 query 参数（如 ?category=frontend&page=2）
// 为什么分页用 URL query 而非 useState？// useState 刷新页面后丢失，URL query 持久化且可分享

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  // 基础路径，如 "/posts"、"/category/frontend"
  basePath: string;
  // 额外 query 参数（如 { category: "frontend" }），会拼到 URL 里
  searchParams?: Record<string, string | undefined>;
}

/**
 * 构建分页 URL
 * 例：basePath="/posts", page=2, searchParams={category:"frontend"}
 * → "/posts?category=frontend&page=2"
 */
function buildPageUrl(basePath: string, page: number, searchParams?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  // 先写入已有参数（排除 page，避免重复）
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") {
        params.set(key, value);
      }
    }
  }
  // page=1 时不带 query（规范化 URL，避免 /posts?page=1 和 /posts 重复）
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * 生成页码数组（含省略号）
 * 例：currentPage=1, totalPages=10 → [1, 2, 3, "...", 10]
 * 例：currentPage=5, totalPages=10 → [1, "...", 4, 5, 6, "...", 10]
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  // 总页数 ≤ 7 时全部展示
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  // 中间区域：当前页左右各 1 页
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (end < totalPages - 1) pages.push("...");

  pages.push(totalPages);
  return pages;
}

export function Pagination({ currentPage, totalPages, basePath, searchParams }: PaginationProps) {
  // 只有 1 页时不渲染分页
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="分页导航">
      {/* 上一页 */}
      {hasPrev ? (
        <Link
          href={buildPageUrl(basePath, currentPage - 1, searchParams)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-700" aria-disabled="true">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {/* 页码 */}
      {pageNumbers.map((page, idx) => {
        if (page === "...") {
          return (
            <span key={`ellipsis-${idx}`} className="inline-flex h-10 w-10 items-center justify-center text-zinc-400">
              ...
            </span>
          );
        }
        const isActive = page === currentPage;
        return (
          <Link
            key={page}
            href={buildPageUrl(basePath, page, searchParams)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {page}
          </Link>
        );
      })}

      {/* 下一页 */}
      {hasNext ? (
        <Link
          href={buildPageUrl(basePath, currentPage + 1, searchParams)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-700" aria-disabled="true">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
