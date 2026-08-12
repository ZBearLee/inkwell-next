// src/lib/utils.ts
// 通用工具函数

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type Role } from "@/generated/prisma";

/**
 * 合并 Tailwind CSS 类名
 * clsx：处理条件类名（false / undefined 会被过滤）
 * twMerge：解决 Tailwind 类名冲突（如 "px-2 px-4" → "px-4"）
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期：2026-08-10 → "2026 年 8 月 10 日"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 相对时间：刚刚 / 3 分钟前 / 2 小时前 / 3 天前 / 具体日期
 */
export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return formatDate(d);
}

/**
 * 角色中文标签映射
 * USER → 用户，ADMIN → 管理员
 *
 * 当前系统只有两种角色（USER / ADMIN），如未来扩展为更多角色（如 EDITOR），
 * 改这里一处即可（避免在每个页面重复 { USER: "...", ADMIN: "..." } 对象字面量）
 */
const ROLE_LABELS: Record<Role, string> = {
  USER: "用户",
  ADMIN: "管理员",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}
