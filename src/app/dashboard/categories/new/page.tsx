// src/app/dashboard/categories/new/page.tsx
// 新建分类页（Server Component，仅 ADMIN）
//
// 页面本身是 Server Component：
//   1. auth() 权限校验（仅 ADMIN）
//   2. 渲染 CategoryForm（Client Component）
//
// 和文章新建页（dashboard/posts/new）结构一致，但更简单：
//   - 不需要查询分类/标签选项（分类表单只有 name/slug/description）
//   - 不需要 PostEditor 那么复杂的组件

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CategoryForm } from "@/components/dashboard/category-form";
import { AdminRequired } from "@/components/dashboard/admin-required";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  // 权限校验：仅 ADMIN
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?redirect=/dashboard/categories/new");
  }
  if (session.user.role !== "ADMIN") {
    return <AdminRequired currentRole={session.user.role} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        新建分类
      </h1>
      <CategoryForm category={null} />
    </div>
  );
}
