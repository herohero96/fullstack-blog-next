const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const fs = require('fs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const content = fs.readFileSync('/home/ubuntu/.openclaw/workspace/blog-post-openclaw-series-1.md', 'utf8')

async function main() {
  const slug = 'openclaw-series-1-' + Date.now().toString(36)
  const article = await prisma.article.create({
    data: {
      title: 'OpenClaw 系列之一：基础篇——架构概览，为何它是个人 AI 助理的"终极形态"？',
      content,
      summary: '从架构原理到工具系统，深入解析 OpenClaw 这个本地 AI Agent 框架是如何让 AI 真正能"干活"的。',
      slug,
      authorId: 1,
      categoryId: 1,
      published: false, // 默认草稿，登录后预览再发布
      coverImage: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800',
    }
  })
  console.log('文章已发布！')
  console.log('地址：https://ai-news-hub-next.vercel.app/article/' + article.slug)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })
