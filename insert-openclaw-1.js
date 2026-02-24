const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const fs = require('fs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
const content = fs.readFileSync('/home/ubuntu/.openclaw/workspace/blog-post-openclaw-1.md', 'utf8')

async function main() {
  const slug = 'openclaw-series-1-' + Date.now().toString(36)
  const article = await prisma.article.create({
    data: {
      title: 'OpenClaw 系列之一：OpenClaw 是什么，它是怎么工作的',
      content,
      summary: '从架构原理到工具系统，深入解析 OpenClaw 这个本地 AI Agent 框架是如何让 AI 真正能"干活"的。',
      slug,
      authorId: 1,
      categoryId: 1,
      published: true,
      coverImage: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800',
    }
  })
  console.log('发布成功！')
  console.log('地址：https://ai-news-hub-next.vercel.app/article/' + article.slug)
  
  // 生成 embedding
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.VOYAGE_API_KEY },
    body: JSON.stringify({ model: 'voyage-3', input: [article.title + '\n\n' + content], input_type: 'document' })
  })
  const data = await res.json()
  const embedding = data.data[0].embedding
  await prisma.$executeRawUnsafe('UPDATE "Article" SET embedding = $1::vector WHERE id = $2', '[' + embedding.join(',') + ']', article.id)
  console.log('embedding 已生成')
  await prisma.$disconnect()
}
main().catch(e => { console.error(e.message); process.exit(1) })
