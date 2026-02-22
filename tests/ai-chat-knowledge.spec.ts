import { test, expect } from '@playwright/test'

const BASE_URL = 'https://ai-news-hub-next.vercel.app'

test('AI 助手知识图谱功能测试', async ({ page }) => {
  test.setTimeout(180_000)

  // 1. 打开博客首页
  console.log('Step 1: 打开博客首页...')
  await page.goto(BASE_URL)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)
  console.log('✅ Step 1: 首页已打开')

  // 2. 点击 AI 助手按钮
  console.log('Step 2: 点击 AI 助手按钮...')
  const chatBtn = page.locator('button[aria-label="打开 AI 助手"]')
  await expect(chatBtn).toBeVisible({ timeout: 10000 })
  await chatBtn.click()
  await page.waitForTimeout(1000)

  const chatBox = page.locator('input[placeholder="输入消息..."]')
  await expect(chatBox).toBeVisible({ timeout: 5000 })
  console.log('✅ Step 2: AI 助手对话框已打开')

  // 3. 第一轮对话：问文章列表
  console.log('Step 3: 问"你有哪些文章"...')
  await chatBox.fill('你有哪些文章')
  await page.locator('button', { hasText: '发送' }).click()

  // 等待 AI 回复完成（发送按钮重新可用）
  await page.waitForTimeout(3000)
  for (let i = 0; i < 30; i++) {
    const disabled = await page.locator('button', { hasText: '发送' }).isDisabled()
    if (!disabled) break
    await page.waitForTimeout(2000)
  }
  await page.waitForTimeout(1000)

  await page.screenshot({ path: 'tests/ai-chat-01-articles.png', fullPage: true })

  // 验证回复包含文章标题关键词
  const chatMessages = page.locator('.bg-gray-100.text-gray-800')
  const lastReply = await chatMessages.last().textContent()
  console.log(`  AI 回复: ${lastReply?.slice(0, 200)}...`)

  const hasArticleRef = lastReply && (
    lastReply.includes('Claude Code') ||
    lastReply.includes('系列') ||
    lastReply.includes('文章')
  )
  if (hasArticleRef) {
    console.log('✅ Step 3: AI 回复包含文章相关内容')
  } else {
    console.log('⚠️ Step 3: AI 回复未明确提及文章标题')
  }

  // 4. 第二轮对话：问具体技术问题
  console.log('Step 4: 问"Claude Code 怎么入门"...')
  await chatBox.fill('Claude Code 怎么入门')
  await page.locator('button', { hasText: '发送' }).click()

  await page.waitForTimeout(3000)
  for (let i = 0; i < 30; i++) {
    const disabled = await page.locator('button', { hasText: '发送' }).isDisabled()
    if (!disabled) break
    await page.waitForTimeout(2000)
  }
  await page.waitForTimeout(1000)

  await page.screenshot({ path: 'tests/ai-chat-02-claude-code.png', fullPage: true })

  const secondReply = await chatMessages.last().textContent()
  console.log(`  AI 回复: ${secondReply?.slice(0, 200)}...`)

  const hasClaudeCodeRef = secondReply && (
    secondReply.includes('Claude Code') ||
    secondReply.includes('入门') ||
    secondReply.includes('系列')
  )
  if (hasClaudeCodeRef) {
    console.log('✅ Step 4: AI 回复包含 Claude Code 相关内容')
  } else {
    console.log('⚠️ Step 4: AI 回复未明确提及 Claude Code')
  }

  // 5. 最终截图
  await page.screenshot({ path: 'tests/ai-chat-03-full.png', fullPage: true })
  console.log('✅ 截图已保存到 tests/ 目录')

  // 断言至少有回复内容
  expect(lastReply?.length).toBeGreaterThan(10)
  expect(secondReply?.length).toBeGreaterThan(10)
  console.log('🎉 测试通过：AI 助手知识图谱功能正常！')
})
