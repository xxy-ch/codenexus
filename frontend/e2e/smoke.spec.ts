import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'

async function loginAs(page: import('@playwright/test').Page, username: string, password = 'admin123') {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel(/用户名/i).fill(username)
  await page.getByLabel(/密码/i).fill(password)
  await page.getByRole('button', { name: /登录/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await loginAs(page, '1001')
}

test.describe('delivery smoke', () => {
  test('login page renders and supports demo credentials', async ({ page }) => {
    await page.goto(`${baseURL}/login`)
    await expect(page.getByRole('heading', { name: /欢迎回来/i })).toBeVisible()
    await expect(page.getByLabel(/用户名/i)).toBeVisible()
    await expect(page.getByLabel(/密码/i)).toBeVisible()
  })

  test('admin demo account can log in and reach dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: /欢迎回来/i })).toBeVisible()
    await expect(page.locator('body')).toContainText(/已解决问题|最近提交|进行中的比赛/)
  })

  test('authenticated user can open the current core workspace routes', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`${baseURL}/problems`)
    await expect(page.getByRole('heading', { name: /题库/i })).toBeVisible()

    await page.goto(`${baseURL}/rankings`)
    await expect(page.getByRole('heading', { name: /排行榜/i })).toBeVisible()

    await page.goto(`${baseURL}/submissions`)
    await expect(page.getByRole('heading', { name: /提交记录/i })).toBeVisible()

    await page.goto(`${baseURL}/discussions`)
    await expect(page.getByRole('heading', { name: /讨论区/i })).toBeVisible()

    await page.goto(`${baseURL}/contests`)
    await expect(page.getByRole('heading', { name: /竞赛/i })).toBeVisible()

    await page.goto(`${baseURL}/ide`)
    await expect(page.locator('body')).toContainText(/Ctrl\+Enter 运行|输出|测试结果/)
  })

  test('non-admin users are redirected to the dedicated unauthorized page', async ({ page }) => {
    await loginAs(page, '2001')
    await page.goto(`${baseURL}/admin`)
    await expect(page.getByRole('heading', { name: /访问被拒绝/i })).toBeVisible()
  })

  test('admin users can open the simplified admin panel', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${baseURL}/admin`)
    await expect(page.getByRole('heading', { name: /管理面板/i })).toBeVisible()
  })
})
