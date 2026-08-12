// src/app/dashboard/categories/page.tsx
// 分类管理列表页（Server Component，仅 ADMIN）
//
// ==================== 和文章列表页的区别 ====================
//
// 1. 权限：分类管理只允许 ADMIN（文章管理允许 USER + ADMIN）
//    → 分类是全局结构，修改影响所有用户的文章
// 2. 删除保护：分类下有文章时不能删（文章管理可以随时删自己的）
// 3. 无分页：分类通常不超过几十个，一次全部加载
//
// ==================== 数据流 ====================
//
// Page (Server) → 查 getAllCategoriesWithCount()
//   → 渲染表格 + 传 props 给 CategoryListActions (Client)
//     → 管理员点击删除 → Server Action → revalidatePath 刷新

import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Tag, FileText } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CategoryListActions } from "@/components/dashboard/category-list-actions";
import { AdminRequired } from "@/components/dashboard/admin-required";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// ==================== 数据查询 ====================
/**
 * 查询所有分类（含文章数统计）
 *
 * 为什么不用 getAllCategories()？
 *   → getAllCategories 只返回 id/name/slug，没有文章数
 *   → 管理后台需要展示每个分类下有多少文章
 *   → 用 _count 聚合，一次查询搞定（避免 N+1）
 */
async function getAllCategoriesWithCount() {
  return prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          posts: {
            where: { status: "PUBLISHED" }, // 只统计已发布文章
          },
        },
      },
    },
    orderBy: { createdAt: "asc" }, // 按创建时间正序（和 seed 顺序一致）
  });
}

export default async function CategoriesPage() {
  // 1. 权限校验：仅 ADMIN
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?redirect=/dashboard/categories");
  }
  if (session.user.role !== "ADMIN") {
    return <AdminRequired currentRole={session.user.role} />;
  }

  // 2. 查询所有分类
  const categories = await getAllCategoriesWithCount();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* ---------- 页头 ---------- */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            分类管理
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            共 {categories.length} 个分类
          </p>
        </div>
        <Link
          href="/dashboard/categories/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          新建分类
        </Link>
      </div>

      {/* ---------- 分类列表 ---------- */}
      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <Tag className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            还没有分类，点击&ldquo;新建分类&rdquo;开始创建
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full">
            {/* 表头 */}
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">分类名称</th>
                <th className="hidden px-4 py-3 md:table-cell">Slug</th>
                <th className="hidden px-4 py-3 lg:table-cell">描述</th>
                <th className="px-4 py-3">文章数</th>
                <th className="hidden px-4 py-3 sm:table-cell">创建时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            {/* 表体 */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  {/* 分类名称 */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/category/${category.slug}`}
                      className="font-medium text-zinc-900 transition-colors hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
                    >
                      {category.name}
                    </Link>
                  </td>

                  {/* Slug */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {category.slug}
                    </code>
                  </td>

                  {/* 描述 */}
                  <td className="hidden max-w-[200px] px-4 py-3 lg:table-cell">
                    <span className="text-xs text-zinc-500">
                      {category.description || "—"}
                    </span>
                  </td>

                  {/* 文章数 */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <FileText className="h-3 w-3" />
                      {category._count.posts}
                    </span>
                  </td>

                  {/* 创建时间 */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-zinc-500">
                      {formatDate(category.createdAt)}
                    </span>
                  </td>

                  {/* 操作 */}
                  <td className="px-4 py-3 text-right">
                    <CategoryListActions
                      categoryId={category.id}
                      categorySlug={category.slug}
                      postCount={category._count.posts}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
