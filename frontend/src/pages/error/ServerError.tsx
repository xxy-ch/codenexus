import { Link } from 'react-router-dom'
import { Home, RefreshCcw, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'

export function ServerError() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf8ff_0%,#eef3ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <PageHeader
            eyebrow="500"
            title="服务暂时不可用"
            description="请求已经到达平台，但当前服务没有顺利完成处理。"
            className="border-slate-200/80 bg-white/80"
          />

          <SurfaceCard className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#ffdad6] text-[#93000a]">
                <TriangleAlert className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">恢复建议</p>
                <h2 className="text-xl font-semibold text-slate-950">先重新加载，再回到工作台。</h2>
                <p className="text-sm leading-6 text-slate-600">
                  这通常出现在长请求、会话过期或后端发布切换时。
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              建议先重试一次；如果仍然失败，就回到稳定入口继续后面的流程。
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => window.location.reload()} className="sm:flex-1">
                <RefreshCcw className="h-4 w-4" />
                重新加载
              </Button>
              <Button as={Link} to="/dashboard" variant="outline" className="sm:flex-1">
                <Home className="h-4 w-4" />
                回到工作台
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </main>
  )
}
