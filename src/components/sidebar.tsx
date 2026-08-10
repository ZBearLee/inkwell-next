// src/components/sidebar.tsx
// 侧边栏组件（Server Component）
// 展示：分类导航（含文章数）+ 热门标签云
//
// Suspense 流式渲染：
// → 首页/列表页将 <Sidebar /> 包在 <Suspense> 中
// → 主内容（文章列表）先渲染，侧边栏异步加载不阻塞首屏
// → 侧边栏加载时显示 fallback 骨架屏

import Link from "next/link";
import { getSidebarData } from "@/lib/post";
import { cn } from "@/lib/utils";

// 标签字体大小映射（按文章数分级，营造"标签云"视觉层次）
function getTagSize(count: number): string {
  if (count >= 5) return "text-base";
  if (count >= 3) return "text-sm";
  return "text-xs";
}

export async function Sidebar() {
  const { categories, popularTags } = await getSidebarData();

  return (
    <aside className="space-y-8">
      {/* 分类导航 */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">分类</h2>
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/category/${category.slug}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                <span>{category.name}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {category._count.posts}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 热门标签 */}
      {popularTags.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">热门标签</h2>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className={cn(
                  "inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 font-medium text-zinc-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-blue-800 dark:hover:bg-blue-950 dark:hover:text-blue-300",
                  getTagSize(tag._count.posts),
                )}
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}

// 侧边栏骨架屏（Suspense fallback 用）
export function SidebarSkeleton() {
  return (
    <aside className="space-y-8 animate-pulse">
      <section>
        <div className="mb-4 h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/50" />
          ))}
        </div>
      </section>
      <section>
        <div className="mb-4 h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800/50" />
          ))}
        </div>
      </section>
    </aside>
  );
}
