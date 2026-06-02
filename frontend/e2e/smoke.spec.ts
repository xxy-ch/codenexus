import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'

async function loginAs(page: import('@playwright/test').Page, username: string, password = 'admin123') {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel(/用户名/).fill(username)
  await page.getByLabel(/密码/).fill(password)
  await page.getByRole('button', { name: /^登录$/ }).click()
  await expect(page).toHaveURL(/dashboard/)
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await loginAs(page, '1001')
}

test.describe('delivery smoke', () => {
  test('login page renders and supports demo credentials', async ({ page }) => {
    await page.goto(`${baseURL}/login`)
    await expect(page.getByRole('heading', { name: /欢迎使用 CodeNexus/ })).toBeVisible()
    await expect(page.getByLabel(/用户名/)).toBeVisible()
    await expect(page.getByLabel(/密码/)).toBeVisible()
  })


  test('database-backed demo accounts support multi-role login', async ({ page }) => {
    await loginAs(page, '2001')
    await page.goto(`${baseURL}/submissions`)
    await expect(page.locator('body')).toContainText(/提交记录|暂无提交记录/)

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
    await expect(page.getByRole('heading', { name: /题目/ })).toBeVisible()
    await expect(page.locator('body')).toContainText(/浏览题库|搜索题目/)

    await page.goto(`${baseURL}/search?q=two`)
    await expect(page).toHaveURL(/search/)
    await expect(page.getByRole('heading', { name: 'Two Sum', exact: true })).toBeVisible()

    await page.goto(`${baseURL}/blog`)
    await expect(page.getByRole('heading', { name: /博客/ })).toBeVisible()

    await page.goto(`${baseURL}/blog/new`)
    await expect(page.locator('body')).toContainText(/Write Article|文章内容/)
  })

  test('admin can open plagiarism reports and problem management', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`${baseURL}/admin/users`)
    await expect(page.locator('body')).toContainText(/用户管理|账号|用户/)

    await page.goto(`${baseURL}/admin/plagiarism-reports`)
    await expect(page.getByRole('heading', { name: /抄袭检测报告/i })).toBeVisible()

    await page.goto(`${baseURL}/admin/problems`)
    await expect(page.getByRole('heading', { name: /题目管理/ })).toBeVisible()
    await expect(page.locator('body')).toContainText(/CRUD Live|创建题目|当前交付已接通后台 CRUD/i)

    await page.goto(`${baseURL}/admin/plagiarism-reports/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb`)
    await expect(page.getByRole('heading', { name: /抄袭检测报告/i })).toBeVisible()
  })

  test('authenticated user can open submissions and teacher pages without crashing', async ({ page }) => {
    await loginAsAdmin(page)

    const submissionId = await page.evaluate(async () => {
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          problem_id: 1,
          language: 'python3',
          code: 'print(1)',
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
    await expect(page.locator('body')).toContainText(/判题结果/)
    await expect(page.locator('body')).toContainText(/提交元数据/)

    await page.goto(`${baseURL}/problems/1/solve`)
    await expect(page.locator('body')).toContainText(/题目描述/)
    await expect(page.locator('body')).toContainText(/Python 3/)

    await page.goto(`${baseURL}/teacher/classes`)
    await expect(page.getByRole('heading', { name: /班级管理/i })).toBeVisible()
    await expect(page.locator('body')).toContainText(/邀请码入班|按邮箱加人|批量导入学生|发布作业/i)

    await page.goto(`${baseURL}/messages`)
    await expect(page.getByRole('heading', { name: /私信中心/i })).toBeVisible()

    await page.goto(`${baseURL}/ranking`)
    await expect(page.getByRole('heading', { name: /排行榜/i })).toBeVisible()

    await page.goto(`${baseURL}/contests`)
    await expect(page.getByText(/Weekly Contest 1/)).toBeVisible()

    await page.goto(`${baseURL}/contests/1`)
    await expect(page.getByRole('heading', { name: /Weekly Contest 1/i })).toBeVisible()

    await page.goto(`${baseURL}/contests/1/scoreboard`)
    await expect(page.getByRole('heading', { name: /CodeNexus 实时榜单/i })).toBeVisible()
  })
})
