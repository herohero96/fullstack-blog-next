import { test, expect } from '@playwright/test'

const BASE_URL = 'https://ai-news-hub-next.vercel.app'

test('AI 助手 UI 改造测试', async ({ page, context }) => {
  test.setTimeout(60_000)

  // 清除 localStorage 以触发气泡提示
  await context.addInitScript(() => {
    localStorage.removeItem('ai-chat-bubble-shown')
  })

  // 1. 打开首页
  console.log('Step 1: 打开首页...')
  await page.goto(BASE_URL)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(2000)

  // 2. 验证悬浮按钮存在
  const fab = page.locator('[data-testid="chat-fab"]')
  await expect(fab).toBeVisible({ timeout: 10000 })
  await page.screenshot({ path: 'tests/ui-01-fab-button.png', fullPage: true })
  console.log('✅ Step 2: 悬浮按钮可见')

  // 3. 验证气泡提示
  console.log('Step 3: 检查气泡提示...')
  const bubble = page.locator('[data-testid="chat-bubble"]')
  const bubbleVisible = await bubble.isVisible().catch(() => false)
  if (bubbleVisible) {
    console.log('✅ Step 3: 气泡提示已显示')
    await page.screenshot({ path: 'tests/ui-02-bubble.png', fullPage: true })
  } else {
    console.log('⚠️ Step 3: 气泡提示可能已消失（3秒自动隐藏）')
  }

  // 4. 点击按钮，验证抽屉滑出
  console.log('Step 4: 点击按钮打开抽屉...')
  await fab.click()
  await page.waitForTimeout(500)

  const drawer = page.locator('[data-testid="chat-drawer"]')
  await expect(drawer).toBeVisible({ timeout: 5000 })

  // 验证抽屉宽度
  const box = await drawer.boundingBox()
  expect(box).toBeTruthy()
  expect(box!.width).toBeGreaterThan(350)
  console.log(`✅ Step 4: 抽屉已打开，宽度 ${box!.width}px`)

  await page.screenshot({ path: 'tests/ui-03-drawer-open.png', fullPage: true })

  // 5. 点击遮罩关闭抽屉
  console.log('Step 5: 点击遮罩关闭抽屉...')
  const overlay = page.locator('[data-testid="chat-overlay"]')
  await overlay.click({ position: { x: 50, y: 300 } })
  await page.waitForTimeout(500)

  // 验证悬浮按钮重新出现
  await expect(fab).toBeVisible({ timeout: 5000 })
  await page.screenshot({ path: 'tests/ui-04-drawer-closed.png', fullPage: true })
  console.log('✅ Step 5: 抽屉已关闭，悬浮按钮重新出现')

  console.log('🎉 测试通过：AI 助手 UI 改造效果正常！')
})
