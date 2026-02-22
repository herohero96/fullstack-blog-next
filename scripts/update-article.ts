import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const newContent = `# 用 OpenClaw + Claude Code 免费搭建并部署两个全栈项目

## 什么是 OpenClaw？

OpenClaw 是一个 AI 驱动的开发助手，通过 Telegram 等聊天工具直接交互。它内置了 Claude AI，能够直接操作文件系统、执行命令、管理数据库，让你用自然语言描述需求，它帮你把事情做完。

与传统 IDE 插件不同，OpenClaw 的核心优势在于它可以集成 Claude Code 作为编程引擎，大幅扩展 AI 的能力边界。本文介绍我如何借助 OpenClaw + Claude Code，从零搭建两个全栈项目并免费部署上线。

### 安装 Claude Code

OpenClaw 支持安装 Claude Code 作为核心编程引擎。Claude Code 是 Anthropic 官方推出的 CLI 编程工具，安装后 OpenClaw 可以直接调用它来完成更复杂的代码任务——分析项目结构、多文件编辑、自动生成提交信息等。

安装方式很简单，在 OpenClaw 配置里添加 Claude Code 即可，之后所有编程相关的指令都会由 Claude Code 来执行。

### 授权 GitHub

为了让 OpenClaw 能直接操作代码仓库，我把 GitHub 的权限授权给了它。授权之后，OpenClaw 可以：

- 直接拉取和推送代码
- 创建和切换分支
- 提交代码并自动生成 commit message
- 查看 PR（Pull Request）状态

这意味着从写代码到提交到仓库，整个流程都可以在对话里完成，不需要手动操作 Git 命令。

### 核心能力

- **文件操作**：读写代码文件，无需手动复制粘贴
- **命令执行**：直接运行构建、测试、部署命令
- **数据库操作**：连接数据库，执行查询和写入
- **定时任务**：设置 cron job，自动化重复工作
- **GitHub 集成**：直接操作代码仓库，提交推送一气呵成
- **Playwright 测试**：自动化浏览器测试，验证页面功能

## 开发工具介绍

### Playwright

Playwright 是一个 Node.js 自动化测试库，可以控制真实浏览器进行端到端测试。在开发过程中，我用它来：

- 自动运行端到端测试，验证页面功能是否正常
- 截图检查页面渲染效果
- 模拟用户操作，测试交互流程

传统方式需要手动写测试脚本、手动跑测试、手动看结果。通过 OpenClaw 调用 Playwright，直接告诉它"帮我测试一下评论功能"，它会自动打开浏览器、填写表单、验证结果，全程不需要人工介入。

### Vercel

Vercel 是一个前端部署平台，核心原理是监听 GitHub 仓库变化，代码 push 后自动触发构建和部署。主要特点：

- 静态文件部署到全球 CDN，访问速度快
- \`app/api/\` 目录自动变成 Serverless Function
- 支持环境变量管理
- 免费额度对个人项目完全够用

## 项目一：全栈博客系统

### 技术栈

- **前端**：Next.js + TypeScript + Tailwind CSS
- **数据库**：PostgreSQL（Supabase 免费托管）
- **部署**：Vercel（免费）

### 核心功能

- 文章列表与详情页，支持 Markdown 渲染
- 评论系统，支持 AI 自动回复
- 文章 AI 问答，基于文章内容回答读者问题
- 定时抓取 AI 资讯自动入库

### 开发过程

整个开发过程基本就是和 OpenClaw 对话。比如需要往博客里写入文章，直接说"帮我往博客里写几篇文章"，OpenClaw 会自动连接数据库、创建分类和标签、写入文章内容。

开发过程中也遇到了典型问题——文章写到了错误的数据库实例里，页面刷新没有数据。排查步骤：

1. OpenClaw 直接跑 \`curl\` 测试 API 返回值
2. 对比本地 \`.env\` 和 Vercel 环境变量里的数据库连接地址
3. 发现连接地址不一致，重新写入正确的数据库

整个排查过程不到 10 分钟，全程用自然语言描述问题，OpenClaw 自动执行排查命令。

### 用 Playwright 测试

部署完成后，用 Playwright 跑了一轮自动化测试：

- 验证文章列表页正常加载
- 验证评论发表功能正常
- 验证 AI 自动回复是否触发

**访问地址：** https://ai-news-hub-next.vercel.app/

## 项目二：AI 资讯聚合站

### 技术栈

与博客系统相同，Next.js + Supabase + Vercel，完全免费。

### 核心功能

自动抓取多个来源的 AI 行业动态：

- simonwillison.net（AI 技术博客）
- anthropic.com（Anthropic 官方新闻）
- blog.google（Google AI 博客）
- huggingface.co（开源模型社区）
- qbitai.com（量子位，中文 AI 资讯）
- 机器之心等共 8 个来源

支持 RSS 解析和 HTML 爬取，自动去重入库。

### 定时自动化

通过 OpenClaw 设置了两个定时任务：

\`\`\`
每天 06:00（北京时间）— 自动抓取最新资讯
每天 18:00（北京时间）— 自动抓取最新资讯
\`\`\`

不需要手动触发，完全自动化运行。

### 部署遇到的坑

Vercel 上线后报错：

\`\`\`
PrismaClientKnownRequestError: The column does not exist in the current database
\`\`\`

原因是数据库表结构和 Prisma schema 不一致。解决方法：

\`\`\`bash
npx prisma db push --accept-data-loss
\`\`\`

同步表结构后重新部署，问题解决。

**访问地址：** https://ai-news-hub-next.vercel.app/

## 免费部署方案

两个项目均零成本部署：

| 服务 | 用途 | 免费额度 |
|------|------|----------|
| Vercel | Next.js 托管 | 无限个人项目 |
| Supabase | PostgreSQL 数据库 | 500MB 存储，2个项目 |
| GitHub | 代码仓库 | 无限公开仓库 |

对于个人项目和作品集完全够用。

## 工具链总结

| 工具 | 作用 |
|------|------|
| OpenClaw | AI 开发助手，自然语言驱动开发 |
| Claude Code | 核心编程引擎，多文件编辑、代码分析 |
| GitHub | 代码仓库，授权后可直接提交推送 |
| Playwright | 自动化测试，验证页面功能 |
| Vercel | 自动部署，监听 GitHub 变化触发构建 |
| Supabase | 免费 PostgreSQL 数据库 |

## 小结

这套工具链最大的价值在于**把重复性工作自动化**：写代码、测试、部署、定时抓取数据，全部可以用自然语言驱动完成。

对于独立开发者来说，OpenClaw + Claude Code + Vercel + Supabase 是一个高效且零成本的组合。从想法到上线，两个项目只花了很短的时间，大部分精力放在了产品设计上，而不是重复的工程工作。`

async function main() {
  await prisma.article.update({
    where: { slug: 'openclaw-mcp-fullstack-deploy-mlw6w2fq' },
    data: {
      title: '用 OpenClaw + Claude Code 免费搭建并部署两个全栈项目',
      content: newContent
    }
  })
  console.log('✅ 文章更新完成')
  await prisma.$disconnect()
}
main().catch(console.error)
