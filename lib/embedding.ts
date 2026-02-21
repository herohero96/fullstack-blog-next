import prisma from './prisma'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!
const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

/** 将文本分块：500字/块，50字重叠 */
export function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end))
    if (end >= text.length) break
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

/** 调用 Voyage AI voyage-3 生成向量 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-3',
      input: texts,
      input_type: 'document',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.data.map((d: { embedding: number[] }) => d.embedding)
}

/** 为单条查询生成向量 */
export async function getQueryEmbedding(query: string): Promise<number[]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-3',
      input: [query],
      input_type: 'query',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.data[0].embedding
}

/** 对文章进行分块、生成向量并存储到数据库 */
export async function embedArticle(articleId: number, content: string) {
  // 先删除旧的 embedding
  await prisma.$executeRaw`DELETE FROM "ArticleEmbedding" WHERE "articleId" = ${articleId}`

  const chunks = chunkText(content)
  if (chunks.length === 0) return

  const embeddings = await getEmbeddings(chunks)

  // 使用原始 SQL 插入 vector 类型
  for (let i = 0; i < chunks.length; i++) {
    const vectorStr = `[${embeddings[i].join(',')}]`
    await prisma.$executeRaw`
      INSERT INTO "ArticleEmbedding" ("articleId", "chunkIndex", "chunkText", "embedding", "createdAt")
      VALUES (${articleId}, ${i}, ${chunks[i]}, ${vectorStr}::vector, NOW())
    `
  }
}

/** 向量检索：返回与 query 最相似的 topK 个文本块 */
export async function searchSimilarChunks(
  articleId: number,
  query: string,
  topK = 3
): Promise<{ chunkText: string; similarity: number }[]> {
  const queryEmbedding = await getQueryEmbedding(query)
  const vectorStr = `[${queryEmbedding.join(',')}]`

  const results = await prisma.$queryRaw<
    { chunkText: string; similarity: number }[]
  >`
    SELECT "chunkText", 1 - ("embedding" <=> ${vectorStr}::vector) AS similarity
    FROM "ArticleEmbedding"
    WHERE "articleId" = ${articleId}
    ORDER BY "embedding" <=> ${vectorStr}::vector
    LIMIT ${topK}
  `

  return results
}
