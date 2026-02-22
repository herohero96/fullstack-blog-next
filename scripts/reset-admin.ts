import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const hash = await bcrypt.hash('admin123456', 10);
  const user = await prisma.user.update({
    where: { username: 'admin' },
    data: { password: hash, status: 'approved' }
  });
  console.log('密码重置成功:', user.username, user.email);
  await prisma.$disconnect();
}
main().catch(console.error);
