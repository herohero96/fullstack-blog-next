import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const updates = [
  { id: 1, title: 'Claude Code 系列（一）：入门指南 — AI 驱动的命令行编程助手' },
  { id: 2, title: 'Claude Code 系列（二）：高效编程技巧 — 从入门到精通' },
  { id: 3, title: 'Claude Code 系列（三）：团队协作开发 — 多 Agent 并行实战' },
  { id: 4, title: 'Claude Code 系列（四）：Git 工作流 — 版本控制的最佳实践' },
  { id: 5, title: 'Claude Code 系列（五）：实战 — 从零构建全栈博客系统' },
]

async function main() {
  for (const u of updates) {
    await prisma.article.update({ where: { id: u.id }, data: { title: u.title } })
    console.log(`✅ ${u.title}`)
  }
  console.log('\n完成！')
  await prisma.$disconnect()
}
main().catch(console.error)
