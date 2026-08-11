// src/app/api/auth/[...all]/route.ts
// NextAuth Route Handler（v5 写法）
//
// ==================== 为什么只需要一行? ====================
//
// v4 时代：这个文件要写完整的 NextAuth 配置
// v5 时代：配置抽到 src/auth.ts，这里只做"转发"
//
// [...all] 是 catch-all 路由，匹配 /api/auth/signin、/api/auth/callback/*、
// /api/auth/signout 等所有 NextAuth 内置路径
//
// NextAuth 内部根据请求路径和方法自动路由到对应的 handler

import { handlers } from "@/auth";

// 解构出 GET 和 POST 两个方法
// NextAuth 内部根据 URL 自动判断该用哪个：
//   GET  /api/auth/providers   → 列出所有 provider
//   GET  /api/auth/session     → 返回当前 session
//   POST /api/auth/callback/credentials → 处理登录表单提交
//   POST /api/auth/signout     → 处理登出
export const { GET, POST } = handlers;
