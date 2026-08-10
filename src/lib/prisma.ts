// src/lib/prisma.ts
// Prisma client 单例
// 为什么需要单例：Next.js 开发模式下热重载会多次执行模块，
// 直接 new PrismaClient() 会导致连接数飙升，最终耗尽数据库连接。
// 通过 globalThis 缓存单例，保证整个进程只创建一个 client。

import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}