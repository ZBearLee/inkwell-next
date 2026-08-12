// src/lib/validations/post.ts
// 文章相关 Zod schema（前后端共享）
//
// ==================== 为什么要共享 schema? ====================
//
// 传统做法：前端写一套校验（JS），后端写一套校验（JS），两边容易漂移
// Zod 共享：
//   1. 前端（Client Component）import 这个 schema 做即时校验
//   2. 后端（Server Action）import 同一个 schema 做权威校验
//   3. TypeScript 类型从 schema 自动推导（z.infer）
//
// 单一数据源（Single Source of Truth）：校验规则只在一处定义
// 改规则只需改这个文件，前后端自动同步

import { z } from "zod";

// ==================== 文章状态 ====================
// 和 Prisma schema 的 PostStatus 枚举对应
// DRAFT：草稿，只有作者本人可见
// PUBLISHED：已发布，所有人可见
export const postStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

// ==================== 创建文章 Schema ====================
// 用于：新建文章页表单校验 + createPost Server Action 校验
export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, "标题不能为空")
    .max(200, "标题最多 200 个字符"),
  slug: z
    .string()
    .min(1, "slug 不能为空")
    .max(200, "slug 最多 200 个字符")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写字母、数字和连字符"),
  excerpt: z
    .string()
    .min(1, "摘要不能为空")
    .max(500, "摘要最多 500 个字符"),
  content: z
    .string()
    .min(1, "内容不能为空")
    .max(100000, "内容过长"),
  coverImage: z
    .string()
    .url("封面图必须是合法 URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  categoryId: z
    .string()
    .min(1, "请选择分类"),
  tags: z
    .array(z.string())
    .max(5, "最多 5 个标签")
    .optional()
    .default([]),
  status: postStatusSchema.default("DRAFT"),
});

// ==================== 更新文章 Schema ====================
// 和创建类似，但所有字段都可选（允许只更新部分字段）
// id 必填（指定更新哪篇文章）
export const updatePostSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "标题不能为空").max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写字母、数字和连字符")
    .optional(),
  excerpt: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(100000).optional(),
  coverImage: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("")),
  categoryId: z.string().min(1).optional(),
  tags: z.array(z.string()).max(5).optional(),
  status: postStatusSchema.optional(),
});

// ==================== 自动保存 Schema ====================
// 轻量版：只保存标题、内容、摘要（元信息不自动保存）
// 避免 5 秒一次的自动保存传输太多数据
export const autoSaveSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).optional(),
  content: z.string().max(100000).optional(),
  excerpt: z.string().max(500).optional(),
});

// ==================== 自动推导 TypeScript 类型 ====================
// 从 Zod schema 推导类型，保证类型和校验规则一致
// 好处：改 schema → 类型自动更新，不用手动维护 interface
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type AutoSaveInput = z.infer<typeof autoSaveSchema>;

// ==================== 表单错误类型 ====================
// 用于把 Zod 错误转成 { fieldName: message } 的格式，方便前端展示
export type FieldErrors = Record<string, string>;

/**
 * 把 Zod 错误转成字段级错误对象
 *
 * @example
 * const parsed = createPostSchema.safeParse(data);
 * if (!parsed.success) {
 *   const errors = formatZodErrors(parsed.error);
 *   // { title: "标题不能为空", slug: "slug 只能包含..." }
 * }
 */
export function formatZodErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as string;
    // 只取第一个错误（避免同一字段多个错误堆叠）
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
