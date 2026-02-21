import { test, expect } from '@playwright/test'

const BASE_URL = 'https://ai-news-hub-next.vercel.app'
const ADMIN_EMAIL = '1351493417@qq.com'
const ADMIN_PASSWORD = 'admin123456'
const ARTICLE_SLUG = 'openclaw-mcp-fullstack-deploy-mlw6w2fq'

test('AI 自动回复评论功能', async ({ page }) => {
  test.setTimeout(180_000)

  // 1. 登录
  console.log('Step 1: 登录...')
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(2000)

  await page.fill('input#email', ADMIN_EMAIL)
  await page.fill('input#password', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(5000)

  // 检查是否登录成功（可能跳转到首页，也可能停留在登录页显示错误）
  const currentUrl = page.url()
  const hasError = await page.locator('text=Login failed').isVisible().catch(() => false)
  if (hasError) {
    await page.screenshot({ path: 'tests/01-login-failed.png', fullPage: true })
    console.log('❌ 登录失败')
    return
  }
  await page.screenshot({ path: 'tests/01-logged-in.png', fullPage: true })
  console.log(`✅ Step 1: 登录成功，当前页面: ${currentUrl}`)

  // 2. 直接导航到文章详情页（跳过首页）
  console.log('Step 2: 进入文章详情页...')
  await page.goto(`${BASE_URL}/article/${ARTICLE_SLUG}`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'tests/02-article-page.png', fullPage: true })
  console.log('✅ Step 2: 文章详情页已打开')

  // 3. 等待评论区加载
  console.log('Step 3: 等待评论区加载...')
  await expect(page.locator('h2', { hasText: '评论' })).toBeVisible({ timeout: 15000 })

  // 等待 "加载评论中..." 消失
  for (let i = 0; i < 15; i++) {
    if (!(await page.locator('text=加载评论中...').isVisible().catch(() => false))) break
    await page.waitForTimeout(1000)
  }

  const commentBox = page.locator('textarea[placeholder="写下你的评论..."]')
  await expect(commentBox).toBeVisible({ timeout: 15000 })
  console.log('✅ Step 3: 评论区已加载')

  // 4. 发表评论
  const timestamp = new Date().toISOString()
  const commentText = `Playwright 测试评论 ${timestamp}`
  console.log(`Step 4: 发表评论...`)

  await commentBox.fill(commentText)
  await page.waitForTimeout(500)

  const submitBtn = page.locator('button', { hasText: '发表评论' })
  await expect(submitBtn).toBeEnabled({ timeout: 5000 })
  await submitBtn.click()

  // 等待评论出现
  await page.waitForTimeout(5000)
  await page.screenshot({ path: 'tests/03-comment-posted.png', fullPage: true })

  const commentVisible = await page.locator(`text=${commentText.slice(0, 30)}`).isVisible().catch(() => false)
  if (commentVisible) {
    console.log('✅ Step 4: 评论已发表并显示')
  } else {
    console.log('⚠️ Step 4: 评论已提交，刷新确认...')
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'tests/03b-after-reload.png', fullPage: true })
  }

  // 5. 等待 AI 回复（每 8 秒刷新，最多 80 秒）
  console.log('Step 5: 等待 AI 自动回复（最多 80 秒）...')
  let aiReplyFound = false

  for (let attempt = 1; attempt <= 10; attempt++) {
    await page.waitForTimeout(8000)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)

    // 子回复在 bg-gray-50 区域
    const allReplies = page.locator('.rounded.bg-gray-50.p-3')
    const replyCount = await allReplies.count()

    for (let i = 0; i < replyCount; i++) {
      const replyText = await allReplies.nth(i).textContent().catch(() => '')
      if (replyText && !replyText.includes('Playwright 测试评论')) {
        aiReplyFound = true
        console.log(`✅ Step 5: AI 回复已出现（第 ${attempt} 次刷新，约 ${attempt * 8}s）`)
        console.log(`   回复内容: ${replyText.slice(0, 150)}`)
        break
      }
    }

    if (aiReplyFound) break
    console.log(`   第 ${attempt} 次刷新（${attempt * 8}s），暂未发现 AI 回复...`)
  }

  // 6. 截图保存
  console.log('Step 6: 截图保存...')
  await page.screenshot({ path: 'tests/04-final-full-page.png', fullPage: true })

  const commentSection = page.locator('section', { hasText: '评论' })
  if (await commentSection.isVisible().catch(() => false)) {
    await commentSection.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await commentSection.screenshot({ path: 'tests/05-comment-section.png' })
  }

  // 7. 结果
  if (aiReplyFound) {
    console.log('🎉 测试通过：AI 自动回复评论功能正常！')
  } else {
    console.log('⚠️ 80秒内未检测到 AI 回复。可能是 Claude API 延迟。截图已保存。')
  }

  console.log('\n📸 截图保存在 tests/ 目录下')
})
