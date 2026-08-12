"use client";

// src/components/reading-progress.tsx
// 阅读进度条（Client Component）
//
// ==================== 为什么是 Client Component? ====================
//
// 需要监听 scroll 事件，实时更新进度条宽度
// Server Component 无法监听 DOM 事件
//
// ==================== 实现原理 ====================
//
// 1. 监听 window scroll 事件
// 2. 计算当前滚动位置占可滚动总高度的比例
// 3. 更新进度条 width（0% → 100%）
// 4. 用 requestAnimationFrame 节流，避免 scroll 事件触发太频繁
//
// ==================== 为什么用 rAF 而非 debounce? ====================
//
// 滚动需要即时反馈，debounce 会有延迟感
// requestAnimationFrame 在浏览器下一次重绘前执行
// 既保证流畅度，又避免每帧都更新 DOM

import { useState, useEffect } from "react";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = document.getElementById("main-scroll");
    if (!container) return;

    const updateProgress = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;

      if (scrollHeight > 0) {
        setProgress(Math.min(100, (scrollTop / scrollHeight) * 100));
      }
    };

    container.addEventListener("scroll", updateProgress);
    updateProgress();

    return () => container.removeEventListener("scroll", updateProgress);
  }, []);

  return (
    <div className="fixed left-0 top-0 z-50 h-1 w-full bg-transparent">
      <div
        className="h-full bg-blue-600 transition-[width] duration-75 ease-out dark:bg-blue-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
