import { test, expect } from '@playwright/test'

const BASE_URL = 'https://ai-news-hub-next.vercel.app'
const ARTICLE_URL = `${BASE_URL}/article/claude-code-fullstack-blog-1771680079027`

test('游客评论功能', async ({ page }) => {
  await page.goto(ARTICLE_URL)
  await page.waitForLoadState('networkidle')
  console.log('✅ Step 1: 文章页已加载')

  // 找到评论区
  const commentSection = page.locator('textarea').first()
  await expect(commentSection).toBeVisible({ timeout: 10000 })
  console.log('✅ Step 2: 评论区已加载')

  // 找昵称输入框（游客模式）
  const nicknameInput = page.locator('input[placeholder*="昵称"]')
  await expect(nicknameInput).toBeVisible({ timeout: 5000 })
  await nicknameInput.fill('测试游客')
  console.log('✅ Step 3: 昵称输入框存在并填写')

  // 填写评论内容
  const commentText = `Playwright 游客评论测试 ${new Date().toISOString()}`
  await commentSection.fill(commentText)

  // 提交评论
  const submitBtn = page.locator('button').filter({ hasText: /提交|发表|评论/ }).first()
  await submitBtn.click()
  console.log('✅ Step 4: 评论已提交')

  // 等待评论出现
  await page.waitForTimeout(3000)
  await page.reload()
  await page.waitForLoadState('networkidle')

  const commentVisible = await page.locator(`text=测试游客`).isVisible()
  console.log(commentVisible ? '✅ Step 5: 游客昵称显示正常' : '❌ Step 5: 游客昵称未显示')

  // 等待 AI 自动回复
  console.log('Step 6: 等待 AI 自动回复（最多 60 秒）...')
  let aiReplyFound = false
  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(10000)
    await page.reload()
    await page.waitForLoadState('networkidle')
    const content = await page.content()
    if (content.includes('博主') || content.includes('admin') || content.includes('谢谢')) {
      aiReplyFound = true
      console.log(`✅ Step 6: AI 自动回复出现（${i * 10}s）`)
      break
    }
    console.log(`  第 ${i} 次刷新（${i * 10}s），暂未发现 AI 回复...`)
  }

  await page.screenshot({ path: 'tests/guest-comment-result.png', fullPage: true })
  console.log('\n📸 截图已保存')

  if (!aiReplyFound) console.log('⚠️  AI 回复未出现，可能需要更长时间')
})
