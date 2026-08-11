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

// ==================== 文章详情相关 ====================

// 文章详情类型（含完整内容和关联数据）
export type PostDetail = Post & {
  author: Pick<User, "id" | "name" | "username" | "image">;
  category: Pick<Category, "id" | "name" | "slug">;
  tags: { tag: Pick<Tag, "id" | "name" | "slug"> }[];
  _count: {
    comments: number;
    likes: number;
    bookmarks: number;
  };
};

/**
 * 按 slug 查询文章详情（含完整 content）
 * 只返回 PUBLISHED 状态的文章（草稿不对外展示）
 *
 * 用于：文章详情页、generateMetadata
 */
export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  const post = await prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
      category: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      _count: {
        select: {
          comments: true,
          likes: true,
          bookmarks: true,
        },
      },
    },
  });

  return post as PostDetail | null;
}

/**
 * 查询所有已发布文章的 slug（用于 generateStaticParams）
 * 构建时预生成所有文章页的静态 HTML
 */
export async function getAllPostSlugs(): Promise<{ slug: string }[]> {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return posts;
}

/**
 * 查询上一篇/下一篇文章（用于详情页底部导航）
 * 上一篇：发布时间晚于当前文章，取最近的一篇
 * 下一篇：发布时间早于当前文章，取最近的一篇
 *
 * 注意：返回的只有 slug 和 title，不需要完整内容
 */
export async function getPostNeighbors(publishedAt: Date) {
  const [previous, next] = await Promise.all([
    // 下一篇（更早发布的）
    prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
        publishedAt: { lt: publishedAt },
      },
      select: { slug: true, title: true },
      orderBy: { publishedAt: "desc" },
    }),
    // 上一篇（更晚发布的）
    prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
        publishedAt: { gt: publishedAt },
      },
      select: { slug: true, title: true },
      orderBy: { publishedAt: "asc" },
    }),
  ]);

  // 命名说明：时间线上，更早的叫"上一篇"（older），更晚的叫"下一篇"（newer）
  // 但博客习惯：列表按时间倒序，所以"下一篇"是更早的文章
  return { next, previous };
}

/**
 * 查询相关文章（同分类的其他文章，排除当前文章）
 * 用于详情页底部"相关推荐"
 *
 * @param postId 当前文章 id
 * @param categoryId 当前文章分类 id
 * @param limit 返回数量
 */
export async function getRelatedPosts(
  postId: string,
  categoryId: string,
  limit = 3,
): Promise<PostWithRelations[]> {
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: postId },
      category: { id: categoryId },
    },
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
 * 增加文章阅读量
 * 用 increment 操作，避免读-改-写的并发问题
 *
 * 注意：SSG 页面中调用此函数需用 after() 或单独接口，不能直接在渲染时调用
 *       否则会导致缓存失效（每次渲染都 +1）
 */
export async function incrementPostViews(postId: string): Promise<void> {
  await prisma.post.update({
    where: { id: postId },
    data: { views: { increment: 1 } },
  });
}

// ==================== 搜索相关 ====================

// 搜索结果项类型（比列表项轻量，不含 tags，减少数据传输）
export type SearchResultItem = Pick<
  Post,
  "id" | "title" | "slug" | "excerpt" | "coverImage" | "readTime" | "publishedAt" | "views"
> & {
  author: Pick<User, "id" | "name" | "username">;
  category: Pick<Category, "id" | "name" | "slug">;
};

/**
 * 搜索文章（标题 + 摘要 + 内容模糊匹配）
 *
 * 为什么用 Prisma 的 contains 而非全文搜索（PostgreSQL full-text search）?
 * → 博客文章量不大（< 1万篇），contains 足够快
 * → contains 底层是 LIKE '%keyword%'，走顺序扫描
 * → 如果数据量大，可后续升级到 PostgreSQL 的 tsvector + GIN 索引
 * → 或接入 Algolia/Meilisearch 等专业搜索引擎
 *
 * @param query 搜索关键词
 * @param page 页码
 * @param pageSize 每页数量
 */
export async function searchPosts(
  query: string,
  page = 1,
  pageSize = 10,
): Promise<{
  posts: SearchResultItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  // 去除首尾空格，空查询返回空结果
  const q = query.trim();
  if (!q) {
    return { posts: [], total: 0, totalPages: 0, currentPage: page };
  }

  // where 条件：标题/摘要/内容任一匹配（OR 关系）
  // 注：当前 Prisma Client 基于 SQLite 生成（之前 prisma init 用的 sqlite），
  //     不支持 insensitive 参数。PostgreSQL 默认大小写敏感，但中文场景影响不大。
  //     如需大小写不敏感，可重新基于 postgresql provider 生成 Client。
  const where = {
    status: "PUBLISHED" as const,
    OR: [
      { title: { contains: q } },
      { excerpt: { contains: q } },
      { content: { contains: q } },
    ],
  };

  // 并行查询：结果列表 + 总数
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        readTime: true,
        publishedAt: true,
        views: true,
        author: { select: { id: true, name: true, username: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    posts: posts as SearchResultItem[],
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}

/**
 * 搜索建议（轻量版，只查标题，用于输入框下拉提示）
 *
 * 与 searchPosts 的区别：
 * - 只查 title 字段（更快）
 * - 只返回 slug + title（数据量小）
 * - 限制 5 条（下拉框展示空间有限）
 *
 * @param query 搜索关键词
 */
export async function searchSuggestions(
  query: string,
): Promise<{ slug: string; title: string; excerpt: string }[]> {
  const q = query.trim();
  if (!q || q.length < 2) {
    // 少于 2 个字符不触发搜索，避免输入单字就查询
    return [];
  }

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      title: { contains: q },
    },
    select: {
      slug: true,
      title: true,
      excerpt: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 5,
  });

  return posts;
}