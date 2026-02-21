import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/search?q=keyword&tag=<id>&category=<id>&page=1&limit=10
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const q = searchParams.get('q') || ''
    const tag = searchParams.get('tag')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const skip = (page - 1) * limit

    const where: any = { published: true }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (tag) {
      const tagId = parseInt(tag)
      if (!isNaN(tagId)) {
        where.tags = { some: { tagId } }
      } else {
        const tagRecord = await prisma.tag.findFirst({ where: { slug: tag } })
        where.tags = { some: { tagId: tagRecord ? tagRecord.id : -1 } }
      }
    }

    if (category) {
      const catId = parseInt(category)
      if (!isNaN(catId)) {
        where.categoryId = catId
      } else {
        const cat = await prisma.category.findFirst({ where: { slug: category } })
        where.categoryId = cat ? cat.id : -1
      }
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          tags: { include: { tag: true } },
          category: true,
          author: { select: { id: true, username: true } },
          _count: { select: { comments: true, likes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.article.count({ where }),
    ])

    const transformed = articles.map((article) => {
      const { tags, ...rest } = article
      return { ...rest, tags: tags.map((at) => at.tag) }
    })

    return NextResponse.json({
      articles: transformed,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Search failed:', error)
    return NextResponse.json({ message: 'Search failed' }, { status: 500 })
  }
}
