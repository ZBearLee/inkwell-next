// src/lib/markdown.ts
// Markdown 渲染层（服务端函数）
//
// 设计意图：把 Markdown 原文转成带代码高亮的 HTML 字符串
// 为什么在服务端渲染？
//   1. 零客户端 JS：shiki/rehype 体积大（~1MB），打包到客户端会拖慢首屏
//   2. SEO 友好：服务端输出 HTML，爬虫直接看到内容
//   3. 缓存友好：渲染结果可缓存，避免每次请求重复渲染
//
// 渲染管道（unified 链式处理）：
//   Markdown 原文
//     → remark-parse      解析成 Markdown AST (mdast)
//     → remark-gfm        支持 GFM（表格、任务列表、删除线等）
//     → remark-rehype     mdast → hast（HTML AST）
//     → rehype-slug       给 h2/h3 加 id（用于 TOC 锚点跳转）
//     → rehype-autolink-headings  标题加可点击的 # 锚点链接
//     → rehype-highlight  代码高亮（用 shiki）
//     → rehype-stringify  hast → HTML 字符串

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";

// 缓存 processor 实例，避免每次渲染都重新初始化（shiki 初始化需加载语言定义）
// 用 any 类型避免 unified 复杂的泛型推断问题
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let processor: any = null;

/**
 * 自定义 rehype 插件：给每个 <pre> 注入复制按钮
 *
 * 为什么用 rehype 插件而不是客户端 JS 注入？
 * 1. 按钮是服务端渲染的（SSR HTML 中就有），无闪烁
 * 2. 符合 React 声明式理念，不手动操作 DOM
 * 3. 客户端只需事件委托处理点击，不创建 DOM 元素
 *
 * 生成的 HTML 结构：
 * <pre>
 *   <code>...</code>
 *   <button class="copy-button" aria-label="复制代码">复制</button>
 * </pre>
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rehypeCopyButton() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    visit(tree, "element", (node: any) => {
      if (node.tagName === "pre") {
        // 给 <pre> 加 position: relative（CSS 需要）
        if (!node.properties) node.properties = {};
        if (!node.properties.className) node.properties.className = [];
        if (!node.properties.className.includes("has-copy-button")) {
          node.properties.className.push("has-copy-button");
        }

        // 在 <pre> 末尾追加 <button>
        node.children = node.children || [];
        node.children.push({
          type: "element",
          tagName: "button",
          properties: {
            className: ["copy-button"],
            ariaLabel: "复制代码",
            type: "button",
          },
          children: [{ type: "text", value: "复制" }],
        });
      }
    });
  };
}

/**
 * 获取处理管道（单例）
 * shiki 初始化开销大，复用同一个 processor 提升性能
 */
function getProcessor() {
  if (!processor) {
    processor = unified()
      .use(remarkParse)                    // Markdown → mdast
      .use(remarkGfm)                      // 支持 GFM 扩展语法
      .use(remarkRehype)                   // mdast → hast
      .use(rehypeSlug)                     // 给标题加 id
      .use(rehypeAutolinkHeadings, {       // 标题加 # 锚点链接
        behavior: "wrap",                  // 用 <a> 包裹整个标题文字
        properties: { className: ["heading-anchor"] },
      })
      .use(rehypeShiki, {                  // 代码高亮
        theme: "github-dark-dimmed",       // 暗色主题，搭配 dark 模式
      })
      .use(rehypeCopyButton)               // 注入代码块复制按钮（自定义插件）
      .use(rehypeStringify);               // hast → HTML 字符串
  }
  return processor;
}

/**
 * 把 Markdown 渲染成 HTML 字符串
 * @param markdown Markdown 原文
 * @returns HTML 字符串（含代码高亮 + 标题锚点）
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const p = getProcessor();
  const file = await p.process(markdown);
  return String(file);
}

/**
 * 从 Markdown 提取标题（用于 TOC 文章目录）
 * 简单实现：正则匹配 ## 和 ### 标题
 * 正式实现可用 mdast-util-toc，但为了简单先这样
 *
 * @returns 标题数组：{ level, text, slug }
 *   - level: 2 或 3（h2/h3）
 *   - text: 标题文字
 *   - slug: 锚点 id（与 rehype-slug 生成的一致，用 github-slugger 规则）
 */
export interface TocItem {
  level: number;
  text: string;
  slug: string;
}

export function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split("\n");
  const toc: TocItem[] = [];

  // 匹配 ## 和 ### 开头的标题（不匹配 # 一级标题，因为文章标题用 H1）
  const headingRegex = /^(#{2,3})\s+(.+)$/;

  for (const line of lines) {
    const match = line.match(headingRegex);
    if (match) {
      const level = match[1].length;        // 2 或 3
      const text = match[2].trim();
      // 生成 slug：与 rehype-slug 一致（小写、空格转横线、去特殊字符）
      const slug = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")  // 保留中英文、数字、空格、横线
        .replace(/\s+/g, "-");
      toc.push({ level, text, slug });
    }
  }

  return toc;
}
