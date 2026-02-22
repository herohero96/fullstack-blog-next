import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const articles = await prisma.article.findMany({
    select: { id: true, title: true },
    orderBy: { id: 'asc' }
  })
  articles.forEach(a => console.log(a.id, a.title))
  await prisma.$disconnect()
}
main().catch(console.error)
