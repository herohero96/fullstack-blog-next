/**
 * 评论 SSE 实时推送管理
 * 维护每篇文章的订阅者列表，支持新评论实时推送
 */

interface CommentEvent {
  id: number
  content: string
  authorId: number | null
  guestName: string | null
  parentId: number | null
  createdAt: string
  author: { id: number; username: string } | null
}

type Subscriber = {
  controller: ReadableStreamDefaultController
  closed: boolean
}

const subscribers = new Map<number, Set<Subscriber>>()

export function subscribe(articleId: number, controller: ReadableStreamDefaultController): Subscriber {
  if (!subscribers.has(articleId)) {
    subscribers.set(articleId, new Set())
  }
  const sub: Subscriber = { controller, closed: false }
  subscribers.get(articleId)!.add(sub)
  return sub
}

export function unsubscribe(articleId: number, sub: Subscriber) {
  sub.closed = true
  subscribers.get(articleId)?.delete(sub)
  if (subscribers.get(articleId)?.size === 0) {
    subscribers.delete(articleId)
  }
}

export function notifyCommentSubscribers(articleId: number, comment: CommentEvent) {
  const subs = subscribers.get(articleId)
  if (!subs) return

  const data = `data: ${JSON.stringify(comment)}\n\n`
  const encoder = new TextEncoder()
  const encoded = encoder.encode(data)

  for (const sub of subs) {
    if (sub.closed) continue
    try {
      sub.controller.enqueue(encoded)
    } catch {
      sub.closed = true
      subs.delete(sub)
    }
  }
}
