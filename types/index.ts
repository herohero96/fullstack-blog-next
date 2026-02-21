export interface Tag {
  id: number
  name: string
  slug: string
  color?: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
}

export interface Author {
  id: number
  username: string
}

export interface Article {
  id: number
  title: string
  slug: string
  summary: string
  content: string
  coverImage?: string
  published: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
  category?: Category
  tags: Tag[]
  author?: Author
  _count?: {
    comments: number
    likes: number
  }
}
