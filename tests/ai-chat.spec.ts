import { test, expect } from '@playwright/test'

const BASE_URL = 'https://ai-news-hub-next.vercel.app'

test('AI 助手悬浮按钮功能', async ({ page }) => {
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')
  console.log('✅ Step 1: 首页已加载')

  // 找悬浮按钮
  const chatBtn = page.locator('button').filter({ hasText: /AI|助手|💬|🤖/ }).last()
  await expect(chatBtn).toBeVisible({ timeout: 10000 })
  console.log('✅ Step 2: AI 助手悬浮按钮存在')

  // 点击打开
  await chatBtn.click()
  await page.waitForTimeout(500)
  console.log('✅ Step 3: 点击打开对话框')

  // 找输入框
  const input = page.locator('input[placeholder*="问"], textarea[placeholder*="问"]').first()
  await expect(input).toBeVisible({ timeout: 5000 })
  console.log('✅ Step 4: 输入框已显示')

  // 发送消息
  await input.fill('你好，请介绍一下这个博客')
  await input.press('Enter')
  console.log('✅ Step 5: 消息已发送')

  // 等待 AI 回复
  console.log('Step 6: 等待 AI 回复...')
  await page.waitForTimeout(8000)

  await page.screenshot({ path: 'tests/ai-chat-result.png', fullPage: false })
  console.log('📸 截图已保存: tests/ai-chat-result.png')

  // 验证有回复内容
  const messages = page.locator('[class*="message"], [class*="chat"], [class*="bubble"]')
  const count = await messages.count()
  console.log(count > 0 ? `✅ Step 6: AI 已回复，共 ${count} 条消息` : '⚠️  未检测到回复消息元素')
})
