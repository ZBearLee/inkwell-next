// src/lib/validations/profile.ts
// 用户资料相关 Zod schema（前后端共享）
//
// ==================== 为什么从 actions/profile.ts 移出来? ====================
//
// actions/profile.ts 顶部有 "use server"，Next.js 规定：
//   "use server" 文件只能 export async 函数
//   不能 export 对象、常量、类型等非函数值
//
// updateProfileSchema 是 Zod 对象（非 async 函数），不能放在 "use server" 文件里
// 移到独立的 validations 文件，前后端都可安全 import

import { z } from "zod";

// ==================== 资料更新 Schema ====================
// name：可选，最长 50 字符（显示名，可以是中文）
// bio：可选，最长 200 字符（个人简介）
// image：可选，必须是合法 URL（头像地址）
export const updateProfileSchema = z.object({
  name: z.string().max(50, "昵称最多 50 个字符").optional().nullable(),
  bio: z.string().max(200, "简介最多 200 个字符").optional().nullable(),
  image: z.string().url("头像必须是合法 URL").optional().nullable().or(z.literal("")),
});

// 自动推导类型
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
