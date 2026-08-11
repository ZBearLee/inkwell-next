// src/lib/validations/category.ts
// 分类管理 Zod schema（前后端共享）
//
// ==================== 为什么单独放一个文件? ====================
//
// actions/category.ts 顶部有 "use server"，Next.js 规定：
//   "use server" 文件只能 export async 函数，不能 export 对象
// 所以 Zod schema 必须放在独立文件（和 post.ts / auth.ts 同样的模式）

import { z } from "zod";

// ==================== 创建分类 Schema ====================
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "分类名称不能为空")
    .max(50, "分类名称最多 50 个字符"),
  slug: z
    .string()
    .min(1, "slug 不能为空")
    .max(50, "slug 最多 50 个字符")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写字母、数字和连字符"),
  description: z
    .string()
    .max(200, "描述最多 200 个字符")
    .optional()
    .nullable(),
});

// ==================== 更新分类 Schema ====================
// 和创建类似，但所有字段可选（允许部分更新），id 必填
export const updateCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "分类名称不能为空").max(50).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写字母、数字和连字符")
    .optional(),
  description: z.string().max(200).optional().nullable(),
});

// ==================== 自动推导类型 ====================
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ==================== 表单错误类型 ====================
export type CategoryFieldErrors = Record<string, string>;

/**
 * 把 Zod 错误转成字段级错误对象（和 post.ts 的 formatZodErrors 逻辑一致）
 */
export function formatCategoryErrors(error: z.ZodError): CategoryFieldErrors {
  const errors: CategoryFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as string;
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
