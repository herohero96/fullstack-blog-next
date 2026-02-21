import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// PATCH /api/users/[id] — update user status (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const caller = await verifyToken(token)
    if (caller.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const userId = parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'Invalid user id' }, { status: 400 })
    }

    const body = await req.json()
    const { status } = body
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, username: true, email: true, role: true, status: true, createdAt: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ message: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/users/[id] — delete user (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const caller = await verifyToken(token)
    if (caller.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const userId = parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'Invalid user id' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ message: 'User deleted' })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 })
  }
}
