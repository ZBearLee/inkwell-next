// src/actions/profile.ts
// 个人资料相关 Server Actions
//
// ==================== 设计要点 ====================
//
// 1. 登录态校验：每个 Action 第一行都 await auth()，未登录直接拒绝
//    → 不能信任 Client Component 传来的 currentUserId（可被篡改）
//    → 必须从服务端 session 取真实用户 id
//
// 2. zod 校验：防止恶意输入（超长字段、非法字符）
//
// 3. revalidatePath：更新后刷新相关页面缓存
//    → /profile 本身（显示新资料）
//    → /u/[username] 个人主页（公开展示的资料）
//    → Header 组件里的用户菜单（显示新名字）
//
// ==================== 为什么不允许改 username? ====================
//
// username 是 URL 路径的一部分（/u/[username]），改了会导致：
//   - 旧链接 404
//   - 收藏的书签失效
//   - SEO 权重丢失
// 业界惯例：username 一经设定不可改（Twitter/X 也是）
// 如需改，走"改名申请"流程 + 301 重定向，本项目暂不实现

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/profile";

// ==================== 更新个人资料 ====================
/**
 * 更新当前登录用户的资料（name / bio / image）
 *
 * 安全要点：
 *   - 从 session 取 userId，不接受前端传入的 userId
 *   - zod 校验所有字段
 *   - 只更新允许的字段（用 Prisma 的 select 防止误传 role/passwordHash）
 *
 * @param formData 表单数据
 * @returns { success, error? }
 */
export async function updateProfileAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  // 1. 校验登录态
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "请先登录" };
  }

  // 2. zod 校验输入
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name") || null,
    bio: formData.get("bio") || null,
    image: formData.get("image") || null,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // 3. 写入数据库
  // 空字符串转 null（数据库存 null 而非空串）
  const data = {
    name: parsed.data.name?.trim() || null,
    bio: parsed.data.bio?.trim() || null,
    image: parsed.data.image?.trim() || null,
  };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data,
    });

    // 4. 刷新相关页面缓存
    // /profile：本页面显示资料
    revalidatePath("/profile");
    // /u/[username]：公开个人主页（username 不变，路径固定）
    revalidatePath(`/u/${session.user.username}`);
    // 首页 Header 有用户菜单（显示 name/image）
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("更新资料失败:", error);
    return { success: false, error: "更新失败，请稍后重试" };
  }
}
