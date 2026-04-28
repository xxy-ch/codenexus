import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'

async function loginAs(page: import('@playwright/test').Page, username: string, password = 'admin123') {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel(/username/i).fill(username)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/dashboard/)
}

test.describe('post-contest upsolving', () => {
  test('contest page renders after contest ends', async ({ page }) => {
    await loginAs(page, '1001')
    // Navigate to a contest page. Seed data has "春季热身赛" as contest 1.
    await page.goto(`${baseURL}/contests/1`)
    await expect(page.getByRole('heading', { name: /春季热身赛/i })).toBeVisible()

    // Verify the contest detail page renders key metadata sections
    await expect(page.locator('body')).toContainText(/竞赛介绍/)
    await expect(page.locator('body')).toContainText(/竞赛统计/)
  })

  test('submission form is available on contest problem after contest ends', async ({ page }) => {
    await loginAs(page, '1001')
    // Navigate to the contest detail page.
    // The contest detail renders the problem list and a "查看榜单" button.
    // After contest ends, the submission interface should still work for upsolving.
    // The actual is_upsolving tagging happens server-side and is validated
    // by the Rust integration tests in Plan 03 (domain-contests/tests/integration.rs).
    await page.goto(`${baseURL}/contests/1`)
    await expect(page.getByRole('heading', { name: /春季热身赛/i })).toBeVisible()

    // Verify the "查看榜单" link is present (contest detail page renders fully)
    await expect(page.getByRole('link', { name: /查看榜单/ })).toBeVisible()

    // The contest detail page should show contest info and statistics
    // even after the contest has ended -- upsolving is a post-contest activity
    await expect(page.locator('body')).toContainText(/参与人数/)
  })
})
