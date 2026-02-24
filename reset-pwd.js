const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, email: true, role: true } })
  console.log(JSON.stringify(users, null, 2))
  const hash = await bcrypt.hash('admin123', 10)
  const updated = await prisma.user.updateMany({ where: { role: 'ADMIN' }, data: { password: hash } })
  console.log('已重置', updated.count, '个管理员密码为 admin123')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })
