import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_BASE_URL || 'https://ai-news-hub-next.vercel.app'

test('AI Chat UI v3 - textarea, blue style, send button position', async ({ page }) => {
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  // 1. 截图悬浮按钮
  const fab = page.locator('button[aria-label="打开 AI 助手"]')
  await expect(fab).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: 'tests/ui-v3-01-fab.png', fullPage: true })
  console.log('✅ Step 1: 悬浮按钮可见，已截图')

  // 验证悬浮按钮是蓝色（无紫色渐变）
  const fabClass = await fab.getAttribute('class')
  expect(fabClass).toContain('bg-blue-600')
  expect(fabClass).not.toContain('purple')
  console.log('✅ Step 1b: 悬浮按钮为蓝色')

  // 2. 点击打开抽屉截图
  await fab.click()
  const drawer = page.locator('[data-testid="chat-drawer"]')
  await expect(drawer).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'tests/ui-v3-02-drawer.png', fullPage: true })
  console.log('✅ Step 2: 抽屉已打开，已截图')

  // 3. 验证输入框高度大于 100px（rows=5）
  const textarea = page.locator('textarea')
  await expect(textarea).toBeVisible()
  const box = await textarea.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.height).toBeGreaterThan(100)
  console.log(`✅ Step 3: 输入框高度 ${box!.height}px > 100px`)

  // 4. 验证发送按钮在输入框右下角
  const sendBtn = page.locator('[data-testid="chat-send"]')
  await expect(sendBtn).toBeVisible()
  const sendBox = await sendBtn.boundingBox()
  expect(sendBox).not.toBeNull()

  // 发送按钮应在 textarea 右侧区域内（x > textarea.x + textarea.width * 0.5）
  expect(sendBox!.x).toBeGreaterThan(box!.x + box!.width * 0.5)
  // 发送按钮底部应接近 textarea 底部（在 textarea 底部 40px 内）
  const sendBottom = sendBox!.y + sendBox!.height
  const textareaBottom = box!.y + box!.height
  expect(Math.abs(sendBottom - textareaBottom)).toBeLessThan(40)
  console.log('✅ Step 4: 发送按钮在输入框右下角')

  await page.screenshot({ path: 'tests/ui-v3-03-input-area.png' })
  console.log('✅ All tests passed!')
})
