import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function NotFound() {
  return (
    <main className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: Page Header */}
          <div className="flex items-center">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">404</p>
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
                页面未找到
              </h1>
              <p className="max-w-xl text-sm leading-6 text-on-surface-variant">
                这条路径在历史记录里存在，但当前没有挂载对应页面。
              </p>
            </div>
          </div>

          {/* Right: Action Card */}
          <Card variant="surface" className="space-y-6 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tertiary-container text-on-tertiary-container">
                <span className="material-symbols-outlined text-3xl">search_off</span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">恢复建议</p>
                <h2 className="text-xl font-semibold text-on-surface">先回到稳定入口，再继续导航。</h2>
                <p className="text-sm leading-6 text-on-surface-variant">
                  链接可能被复制得不完整，或者该页面已经在改版后移动。
                </p>
              </div>
            </div>

            <Card variant="surface" className="px-4 py-3 text-sm text-on-surface-variant">
              先检查导航路径和复制的地址，再从题库入口继续。
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/dashboard" fullWidth>
                <span className="material-symbols-outlined text-base">home</span>
                返回工作台
              </Button>
              <Button as={Link} to="/problems" variant="outline" fullWidth>
                浏览题库
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
