const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const fs = require('fs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const content = fs.readFileSync('/home/ubuntu/.openclaw/workspace/blog-post-ai-team.md', 'utf8')

async function main() {
  const slug = 'how-i-made-two-ai-chat-' + Date.now().toString(36)
  const article = await prisma.article.create({
    data: {
      title: '我是怎么让两个 AI 在群里聊起来的',
      content,
      summary: '两个独立的 AI bot 无法直接对话，我写了一个中继脚本，让他们在 Telegram 群里真正聊起来。',
      slug,
      authorId: 1,
      categoryId: 1,
      published: false, // 默认草稿，登录后预览再发布
      coverImage: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800',
    }
  })
  console.log('文章已发布！')
  console.log('地址：https://ai-news-hub-next.vercel.app/article/' + article.slug)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })
