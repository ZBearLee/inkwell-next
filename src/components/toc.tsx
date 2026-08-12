"use client";

// src/components/toc.tsx
// 文章目录（Table of Contents）
// Client Component，需要监听滚动位置高亮当前标题
//
// 功能：
// 1. 展示文章的 H2/H3 标题列表
// 2. 点击跳转到对应标题
// 3. 滚动时高亮当前所在标题（scroll spy）
//
// 实现：
// - 用 IntersectionObserver 监听标题元素是否进入视口
// - 比监听 scroll 事件性能更好（浏览器优化过的 API）

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown";

interface TocProps {
  items: TocItem[];
}

export function Toc({ items }: TocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    // 收集所有标题元素
    const headings = items
      .map((item) => document.getElementById(item.slug))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    // 用 IntersectionObserver 监听标题进入/离开视口
    // root 设为 main 滚动容器（因为 main 区域独立滚动）
    const root = document.getElementById("main-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        // 找到当前最靠近视口顶部的可见标题
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root,
        rootMargin: "-20px 0px -70% 0px",
        threshold: 0,
      },
    );

    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, [items]);

  // 点击目录项：手动滚动 main 容器到目标标题
  // 不能用默认的 href="#slug" 跳转，因为滚动容器是 main（overflow-y-auto）而非 window
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    const target = document.getElementById(slug);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // 手动更新 URL hash（不触发默认滚动）
      history.replaceState(null, "", `#${slug}`);
      setActiveId(slug);
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className="space-y-1">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        目录
      </h2>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.slug}>
            <a
              href={`#${item.slug}`}
              onClick={(e) => handleClick(e, item.slug)}
              className={`toc-link ${activeId === item.slug ? "active" : ""} ${
                item.level === 3 ? "pl-5" : ""
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
