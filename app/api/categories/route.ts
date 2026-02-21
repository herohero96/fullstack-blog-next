import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// GET /api/categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json({ message: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST /api/categories — admin only
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const user = await verifyToken(token)
    if (user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { name, slug, description } = await req.json()
    if (!name || !slug) {
      return NextResponse.json({ message: 'Name and slug are required' }, { status: 400 })
    }

    const category = await prisma.category.create({
      data: { name, slug, description: description || '' },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Failed to create category:', error)
    return NextResponse.json({ message: 'Failed to create category' }, { status: 500 })
  }
}
