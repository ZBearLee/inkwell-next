// src/lib/post.ts
// 文章数据访问层
// 设计意图：封装所有文章查询逻辑，页面只调用函数，不直接操作 prisma
// 关键点：
// 1. 只查询 PUBLISHED 状态的文章（草稿不展示给读者）
// 2. 用 include 避免 N+1 查询，一次 SQL JOIN 拿到所有数据,一次性加载 author/category/tags
// 3. 用 Promise.all 并行查询文章列表和总数，性能翻倍,文章列表和总数无依赖关系，串行会慢一倍
// 4. _count 聚合查询 → Prisma 内置聚合，比加载所有记录再 .length 高效

import { prisma } from "@/lib/prisma";
import type { Post, User, Category, Tag } from "@/generated/prisma";

// 文章列表项的完整类型（含关联数据）
export type PostWithRelations = Post & {
  author: Pick<User, "id" | "name" | "username">;
  category: Pick<Category, "id" | "name" | "slug">;
  tags: { tag: Pick<Tag, "id" | "name" | "slug"> }[];
};

// 分页查询参数
interface GetPostsParams {
  page?: number;        // 页码，从 1 开始
  pageSize?: number;    // 每页数量
  category?: string;    // 分类 slug 筛选
  tag?: string;         // 标签 slug 筛选
}

// 分页查询结果
interface PaginatedResult {
  posts: PostWithRelations[];
  total: number;        // 符合条件的文章总数
  totalPages: number;   // 总页数
  currentPage: number;  // 当前页码
}

/**
 * 查询文章列表（分页 + 分类/标签筛选）
 * 返回已发布文章，按发布时间倒序
 */
export async function getPosts({
  page = 1,
  pageSize = 10,
  category,
  tag,
}: GetPostsParams = {}): Promise<PaginatedResult> {
  // 构建 where 条件
  const where = {
    status: "PUBLISHED" as const,
    ...(category && { category: { slug: category } }),
    ...(tag && { tags: { some: { tag: { slug: tag } } } }),
  };

  // 并行查询：文章列表 + 总数
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, username: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    posts: posts as PostWithRelations[],
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}

/**
 * 查询最新文章（首页用，不分页）
 */
export async function getLatestPosts(limit = 5): Promise<PostWithRelations[]> {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    include: {
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
 * 查询侧边栏数据：所有分类 + 热门标签（按文章数排序）
 */
export async function getSidebarData() {
  const [categories, popularTags] = await Promise.all([
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { posts: { where: { status: "PUBLISHED" } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        // Tag.posts 是 PostTag[]（显式关系表），需通过 post 关联过滤 status
        _count: { select: { posts: { where: { post: { status: "PUBLISHED" } } } } },
      },
      orderBy: { posts: { _count: "desc" } },
      take: 10,
    }),
  ]);

  return { categories, popularTags };
}

/**
 * 按 slug 查询分类信息（分类页头部展示）
 */
export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true },
  });
}

/**
 * 按 slug 查询标签信息（标签页头部展示）
 */
export async function getTagBySlug(slug: string) {
  return prisma.tag.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
}