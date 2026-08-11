// src/app/dashboard/posts/new/page.tsx
// 新建文章页（Server Component）
//
// ==================== 为什么是 Server Component? ====================
//
// 页面本身是 Server Component：
//   1. 读 session 做权限校验
//   2. 查所有分类/标签（供选择）
//   3. 把数据传给 PostEditor（Client Component）做交互
//
// ==================== 和编辑页的区别 ====================
//
// 新建页：PostEditor post={null}（空表单，无自动保存）
// 编辑页：PostEditor post={postData}（预填数据，有自动保存）

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllCategories, getAllTags } from "@/lib/post";
import { PostEditor } from "@/components/editor/post-editor";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  // 1. 权限校验
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?redirect=/dashboard/posts/new");
  }
  if (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN") {
    redirect("/dashboard/posts");
  }

  // 2. 查询分类和标签（供表单选择）
  const [categories, tags] = await Promise.all([
    getAllCategories(),
    getAllTags(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        写新文章
      </h1>
      <PostEditor post={null} categories={categories} tags={tags} />
    </div>
  );
}
