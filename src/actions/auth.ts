// src/actions/auth.ts
// 鉴权相关 Server Actions
//
// ==================== 为什么用 Server Action 而非 Client signIn? ====================
//
// 1. 类型安全：参数和返回值有完整类型
// 2. 错误处理优雅：不需要解析 URL query 拿错误信息
// 3. 风格统一：和搜索、评论 Server Action 一致
// 4. 注册逻辑（查重 + bcrypt + 写库）必须在服务端，Server Action 是天然选择
//
// ==================== 登录 vs 注册流程对比 ====================
//
// 注册：
//   1. 校验输入（zod）
//   2. 查重（email / username 是否已存在）
//   3. bcrypt 哈希密码
//   4. 写入数据库
//   5. 自动登录（redirect 到首页，让 NextAuth cookie 生效）
//
// 登录：
//   1. 调用 NextAuth 的 signIn 函数
//   2. signIn 内部触发 authorize，校验密码
//   3. 成功 → redirect 到首页；失败 → 返回错误信息

"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { registerSchema } from "@/lib/validations/auth";

// registerSchema 从 lib/validations/auth.ts 导入（不能在 "use server" 文件里定义非函数导出）

// ==================== 注册 Server Action ====================
/**
 * 注册并自动登录
 *
 * 流程：
 * 1. zod 校验输入
 * 2. 查重（email + username）
 * 3. bcrypt 哈希密码
 * 4. 写入数据库
 * 5. redirect 到登录页让用户手动登录（或自动登录）
 *
 * 为什么注册后不自动登录?
 *   → 自动登录需要调用 signIn，会 throw NEXT_REDIRECT
 *   → 和 return 返回值混在一起逻辑复杂
 *   → 简单起见：注册成功后 redirect 到 /login，让用户手动登录
 *   → 用户体验稍差但代码清晰
 */
export async function registerAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  // 1. zod 校验
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    // 返回第一个错误信息
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError.message };
  }

  const { username, email, password } = parsed.data;

  // 2. 查重：email 和 username 都要唯一
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { id: true, email: true, username: true },
  });

  if (existing) {
    if (existing.email === email) {
      return { success: false, error: "该邮箱已被注册" };
    }
    return { success: false, error: "该用户名已被占用" };
  }

  // 3. bcrypt 哈希密码
  // saltRounds = 10：成本因子，值越大越安全但越慢
  // 10 是业界默认值，约 100ms（生产可提到 12）
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. 写入数据库
  try {
    await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        // 项目：注册即可发文（默认 USER 角色）
        // role 字段使用 schema 默认值，不显式赋值
      },
    });
  } catch (error) {
    console.error("注册失败:", error);
    return { success: false, error: "注册失败，请稍后重试" };
  }

  // 5. 注册成功，redirect 到登录页
  // 注意：redirect 必须在 try/catch 外面调用（它会 throw NEXT_REDIRECT）
  redirect("/login?registered=true");
}

// ==================== 登录 Server Action ====================
/**
 * 登录 Server Action
 *
 * 调用 NextAuth 的 signIn 函数：
 *   signIn("credentials", formData, redirectTo)
 *
 * signIn 内部流程：
 *   1. 解析 formData 拿 email/password
 *   2. 调用 authorize 函数（在 auth.ts 里定义）
 *   3. authorize 返回 user → 创建 JWT + 设置 cookie + redirect
 *   4. authorize 返回 null → 抛 CredentialsSignIn 错误
 *
 * 错误处理：
 *   - AuthError：NextAuth 的错误基类
 *   - CredentialsSignIn：凭证错误（用户名/密码不对）
 *   - 其他错误：直接 throw（让 Next.js 错误边界处理）
 */
export async function loginAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    // signIn 会自动 redirect（成功时 throw NEXT_REDIRECT）
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: formData.get("redirectTo") as string || "/",
    });

    // 正常情况下 signIn 会 redirect，不会走到这里
    return { success: true };
  } catch (error) {
    // NEXT_REDIRECT 是正常的 redirect 信号，必须重新抛出
    // 否则登录成功后不会跳转
    // 注意：Next.js 把 redirect 信息放在 error.digest 上（"NEXT_REDIRECT;push;..."），
    //      error.message 并不是 "NEXT_REDIRECT"，所以必须用 digest 判断
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    // AuthError：NextAuth 相关错误
    if (error instanceof AuthError) {
      // CredentialsSignin：凭证错误（authorize 返回了 null）
      if (error.type === "CredentialsSignin") {
        return { success: false, error: "邮箱或密码错误" };
      }
      // 其他 NextAuth 错误（配置错误等）
      return { success: false, error: "登录失败，请稍后重试" };
    }

    // 未知错误
    console.error("登录失败:", error);
    return { success: false, error: "登录失败，请稍后重试" };
  }
}

// ==================== 登出 Server Action ====================
/**
 * 登出 Server Action
 *
 * 为什么不直接在 Client Component 里调 signOut?
 *   → signOut 从 @/auth 导入，@/auth 是服务端模块（含 prisma、bcrypt 等）
 *   → 在 "use client" 文件里 import signOut 会把服务端代码打包到客户端
 *   → 必须在 "use server" 文件里调用，Client Component 通过 form action 触发
 *
 * Client Component 用法：
 *   <form action={signOutAction}>
 *     <button type="submit">登出</button>
 *   </form>
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
