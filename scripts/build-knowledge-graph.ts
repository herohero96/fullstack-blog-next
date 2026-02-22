import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
const ANTHROPIC_AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN!

// ── Voyage AI embedding ──
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ model: 'voyage-3', input: [text] }),
  })
  if (!res.ok) throw new Error(`Voyage API error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.data[0].embedding
}

// ── Claude API call ──
async function callClaude(prompt: string): Promise<string> {
  const res = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_AUTH_TOKEN,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.content[0]?.text || ''
}

// ── 提取小结段落 ──
function extractSummarySection(content: string): string {
  const regex = /##\s*小结[\s\S]*$/
  const match = content.match(regex)
  if (match) return match[0].replace(/^##\s*小结\s*\n?/, '').trim()
  // 没有小结段落，取最后 500 字
  return content.slice(-500)
}

// ── 解析系列编号 ──
const SERIES_NUMBERS: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
}

function parseSeriesInfo(title: string): { seriesName: string; order: number } | null {
  // 匹配 "xxx（一）" 或 "xxx(一)" 或 "xxx 一" 等模式
  const match = title.match(/^(.+?)[（(]\s*([一二三四五六七八九十]+)\s*[）)]/)
    || title.match(/^(.+?)\s+([一二三四五六七八九十]+)\s*[：:—\-]/)
  if (!match) return null
  const seriesName = match[1].trim()
  const numStr = match[2]
  const order = SERIES_NUMBERS[numStr]
  if (!order) return null
  return { seriesName, order }
}

async function main() {
  console.log('=== 知识图谱建库脚本 ===\n')

  const articles = await prisma.article.findMany({
    where: { published: true },
    select: { id: true, title: true, content: true, slug: true },
  })
  console.log(`找到 ${articles.length} 篇已发布文章\n`)

  // Step 1: 生成 embedding
  console.log('--- Step 1: 生成文章 embedding ---')
  for (const article of articles) {
    const summary = extractSummarySection(article.content)
    console.log(`  [${article.id}] ${article.title} — 小结长度: ${summary.length}`)
    try {
      const embedding = await getEmbedding(summary)
      const vectorStr = `[${embedding.join(',')}]`
      await prisma.$executeRawUnsafe(
        `UPDATE "Article" SET embedding = $1::vector WHERE id = $2`,
        vectorStr,
        article.id
      )
      console.log(`    ✓ embedding 已存入`)
    } catch (e) {
      console.error(`    ✗ embedding 失败:`, e)
    }
  }

  // Step 2: 提取概念节点
  console.log('\n--- Step 2: 提取概念节点 ---')
  for (const article of articles) {
    console.log(`  [${article.id}] ${article.title}`)
    try {
      const prompt = `分析以下博客文章，提取 3-5 个核心技术概念/名词。
每个概念用 JSON 格式返回，包含 name（概念名称）、type（分类，如 tool/framework/concept/language/platform）、relation（与文章的关系，如 主题/工具/技术栈）。
只返回 JSON 数组，不要其他文字。

文章标题：${article.title}
文章内容（前2000字）：
${article.content.slice(0, 2000)}`

      const result = await callClaude(prompt)
      // 提取 JSON 数组
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.log(`    ✗ 无法解析概念`)
        continue
      }

      const concepts: { name: string; type: string; relation: string }[] = JSON.parse(jsonMatch[0])
      for (const c of concepts) {
        // upsert ConceptNode
        const node = await prisma.conceptNode.upsert({
          where: { name: c.name },
          update: { type: c.type },
          create: { name: c.name, type: c.type },
        })
        // upsert ArticleConcept
        await prisma.articleConcept.upsert({
          where: { articleId_conceptId: { articleId: article.id, conceptId: node.id } },
          update: { relation: c.relation },
          create: { articleId: article.id, conceptId: node.id, relation: c.relation },
        })
        console.log(`    ✓ ${c.name} (${c.type}) — ${c.relation}`)
      }
    } catch (e) {
      console.error(`    ✗ 概念提取失败:`, e)
    }
  }

  // Step 3: 建立系列关系
  console.log('\n--- Step 3: 建立系列关系 ---')
  const seriesMap = new Map<string, { id: number; title: string; order: number }[]>()

  for (const article of articles) {
    const info = parseSeriesInfo(article.title)
    if (!info) continue
    if (!seriesMap.has(info.seriesName)) seriesMap.set(info.seriesName, [])
    seriesMap.get(info.seriesName)!.push({ id: article.id, title: article.title, order: info.order })
  }

  for (const [seriesName, members] of seriesMap) {
    members.sort((a, b) => a.order - b.order)
    console.log(`  系列: ${seriesName} (${members.length} 篇)`)

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        // SERIES 关系（双向）
        await prisma.articleRelation.upsert({
          where: { fromId_toId_type: { fromId: members[i].id, toId: members[j].id, type: 'SERIES' } },
          update: {},
          create: { fromId: members[i].id, toId: members[j].id, type: 'SERIES' },
        })
        // PREREQUISITE 关系（前 → 后）
        await prisma.articleRelation.upsert({
          where: { fromId_toId_type: { fromId: members[i].id, toId: members[j].id, type: 'PREREQUISITE' } },
          update: {},
          create: { fromId: members[i].id, toId: members[j].id, type: 'PREREQUISITE' },
        })
        console.log(`    ✓ ${members[i].title} → ${members[j].title} (SERIES + PREREQUISITE)`)
      }
    }
  }

  console.log('\n=== 完成 ===')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
