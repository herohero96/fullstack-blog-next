import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const articles = await prisma.article.findMany({
    select: { id: true, title: true, createdAt: true },
    orderBy: { id: 'asc' }
  })

  // 按标题分组
  const groups: Record<string, typeof articles> = {}
  for (const a of articles) {
    if (!groups[a.title]) groups[a.title] = []
    groups[a.title].push(a)
  }

  // 找出重复的
  const toDelete: number[] = []
  for (const [title, list] of Object.entries(groups)) {
    if (list.length > 1) {
      console.log(`重复: "${title}" — ${list.length} 篇，保留 id:${list[0].id}，删除 ${list.slice(1).map(a => 'id:' + a.id).join(', ')}`)
      toDelete.push(...list.slice(1).map(a => a.id))
    }
  }

  if (toDelete.length === 0) {
    console.log('没有重复文章')
    return
  }

  // 先删关联数据
  await prisma.articleTag.deleteMany({ where: { articleId: { in: toDelete } } })
  await prisma.comment.deleteMany({ where: { articleId: { in: toDelete } } })
  await prisma.like.deleteMany({ where: { articleId: { in: toDelete } } })
  // 删文章
  const result = await prisma.article.deleteMany({ where: { id: { in: toDelete } } })
  console.log(`\n✅ 删除了 ${result.count} 篇重复文章`)

  await prisma.$disconnect()
}
main().catch(console.error)
