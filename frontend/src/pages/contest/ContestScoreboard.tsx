import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { scoreboardService } from '@/services/scoreboard'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { ScoreboardTable } from '@/components/contest/ScoreboardTable'

export function ContestScoreboard() {
  const { contestId } = useParams<{ contestId: string }>()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contest-scoreboard', contestId],
    queryFn: () => scoreboardService.getContestScoreboard(contestId!),
    enabled: !!contestId,
    refetchInterval: 15000,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading message="加载排行榜..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        title="排行榜加载失败"
        description="当前无法读取实时榜单数据。"
        action={
          <Button variant="primary" onClick={() => refetch()}>
            重试
          </Button>
        }
      />
    )
  }

  const leader = data[0]
  const totalSolved = data.reduce((sum, entry) => sum + entry.solved_count, 0)
  const totalScore = data.reduce((sum, entry) => sum + entry.score, 0)
  const averageSolved = data.length > 0 ? (totalSolved / data.length).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="竞赛榜单台"
        breadcrumb={['竞赛中心', '实时榜单']}
        title="实时榜单"
        description="按参考稿收成控制台式榜单工作区，聚合榜首状态、刷新节奏和实时排名池，榜单每 15 秒自动轮询一次。"
        actions={
          <Link to={contestId ? `/contests/${contestId}` : '/contests'}>
            <Button variant="outline">返回竞赛</Button>
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <SurfaceCard className="overflow-hidden bg-[linear-gradient(135deg,rgba(8,50,132,0.98)_0%,rgba(15,82,186,0.96)_48%,rgba(109,168,255,0.92)_100%)] px-6 py-6 text-white shadow-[0_22px_48px_rgba(8,50,132,0.24)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">竞赛榜单台</p>
              <h2 className="mt-3 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-white md:text-[2.5rem]">榜单概览</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                榜首、均值和积分池在同一屏直接读取，不再退回普通表格页。
              </p>
            </div>
            <div className="grid gap-3 rounded-[28px] border border-white/18 bg-white/10 p-4 text-sm text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">当前榜首</p>
                <p className="mt-1 text-xl font-semibold text-white">{leader?.username ?? '暂无数据'}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/56">累计积分</p>
                  <p className="mt-1 text-lg font-semibold text-white">{totalScore}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/56">平均解题</p>
                  <p className="mt-1 text-lg font-semibold text-white">{averageSolved}</p>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
          <StatCard label="刷新窗口" value="15s" helper="自动轮询已开启" />
          <StatCard label="榜单来源" value="实时接口" helper="不使用前端兜底榜单" />
          <StatCard label="计分模式" value="实时视图" helper={`当前席位 ${data.length} 人`} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.35fr]">
        <SurfaceCard tone="muted" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4f6ea8]">实时榜单</p>
          <h3 className="mt-3 font-['Manrope'] text-[1.4rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">席位观察</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            榜单源自真实排名接口，适合直接查看名次、罚时、解题量和题目分布。
          </p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-[22px] border border-[#dbe5ff] bg-white/88 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4f6ea8]">榜首用户</p>
              <p className="mt-2 text-lg font-semibold text-[#131b2e]">{leader?.username ?? '暂无数据'}</p>
            </div>
            <div className="rounded-[22px] border border-[#dbe5ff] bg-white/88 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4f6ea8]">解题总量</p>
              <p className="mt-2 text-lg font-semibold text-[#131b2e]">{totalSolved}</p>
            </div>
          </div>
        </SurfaceCard>

        <section className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-[rgba(255,255,255,0.92)] shadow-[0_16px_36px_rgba(15,23,42,0.07)] backdrop-blur-sm">
          <div className="border-b border-slate-200/80 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f6ea8]">实时排名池</p>
            <h3 className="mt-2 font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">排名明细</h3>
          </div>
          <ScoreboardTable entries={data} />
        </section>
      </div>
    </div>
  )
}
