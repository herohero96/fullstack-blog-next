import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

const transformArticleTags = (article: any) => {
  if (!article) return article
  const { tags, ...rest } = article
  return {
    ...rest,
    tags: tags ? tags.map((at: any) => at.tag) : [],
  }
}

// GET /api/articles/[slug]
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        tags: { include: { tag: true } },
        category: true,
        author: { select: { id: true, username: true } },
        comments: {
          include: { author: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { likes: true } },
      },
    })
    if (!article) {
      return NextResponse.json({ message: 'Article not found' }, { status: 404 })
    }
    return NextResponse.json(transformArticleTags(article))
  } catch (error) {
    console.error('Failed to fetch article:', error)
    return NextResponse.json({ message: 'Failed to fetch article' }, { status: 500 })
  }
}

// PUT /api/articles/[slug]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const user = await verifyToken(token)

    const { slug } = await params
    const existing = await prisma.article.findUnique({
      where: { slug },
      include: { tags: true },
    })
    if (!existing) {
      return NextResponse.json({ message: 'Article not found' }, { status: 404 })
    }

    const oldTagIds = existing.tags.map((t) => t.tagId)
    const oldCategoryId = existing.categoryId

    const body = await req.json()
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.content !== undefined) updateData.content = body.content
    if (body.summary !== undefined) updateData.summary = body.summary
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage
    if (body.published !== undefined) updateData.published = body.published
    if (body.categoryId !== undefined || body.category !== undefined) {
      const rawCat = body.categoryId !== undefined ? body.categoryId : body.category
      updateData.categoryId = rawCat ? Number(rawCat) : null
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.tags !== undefined) {
        const newTagIds: number[] = body.tags.map((t: string | number) =>
          typeof t === 'string' ? parseInt(t) : t
        )
        await tx.articleTag.deleteMany({ where: { articleId: existing.id } })
        if (newTagIds.length > 0) {
          await tx.articleTag.createMany({
            data: newTagIds.map((tagId) => ({ articleId: existing.id, tagId })),
          })
        }
        const removed = oldTagIds.filter((t) => !newTagIds.includes(t))
        const added = newTagIds.filter((t) => !oldTagIds.includes(t))
        if (removed.length > 0) {
          await tx.tag.updateMany({ where: { id: { in: removed } }, data: { articleCount: { decrement: 1 } } })
        }
        if (added.length > 0) {
          await tx.tag.updateMany({ where: { id: { in: added } }, data: { articleCount: { increment: 1 } } })
        }
      }

      const result = await tx.article.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          tags: { include: { tag: true } },
          category: true,
          author: { select: { id: true, username: true } },
        },
      })

      const rawNewCat = body.categoryId !== undefined ? body.categoryId : body.category
      const newCategoryId =
        body.categoryId !== undefined || body.category !== undefined
          ? rawNewCat ? Number(rawNewCat) : null
          : oldCategoryId
      if (newCategoryId !== oldCategoryId) {
        if (oldCategoryId) {
          await tx.category.update({ where: { id: oldCategoryId }, data: { articleCount: { decrement: 1 } } })
        }
        if (newCategoryId) {
          await tx.category.update({ where: { id: newCategoryId }, data: { articleCount: { increment: 1 } } })
        }
      }

      return result
    })

    return NextResponse.json(transformArticleTags(updated))
  } catch (error) {
    console.error('Failed to update article:', error)
    return NextResponse.json({ message: 'Failed to update article' }, { status: 500 })
  }
}

// DELETE /api/articles/[slug]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const user = await verifyToken(token)

    const { slug } = await params
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { tags: true },
    })
    if (!article) {
      return NextResponse.json({ message: 'Article not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.article.delete({ where: { id: article.id } })
      const tagIds = article.tags.map((t) => t.tagId)
      if (tagIds.length > 0) {
        await tx.tag.updateMany({ where: { id: { in: tagIds } }, data: { articleCount: { decrement: 1 } } })
      }
      if (article.categoryId) {
        await tx.category.update({ where: { id: article.categoryId }, data: { articleCount: { decrement: 1 } } })
      }
    })

    return NextResponse.json({ message: 'Article deleted' })
  } catch (error) {
    console.error('Failed to delete article:', error)
    return NextResponse.json({ message: 'Failed to delete article' }, { status: 500 })
  }
}
