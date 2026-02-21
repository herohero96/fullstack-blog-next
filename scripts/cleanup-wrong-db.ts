import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // 删除文章标签关联
  const delTags = await prisma.articleTag.deleteMany({});
  console.log(`删除 articleTag: ${delTags.count} 条`);

  // 删除文章
  const delArticles = await prisma.article.deleteMany({});
  console.log(`删除 article: ${delArticles.count} 条`);

  // 删除标签
  const delTagRecords = await prisma.tag.deleteMany({});
  console.log(`删除 tag: ${delTagRecords.count} 条`);

  // 删除分类
  const delCats = await prisma.category.deleteMany({});
  console.log(`删除 category: ${delCats.count} 条`);

  console.log('清理完成');
  await prisma.$disconnect();
}

main().catch(console.error);
