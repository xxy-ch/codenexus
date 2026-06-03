import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../frontend/package.json', import.meta.url))
const { chromium } = require('playwright')

const baseURL = process.env.WORKTREE_BASE_URL || 'http://127.0.0.1:5174'
const outDir = path.resolve('design-audit/worktree-after-redesign')

const routes = [
  ['01-login', '/login', null],
  ['02-register', '/register', null],
  ['03-student-dashboard', '/dashboard', '2001'],
  ['04-student-problems', '/problems', '2001'],
  ['05-student-problem-detail', '/problems/1', '2001'],
  ['06-student-solve', '/problems/1/solve', '2001'],
  ['07-student-submissions', '/submissions', '2001'],
  ['08-student-submission-detail', '/submissions/40', '2001'],
  ['09-student-contests', '/contests', '2001'],
  ['10-student-contest-detail', '/contests/1', '2001'],
  ['11-student-contest-scoreboard', '/contests/1/scoreboard', '2001'],
  ['12-student-ranking', '/ranking', '2001'],
  ['13-student-roadmap', '/roadmap', '2001'],
  ['14-student-discussions', '/discussions', '2001'],
  ['15-student-discussion-new', '/discussions/new', '2001'],
  ['16-student-blog', '/blog', '2001'],
  ['17-student-blog-new', '/blog/new', '2001'],
  ['18-student-messages', '/messages', '2001'],
  ['19-student-search', '/search?q=two', '2001'],
  ['20-student-profile', '/profile', '2001'],
  ['21-student-settings', '/settings', '2001'],
  ['22-teacher-classes', '/teacher/classes', '3001'],
  ['23-teacher-assignment-report', '/teacher/assignment-report', '3001'],
  ['24-teacher-contest-wizard', '/teacher/contest-wizard', '3001'],
  ['25-teacher-problem-content', '/teacher/problem-content', '3001'],
  ['26-teacher-batch-operations', '/batch-operations', '3001'],
  ['27-teacher-features', '/teacher/features', '3001'],
  ['28-root-admin-dashboard', '/admin', '1001'],
  ['29-root-admin-users', '/admin/users', '1001'],
  ['30-root-admin-problems', '/admin/problems', '1001'],
  ['31-root-admin-judge-settings', '/admin/judge-settings', '1001'],
  ['32-root-admin-judge-queue', '/admin/judge-queue', '1001'],
  ['33-root-admin-grades', '/admin/grades', '1001'],
  ['34-root-admin-features', '/admin/features', '1001'],
  ['35-root-admin-problem-content', '/admin/problem-content', '1001'],
  ['36-root-admin-similarity-scan', '/admin/similarity-scan', '1001'],
  ['37-root-admin-plagiarism-reports', '/admin/plagiarism-reports', '1001'],
  ['38-root-admin-plagiarism-detail', '/admin/plagiarism-reports/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb', '1001'],
  ['39-unauthorized', '/admin', '2001'],
  ['40-not-found', '/not-a-real-route', '2001'],
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const sessionCache = new Map()

async function getSession(username) {
  if (sessionCache.has(username)) {
    return sessionCache.get(username)
  }

  const response = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'admin123' }),
  })

  if (!response.ok) {
    throw new Error(`login ${username}: ${response.status} ${await response.text()}`)
  }

  const session = await response.json()
  sessionCache.set(username, session)
  return session
}

async function installSession(context, username) {
  const session = await getSession(username)
  await context.addInitScript(({ session }) => {
    localStorage.setItem('oj_token', session.token)
    localStorage.setItem('token', session.token)
    if (session.refresh_token) {
      localStorage.setItem('oj_refresh_token', session.refresh_token)
      localStorage.setItem('refresh_token', session.refresh_token)
    }
    localStorage.setItem('oj_user', JSON.stringify(session.user))
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: session.user,
        token: session.token,
        isAuthenticated: true,
      },
      version: 0,
    }))
  }, { session })
}

async function captureRoute(browser, [id, route, auth]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  if (auth) {
    await installSession(context, auth)
  }
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  page.setDefaultNavigationTimeout(12000)
  const errors = []
  const consoleErrors = []

  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  const started = Date.now()
  try {
    if (route.includes('/solve')) {
      const navigation = page.goto(`${baseURL}${route}`, { waitUntil: 'commit', timeout: 5000 }).catch((error) => {
        errors.push(`navigation: ${error instanceof Error ? error.message : String(error)}`)
      })
      await Promise.race([navigation, sleep(3000)])
      await sleep(1200)
    } else {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 12000 })
      await page.waitForTimeout(2000)
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  const file = path.join(outDir, `${id}.png`)
  try {
    await page.screenshot({ path: file, fullPage: false, timeout: 8000 })
  } catch (error) {
    errors.push(`screenshot: ${error instanceof Error ? error.message : String(error)}`)
  }

  const metricsPromise = page.evaluate(() => ({
    path: window.location.pathname,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    h1: Array.from(document.querySelectorAll('h1')).map((node) => node.textContent?.trim()).filter(Boolean),
    text: document.body.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500) ?? '',
  })).catch((error) => ({
    path: 'unknown',
    horizontalOverflow: false,
    clientWidth: 0,
    scrollWidth: 0,
    h1: [],
    text: `metrics failed: ${error instanceof Error ? error.message : String(error)}`,
  }))
  const metrics = await Promise.race([
    metricsPromise,
    sleep(3000).then(() => ({
      path: 'timeout',
      horizontalOverflow: false,
      clientWidth: 0,
      scrollWidth: 0,
      h1: [],
      text: 'metrics timeout',
    })),
  ])

  await Promise.race([context.close(), sleep(2000)])
  return {
    id,
    route,
    auth,
    file,
    elapsedMs: Date.now() - started,
    metrics,
    errors,
    consoleErrors,
  }
}

await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const results = []
for (const route of routes) {
  console.log(`capturing ${route[0]} ${route[1]}`)
  results.push(await captureRoute(browser, route))
}
await browser.close()

await fs.writeFile(path.join(outDir, 'capture-results.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify({
  outDir,
  count: results.length,
  errored: results.filter((r) => r.errors.length || r.consoleErrors.length).map((r) => r.id),
  overflow: results.filter((r) => r.metrics.horizontalOverflow).map((r) => r.id),
}, null, 2))
