import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const articles = await prisma.article.findMany({
    select: { title: true, summary: true, content: true },
    orderBy: { createdAt: 'asc' },
    take: 2
  })
  for (const a of articles) {
    console.log('=== TITLE:', a.title)
    console.log('=== SUMMARY:', a.summary)
    console.log('=== CONTENT (first 500):', a.content.slice(0, 500))
    console.log('\n')
  }
  await prisma.$disconnect()
}
main().catch(console.error)
