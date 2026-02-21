import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const categories = await prisma.category.findMany()
  const tags = await prisma.tag.findMany()
  console.log('Categories:', JSON.stringify(categories, null, 2))
  console.log('Tags:', JSON.stringify(tags, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
