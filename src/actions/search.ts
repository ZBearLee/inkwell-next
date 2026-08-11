// src/actions/search.ts
// 搜索 Server Actions
//
// ==================== 为什么用 Server Actions 而非 API Route? ====================
//
// 1. 类型安全：参数和返回值有完整 TypeScript 类型，前后端共享
// 2. 无需手写 fetch：客户端直接调用函数，Next.js 自动处理网络请求
// 3. 安全性：Server Action 默认走 POST 请求，带 CSRF 保护
// 4. 无需暴露 API 端点：搜索逻辑不暴露为公开 API
// 5. 与 RSC 集成：可在 Server Component 中直接调用
//
// ==================== 何时用 Server Action 何时直接调数据层? ====================
//
// 两种做法都合理，本项目选择"统一走 Server Action"以保持一致性：
//
//  一致性：所有查询（搜索建议 + 搜索结果）都走 action，风格统一
//  参数校验集中：长度限制、类型检查都在 action 层，不散落在各调用点
//  未来扩展：想给客户端组件复用查询逻辑时，已有 action 可直接用
//
// 对比"Server Component 直接调数据层"：
//   少一层函数调用，但同进程开销几乎无感
//   适合超大型项目追求极致性能时考虑
//
// ==================== 对比 API Route ====================
//
// Server Action:
//   客户端调用 → Next.js 自动序列化 → 服务端执行 → 自动反序列化返回
//   无需手写 fetch、无需处理 JSON、类型安全
//
// API Route:
//   客户端 fetch("/api/search?q=xxx") → 手动处理请求 → 返回 JSON
//   需要手写 fetch、处理 JSON、类型断言
//
// ==================== 何时用 API Route? ====================
//
// - 需要被第三方调用（如 webhook、外部 API）
// - 需要特定的 HTTP 方法语义（GET 用于幂等查询）
// - 需要流式响应（SSE、streaming）

"use server";

import { searchPosts, searchSuggestions } from "@/lib/post";
import type { SearchResultItem } from "@/lib/post";

// ==================== 搜索结果 Server Action ====================

/**
 * 搜索文章 Server Action
 *
 * 用于搜索结果页（Server Component）和未来可能的客户端搜索。
 *
 * 调用方式：
 *   const result = await searchPostsAction("React", 1);
 *
 * @param query 搜索关键词
 * @param page 页码
 * @returns 搜索结果（含分页信息）
 */
export async function searchPostsAction(
  query: string,
  page: number = 1,
): Promise<{
  posts: SearchResultItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  // 参数校验（防止恶意调用）
  if (typeof query !== "string" || query.length > 100) {
    return { posts: [], total: 0, totalPages: 0, currentPage: page };
  }

  if (typeof page !== "number" || page < 1 || page > 1000) {
    page = 1;
  }

  return searchPosts(query, page);
}

// ==================== 搜索建议 Server Action ====================

/**
 * 搜索建议 Server Action（用于输入框下拉提示）
 *
 * 客户端调用方式：
 *   const suggestions = await searchSuggestionsAction("React");
 *
 * 返回最多 5 条建议，每条含 slug + title + excerpt
 */
export async function searchSuggestionsAction(
  query: string,
): Promise<{ slug: string; title: string; excerpt: string }[]> {
  // 参数校验
  if (typeof query !== "string" || query.length > 100) {
    return [];
  }

  return searchSuggestions(query);
}
