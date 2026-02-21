import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // 先查现有分类和标签
  const categories = await prisma.category.findMany();
  const tags = await prisma.tag.findMany();
  console.log('现有分类:', categories.map(c => `${c.id}:${c.name}`));
  console.log('现有标签:', tags.map(t => `${t.id}:${t.name}`));

  // 确保分类存在：技术教程
  let techTutorialCat = categories.find(c => c.slug === 'tech-tutorial');
  if (!techTutorialCat) {
    techTutorialCat = await prisma.category.create({
      data: {
        name: '技术教程',
        slug: 'tech-tutorial',
        description: '编程技术教程与实践指南',
      }
    });
    console.log('创建分类: 技术教程', techTutorialCat.id);
  }

  // 确保标签存在
  const tagDefs = [
    { name: 'Claude Code', slug: 'claude-code', color: '#D97706' },
    { name: 'AI编程', slug: 'ai-programming', color: '#7C3AED' },
    { name: '开发工具', slug: 'dev-tools', color: '#059669' },
    { name: '效率提升', slug: 'productivity', color: '#DC2626' },
    { name: '全栈开发', slug: 'fullstack', color: '#2563EB' },
  ];

  const tagMap: Record<string, number> = {};
  for (const td of tagDefs) {
    let tag = tags.find(t => t.slug === td.slug);
    if (!tag) {
      tag = await prisma.tag.create({ data: td });
      console.log('创建标签:', tag.name, tag.id);
    }
    tagMap[td.slug] = tag.id;
  }

  // 文章数据（来自 SQL dump）
  const articles = [
    {
      title: 'Claude Code 入门指南：AI 驱动的命令行编程助手',
      slug: 'claude-code-getting-started-' + Date.now(),
      summary: '全面介绍 Claude Code 的安装配置、核心概念和基本使用方法，帮助开发者快速上手这款 AI 驱动的命令行编程助手。',
      coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
      published: true,
      tagSlugs: ['claude-code', 'ai-programming', 'dev-tools'],
      content: `# Claude Code 入门指南：AI 驱动的命令行编程助手

## 什么是 Claude Code？

Claude Code 是 Anthropic 官方推出的一款 CLI（命令行界面）编程工具。它将 Claude 大语言模型的强大能力直接带入你的终端，让你可以通过自然语言对话的方式完成各种编程任务。

与传统的 IDE 插件不同，Claude Code 运行在终端中，能够直接访问你的文件系统、执行 shell 命令、操作 Git 仓库，真正实现了"对话式编程"的体验。你只需要用自然语言描述你想做什么，Claude Code 就会帮你分析代码、编写功能、修复 Bug、重构代码，甚至帮你管理 Git 提交。

### 核心特点

- **上下文感知**：自动理解你的项目结构、代码风格和依赖关系
- **文件操作**：可以读取、编辑、创建文件，无需手动复制粘贴
- **命令执行**：直接在终端执行构建、测试、部署等命令
- **Git 集成**：智能管理版本控制，自动生成提交信息
- **安全可控**：所有操作都需要你的确认，不会擅自执行危险操作

## 安装方法

### 前置要求

- Node.js 18 或更高版本
- npm 或其他包管理器
- 一个 Anthropic API Key

### 全局安装

\`\`\`bash
npm install -g @anthropic-ai/claude-code
\`\`\`

### 验证安装

\`\`\`bash
claude --version
\`\`\`

## 基本配置

### API Key 配置

首次运行 \`claude\` 时，它会引导你完成认证。你有两种方式：

1. **Anthropic Console 登录**（推荐）：通过浏览器完成 OAuth 认证
2. **API Key**：直接设置环境变量

\`\`\`bash
export ANTHROPIC_API_KEY=your-api-key-here
\`\`\`

## 基本使用

在你的项目目录下运行：

\`\`\`bash
cd your-project
claude
\`\`\`

Claude Code 会自动扫描项目结构，然后等待你的输入。

### 常见使用场景

\`\`\`
> 解释一下 src/hooks/useAuth.ts 这个文件的作用
> 帮我创建一个 React 组件，实现一个带搜索功能的下拉选择框
> 运行 npm test 后有 3 个测试失败了，帮我修复
> 把 src/api 目录下的所有 fetch 调用改成使用 axios
\`\`\`

## 常用命令

| 命令 | 说明 |
|------|------|
| \`/help\` | 查看帮助信息 |
| \`/clear\` | 清除当前对话历史 |
| \`/compact\` | 压缩上下文，释放 token 空间 |
| \`/cost\` | 查看当前会话的 token 使用量和费用 |
| \`/commit\` | 自动生成 Git 提交 |

## 小结

Claude Code 是一个强大的 AI 编程助手，通过自然语言交互，你可以更高效地完成编码任务。关键要点：

- 使用 \`npm install -g @anthropic-ai/claude-code\` 安装
- 在项目目录下运行 \`claude\` 启动
- 用自然语言描述你的需求
- 善用 \`/compact\`、\`/cost\` 等命令管理会话`,
    },
    {
      title: 'Claude Code 高效编程技巧：从入门到精通',
      slug: 'claude-code-advanced-tips-' + (Date.now() + 1),
      summary: '深入介绍 Claude Code 的进阶技巧，包括 CLAUDE.md 配置、高效提示词策略、文件操作工具、自定义命令和 Hooks 自动化。',
      coverImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
      published: true,
      tagSlugs: ['claude-code', 'ai-programming', 'productivity'],
      content: `# Claude Code 高效编程技巧：从入门到精通

掌握了 Claude Code 的基本使用后，是时候深入了解那些能让你效率翻倍的进阶技巧了。

## CLAUDE.md：项目级指令配置

### 什么是 CLAUDE.md？

CLAUDE.md 是 Claude Code 的项目配置文件，放在项目根目录下。每次启动 Claude Code 时，它会自动读取这个文件，获取项目特定的指令和上下文。

这就像给 Claude 一份"项目说明书"，告诉它这个项目的技术栈、编码规范、工作流程等关键信息。

### 基本结构

\`\`\`markdown
# 项目名称

## 技术栈
- 前端：React + TypeScript + Tailwind CSS
- 后端：Node.js + Express
- 数据库：MySQL + Prisma ORM

## 编码规范
- 使用 TypeScript strict 模式
- 组件使用函数式写法 + Hooks
\`\`\`

## 高效提示词技巧

### 明确具体的指令

差的提示词：
\`\`\`
> 帮我写个组件
\`\`\`

好的提示词：
\`\`\`
> 在 src/components/SearchBar.tsx 中创建一个搜索栏组件，
> 要求：
> 1. 接收 onSearch 回调函数作为 props
> 2. 输入框带防抖，延迟 300ms
> 3. 支持按 Enter 键触发搜索
> 4. 使用 Tailwind CSS 样式
\`\`\`

### 分步骤执行复杂任务

\`\`\`
> 我需要给博客系统添加评论功能，我们分步来：
> 第一步：先设计数据库 Schema
\`\`\`

## 自定义 Slash Commands

在项目根目录创建 \`.claude/commands/\` 目录，每个 \`.md\` 文件就是一个命令：

\`\`\`
.claude/
└── commands/
    ├── review.md
    └── test-component.md
\`\`\`

### 示例：代码审查命令

\`.claude/commands/review.md\`：
\`\`\`markdown
请审查当前 Git 暂存区的代码变更：
1. 检查代码质量和最佳实践
2. 查找潜在的 Bug 和安全问题
3. 验证 TypeScript 类型是否正确
\`\`\`

使用时只需输入：
\`\`\`
> /review
\`\`\`

## 小结

掌握这些技巧后，你会发现 Claude Code 不仅仅是一个代码生成工具，更是一个真正的编程伙伴。通过 CLAUDE.md 配置项目上下文、使用高效的提示词策略，你的开发效率将得到显著提升。`,
    },
    {
      title: '用 Claude Code 进行团队协作开发：多 Agent 并行实战',
      slug: 'claude-code-team-collaboration-' + (Date.now() + 2),
      summary: '详解 Claude Code 的团队协作模式，包括多 Agent 并行开发、任务驱动开发、消息通信机制，并通过博客系统开发案例展示实战流程。',
      coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
      published: true,
      tagSlugs: ['claude-code', 'ai-programming', 'fullstack'],
      content: `# 用 Claude Code 进行团队协作开发：多 Agent 并行实战

Claude Code 不仅是个人开发利器，它还支持强大的团队协作模式。通过多 Agent 并行工作和任务驱动开发，你可以让多个 AI Agent 同时处理不同的开发任务，大幅提升团队开发效率。

## 团队模式概述

Claude Code 的团队模式允许你创建多个 Agent 实例，每个 Agent 负责不同的任务，它们之间可以通过消息系统进行通信。这就像一个虚拟的开发团队：

1. **Team Lead（团队负责人）**：负责任务分配、进度协调和最终审查
2. **Teammates（团队成员）**：执行具体的开发任务
3. **Task System（任务系统）**：管理任务的创建、分配和状态追踪

## 任务驱动开发

### 任务状态流转

\`pending\` -> \`in_progress\` -> \`completed\`

### 任务依赖管理

\`\`\`
任务 #1: 设计数据库 Schema
任务 #2: 实现后端 API（blockedBy: [#1]）
任务 #3: 实现前端页面（blockedBy: [#2]）
任务 #4: 编写测试（blockedBy: [#2]）
\`\`\`

## 并行开发实践

假设我们要开发一个博客系统，可以这样分配任务：

\`\`\`
Team Lead（团队负责人）
├── Agent A: ui-dev（前端开发）
│   ├── 任务：页面布局和样式
│   └── 任务：组件开发
├── Agent B: backend-dev（后端开发）
│   ├── 任务：API 路由实现
│   └── 任务：数据库操作
└── Agent C: content-dev（内容开发）
    ├── 任务：编写示例数据
    └── 任务：编写测试
\`\`\`

## 最佳实践

1. **独立性**：每个任务应该尽量独立，减少 Agent 之间的依赖
2. **明确性**：任务描述要清晰具体，包含验收标准
3. **文件分区**：不同 Agent 尽量操作不同的文件
4. **合理的并行度**：2-4 个 Agent 通常最优

## 小结

Claude Code 的团队模式将 AI 辅助编程提升到了一个新的层次。通过任务驱动开发和多 Agent 并行工作，你可以将复杂项目拆分为可管理的子任务，多个 Agent 并行工作，大幅缩短开发周期。`,
    },
    {
      title: 'Claude Code + Git 工作流：版本控制的最佳实践',
      slug: 'claude-code-git-workflow-' + (Date.now() + 3),
      summary: '详解 Claude Code 与 Git 的深度集成，包括智能提交、PR 管理、代码审查、分支策略和安全协议，附带完整的工作流示例。',
      coverImage: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800',
      published: true,
      tagSlugs: ['claude-code', 'dev-tools', 'productivity'],
      content: `# Claude Code + Git 工作流：版本控制的最佳实践

Git 是现代软件开发的基石，而 Claude Code 与 Git 的深度集成让版本控制变得更加智能和高效。

## /commit 命令：智能提交

Claude Code 最受欢迎的功能之一就是 \`/commit\` 命令。它会自动分析你的代码变更，生成准确、规范的提交信息：

\`\`\`
> /commit
\`\`\`

Claude 会：
1. 运行 \`git status\` 查看所有变更
2. 运行 \`git diff\` 分析具体修改内容
3. 查看最近的提交历史，匹配项目的提交风格
4. 生成简洁准确的提交信息

### 提交信息示例

\`\`\`
feat: add user authentication with JWT tokens

- Implement login and register API endpoints
- Add JWT token generation and validation middleware
- Create auth context and useAuth ntend

Co-Authored-By: Claude <noreply@anthropic.com>
\`\`\`

## Git 安全协议

Claude Code 内置了严格的 Git 安全协议：

**绝对不会做的事情：**
- 不会 force push
- 不会 reset --hard
- 不会修改 Git 配置
- 不会跳过 hooks（\`--no-verify\`）
- 不会 amend 已发布的提交

## 分支管理策略

\`\`\`
> 从 main 分支创建一个新分支 feature/user-auth
\`\`\`

Claude 会遵循常见的分支命名规范：
- \`feature/xxx\`：新功能
- \`fix/xxx\`：Bug 修复
- \`refactor/xxx\`：代码重构
- \`docs/xxx\`：文档更新

## 实际工作流示例

### 修复一个 Bug

\`\`\`
# 1. 创建修复分支
> 从 main 创建 fix/login-redirect 分支

# 2. 定位问题
> 用户反馈登录后没有正确跳转，帮我找到相关代码

# 3. 修复 Bug
> 修复登录跳转逻辑

# 4. 提交
> /commit

# 5. 创建 PR
> 创建 PR 到 main 分支
\`\`\`

## 小结

Claude Code 与 Git 的集成让版本控制变得更加智能：\`/commit\` 自动生成高质量的提交信息，内置安全协议防止破坏性操作，支持完整的 Git 工作流。`,
    },
    {
      title: 'Claude Code 实战：从零构建全栈博客系统',
      slug: 'claude-code-fullstack-blog-' + (Date.now() + 4),
      summary: '以本博客系统为实际案例，完整展示用 Claude Code 从零构建全栈项目的全过程，涵盖规划、数据库设计、前后端开发、联调和部署优化。',
      coverImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
      published: true,
      tagSlugs: ['claude-code', 'ai-programming', 'fullstack'],
      content: `# Claude Code 实战：从零构建全栈博客系统

理论学得再多，不如动手实践一次。本文将以我们正在阅读的这个博客系统为实际案例，完整展示如何用 Claude Code 从零构建一个全栈项目。

## 项目概述

我们要构建的是一个功能完整的博客系统：

- **前端**：React + TypeScript + Tailwind CSS + Vite
- **后端**：Node.js + Express + TypeScript + Prisma
- **数据库**：MySQL
- **功能**：文章 CRUD、分类标签、Markdown 渲染、全文搜索、响应式设计

## 第一步：项目规划

在开始编码之前，先用 Claude Code 的规划能力来设计项目架构：

\`\`\`
> 我要构建一个全栈博客系统，请帮我规划项目结构和技术方案：
> - 前端：React + TypeScript + Tailwind CSS
> - 后端：Express + Prisma + MySQL
> - 功能：文章 CRUD、分类、标签、搜索
\`\`\`

## 第二步：数据库设计

\`\`\`prisma
model Article {
  id         Int          @id @default(autoincrement())
  title      String
  content    String       @db.LongText
  summary    String       @db.Text
  slug       String       @unique
  categoryId Int?
  category   Category?    @relation(fields: [categoryId], references: [id])
  coverImage String       @default("")
  published  Boolean      @default(false)
  viewCount  Int          @default(0)
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  tags       ArticleTag[]

  @@fulltext([title, content])
}
\`\`\`

## 第三步：后端 API 设计

\`\`\`
GET    /api/articles          # 获取文章列表（支持分页、筛选）
GET    /api/articles/:slug    # 获取单篇文章
POST   /api/articles          # 创建文章
PUT    /api/articles/:slug    # 更新文章
DELETE /api/articles/:slug    # 删除文章
GET    /api/search?q=keyword  # 全文搜索
\`\`\`

## 第四步：前端搭建

\`\`\`typescript
// src/lib/api.ts
export const articleAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<ArticleListResponse>(\`/articles\${query}\`);
  },
  getBySlug: (slug: string) => fetchAPI<Article>(\`/articles/\${slug}\`),
  create: (data: CreateArticleData) =>
    fetchAPI<Article>('/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
\`\`\`

## 项目回顾

| 阶段 | Claude Code 的贡献 |
|------|-------------------|
| 规划 | 项目结构设计、技术选型建议 |
| 数据库 | Schema 设计、迁移执行 |
| 后端 | API 路由、控制器、中间件 |
| 前端 | 组件开发、页面布局、样式 |
| 联调 | API 测试、Bug 修复 |

## 经验总结

1. **先规划后编码**：用 Claude 帮你理清思路再动手
2. **分步实现**：不要一次性给太大的任务
3. **及时测试**：每完成一个模块就测试
4. **善用 CLAUDE.md**：让 Claude 了解你的项目上下文
5. **保持对话**：遇到问题及时和 Claude 讨论

这个博客系统本身就是用 Claude Code 构建的，这就是 AI 辅助编程的魅力所在——它不仅帮你写代码，更帮你构建完整的产品。`,
    },
  ];

  let successCount = 0;
  for (const article of articles) {
    try {
      const tagIds = article.tagSlugs.map(slug => tagMap[slug]).filter(Boolean);
      const created = await prisma.article.create({
        data: {
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          content: article.content,
          coverImage: article.coverImage,
          published: article.published,
          categoryId: techTutorialCat!.id,
          tags: tagIds.length > 0 ? {
            create: tagIds.map(tagId => ({ tagId }))
          } : undefined,
        }
      });
      console.log(`✅ 创建文章: ${created.title} (id: ${created.id})`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ 失败: ${article.title} - ${err.message}`);
    }
  }

  console.log(`\n完成！成功写入 ${successCount}/${articles.length} 篇文章`);
  await prisma.$disconnect();
}

main().catch(console.error);
