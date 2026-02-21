import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36)
}

const transformArticleTags = (article: any) => {
  if (!article) return article
  const { tags, ...rest } = article
  return {
    ...rest,
    tags: tags ? tags.map((at: any) => at.tag) : [],
  }
}

// GET /api/articles — list with pagination, category, tag filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const skip = (page - 1) * limit

    const where: any = {}
    if (searchParams.get('published') === 'true') where.published = true

    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      const catId = parseInt(categoryParam)
      if (!isNaN(catId)) {
        where.categoryId = catId
      } else {
        const cat = await prisma.category.findFirst({ where: { slug: categoryParam } })
        where.categoryId = cat ? cat.id : -1
      }
    }

    const tagParam = searchParams.get('tag')
    if (tagParam) {
      const tagId = parseInt(tagParam)
      if (!isNaN(tagId)) {
        where.tags = { some: { tagId } }
      } else {
        const tag = await prisma.tag.findFirst({ where: { slug: tagParam } })
        where.tags = { some: { tagId: tag ? tag.id : -1 } }
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

    return NextResponse.json({
      articles: articles.map(transformArticleTags),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Failed to fetch articles:', error)
    return NextResponse.json({ message: 'Failed to fetch articles' }, { status: 500 })
  }
}

// POST /api/articles — create article (requires auth)
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const user = await verifyToken(token)
    if (user.status !== 'approved') {
      return NextResponse.json({ message: 'Account not approved' }, { status: 403 })
    }

    const body = await req.json()
    const { title, content, summary, tags, categoryId, category, coverImage, published } = body

    if (!title || !content) {
      return NextResponse.json({ message: 'Title and content are required' }, { status: 400 })
    }

    const slug = generateSlug(title)
    const tagIds: number[] = tags
      ? tags.map((t: string | number) => (typeof t === 'string' ? parseInt(t) : t))
      : []
    const rawCat = categoryId ?? category
    const validCategoryId = rawCat && !isNaN(Number(rawCat)) ? Number(rawCat) : null

    const article = await prisma.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          title,
          content,
          summary: summary || '',
          slug,
          categoryId: validCategoryId,
          coverImage: coverImage || '',
          published: published || false,
          authorId: user.userId,
          tags: tagIds.length > 0
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        },
        include: {
          tags: { include: { tag: true } },
          category: true,
          author: { select: { id: true, username: true } },
        },
      })

      if (tagIds.length > 0) {
        await tx.tag.updateMany({
          where: { id: { in: tagIds } },
          data: { articleCount: { increment: 1 } },
        })
      }
      if (validCategoryId) {
        await tx.category.update({
          where: { id: validCategoryId },
          data: { articleCount: { increment: 1 } },
        })
      }

      return created
    })

    return NextResponse.json(transformArticleTags(article), { status: 201 })
  } catch (error) {
    console.error('Failed to create article:', error)
    return NextResponse.json({ message: 'Failed to create article' }, { status: 500 })
  }
}
