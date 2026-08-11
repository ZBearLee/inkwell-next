// src/lib/validations/auth.ts
// 鉴权相关 Zod schema（前后端共享）
//
// ==================== 为什么从 actions/auth.ts 移出来? ====================
//
// actions/auth.ts 顶部有 "use server"，Next.js 规定：
//   "use server" 文件只能 export async 函数
//   不能 export 对象、常量、类型等非函数值
//
// registerSchema 是 Zod 对象（非 async 函数），不能放在 "use server" 文件里
// 移到独立的 validations 文件，前后端都可安全 import

import { z } from "zod";

// ==================== 注册 Schema ====================
// 前后端共享：注册页表单 + registerAction 都用这个
export const registerSchema = z.object({
  username: z
    .string()
    .min(2, "用户名至少 2 个字符")
    .max(20, "用户名最多 20 个字符")
    .regex(/^[a-zA-Z0-9_-]+$/, "用户名只能包含字母、数字、下划线、连字符"),
  email: z.string().email("邮箱格式不正确"),
  password: z
    .string()
    .min(6, "密码至少 6 个字符")
    .max(72, "密码最多 72 个字符（bcrypt 限制）"),
});

// 自动推导类型
export type RegisterInput = z.infer<typeof registerSchema>;
