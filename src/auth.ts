// src/auth.ts
// NextAuth.js v5 配置入口
//
// ==================== v5 vs v4 关键变化====================
//
// 1. 配置文件位置：v4 在 pages/api/auth/[...nextauth].ts，v5 提到顶层 src/auth.ts
// 2. Route Handler：单独放在 app/api/auth/[...all]/route.ts，只写一行转发
// 3. RSC 支持：Server Component 里直接 await auth() 读 session，不用 getServerSession
// 4. Session 策略：v5 默认 jwt（无数据库 session 表，配置更轻）
// 5. 导出方式：一次 NextAuth({...}) 调用，解构出 handlers/auth/signIn/signOut
//
// ==================== 四个导出分别用来干嘛 ====================
//
// handlers  → 给 Route Handler 用（GET/POST 处理登录回调）
// auth()    → Server Component / Server Action / proxy 里读 session
// signIn    → Client 端触发登录（Client Component 用，如登录表单提交）
// signOut   → Client 端触发登出
//
// ==================== Session 策略选择 ====================
//
// jwt 策略（本项目用）：
//   - 用户信息存 JWT，不写数据库 session 表
//   - 适合无状态部署（Vercel Edge）
//   - 缺点：无法在服务端主动让某个 session 失效
//
// database 策略：
//   - session 存数据库表，可主动踢人下线
//   - 需要配 adapter（Prisma Adapter）
//   - 每次请求查一次数据库，性能略低

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ExtendedJWT } from "@/types/next-auth";

// 注：NextAuth v5 会自动读 AUTH_SECRET 环境变量，不需要手动传
// env.ts 的校验保证 AUTH_SECRET 一定存在，启动时就暴露配置问题
export const { handlers, auth, signIn, signOut } = NextAuth({
  // ==================== Providers：登录方式数组 ====================
  // v5 支持多种 provider：Credentials / GitHub / Google / Email 等
  // 本项目先用 Credentials（邮箱密码），后续可加 GitHub OAuth
  providers: [
    Credentials({
      // name: 登录表单上显示的 provider 名称
      name: "账号密码",
      // credentials: 定义登录表单的字段（NextAuth 内置登录页用）
      // 自定义登录页时这里主要用于类型提示，实际表单我们自己写
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      // ==================== authorize: 密码校验核心 ====================
      //
      // 执行时机：用户提交登录表单时（POST /api/auth/callback/credentials）
      // 执行环境：服务端（可以查数据库、用 bcrypt）
      //
      // 返回值约定：
      //   返回 user 对象 → 登录成功，NextAuth 把 user 写入 JWT
      //   返回 null      → 登录失败，跳回登录页显示通用错误
      //
      // 为什么返回 null 而不是抛错?
      //   抛错会让错误信息暴露给前端（如"用户不存在"可被用来枚举账号）
      //   返回 null 只显示通用错误，不泄露用户是否存在
      //
      // 为什么 credentials 是 Partial<Record<...>>?
      //   NextAuth 不知道你的表单字段，类型上是宽松的
      //   必须用 zod 或手动断言校验，不能盲目信任输入
      authorize: async (credentials) => {
        // ---------- 1. 用 zod 校验输入（防止恶意请求）----------
        // credentials 类型是 Partial<Record<string, unknown>>
        // 必须先校验类型和格式，不能直接用
        const inputSchema = z.object({
          email: z.string().email(),
          password: z.string().min(1),
        });

        const parsed = inputSchema.safeParse(credentials);
        if (!parsed.success) {
          // 输入格式不对（不是有效邮箱或密码为空）
          // 返回 null 而非抛错，避免信息泄露
          return null;
        }

        const { email, password } = parsed.data;

        // ---------- 2. 查数据库找用户 ----------
        // 用 findUnique 因为 email 是唯一字段
        // 注意：OAuth 用户 passwordHash 可能为空（没设过密码）
        //       这类用户不能用 Credentials 登录
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            image: true,
            role: true,
            passwordHash: true,
          },
        });

        // 用户不存在 → 返回 null（不区分"用户不存在"和"密码错误"）
        if (!user || !user.passwordHash) {
          return null;
        }

        // ---------- 3. bcrypt 比对密码 ----------
        // bcrypt.compare 是安全的：恒定时间比较，防时序攻击
        // 不能用 === 直接比较 hash（hash 含 salt，每次不同）
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return null;
        }

        // ---------- 4. 返回 user 对象 ----------
        // 这个对象会被传给 jwt callback（任务3 在那里把 role/id 塞进 token）
        // 注意：不要返回 passwordHash！只返回非敏感字段
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          username: user.username,
        };
      },
    }),
  ],

  // ==================== Session 策略 ====================
  // jwt：用户信息存 JWT token（存在 cookie 里）
  // database：session 存数据库表
  // 本项目用 jwt：部署到 Vercel Edge 无状态运行，不需要数据库 session 表
  session: { strategy: "jwt" },

  // ==================== 自定义页面路径 ====================
  // 不配的话 NextAuth 用内置丑陋登录页
  // 配了之后访问受保护路由未登录会跳转到 /login
  pages: {
    signIn: "/login",
  },

  // ==================== Callbacks：自定义 JWT 和 Session 内容 ====================
  //
  // 这是 v5 jwt 策略的核心数据流）：
  //
  //   登录时：
  //     authorize 返回 user
  //       → jwt callback 收到 { token, user }
  //       → 把 user.id / user.role / user.username 写进 token
  //
  //   后续每次请求：
  //     jwt callback 收到 { token }（user 为 undefined）
  //       → 直接返回 token（已经包含 role/id）
  //       → session callback 收到 { session, token }
  //       → 把 token 的字段映射到 session.user
  //
  //   Server Component：
  //     await auth() → 拿到 session（含 user.id / user.role）
  //
  // 为什么不直接在 session callback 里查数据库?
  //   → 每次请求都查库太慢
  //   → role 存 JWT 里即可（改 role 后需要重新登录才生效，可接受）
  callbacks: {
    // ---------- jwt callback：把 user 字段塞进 token ----------
    jwt({ token, user }) {
      // user 只在登录时有值（authorize 返回的 user 对象）
      // 后续请求 user 为 undefined，直接返回 token
      if (user) {
        // 把 authorize 返回的额外字段写进 token
        // token 默认只有 name/email/picture/sub
        // 注：用双重断言是因为 @auth/core 的 JWT 接口
        //     extends Record<string, unknown>，索引签名让新增属性变成 unknown
        //     双重断言（as unknown as）绕过 TS 的类型检查
        //     这是 Auth.js v5 beta + Record 索引签名的已知局限
        const t = token as unknown as ExtendedJWT;
        t.id = user.id;
        t.role = user.role;
        t.username = user.username;
      }
      return token;
    },

    // ---------- session callback：把 token 字段映射到 session.user ----------
    session({ session, token }) {
      // token 在 jwt callback 里已经塞好了 id/role/username
      // 这里把它们映射到 session.user 上
      // 这样 Server Component 里 await auth() 就能拿到 session.user.role 等
      const t = token as unknown as ExtendedJWT;
      if (session.user) {
        session.user.id = t.id;
        session.user.role = t.role;
        session.user.username = t.username;
      }
      return session;
    },
  },
});
