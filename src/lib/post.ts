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

// ==================== 搜索相关 ====================

// 搜索结果项类型（比列表项轻量，不含 tags，减少数据传输）
export type SearchResultItem = Pick<
  Post,
  "id" | "title" | "slug" | "excerpt" | "coverImage" | "readTime" | "publishedAt"
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

// ==================== 评论相关 ====================

import type { Comment } from "@/generated/prisma";

/**
 * 评论类型（含作者和回复）
 *
 * 为什么用 CommentWithRelations 而非 Prisma.CommentGetPayload?
 * → 手写类型更直观，便于理解关联结构
 * → 楼中楼回复用 replies 递归嵌套，类型自引用
 */
export type CommentWithRelations = Comment & {
  author: Pick<User, "id" | "name" | "username" | "image">;
  replies?: CommentWithRelations[];  // 自引用：子评论（楼中楼）
  _count?: { replies: number };      // 子评论数量（用于"展开 N 条回复"）
};

/**
 * 获取文章的评论列表（含楼中楼回复）
 *
 * 查询策略：
 * 1. 只查顶级评论（parentId = null）
 * 2. 每个顶级评论 include 其 replies（最多 2 级，避免无限嵌套）
 * 3. 按 createdAt 升序（最早的在前，符合评论阅读习惯）
 *
 * 为什么不用递归查询所有层级?
 * → 楼中楼通常最多 2 级，避免无限嵌套导致 UI 复杂
 * → 2 级查询性能好，一次 SQL 就能拿到顶级 + 子评论
 *
 * @param postSlug 文章 slug
 */
export async function getComments(postSlug: string): Promise<CommentWithRelations[]> {
  // 先查文章 id（评论通过 postId 关联）
  const post = await prisma.post.findUnique({
    where: { slug: postSlug },
    select: { id: true },
  });

  if (!post) return [];

  // 查询顶级评论 + include 子评论
  return prisma.comment.findMany({
    where: {
      postId: post.id,
      parentId: null,  // 只查顶级评论
    },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true },
      },
      replies: {
        include: {
          author: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  }) as Promise<CommentWithRelations[]>;
}

/**
 * 获取评论总数（用于文章详情页显示"N 条评论"）
 */
export async function getCommentCount(postSlug: string): Promise<number> {
  const post = await prisma.post.findUnique({
    where: { slug: postSlug },
    select: { id: true },
  });

  if (!post) return 0;

  return prisma.comment.count({
    where: { postId: post.id },
  });
}

/**
 * 创建评论
 *
 * @param postId 文章 id
 * @param authorId 作者 id
 * @param content 评论内容
 * @param parentId 父评论 id（可选，用于回复）
 */
export async function createComment(
  postId: string,
  authorId: string,
  content: string,
  parentId?: string,
): Promise<Comment> {
  return prisma.comment.create({
    data: {
      postId,
      authorId,
      content,
      parentId: parentId || null,
    },
  });
}

/**
 * 删除评论
 * 级联策略：schema 中定义了 onDelete: Cascade，删父评论会自动删子评论
 */
export async function deleteComment(commentId: string): Promise<void> {
  await prisma.comment.delete({
    where: { id: commentId },
  });
}

/**
 * 根据 id 查评论（用于权限校验：判断是否本人/管理员）
 */
export async function getCommentById(
  commentId: string,
): Promise<{ id: string; authorId: string; postId: string } | null> {
  return prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, postId: true },
  });
}

// ==================== 用户后台相关 ====================

/**
 * 用户管理后台用的文章列表类型
 * 比公开列表多 content 摘要信息，但不需要完整内容
 */
export type MyPostItem = Pick<
  Post,
  "id" | "title" | "slug" | "excerpt" | "status" | "publishedAt" | "createdAt" | "updatedAt"
> & {
  category: Pick<Category, "id" | "name" | "slug">;
  _count: {
    comments: number;
  };
};

/**
 * 查询某用户的全部文章（含草稿，用于作者后台）
 *
 * 和 getPosts 的区别：
 *   1. 包含 DRAFT 状态（草稿也要管理）
 *   2. 按 authorId 过滤（只看自己的）
 *   3. 按 updatedAt 倒序（最近编辑的在前）
 *
 * @param authorId 作者 id
 */
export async function getMyPosts(authorId: string): Promise<MyPostItem[]> {
  const posts = await prisma.post.findMany({
    where: { authorId },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true, slug: true } },
      _count: {
        select: {
          comments: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return posts as MyPostItem[];
}

/**
 * 管理员后台用的文章列表类型
 * 在 MyPostItem 基础上额外包含 author 字段，便于在表格里显示作者列
 */
export type AdminPostItem = MyPostItem & {
  author: Pick<User, "id" | "name" | "username">;
};

/**
 * 查询所有用户的全部文章（含草稿，用于 ADMIN 后台）
 *
 * 和 getMyPosts 的区别：
 *   1. 不按 authorId 过滤（管理员要看所有用户的文章）
 *   2. 额外 include author 字段（表格里要展示作者列）
 *
 * 权限说明：
 *   本函数只负责查数据，不校验角色。调用方需确保 session.user.role === "ADMIN"。
 */
export async function getAllPostsForAdmin(): Promise<AdminPostItem[]> {
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true, username: true } },
      category: { select: { id: true, name: true, slug: true } },
      _count: {
        select: {
          comments: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return posts as AdminPostItem[];
}

/**
 * 编辑文章时用的文章详情类型
 * 含完整 content + 所有元信息，但不含 _count（编辑不需要统计）
 */
export type PostForEdit = Pick<
  Post,
  "id" | "title" | "slug" | "excerpt" | "content" | "coverImage" | "status" | "categoryId" | "authorId"
> & {
  tags: { tag: Pick<Tag, "id" | "name" | "slug"> }[];
};

/**
 * 按 id 查询文章（用于编辑页）
 * 含草稿状态的文章（作者可以编辑自己的草稿）
 *
 * 安全要点：
 *   这个函数只负责查数据，不做权限校验
 *   权限校验在 Server Action 里做（检查 authorId 是否匹配）
 *
 * @param postId 文章 id
 */
export async function getPostForEdit(postId: string): Promise<PostForEdit | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImage: true,
      status: true,
      categoryId: true,
      authorId: true,
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  });

  return post as PostForEdit | null;
}

/**
 * 查询所有分类（发文时选择用）
 * 按名称排序，方便查找
 */
export async function getAllCategories() {
  return prisma.category.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

/**
 * 查询所有标签（发文时选择用）
 * 按名称排序
 */
export async function getAllTags() {
  return prisma.tag.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

/**
 * 查询所有已存在的 slug（用于生成唯一 slug 时的去重）
 */
export async function getAllSlugs(): Promise<string[]> {
  const posts = await prisma.post.findMany({
    select: { slug: true },
  });
  return posts.map((p) => p.slug);
}

/**
 * 计算阅读时长（分钟）
 * 规则：中文按字数 / 300，英文按词数 / 200，取较大值
 * 简单实现：按字符数 / 500 估算
 *
 * @param content Markdown 原文
 */
export function calculateReadTime(content: string): number {
  const charCount = content.length;
  const readTime = Math.ceil(charCount / 500);
  return Math.max(1, readTime); // 至少 1 分钟
}

// ==================== Sitemap / RSS 相关 ====================

/**
 * 查询所有已发布文章的轻量信息（用于 sitemap 和 RSS feed）
 *
 * 和 getAllPostSlugs 的区别：
 *   → getAllPostSlugs 只返回 slug（给 generateStaticParams 用）
 *   → 这个函数还返回 title/excerpt/publishedAt/author（给 RSS feed 用）
 *
 * 和 getLatestPosts 的区别：
 *   → getLatestPosts 返回完整关联数据（含 category/tags），较重
 *   → 这个函数只 select 必要字段，适合 sitemap/RSS 这种大数据量场景
 */
export async function getPublishedPostsForFeed() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      updatedAt: true,
      author: { select: { name: true, username: true } },
    },
    orderBy: { publishedAt: "desc" },
  });
}