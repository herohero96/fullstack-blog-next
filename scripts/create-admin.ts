import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const hash = await bcrypt.hash('admin123456', 10);
  const user = await prisma.user.create({
    data: {
      username: 'admin',
      email: '1351493417@qq.com',
      password: hash,
      role: 'admin',
      status: 'approved'
    }
  });
  console.log('管理员创建成功:', user.username, user.email);
  await prisma.$disconnect();
}

main().catch(console.error);
