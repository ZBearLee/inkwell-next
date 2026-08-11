// src/actions/post.ts
// 文章管理 Server Actions（作者后台）
//
// ==================== 设计要点 ====================
//
// 1. 权限校验三重检查：
//    a. auth() 检查是否登录
//    b. session.user.role 检查是否 AUTHOR/ADMIN（USER 不能发文）
//    c. 更新/删除时检查 post.authorId === session.user.id（不能改别人的文章）
//    → ADMIN 可以管理所有文章（额外判断）
//
// 2. Zod 校验：用共享的 schema，前后端一致
//
// 3. revalidatePath：发布/删除后刷新相关页面缓存
//    → /dashboard/posts：我的文章列表
//    → /：首页文章流
//    → /posts/[slug]：文章详情页
//
// 4. 事务操作：更新标签涉及多表（Post + PostTag），需要原子操作
//    → Prisma 的 $transaction 保证一致性
//
// ==================== 为什么不在 proxy.ts 里校验角色? ====================
//
// proxy.ts 运行在 Edge Runtime，不能查数据库
// 角色校验需要读 session.user.role（JWT 里有），但更细粒度的权限
// （如"只能编辑自己的文章"）需要查数据库，只能在 Server Action 里做

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";
import { calculateReadTime } from "@/lib/post";
import {
  createPostSchema,
  updatePostSchema,
  autoSaveSchema,
  formatZodErrors,
  type FieldErrors,
} from "@/lib/validations/post";

// ==================== 统一返回类型 ====================
// 所有 Action 返回统一结构，前端处理一致
interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  postId?: string; // 创建/更新成功后返回文章 id（用于跳转）
}

// ==================== 权限检查工具函数 ====================
/**
 * 检查当前用户是否有发文权限
 * @returns { userId, role } 或 null（无权限）
 */
async function checkPostPermission(): Promise<
  { userId: string; role: string } | null
> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // 只有 AUTHOR 和 ADMIN 可以发文
  // USER 角色无权限（注册用户只能评论/点赞/收藏）
  if (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN") {
    return null;
  }

  return { userId: session.user.id, role: session.user.role };
}

// ==================== 创建文章 ====================
/**
 * 创建新文章
 *
 * 流程：
 *   1. 权限检查（登录 + AUTHOR/ADMIN 角色）
 *   2. Zod 校验
 *   3. 检查 slug 唯一性
 *   4. 计算阅读时长
 *   5. 写入数据库（Post + PostTag 关系）
 *   6. 如果是 PUBLISHED，设置 publishedAt
 *   7. revalidatePath 刷新缓存
 *
 * @param formData 表单数据
 * @returns { success, postId?, error?, fieldErrors? }
 */
export async function createPostAction(formData: FormData): Promise<ActionResult> {
  // 1. 权限检查
  const perm = await checkPostPermission();
  if (!perm) {
    return { success: false, error: "无发文权限，需要作者角色" };
  }

  // 2. 从 formData 提取并校验
  // tags 是多选，需要从 formData.getAll 提取
  const rawTags = formData.getAll("tags");
  const parsed = createPostSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    coverImage: formData.get("coverImage") || "",
    categoryId: formData.get("categoryId"),
    tags: rawTags.filter(Boolean), // 过滤空值
    status: formData.get("status") || "DRAFT",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "请检查输入",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  // 3. 检查 slug 唯一性
  const existing = await prisma.post.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      error: "slug 已被使用",
      fieldErrors: { slug: "该 slug 已存在，请修改" },
    };
  }

  // 4. 计算阅读时长
  const readTime = calculateReadTime(data.content);

  // 5. 写入数据库（用事务保证 Post + PostTag 原子写入）
  try {
    const post = await prisma.$transaction(async (tx) => {
      // 创建文章
      const newPost = await tx.post.create({
        data: {
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt,
          content: data.content,
          coverImage: data.coverImage || null,
          readTime,
          status: data.status,
          publishedAt: data.status === "PUBLISHED" ? new Date() : null,
          authorId: perm.userId,
          categoryId: data.categoryId,
        },
      });

      // 创建标签关联（如果有标签）
      if (data.tags.length > 0) {
        await tx.postTag.createMany({
          data: data.tags.map((tagId) => ({
            postId: newPost.id,
            tagId,
          })),
        });
      }

      return newPost;
    });

    // 6. 刷新缓存
    revalidatePath("/dashboard/posts");
    if (data.status === "PUBLISHED") {
      revalidatePath("/"); // 首页文章流
      revalidatePath(`/posts/${data.slug}`);
    }

    return { success: true, postId: post.id };
  } catch (error) {
    console.error("创建文章失败:", error);
    return { success: false, error: "创建失败，请稍后重试" };
  }
}

// ==================== 更新文章 ====================
/**
 * 更新文章（含草稿/发布状态切换）
 *
 * 权限：
 *   - 作者只能更新自己的文章
 *   - ADMIN 可以更新任何文章
 *
 * @param formData 表单数据（必须包含 id）
 */
export async function updatePostAction(formData: FormData): Promise<ActionResult> {
  // 1. 权限检查
  const perm = await checkPostPermission();
  if (!perm) {
    return { success: false, error: "无发文权限" };
  }

  // 2. 提取 id（更新操作必须指定）
  const postId = formData.get("id") as string;
  if (!postId) {
    return { success: false, error: "缺少文章 id" };
  }

  // 3. Zod 校验
  const rawTags = formData.getAll("tags");
  const parsed = updatePostSchema.safeParse({
    id: postId,
    title: formData.get("title") || undefined,
    slug: formData.get("slug") || undefined,
    excerpt: formData.get("excerpt") || undefined,
    content: formData.get("content") || undefined,
    coverImage: formData.get("coverImage") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    tags: rawTags.filter(Boolean),
    status: formData.get("status") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "请检查输入",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  const data = parsed.data;

  // 4. 查询原文章，做权限校验
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, slug: true, status: true },
  });

  if (!existingPost) {
    return { success: false, error: "文章不存在" };
  }

  // 非 ADMIN 只能改自己的文章
  if (perm.role !== "ADMIN" && existingPost.authorId !== perm.userId) {
    return { success: false, error: "无权修改他人的文章" };
  }

  // 5. 如果改了 slug，检查唯一性
  if (data.slug && data.slug !== existingPost.slug) {
    const slugConflict = await prisma.post.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (slugConflict && slugConflict.id !== postId) {
      return {
        success: false,
        error: "slug 已被使用",
        fieldErrors: { slug: "该 slug 已存在，请修改" },
      };
    }
  }

  // 6. 构建更新数据
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
  if (data.content !== undefined) {
    updateData.content = data.content;
    updateData.readTime = calculateReadTime(data.content);
  }
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage || null;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

  // 状态切换：DRAFT → PUBLISHED 时设置 publishedAt
  if (data.status !== undefined && data.status !== existingPost.status) {
    updateData.status = data.status;
    if (data.status === "PUBLISHED") {
      updateData.publishedAt = new Date();
    }
    // PUBLISHED → DRAFT 时不清除 publishedAt（保留首次发布时间）
  }

  // 7. 事务更新（文章 + 标签关联）
  try {
    await prisma.$transaction(async (tx) => {
      // 更新文章
      if (Object.keys(updateData).length > 0) {
        await tx.post.update({
          where: { id: postId },
          data: updateData,
        });
      }

      // 更新标签关联（先删后建）
      if (data.tags !== undefined) {
        await tx.postTag.deleteMany({ where: { postId } });
        if (data.tags.length > 0) {
          await tx.postTag.createMany({
            data: data.tags.map((tagId) => ({
              postId,
              tagId,
            })),
          });
        }
      }
    });

    // 8. 刷新缓存
    revalidatePath("/dashboard/posts");
    revalidatePath(`/dashboard/posts/${postId}/edit`);
    // 刷新旧 slug 和新 slug 的详情页
    if (existingPost.slug) {
      revalidatePath(`/posts/${existingPost.slug}`);
    }
    if (data.slug && data.slug !== existingPost.slug) {
      revalidatePath(`/posts/${data.slug}`);
    }
    revalidatePath("/"); // 首页文章流

    return { success: true, postId };
  } catch (error) {
    console.error("更新文章失败:", error);
    return { success: false, error: "更新失败，请稍后重试" };
  }
}

// ==================== 自动保存草稿 ====================
/**
 * 自动保存草稿（debounce 触发）
 *
 * 设计要点：
 *   1. 只保存 title/content/excerpt（元信息不自动保存）
 *   2. 不改变 status（不会把草稿自动发布）
 *   3. 不触发 revalidatePath（避免频繁刷新缓存影响性能）
 *   4. 返回保存时间戳，前端显示"已保存于 xx:xx"
 *
 * @param postId 文章 id
 * @param data 要保存的字段
 */
export async function autoSavePostAction(
  postId: string,
  data: { title?: string; content?: string; excerpt?: string },
): Promise<{ success: boolean; savedAt?: string }> {
  // 1. 权限检查
  const perm = await checkPostPermission();
  if (!perm) {
    return { success: false };
  }

  // 2. Zod 校验
  const parsed = autoSaveSchema.safeParse({ id: postId, ...data });
  if (!parsed.success) {
    return { success: false };
  }

  // 3. 权限校验：只能自动保存自己的文章
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!existing) return { success: false };
  if (perm.role !== "ADMIN" && existing.authorId !== perm.userId) {
    return { success: false };
  }

  // 4. 更新（只更新非空字段）
  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.content !== undefined) {
    updateData.content = parsed.data.content;
    updateData.readTime = calculateReadTime(parsed.data.content);
  }
  if (parsed.data.excerpt !== undefined) updateData.excerpt = parsed.data.excerpt;

  try {
    await prisma.post.update({
      where: { id: postId },
      data: updateData,
    });

    // 不触发 revalidatePath（自动保存太频繁，不刷新缓存）
    // 只有手动保存/发布时才刷新
    return {
      success: true,
      savedAt: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch (error) {
    console.error("自动保存失败:", error);
    return { success: false };
  }
}

// ==================== 删除文章 ====================
/**
 * 删除文章
 *
 * 权限：作者只能删自己的，ADMIN 可以删任何人的
 * 级联：schema 中定义了 onDelete: Cascade，评论/点赞/收藏会自动删除
 *
 * @param postId 文章 id
 */
export async function deletePostAction(postId: string): Promise<ActionResult> {
  // 1. 权限检查
  const perm = await checkPostPermission();
  if (!perm) {
    return { success: false, error: "无权限" };
  }

  // 2. 查询文章，校验权限
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, slug: true, status: true },
  });

  if (!post) {
    return { success: false, error: "文章不存在" };
  }

  if (perm.role !== "ADMIN" && post.authorId !== perm.userId) {
    return { success: false, error: "无权删除他人的文章" };
  }

  // 3. 删除（级联删除评论/点赞/收藏/标签关联）
  try {
    await prisma.post.delete({
      where: { id: postId },
    });

    // 4. 刷新缓存
    revalidatePath("/dashboard/posts");
    if (post.status === "PUBLISHED") {
      revalidatePath("/");
      revalidatePath(`/posts/${post.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("删除文章失败:", error);
    return { success: false, error: "删除失败，请稍后重试" };
  }
}

// ==================== Markdown 实时预览 ====================
/**
 * 渲染 Markdown 为 HTML（编辑器实时预览用）
 *
 * 为什么用 Server Action 而非客户端渲染?
 *   1. 复用 renderMarkdown 函数（含 shiki 代码高亮），保证预览和正式渲染一致
 *   2. shiki 体积大（~1MB），打包到客户端会拖慢首屏
 *   3. 前端 debounce 500ms 调用，延迟可接受
 *
 * @param markdown Markdown 原文
 * @returns { html } 渲染后的 HTML
 */
export async function renderPreviewAction(
  markdown: string,
): Promise<{ html: string }> {
  // 不需要登录校验（预览不涉及数据修改）
  // 但限制内容长度，防止恶意大文本
  if (markdown.length > 100000) {
    return { html: "<p>内容过长，无法预览</p>" };
  }

  try {
    const html = await renderMarkdown(markdown);
    return { html };
  } catch (error) {
    console.error("预览渲染失败:", error);
    return { html: "<p>渲染失败</p>" };
  }
}

// ==================== 切换发布状态 ====================
/**
 * 快捷切换文章状态（列表页"发布"/"取消发布"按钮用）
 *
 * 和 updatePostAction 的区别：
 *   - 只改 status，不改其他字段
 *   - 更轻量，适合列表页快速操作
 */
export async function togglePostStatusAction(
  postId: string,
): Promise<ActionResult> {
  const perm = await checkPostPermission();
  if (!perm) {
    return { success: false, error: "无权限" };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, slug: true, status: true, publishedAt: true },
  });

  if (!post) {
    return { success: false, error: "文章不存在" };
  }

  if (perm.role !== "ADMIN" && post.authorId !== perm.userId) {
    return { success: false, error: "无权修改他人的文章" };
  }

  const newStatus = post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  try {
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: newStatus,
        publishedAt: newStatus === "PUBLISHED" && !post.publishedAt
          ? new Date()
          : post.publishedAt, // 保留首次发布时间
      },
    });

    revalidatePath("/dashboard/posts");
    revalidatePath("/");
    revalidatePath(`/posts/${post.slug}`);

    return { success: true };
  } catch (error) {
    console.error("切换状态失败:", error);
    return { success: false, error: "操作失败" };
  }
}
