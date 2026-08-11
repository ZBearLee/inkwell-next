// src/actions/category.ts
// 分类管理 Server Actions（仅管理员）
//
// ==================== 设计要点 ====================
//
// 1. 权限校验：只有 ADMIN 可以管理分类
//    → 和 post.ts 的 AUTHOR/ADMIN 不同，分类是全局结构，作者无权修改
//    → 避免作者误改分类导致其他人的文章分类混乱
//
// 2. slug 唯一性：分类 slug 是 URL 路径（/category/[slug]），必须唯一
//
// 3. 删除保护：分类下有文章时不能直接删
//    → 需要先迁移文章到其他分类，或确认分类下无文章
//    → 避免 Prisma 级联删除导致文章丢失
//
// 4. revalidatePath：分类变化影响多处缓存
//    → / 首页侧边栏（分类导航 + 文章数统计）
//    → /category/[slug] 分类页
//    → /dashboard/categories 后台列表

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createCategorySchema,
  updateCategorySchema,
  formatCategoryErrors,
  type CategoryFieldErrors,
} from "@/lib/validations/category";

// ==================== 统一返回类型 ====================
interface CategoryActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: CategoryFieldErrors;
  categoryId?: string;
}

// ==================== 权限检查工具函数 ====================
/**
 * 检查当前用户是否为管理员
 *
 * 和 post.ts 的 checkPostPermission 区别：
 *   - post.ts 允许 AUTHOR 和 ADMIN
 *   - 分类管理只允许 ADMIN（分类是全局结构，作者无权改）
 */
async function checkAdminPermission(): Promise<{ userId: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") return null;
  return { userId: session.user.id };
}

// ==================== 刷新所有分类相关缓存 ====================
/**
 * 分类变化影响的页面：
 *   1. / 首页（侧边栏分类导航 + 文章数）
 *   2. /category/[slug] 分类页（文章列表会变）
 *   3. /dashboard/categories 后台列表
 *
 * 为什么不按 slug 精确刷新？
 *   → 侧边栏在所有页面都显示，分类数据是全局的
 *   → 用 layout 级刷新一次搞定
 */
function revalidateCategoryPaths() {
  revalidatePath("/", "layout"); // 侧边栏在 layout 里
  revalidatePath("/dashboard/categories");
}

// ==================== 创建分类 ====================
/**
 * 创建新分类（仅 ADMIN）
 *
 * 流程：
 *   1. 权限校验（ADMIN）
 *   2. Zod 校验
 *   3. slug 唯一性检查
 *   4. 写入数据库
 *   5. revalidatePath
 */
export async function createCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  // 1. 权限校验
  const perm = await checkAdminPermission();
  if (!perm) {
    return { success: false, error: "需要管理员权限" };
  }

  // 2. Zod 校验
  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || null,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "请检查输入",
      fieldErrors: formatCategoryErrors(parsed.error),
    };
  }

  const data = parsed.data;

  // 3. slug + name 唯一性检查
  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ slug: data.slug }, { name: data.name }],
    },
    select: { id: true, slug: true, name: true },
  });

  if (existing) {
    if (existing.slug === data.slug) {
      return {
        success: false,
        error: "slug 已被使用",
        fieldErrors: { slug: "该 slug 已存在，请修改" },
      };
    }
    return {
      success: false,
      error: "分类名称已存在",
      fieldErrors: { name: "该分类名称已存在" },
    };
  }

  // 4. 写入数据库
  try {
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description?.trim() || null,
      },
    });

    // 5. 刷新缓存
    revalidateCategoryPaths();

    return { success: true, categoryId: category.id };
  } catch (error) {
    console.error("创建分类失败:", error);
    return { success: false, error: "创建失败，请稍后重试" };
  }
}

// ==================== 更新分类 ====================
/**
 * 更新分类（仅 ADMIN）
 *
 * 权限：仅 ADMIN
 * slug 唯一性：排除自身（和 updatePostAction 一样的逻辑）
 */
export async function updateCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  // 1. 权限校验
  const perm = await checkAdminPermission();
  if (!perm) {
    return { success: false, error: "需要管理员权限" };
  }

  // 2. 提取 id
  const categoryId = formData.get("id") as string;
  if (!categoryId) {
    return { success: false, error: "缺少分类 id" };
  }

  // 3. Zod 校验
  const parsed = updateCategorySchema.safeParse({
    id: categoryId,
    name: formData.get("name") || undefined,
    slug: formData.get("slug") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "请检查输入",
      fieldErrors: formatCategoryErrors(parsed.error),
    };
  }

  const data = parsed.data;

  // 4. 查询原分类
  const existingCategory = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, slug: true, name: true },
  });

  if (!existingCategory) {
    return { success: false, error: "分类不存在" };
  }

  // 5. slug/name 唯一性检查（排除自身）
  if (data.slug && data.slug !== existingCategory.slug) {
    const slugConflict = await prisma.category.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (slugConflict && slugConflict.id !== categoryId) {
      return {
        success: false,
        error: "slug 已被使用",
        fieldErrors: { slug: "该 slug 已存在，请修改" },
      };
    }
  }

  if (data.name && data.name !== existingCategory.name) {
    const nameConflict = await prisma.category.findFirst({
      where: { name: data.name, NOT: { id: categoryId } },
      select: { id: true },
    });
    if (nameConflict) {
      return {
        success: false,
        error: "分类名称已存在",
        fieldErrors: { name: "该分类名称已存在" },
      };
    }
  }

  // 6. 构建更新数据
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null;
  }

  // 7. 更新
  try {
    await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
    });

    // 8. 刷新缓存
    revalidateCategoryPaths();
    // 如果 slug 变了，刷新旧 slug 和新 slug 的分类页
    if (data.slug && data.slug !== existingCategory.slug) {
      revalidatePath(`/category/${existingCategory.slug}`);
      revalidatePath(`/category/${data.slug}`);
    } else if (existingCategory.slug) {
      revalidatePath(`/category/${existingCategory.slug}`);
    }

    return { success: true, categoryId };
  } catch (error) {
    console.error("更新分类失败:", error);
    return { success: false, error: "更新失败，请稍后重试" };
  }
}

// ==================== 删除分类 ====================
/**
 * 删除分类（仅 ADMIN）
 *
 * 删除保护：
 *   → 如果分类下有文章，拒绝删除（防止文章丢失）
 *   → 管理员需要先迁移文章到其他分类，再删除空分类
 *
 * 为什么不用级联删除？
 *   → Prisma schema 中 Category.posts 是默认关系（无 onDelete: Cascade）
 *   → 直接删会导致外键约束错误
 *   → 即使设了级联删除，也会把文章全删了，太危险
 *   → 更安全的做法：拒绝删除非空分类
 */
export async function deleteCategoryAction(
  categoryId: string,
): Promise<CategoryActionResult> {
  // 1. 权限校验
  const perm = await checkAdminPermission();
  if (!perm) {
    return { success: false, error: "需要管理员权限" };
  }

  // 2. 查询分类
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      slug: true,
      _count: { select: { posts: true } },
    },
  });

  if (!category) {
    return { success: false, error: "分类不存在" };
  }

  // 3. 删除保护：分类下有文章时拒绝删除
  if (category._count.posts > 0) {
    return {
      success: false,
      error: `该分类下有 ${category._count.posts} 篇文章，请先迁移文章后再删除`,
    };
  }

  // 4. 安全删除（此时分类下无文章）
  try {
    await prisma.category.delete({
      where: { id: categoryId },
    });

    // 5. 刷新缓存
    revalidateCategoryPaths();
    revalidatePath(`/category/${category.slug}`);

    return { success: true };
  } catch (error) {
    console.error("删除分类失败:", error);
    return { success: false, error: "删除失败，请稍后重试" };
  }
}
