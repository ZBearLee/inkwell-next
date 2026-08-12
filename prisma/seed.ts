// prisma/seed.ts
// 种子数据：2 个用户（作者 + 管理员）、3 个分类、5 个标签、5 篇文章
// 设计意图：提供最小可运行的数据，覆盖已发布/草稿两种状态、多分类多标签
//
// 运行：pnpm db:seed
// 幂等性：用 upsert 按唯一键写入，重复执行不会报错也不会产生重复数据

import { PrismaClient, Role, PostStatus } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始写入种子数据...");

  // ---------- 1. 用户 ----------
  const authorPassword = await bcrypt.hash("author123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  const author = await prisma.user.upsert({
    where: { email: "author@inkwell.dev" },
    update: {},
    create: {
      email: "author@inkwell.dev",
      username: "inkwriter",
      name: "墨作者",
      passwordHash: authorPassword,
      bio: "全栈开发者，热爱分享 Next.js 与 TypeScript 实践",
      role: Role.USER,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@inkwell.dev" },
    update: {},
    create: {
      email: "admin@inkwell.dev",
      username: "admin",
      name: "管理员",
      passwordHash: adminPassword,
      bio: "Inkwell-next 平台管理员",
      role: Role.ADMIN,
    },
  });

  console.log(`  ✓ 用户: ${author.name} (用户), ${admin.name} (管理员)`);

  // ---------- 2. 分类 ----------
  const categories = await Promise.all(
    [
      { name: "前端工程", slug: "frontend", description: "前端框架、工具链与工程化实践" },
      { name: "后端架构", slug: "backend", description: "服务端架构、数据库与分布式" },
      { name: "开发随笔", slug: "essay", description: "技术思考与开发心得" },
    ].map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: {},
        create: c,
      }),
    ),
  );
  console.log(`  ✓ 分类: ${categories.map((c) => c.name).join("、")}`);

  // ---------- 3. 标签 ----------
  const tags = await Promise.all(
    ["Next.js", "TypeScript", "Prisma", "React", "性能优化"].map((name) => {
      const slug = name.toLowerCase().replace(/\./g, "");
      return prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
      });
    }),
  );
  console.log(`  ✓ 标签: ${tags.map((t) => t.name).join("、")}`);

  // ---------- 4. 文章 ----------
  const posts = [
    {
      title: "Next.js 16 App Router 实践：从 SSR 到 RSC 的演进",
      slug: "nextjs-16-app-router-practice",
      excerpt: "深入理解 App Router 架构，掌握 RSC/SSG/ISR/SSR 四种渲染策略的取舍。",
      content: `# Next.js 16 App Router 实践

## 为什么选 App Router

App Router 基于 React Server Components，带来了全新的渲染模型：

- **默认服务端渲染**：组件默认在服务端执行，零客户端 JS
- **流式渲染**：配合 Suspense 实现渐进式首屏
- **嵌套布局**：通过 \`layout.tsx\` 实现布局复用

## 四种渲染策略

| 策略 | 适用场景 | 特点 |
|---|---|---|
| SSR | 动态内容 | 每次请求渲染 |
| SSG | 静态内容 | 构建时生成 |
| ISR | 半静态 | 增量更新 |
| CSR | 交互密集 | 客户端渲染 |

## 代码示例

\`\`\`tsx
// 服务端组件，零客户端 JS
export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return <article>{post.content}</article>;
}
\`\`\`

## 小结

App Router 不是 pages 的简单升级，而是渲染范式的转变。`,
      categoryId: categories[0].id, // 前端工程
      tagSlugs: ["nextjs", "typescript", "react"],
      readTime: 8,
    },
    {
      title: "Prisma ORM 深入：Schema 设计与性能优化",
      slug: "prisma-schema-and-performance",
      excerpt: "从 Schema 设计到 N+1 查询优化，全面掌握 Prisma 的最佳实践。",
      content: `# Prisma ORM 深入

## Schema 设计要点

\`\`\`prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  author    User     @relation(fields: [authorId], references: [id])
  @@index([authorId])  // 别忘了给外键加索引
}
\`\`\`

## 避免 N+1 查询

使用 \`include\` 或 \`select\` 一次性加载关联数据：

\`\`\`ts
const posts = await prisma.post.findMany({
  include: { author: true, tags: { include: { tag: true } } },
});
\`\`\`

## 事务保证

\`\`\`ts
await prisma.$transaction([
  prisma.post.create({ data: postData }),
  prisma.user.update({ where: { id }, data: { postCount: { increment: 1 } } }),
]);
\`\`\``,
      categoryId: categories[1].id, // 后端架构
      tagSlugs: ["prisma", "performance"],
      readTime: 6,
    },
    {
      title: "TypeScript 类型体操：从入门到实用",
      slug: "typescript-type-gymnastics",
      excerpt: "类型系统不只是约束，更是设计工具。掌握条件类型、映射类型等高级技巧。",
      content: `# TypeScript 类型体操

## 条件类型

\`\`\`ts
type IsString<T> = T extends string ? true : false;
type A = IsString<"hi">;  // true
type B = IsString<42>;    // false
\`\`\`

## 映射类型

\`\`\`ts
type Optional<T> = { [K in keyof T]?: T[K] };
\`\`\`

## 实用场景：Zod 推断类型

\`\`\`ts
const schema = z.object({ title: z.string(), views: z.number() });
type Post = z.infer<typeof schema>;  // 前后端共享类型
\`\`\``,
      categoryId: categories[0].id, // 前端工程
      tagSlugs: ["typescript"],
      readTime: 5,
    },
    {
      title: "React Server Components 完全指南",
      slug: "react-server-components-guide",
      excerpt: "RSC 是 React 的未来。理解服务端组件与客户端组件的边界划分。",
      content: `# React Server Components 完全指南

## 核心理念

RSC 让组件在服务端执行，**不打包到客户端 bundle**。

## 边界划分原则

- **Server Component**：数据获取、静态渲染、直接访问数据库
- **Client Component**：事件处理、状态管理、浏览器 API

\`\`\`tsx
// Server Component
import { db } from "@/lib/prisma";

export default async function List() {
  const items = await db.post.findMany();  // 直接查数据库
  return items.map(i => <Card key={i.id} {...i} />);
}
\`\`\`

\`\`\`tsx
"use client";
// Client Component
import { useState } from "react";

export function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>赞</button>;
}
\`\`\``,
      categoryId: categories[0].id, // 前端工程
      tagSlugs: ["react", "nextjs"],
      readTime: 7,
    },
    {
      title: "我的开发工作流：从命令行到部署",
      slug: "my-dev-workflow",
      excerpt: "分享我日常使用的高效开发工具链与部署流程。",
      content: `# 我的开发工作流

## 本地开发

- **pnpm**：快速、节省磁盘的包管理器
- **tsx**：直接运行 TypeScript 脚本
- **Prisma Studio**：可视化数据库管理

## 部署

Vercel 提供零配置的 Next.js 部署：

\`\`\`bash
vercel --prod
\`\`\`

## 小结

工具链的价值在于减少心智负担，让你专注于业务逻辑。`,
      categoryId: categories[2].id, // 开发随笔
      tagSlugs: [],
      readTime: 3,
    },
  ];

  // 前 4 篇发布
  for (const p of posts.slice(0, 4)) {
    const tagIds = p.tagSlugs
      .map((slug) => tags.find((t) => t.slug === slug)?.id)
      .filter((id): id is string => Boolean(id));

    await prisma.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content: p.content,
        readTime: p.readTime,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: author.id,
        categoryId: p.categoryId,
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
    });
  }

  // 第 5 篇保持草稿状态，用于草稿逻辑
  const draftPost = posts[4];
  await prisma.post.upsert({
    where: { slug: draftPost.slug },
    update: {},
    create: {
      title: draftPost.title,
      slug: draftPost.slug,
      excerpt: draftPost.excerpt,
      content: draftPost.content,
      readTime: draftPost.readTime,
      status: PostStatus.DRAFT,
      authorId: author.id,
      categoryId: draftPost.categoryId,
    },
  });

  console.log(`  ✓ 文章: 4 篇已发布, 1 篇草稿`);

  // ---------- 5. 评论（楼中楼）----------
  // 给第一篇文章加 2 条顶级评论 + 1 条回复，第二篇加 1 条顶级评论 + 1 条回复
  const publishedPosts = await prisma.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    select: { id: true, slug: true },
    take: 2,
    orderBy: { publishedAt: "desc" },
  });

  if (publishedPosts.length > 0) {
    // 清理旧评论（确保幂等：重跑 seed 不产生重复）
    await prisma.comment.deleteMany({
      where: { postId: { in: publishedPosts.map((p) => p.id) } },
    });

    const firstPost = publishedPosts[0];
    const secondPost = publishedPosts[1];

    // 第一篇：2 条顶级 + 1 条回复
    const c1 = await prisma.comment.create({
      data: {
        postId: firstPost.id,
        authorId: admin.id,
        content: "讲得很清晰，App Router 的四种渲染策略对比那张表太实用了！",
      },
    });
    await prisma.comment.create({
      data: {
        postId: firstPost.id,
        authorId: author.id,
        content: "感谢分享，SSG + ISR 的组合确实是博客类项目的最佳实践。",
        parentId: c1.id, // 楼中楼回复
      },
    });
    await prisma.comment.create({
      data: {
        postId: firstPost.id,
        authorId: author.id,
        content: "期待下一篇讲 Streaming + Suspense 的实战。",
      },
    });

    // 第二篇：1 条顶级 + 1 条回复
    const c2 = await prisma.comment.create({
      data: {
        postId: secondPost.id,
        authorId: admin.id,
        content: "N+1 那段讲得不错，include 和 select 的区别可以再展开讲讲。",
      },
    });
    await prisma.comment.create({
      data: {
        postId: secondPost.id,
        authorId: author.id,
        content: "已记下，下次专门写一篇讲 include vs select 的取舍。",
        parentId: c2.id,
      },
    });

    console.log(`  ✓ 评论: 3 条顶级 + 2 条回复（楼中楼）`);
  }

  console.log("🎉 种子数据写入完成！");
  console.log("   用户账号: author@inkwell.dev / author123");
  console.log("   管理员账号: admin@inkwell.dev / admin123");
}

main()
  .catch((e) => {
    console.error("❌ 种子数据写入失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });