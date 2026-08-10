# Inkwell-next

基于 Next.js 16 构建的技术博客 CMS，探索 React Server Components、多种渲染策略与全栈实践。

## 技术栈

- Next.js 16 (App Router) + React 19
- TypeScript + Tailwind CSS v4
- PostgreSQL 16 (Docker) + Prisma 6
- NextAuth.js v5 + Zod

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量
cp .env.example .env

# 3. 启动数据库（Docker）
docker run --name inkwell-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inkwell -p 5434:5432 -d postgres:16

# 4. 运行迁移 + 写入种子数据
pnpm db:migrate
pnpm db:seed

# 5. 启动开发服务器
pnpm dev
```

打开 http://localhost:3000

## 测试账号

| 角色 | 邮箱 | 密码 |
|---|---|---|
| 作者 | author@inkwell.dev | author123 |
| 管理员 | admin@inkwell.dev | admin123 |

## License

MIT
