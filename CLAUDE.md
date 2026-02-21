# Fullstack Blog Next.js 版

## 项目简介
将原有 React + Express + MySQL 博客迁移到 Next.js + Prisma + Supabase + Vercel。

技术栈：Next.js 15 + TypeScript + Tailwind CSS + Prisma + PostgreSQL（Supabase）

## 原项目参考
原项目在 /home/ubuntu/.openclaw/workspace/fullstack-blog，可以参考：
- backend/prisma/schema.prisma — 数据模型
- backend/src/controllers/ — 业务逻辑
- frontend/src/ — 前端组件和页面

## MANDATORY: Agent Workflow

### Step 1: 选择任务
读取 task.json，选择 id 最小的 passes: false 任务。

### Step 2: 实现任务
- 参考原项目代码逻辑，用 Next.js App Router 重写
- TypeScript 严格模式
- Tailwind CSS 样式

### Step 3: 测试
- npm run lint 无错误
- npm run build 构建成功

### Step 4: 更新 progress.txt

### Step 5: 提交
```bash
git add . && git commit -m "[任务描述] - completed" && git push
```

## 环境变量
```
DATABASE_URL=postgresql://postgres.epzmvgcewdksftfbchaj:Jgb6r0CGSrk2Mi2K@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
JWT_SECRET=blog-jwt-secret-2026
NEXT_PUBLIC_API_URL=
```

## 项目结构
```
app/
├── page.tsx              # 首页
├── article/[slug]/       # 文章详情
├── create/               # 创建文章
├── edit/[slug]/          # 编辑文章
├── login/                # 登录
├── register/             # 注册
├── search/               # 搜索
├── category/[slug]/      # 分类
├── tag/[slug]/           # 标签
├── admin/users/          # 后台用户管理
└── api/                  # API Routes
components/
lib/
├── prisma.ts             # Prisma 客户端
├── auth.ts               # JWT 工具
└── api.ts                # 前端 API 请求
prisma/
└── schema.prisma
```
