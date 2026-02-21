import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const content = fs.readFileSync('/tmp/blog-openclaw-v2.md', 'utf-8')
  
  // 找到技术教程分类
  const category = await prisma.category.findFirst({ where: { slug: 'tech-tutorial' } })

  // 找到相关标签
  const tags = await prisma.tag.findMany({
    where: { slug: { in: ['dev-tools', 'ai-programming', 'fullstack'] } }
  })

  const slug = 'openclaw-mcp-fullstack-deploy-' + Date.now().toString(36)

  const article = await prisma.article.create({
    data: {
      title: '用 OpenClaw + MCP 工具链免费搭建并部署两个全栈项目',
      slug,
      summary: '介绍如何借助 OpenClaw + Claude Code + Playwright MCP + Vercel MCP，从零搭建全栈博客和 AI 资讯聚合站，并免费部署上线的完整过程。',
      content,
      coverImage: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800',
      published: true,
      categoryId: category?.id ?? null,
      tags: tags.length > 0 ? {
        create: tags.map(t => ({ tagId: t.id }))
      } : undefined,
    }
  })

  console.log(`✅ 发布成功: ${article.title}`)
  console.log(`   slug: ${article.slug}`)
  console.log(`   id: ${article.id}`)
  await prisma.$disconnect()
}

main().catch(console.error)
