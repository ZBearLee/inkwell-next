// src/proxy.ts
// 路由保护（Next.js 16 用 proxy.ts 替代 middleware.ts）
//
// ==================== proxy.ts vs middleware.ts====================
//
// Next.js 16 把 middleware.ts 重命名为 proxy.ts：
//   - 作用完全相同：在请求到达页面前的拦截层
//   - 运行在 Edge Runtime（轻量、快、但不能用 Node API）
//   - 可以做：路由保护、重写、重定向、设置请求头
//
// 为什么改名?
//   → "middleware" 容易和 Express middleware 混淆
//   → "proxy" 更准确描述其本质：请求代理/拦截
//
// ==================== NextAuth v5 + proxy 的两种写法 ====================
//
// 写法 1：直接导出 auth（简单但灵活性差）
//   export { auth as proxy } from "@/auth"
//   → 只能用 authorized callback 控制，不能自定义 matcher
//
// 写法 2：自定义 proxy 函数（本项目用）
//   → 可以精细控制哪些路径需要保护
//   → 可以读 session 后做条件跳转
//   → 灵活性高，适合复杂权限场景

import { auth } from "@/auth";
import { NextResponse } from "next/server";

// ==================== 需要登录才能访问的路径 ====================
// 用正则匹配，方便扩展
const protectedPaths = [
  "/profile",        // 用户中心
  "/dashboard",      // 作者后台
  "/settings",       // 设置
];

// ==================== 已登录用户不应该访问的路径 ====================
// 比如登录页、注册页，已登录就跳到首页
const authPages = [
  "/login",
  "/register",
];

export default auth(async (req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  // 当前请求路径
  const pathname = nextUrl.pathname;

  // ---------- 1. 检查受保护路径 ----------
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtectedPath && !isLoggedIn) {
    // 未登录访问受保护页面 → 跳转到登录页
    // 带 redirect 参数，登录后跳回原页面
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ---------- 2. 检查已登录用户访问登录/注册页 ----------
  const isAuthPage = authPages.some((p) => pathname.startsWith(p));

  if (isAuthPage && isLoggedIn) {
    // 已登录还去登录页 → 直接回首页
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // ---------- 3. 其他情况放行 ----------
  return NextResponse.next();
});

// ==================== matcher：哪些路径触发 proxy ====================
// 配置只匹配需要 proxy 的路径，避免所有请求都走一遍（影响性能）
//
// matcher 语法：
//   /            → 匹配所有路径
//   /profile     → 只匹配 /profile
//   /profile/:path* → 匹配 /profile 及其所有子路径
//
// 排除的路径（用 negative lookahead）：
//   - api/auth/*     → NextAuth 内部 API，不能拦截（否则登录功能挂掉）
//   - _next/*        → Next.js 静态资源
//   - favicon.ico    → 网站图标
export const config = {
  matcher: [
    // 匹配所有路径，但排除：
    // - /api/auth/* (NextAuth 路由)
    // - /_next/* (Next.js 静态资源)
    // - /favicon.ico, /*.png, /*.jpg 等静态文件
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
