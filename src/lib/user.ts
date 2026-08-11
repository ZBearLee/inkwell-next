// src/lib/user.ts
// 用户数据访问层
//
// ==================== 设计意图 ====================
//
// 和 src/lib/post.ts 一样，封装所有用户相关的数据库查询
// 页面组件只调用函数，不直接操作 prisma
//
// ==================== 隐私边界 ====================
//
// 公开主页（/u/[username]）只展示非敏感信息：
//   ✓ name / username / image / bio / role / createdAt
//   ✗ email / passwordHash / id（内部用，不公开）
//
// 查询时用 select 明确列出字段，防止误暴露敏感信息

import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma";
import type { PostWithRelations } from "@/lib/post";

// ==================== 公开用户信息类型 ====================
// 只包含可以公开的字段（不含 email / passwordHash）
export type PublicUser = Pick<
  User,
  "name" | "username" | "image" | "bio" | "role" | "createdAt"
>;

// ==================== 用户主页数据类型 ====================
// 含用户信息 + 统计数据
export interface UserProfile extends PublicUser {
  _count: {
    posts: number;      // 已发布文章数
    comments: number;   // 评论数
  };
}

/**
 * 按 username 查询用户公开资料 + 统计
 *
 * 用于：/u/[username] 个人主页
 * 只返回 PUBLISHED 状态的文章数（草稿不算）
 *
 * @param username 用户名
 */
export async function getUserProfile(
  username: string,
): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      name: true,
      username: true,
      image: true,
      bio: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          // 只统计已发布文章（草稿不公开）
          posts: { where: { status: "PUBLISHED" } },
          comments: true,
        },
      },
    },
  });

  return user as UserProfile | null;
}

/**
 * 查询用户已发布的文章列表
 *
 * 用于：/u/[username] 个人主页展示文章列表
 * 按 publishedAt 倒序（最新的在前）
 *
 * 返回类型兼容 PostCard 组件（含 author/category/tags）
 *
 * @param username 用户名
 * @param limit 返回数量（默认 10）
 */
export async function getUserPosts(
  username: string,
  limit = 10,
): Promise<PostWithRelations[]> {
  const posts = await prisma.post.findMany({
    where: {
      author: { username },
      status: "PUBLISHED",
    },
    include: {
      // PostCard 需要 author 字段，虽然主页已知作者，但为复用组件必须带上
      author: { select: { id: true, name: true, username: true } },
      category: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  return posts as PostWithRelations[];
}

/**
 * 查询所有有已发布文章的用户名
 *
 * 用于：generateStaticParams（构建时预生成所有用户主页）
 * 只预生成有内容的用户主页，避免空页面
 */
export async function getAllUsernames(): Promise<{ username: string }[]> {
  // distinct: 去重，一个用户有多篇文章只返回一次
  return prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { author: { select: { username: true } } },
    distinct: ["authorId"],
  }).then((posts) =>
    posts.map((p) => ({ username: p.author.username })),
  );
}
