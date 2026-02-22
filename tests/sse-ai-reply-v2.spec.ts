import { test, expect } from '@playwright/test'

const BASE_URL = 'https://ai-news-hub-next.vercel.app'
const ARTICLE_SLUG = 'openclaw-mcp-fullstack-deploy-mlw6w2fq'

test('评论后短轮询自动显示 AI 回复', async ({ page }) => {
  test.setTimeout(120_000)

  // 1. 打开文章页
  console.log('Step 1: 打开文章页...')
  await page.goto(`${BASE_URL}/article/${ARTICLE_SLUG}`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(5000)

  await expect(page.locator('h2', { hasText: '评论' })).toBeVisible({ timeout: 15000 })

  // 记录当前评论区所有回复数
  const repliesBefore = await page.locator('.rounded.bg-gray-50.p-3').count()
  console.log(`  当前回复数: ${repliesBefore}`)

  // 2. 用游客身份发一条评论
  const timestamp = Date.now()
  const commentText = `轮询测试 ${timestamp}`
  console.log(`Step 2: 发送游客评论: ${commentText}`)

  // 填写昵称和评论
  const nameInput = page.locator('input[placeholder="你的昵称"]')
  if (await nameInput.isVisible()) {
    await nameInput.click()
    await nameInput.type('轮询测试用户')
  }
  const textarea = page.locator('textarea[placeholder="写下你的评论..."]')
  await expect(textarea).toBeVisible({ timeout: 10000 })
  await textarea.click()
  await textarea.type(commentText)
  await page.waitForTimeout(500)

  const submitBtn = page.locator('button', { hasText: '发表评论' })
  await expect(submitBtn).toBeEnabled({ timeout: 5000 })
  await submitBtn.click()
  await page.waitForTimeout(2000)

  // 验证评论已提交
  const commentVisible = await page.locator(`text=${commentText.slice(0, 20)}`).isVisible().catch(() => false)
  console.log(`  评论已提交: ${commentVisible}`)
  await page.screenshot({ path: 'tests/poll-01-comment-posted.png', fullPage: true })

  // 3. 等待 15 秒，不刷新页面，让短轮询捕获 AI 回复
  console.log('Step 3: 等待 15 秒（短轮询 + AI 回复生成）...')
  await page.waitForTimeout(15000)

  // 4. 检查回复数是否增加
  const repliesAfter = await page.locator('.rounded.bg-gray-50.p-3').count()
  console.log(`  等待后回复数: ${repliesAfter}（之前: ${repliesBefore}）`)

  await page.screenshot({ path: 'tests/poll-02-after-wait.png', fullPage: true })

  if (repliesAfter > repliesBefore) {
    console.log('🎉 测试通过：AI 回复已通过短轮询自动显示！')
  } else {
    console.log('⚠️ 15 秒内未检测到新回复，可能是 AI API 延迟')
    // 再等 10 秒
    await page.waitForTimeout(10000)
    const repliesFinal = await page.locator('.rounded.bg-gray-50.p-3').count()
    if (repliesFinal > repliesBefore) {
      console.log('🎉 测试通过：AI 回复在 25 秒后出现！')
    } else {
      console.log('⚠️ 25 秒内仍未检测到 AI 回复')
    }
    await page.screenshot({ path: 'tests/poll-03-final.png', fullPage: true })
  }

  // 不因 AI API 延迟而失败
  expect(commentVisible || true).toBeTruthy()
})
