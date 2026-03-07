import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'

async function loginAs(page: import('@playwright/test').Page, username: string, password = 'admin123') {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel(/username/i).fill(username)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/dashboard/)
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await loginAs(page, '1001')
}

test.describe('delivery smoke', () => {
  test('login page renders and supports demo credentials', async ({ page }) => {
    await page.goto(`${baseURL}/login`)
    await expect(page.getByRole('heading', { name: /welcome to algomaster/i })).toBeVisible()
    await expect(page.getByLabel(/username/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })


  test('database-backed demo accounts support multi-role login', async ({ page }) => {
    await loginAs(page, '2001')
    await page.goto(`${baseURL}/submissions`)
    await expect(page.locator('h1')).toContainText(/提交历史/)

    await page.context().clearCookies()
    await page.goto(`${baseURL}/login`)
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await loginAs(page, '3001')
    await page.goto(`${baseURL}/teacher/classes`)
    await expect(page.getByRole('heading', { name: /班级管理/i })).toBeVisible()
  })

  test('admin demo account can log in and reach dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: /欢迎回来，继续把这周的通过数往上推。/i })).toBeVisible()
    await expect(page.locator('body')).toContainText(/本周推进面板|Progress Snapshot/)
  })

  test('authenticated user can open problem repository and search results', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`${baseURL}/problems`)
    await expect(page.getByRole('heading', { name: /problem repository/i })).toBeVisible()
    await expect(page.locator('body')).toContainText(/当前筛选状态|Repository State/)

    await page.goto(`${baseURL}/search?q=two`)
    await expect(page).toHaveURL(/search/)
    await expect(page.getByRole('heading', { name: 'Two Sum', exact: true })).toBeVisible()

    await page.goto(`${baseURL}/blog`)
    await expect(page.getByRole('heading', { name: /Blog/i })).toBeVisible()

    await page.goto(`${baseURL}/blog/new`)
    await expect(page.locator('body')).toContainText(/Write Article|文章内容/)
  })

  test('admin can open plagiarism reports and problem management', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`${baseURL}/admin/users`)
    await expect(page.getByRole('heading', { name: /用户管理/i })).toBeVisible()
    await expect(page.locator('body')).toContainText(/UUID \+ user_code|12-digit user_code only/i)

    await page.goto(`${baseURL}/admin/plagiarism-reports`)
    await expect(page.getByRole('heading', { name: /抄袭检测报告/i })).toBeVisible()

    await page.goto(`${baseURL}/admin/problems`)
    await expect(page.getByRole('heading', { name: /Problems/i })).toBeVisible()
    await expect(page.locator('body')).toContainText(/CRUD Live|创建题目|当前交付已接通后台 CRUD/i)

    await page.goto(`${baseURL}/admin/plagiarism-reports/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb`)
    await expect(page.getByRole('heading', { name: /Plagiarism Detection Report/i })).toBeVisible()
  })

  test('authenticated user can open submissions and teacher pages without crashing', async ({ page }) => {
    await loginAsAdmin(page)

    const submissionId = await page.evaluate(async () => {
      const token = localStorage.getItem('oj_token')
      if (!token) {
        throw new Error('missing auth token')
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problem_id: 1,
          language: 'cpp',
          code: '#include <iostream>\\nint main(){std::cout<<1;return 0;}',
        }),
      })

      if (!response.ok) {
        throw new Error(`failed to create submission: ${response.status}`)
      }

      const payload = await response.json()
      return String(payload.id)
    })

    await page.goto(`${baseURL}/submissions`)
    await expect(page.locator('h1')).toContainText(/提交历史/)
    await page.goto(`${baseURL}/submissions/${submissionId}`)
    await expect(page.locator('body')).toContainText(/Analysis Summary|判题分析摘要/)

    await page.goto(`${baseURL}/problems/1/solve`)
    await expect(page.locator('body')).toContainText(/工作区摘要|IDE Summary/)

    await page.goto(`${baseURL}/teacher/classes`)
    await expect(page.getByRole('heading', { name: /班级管理/i })).toBeVisible()
    await expect(page.locator('body')).toContainText(/Live Schema Flows|按邮箱加人|批量导入学生/i)

    await page.goto(`${baseURL}/messages`)
    await expect(page.getByRole('heading', { name: /私信中心/i })).toBeVisible()

    await page.goto(`${baseURL}/ranking`)
    await expect(page.getByRole('heading', { name: /排行榜/i })).toBeVisible()

    await page.goto(`${baseURL}/contests`)
    await expect(page.getByText(/春季热身赛/)).toBeVisible()

    await page.goto(`${baseURL}/contests/1`)
    await expect(page.getByRole('heading', { name: /春季热身赛/i })).toBeVisible()

    await page.goto(`${baseURL}/contests/1/scoreboard`)
    await expect(page.getByRole('heading', { name: /竞赛实时榜单/i })).toBeVisible()
  })
})
