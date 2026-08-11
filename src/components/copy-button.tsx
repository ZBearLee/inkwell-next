"use client";

// src/components/copy-button.tsx
// 代码块复制按钮的交互逻辑（Client Component）
//
// 改进点（对比旧实现）：
// 1. 不手动创建 DOM 元素 —— 按钮由 rehype 插件在服务端渲染生成
// 2. 用事件委托 —— 在 document 上监听点击，而非每个按钮单独 addEventListener
// 3. 正确清理 —— useEffect return 中移除监听器，无内存泄漏
// 4. 按钮在 SSR HTML 中就有 —— 无客户端 JS 执行前的闪烁
//
// 事件委托的优势：
// - 只需一个监听器，不论页面有多少代码块
// - 动态新增的代码块（如未来支持实时编辑）也能自动响应

import { useEffect } from "react";

export function CopyButton() {
  useEffect(() => {
    // 事件处理函数：判断点击的是否是复制按钮
    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 用 closest 判断：点击按钮本身或其子元素都算
      const button = target.closest(".copy-button") as HTMLButtonElement | null;
      if (!button) return;

      // 找到按钮所在的 <pre>，再找其中的 <code> 获取代码内容
      const pre = button.closest("pre");
      if (!pre) return;

      const code = pre.querySelector("code");
      const text = code?.textContent ?? "";

      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "已复制!";
        setTimeout(() => {
          button.textContent = "复制";
        }, 2000);
      } catch (err) {
        console.error("复制失败:", err);
        button.textContent = "复制失败";
        setTimeout(() => {
          button.textContent = "复制";
        }, 2000);
      }
    };

    // 事件委托：在 document 上监听，不需要给每个按钮单独绑定
    document.addEventListener("click", handleClick);

    // 清理函数：组件卸载时移除监听器（避免内存泄漏）
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  // 组件本身不渲染可见内容
  // 按钮的 HTML 由 rehype 插件在 Markdown 渲染时生成
  return null;
}
