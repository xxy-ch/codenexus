import { Link } from 'react-router-dom'
import { Home, SearchX } from 'lucide-react'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf8ff_0%,#eef3ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <PageHeader
            eyebrow="404"
            title="页面未找到"
            description="这条路径在历史记录里存在，但当前没有挂载对应页面。"
            className="border-slate-200/80 bg-white/80"
          />

          <SurfaceCard className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#dae2ff] text-[#003d9b]">
                <SearchX className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">恢复建议</p>
                <h2 className="text-xl font-semibold text-slate-950">先回到稳定入口，再继续导航。</h2>
                <p className="text-sm leading-6 text-slate-600">
                  链接可能被复制得不完整，或者该页面已经在改版后移动。
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              先检查导航路径和复制的地址，再从题库入口继续。
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/dashboard" className="sm:flex-1">
                <Home className="h-4 w-4" />
                返回工作台
              </Button>
              <Button as={Link} to="/problems" variant="outline" className="sm:flex-1">
                浏览题库
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </main>
  )
}
