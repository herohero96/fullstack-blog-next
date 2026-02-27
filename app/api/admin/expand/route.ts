import { NextRequest, NextResponse } from 'next/server'
import { expandAIContent } from '@/lib/content-engine'

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()
    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 })
    }

    const expanded = await expandAIContent(content)
    if (!expanded) {
      return NextResponse.json({ error: 'Expansion failed' }, { status: 500 })
    }

    return NextResponse.json(expanded)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
