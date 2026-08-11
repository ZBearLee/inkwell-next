// src/components/highlight.tsx
// 关键词高亮组件
//
// 为什么单独抽这个组件?
// → 需要把匹配的关键词用 <mark> 标签包裹
// → 不能用 dangerouslySetInnerHTML（用户输入的 query 不可信，有 XSS 风险）
// → 用 React JSX 安全地拆分文本

import { Fragment } from "react";

interface HighlightProps {
  text: string;
  query: string;
}

/**
 * 高亮文本中的关键词
 *
 * 实现思路：
 * 1. 用正则把文本按关键词拆分成多段
 * 2. 匹配的段用 <mark> 包裹
 * 3. 非匹配段原样显示
 *
 * 安全性：
 * - 不用 dangerouslySetInnerHTML，避免 XSS
 * - query 经过正则转义，防止注入
 */
export function Highlight({ text, query }: HighlightProps) {
  const q = query.trim();
  if (!q) return <>{text}</>;

  // 转义正则特殊字符（如 . * + ? 等），防止注入
  const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 全局匹配 + 大小写不敏感
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        // 与 query 不区分大小写比较，判断是否是匹配段
        if (part.toLowerCase() === q.toLowerCase()) {
          return (
            <mark
              key={i}
              className="rounded bg-yellow-100 px-0.5 text-zinc-900 dark:bg-yellow-900/50 dark:text-yellow-100"
            >
              {part}
            </mark>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
