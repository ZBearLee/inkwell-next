"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// 路由切换时重置 main 滚动容器到顶部
// 因为 main 区域独立滚动，Next.js 默认的 window scroll reset 不生效
export function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    document.getElementById("main-scroll")?.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
