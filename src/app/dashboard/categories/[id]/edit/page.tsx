// src/app/dashboard/categories/[id]/edit/page.tsx
// 编辑分类页（Server Component，仅 ADMIN）
//
// 和新建页的区别：
//   1. 从 URL 取分类 id（params）
//   2. 查数据库拿已有分类数据
//   3. 把数据传给 CategoryForm（预填表单）
//
// 和文章编辑页（dashboard/posts/[id]/edit）结构一致

import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CategoryForm } from "@/components/dashboard/category-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id: categoryId } = await params;

  // 1. 权限校验：仅 ADMIN
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=/dashboard/categories/${categoryId}/edit`);
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard/categories");
  }

  // 2. 查询分类数据
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  });

  // 分类不存在 → 404
  if (!category) {
    notFound();
  }

  // 3. 渲染表单（传入已有数据）
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        编辑分类
      </h1>
      <CategoryForm category={category} />
    </div>
  );
}
