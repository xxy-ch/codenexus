import { Link } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'

export function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf8ff_0%,#eef3ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <PageHeader
            eyebrow="受限访问"
            title="访问受限"
            description="当前账号已登录，但没有进入这个工作区的权限。"
            className="border-slate-200/80 bg-white/80"
          />

          <SurfaceCard className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#ffdad6] text-[#93000a]">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">受限能力</p>
                <h2 className="text-xl font-semibold text-slate-950">先回到工作台，再继续当前任务。</h2>
                <p className="text-sm leading-6 text-slate-600">
                  这类页面通常只向特定角色开放。若你本应看到它，说明权限映射还没有同步。
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                先返回工作台，继续刷题、看竞赛或查看提交记录。
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                如果这门课或这个竞赛应该可见，请联系老师或管理员核对角色映射。
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => window.history.back()} className="sm:flex-1">
                <ArrowLeft className="h-4 w-4" />
                返回上一步
              </Button>
              <Button as={Link} to="/dashboard" variant="outline" className="sm:flex-1">
                <LayoutDashboard className="h-4 w-4" />
                回到工作台
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </main>
  )
}
