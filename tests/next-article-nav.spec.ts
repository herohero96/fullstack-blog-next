import { test, expect } from '@playwright/test'

const BASE_URL = 'https://ai-news-hub-next.vercel.app'

// Earliest article — has a next article
const FIRST_ARTICLE_SLUG = 'claude-code-getting-started-1771664920182'
// Latest article — no next article
const LAST_ARTICLE_SLUG = 'openclaw-series-8-mm0kb4ke'

test('下一篇导航：有下一篇时显示标签和链接', async ({ page }) => {
  await page.goto(`${BASE_URL}/article/${FIRST_ARTICLE_SLUG}`)
  await page.waitForLoadState('domcontentloaded')

  // '下一篇' label should be visible
  const label = page.locator('[data-testid="next-article-nav"] span', { hasText: '下一篇' })
  await expect(label).toBeVisible({ timeout: 15000 })

  // The link should point to /article/<some-slug>
  const link = page.locator('[data-testid="next-article-nav"] a')
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  expect(href).toMatch(/^\/article\/.+/)
})

test('下一篇导航：最新文章不显示下一篇区域', async ({ page }) => {
  await page.goto(`${BASE_URL}/article/${LAST_ARTICLE_SLUG}`)
  await page.waitForLoadState('domcontentloaded')

  // The next-article section should NOT be present
  const nav = page.locator('[data-testid="next-article-nav"]')
  await expect(nav).toHaveCount(0)
})
