// src/types/next-auth.d.ts
// NextAuth 类型扩展
//
// ==================== 为什么要扩展类型? ====================
//
// 默认 session.user 只有 name / email / image 三个字段（NextAuth 内置）
// 我们想在 session.user 上访问 id / role / username
// 不扩展类型的话 TypeScript 会报错："Property 'role' does not exist on type 'User'"
//
// ==================== 模块 augmentation 机制 ====================
//
// TypeScript 的 "module augmentation" 语法：
//   declare module "next-auth" { interface User { ... } }
// 会和 NextAuth 内置的 User 接口合并（而不是覆盖）
// 这样 User 类型就有了 id / role / username 字段
//
// ==================== 三个扩展点 ====================
//
// 1. User：authorize 返回的 user 对象类型
// 2. Session：await auth() 拿到的 session 类型
// 3. JWT：token 的类型（jwt callback 里操作）

import { type DefaultSession } from "next-auth";
import { type Role } from "@/generated/prisma";

// ==================== 1. 扩展 User 类型 ====================
declare module "next-auth" {
  interface User {
    // DefaultSession["User"] 已含 name / email / image
    // 我们额外加 id / role / username
    id: string;
    role: Role;
    username: string;
  }

  // ==================== 2. 扩展 Session 类型 ====================
  interface Session {
    user: {
      id: string;
      role: Role;
      username: string;
    } & DefaultSession["user"];
  }
}

// ==================== 3. 扩展 JWT 类型 ====================
// 注意：@auth/core 的 JWT 接口 extends Record<string, unknown>
// TypeScript 的索引签名会让 module augmentation 添加的属性也变成 unknown
// 所以这里用自定义类型，在 auth.ts 里用断言方式使用
//
// 这是 Auth.js v5 beta 的已知类型局限
// 官方在 v5 stable 里会改进，目前需要开发者手动断言
export interface ExtendedJWT {
  id: string;
  role: Role;
  username: string;
  // DefaultJWT 的字段
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  sub?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}
