// src/app/dashboard/posts/[id]/edit/page.tsx
// 编辑文章页（Server Component）
//
// ==================== 和新建页的区别 ====================
//
// 1. 从 URL 取文章 id（params）
// 2. 查数据库拿已有文章数据
// 3. 权限校验：只能编辑自己的文章（ADMIN 可编辑任何人的）
// 4. 把文章数据传给 PostEditor（预填表单 + 开启自动保存）

import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPostForEdit, getAllCategories, getAllTags } from "@/lib/post";
import { PostEditor } from "@/components/editor/post-editor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const { id: postId } = await params;

  // 1. 权限校验
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?redirect=/dashboard/posts/${postId}/edit`);
  }
  // 所有登录用户都能进编辑页（只能编辑自己的文章）

  // 2. 并行查询：文章数据 + 分类 + 标签
  const [post, categories, tags] = await Promise.all([
    getPostForEdit(postId),
    getAllCategories(),
    getAllTags(),
  ]);

  // 文章不存在 → 404
  if (!post) {
    notFound();
  }

  // 3. 权限校验：非 ADMIN 只能编辑自己的文章
  if (session.user.role !== "ADMIN" && post.authorId !== session.user.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-400">
            无权编辑他人的文章
          </p>
        </div>
      </div>
    );
  }

  // 4. 渲染编辑器（传入已有数据）
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        编辑文章
      </h1>
      <PostEditor post={post} categories={categories} tags={tags} />
    </div>
  );
}
