import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel(/username/i).fill('1001')
  await page.getByLabel(/password/i).fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/dashboard/)
}

test.describe('delivery smoke', () => {
  test('login page renders and supports demo credentials', async ({ page }) => {
    await page.goto(`${baseURL}/login`)
    await expect(page.getByRole('heading', { name: /welcome to algomaster/i })).toBeVisible()
    await expect(page.getByLabel(/username/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('admin demo account can log in and reach dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: /欢迎回来/i })).toBeVisible()
  })

  test('authenticated user can open problem repository and search results', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`${baseURL}/problems`)
    await expect(page.getByRole('heading', { name: /problem repository/i })).toBeVisible()

    await page.goto(`${baseURL}/search?q=two`)
    await expect(page).toHaveURL(/search/)
    await expect(page.getByText(/Two Sum/i)).toBeVisible()
  })

  test('admin can open plagiarism reports and problem management', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`${baseURL}/admin/plagiarism-reports`)
    await expect(page.getByRole('heading', { name: /抄袭检测报告/i })).toBeVisible()

    await page.goto(`${baseURL}/admin/problems`)
    await expect(page.getByRole('heading', { name: /题目管理/i })).toBeVisible()
  })

  test('authenticated user can open submissions and teacher pages without crashing', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`${baseURL}/submissions`)
    await expect(page.getByRole('heading', { name: /提交历史|暂无提交记录/i })).toBeVisible()

    await page.goto(`${baseURL}/teacher/classes`)
    await expect(page.getByRole('heading', { name: /班级管理/i })).toBeVisible()
  })
})
