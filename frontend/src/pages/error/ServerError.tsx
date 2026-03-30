import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function ServerError() {
  return (
    <main className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: Page Header */}
          <div className="flex items-center">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">500</p>
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
                服务暂时不可用
              </h1>
              <p className="max-w-xl text-sm leading-6 text-on-surface-variant">
                请求已经到达平台，但当前服务没有顺利完成处理。
              </p>
            </div>
          </div>

          {/* Right: Action Card */}
          <Card variant="surface" className="space-y-6 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-container text-on-error-container">
                <span className="material-symbols-outlined text-3xl">error</span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">恢复建议</p>
                <h2 className="text-xl font-semibold text-on-surface">先重新加载，再回到工作台。</h2>
                <p className="text-sm leading-6 text-on-surface-variant">
                  这通常出现在长请求、会话过期或后端发布切换时。
                </p>
              </div>
            </div>

            <Card variant="surface" className="px-4 py-3 text-sm text-on-surface-variant">
              建议先重试一次；如果仍然失败，就回到稳定入口继续后面的流程。
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => window.location.reload()} fullWidth>
                <span className="material-symbols-outlined text-base">refresh</span>
                重新加载
              </Button>
              <Button as={Link} to="/dashboard" variant="outline" fullWidth>
                <span className="material-symbols-outlined text-base">home</span>
                回到工作台
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
