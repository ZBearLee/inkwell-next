// src/components/dashboard/admin-required.tsx
// 管理员权限不足提示组件（Server Component）
//
// 用于 dashboard 中需要 ADMIN 权限的页面（分类管理）。
// 保持与 dashboard 页面整体风格一致：居中卡片 + 琥珀色提示。
//
// 为什么不用 redirect？
//   → redirect 会让用户跳到首页，难以理解"为什么被踢"
//   → 当前用户没有权限时，留在原页面 + 提示更清晰
//   → USER 角色用户误进分类管理时，能直接看到"需要管理员权限"

interface AdminRequiredProps {
  /** 当前用户角色，用于在提示中展示 */
  currentRole: string;
}

export function AdminRequired({ currentRole }: AdminRequiredProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          需要管理员权限才能管理分类
        </p>
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
          当前角色：{currentRole}
        </p>
      </div>
    </div>
  );
}
