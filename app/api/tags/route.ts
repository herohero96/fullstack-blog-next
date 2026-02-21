import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// GET /api/tags
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(tags)
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    return NextResponse.json({ message: 'Failed to fetch tags' }, { status: 500 })
  }
}

// POST /api/tags — admin only
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const user = await verifyToken(token)
    if (user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { name, slug, color } = await req.json()
    if (!name || !slug) {
      return NextResponse.json({ message: 'Name and slug are required' }, { status: 400 })
    }

    const tag = await prisma.tag.create({
      data: { name, slug, color: color || '#3B82F6' },
    })
    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Failed to create tag:', error)
    return NextResponse.json({ message: 'Failed to create tag' }, { status: 500 })
  }
}
