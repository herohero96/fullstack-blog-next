# Fullstack Blog - Next.js

一个基于 Next.js 16 + Supabase + Prisma 构建的全栈博客系统。

## 技术栈

- **框架**: Next.js 16 (App Router, TypeScript)
- **样式**: Tailwind CSS
- **数据库**: Supabase (PostgreSQL)
- **ORM**: Prisma 7
- **认证**: JWT (自实现，bcryptjs 加密)
- **Markdown**: react-markdown + remark-gfm + rehype-highlight

## 功能

- 文章 CRUD（Markdown 编辑器，草稿/发布）
- 分类、标签管理
- 评论系统（支持嵌套回复）
- 点赞、浏览量统计
- 全文搜索
- JWT 用户认证（注册/登录/角色权限）
- 后台用户管理（admin 审核）

## 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入真实的 DATABASE_URL 和 JWT_SECRET

# 同步数据库 schema
npx prisma db push

# 启动开发服务器
npm run dev
```

## 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入该仓库
3. 在 Vercel 项目设置中配置环境变量：
   - `DATABASE_URL` — Supabase 连接字符串
   - `JWT_SECRET` — JWT 签名密钥
4. Vercel 会自动执行 `npm run build`（含 `prisma generate`）

## 环境变量

参考 `.env.example`：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Supabase PostgreSQL 连接字符串 |
| `JWT_SECRET` | JWT 签名密钥 |

## 数据库

使用 Prisma 管理 schema，模型包括：`User`、`Article`、`Category`、`Tag`、`Comment`、`Like`、`ArticleTag`。

```bash
# 推送 schema 变更到数据库
npx prisma db push

# 查看数据库（Prisma Studio）
npx prisma studio
```
