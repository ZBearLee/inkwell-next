# Inkwell-next

基于 Next.js 16 构建的技术博客 CMS，探索 React Server Components、多种渲染策略与全栈实践。

## 技术栈

- **框架**：Next.js 16 (App Router) + React 19
- **语言**：TypeScript 5
- **样式**：Tailwind CSS v4 + `@tailwindcss/typography`
- **数据库**：PostgreSQL 16 (Docker) + Prisma 6
- **鉴权**：NextAuth.js v5 (JWT 策略 + Credentials Provider)
- **校验**：Zod 4（前后端共享 Schema）
- **Markdown**：remark + rehype + Shiki（服务端渲染，零客户端 JS）
- **部署**：Vercel

## 功能特性

- 首页文章流 + 侧边栏（分类导航 + 热门标签），Suspense 流式渲染
- 文章详情：SSG + ISR、Markdown 代码高亮、TOC 目录滚动高亮、代码复制按钮、阅读进度条
- 全文搜索（Server Actions + 防抖）
- 评论系统（楼中楼回复 + Markdown 支持）
- 用户认证（注册/登录/登出 + 路由保护）
- 文章管理后台（Markdown 编辑器 + 实时预览 + 草稿/发布 + 自动保存）
- 管理员文章管理（ADMIN 可查看/编辑/删除/发布切换所有用户的文章，列表含作者列）
- 分类管理（仅 ADMIN）
- 用户主页 `/u/[username]`
- SEO：Metadata API + sitemap.ts + robots.ts + JSON-LD + RSS Feed
- 暗色模式 + 响应式设计

## 用户角色

| 角色 | 权限 |
|---|---|
| 游客 | 浏览文章、搜索、看评论、RSS |
| 用户 (USER) | 游客能力 + 发文/编辑/删除自己的文章 + 评论 |
| 管理员 (ADMIN) | 用户能力 + 管理所有用户的文章（查看/编辑/删除/发布切换）+ 管理分类 |

## 快速开始

```bash
# 1. 安装依赖（postinstall 自动生成 Prisma Client）
pnpm install

# 2. 复制环境变量
cp .env.example .env

# 3. 启动数据库（Docker）
docker run --name inkwell-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inkwell -p 5434:5432 -d postgres:16

# 4. 同步数据库 + 写入种子数据
pnpm prisma db push
pnpm db:seed

# 5. 启动开发服务器
pnpm dev
```

打开 http://localhost:3000

## 测试账号

| 角色 | 邮箱 | 密码 |
|---|---|---|
| 用户 | author@inkwell.dev | author123 |
| 管理员 | admin@inkwell.dev | admin123 |

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm lint` | ESLint |
| `pnpm prisma db push` | 同步 schema 到数据库 |
| `pnpm db:seed` | 种子数据 |
| `pnpm db:studio` | Prisma Studio 可视化管理 |

## 项目结构

```
src/
├── app/           # 页面路由（SSR/SSG/ISR + Route Handler）
├── actions/       # Server Actions（数据变更 + 权限校验）
├── components/    # React 组件（Server / Client）
├── lib/           # 数据层 + 工具函数
├── types/         # 类型扩展
├── auth.ts        # NextAuth 配置
└── proxy.ts       # 路由保护
```