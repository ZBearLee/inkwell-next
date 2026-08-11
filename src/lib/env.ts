// src/lib/env.ts
// 环境变量校验（用 Zod 在启动时校验，缺关键变量直接报错）
//
// ==================== 为什么要校验环境变量? ====================
//
// 不校验的问题：
//   - AUTH_SECRET 漏配 → NextAuth 启动时不报错，运行时才崩
//   - DATABASE_URL 拼错 → Prisma 运行时才报错，调试困难
//
// 校验的好处：
//   - 启动时立刻暴露配置问题
//   - TypeScript 智能提示（env.AUTH_SECRET 是 string 而非 string | undefined）
//   - 集中管理所有环境变量的"契约"
//
// ==================== process.env 直接用的问题 ====================
//
// 直接读 process.env.AUTH_SECRET 类型是 string | undefined
// 每次用都要 if 判空，代码啰嗦
// 校验后类型收窄为 string，用起来干净

import { z } from "zod";

// ==================== Zod Schema 定义环境变量契约 ====================
const envSchema = z.object({
  // 数据库连接（必填）
  DATABASE_URL: z.string().url(),

  // NextAuth 密钥（必填，用于签名 JWT）
  // 生成命令：openssl rand -base64 32
  // 开发环境随便写一串也行，生产必须用强随机值
  AUTH_SECRET: z.string().min(16),

  // 站点地址（NextAuth 回调用）
  NEXTAUTH_URL: z.string().url().optional(),
});

// ==================== 解析 + 校验 ====================
// parse 失败会抛 ZodError，Next.js 启动时直接崩溃并打印缺哪个变量
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("环境变量校验失败:");
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  });
  // 开发环境直接退出，生产环境也退出（配置错误不能上线）
  process.exit(1);
}

// 导出校验后的环境变量（类型已收窄为非空 string）
export const env = parsed.data;
