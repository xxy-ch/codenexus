import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RefreshCcw } from 'lucide-react'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { contestsService } from '@/services/contests'
import { cn } from '@/lib/utils'

type ContestStatus = 'upcoming' | 'ongoing' | 'completed' | 'all'
type ContestDifficulty = 'easy' | 'medium' | 'hard' | 'all'

const statusLabels: Record<Exclude<ContestStatus, 'all'>, string> = {
  upcoming: '即将开始',
  ongoing: '进行中',
  completed: '已结束',
}

const difficultyLabels: Record<Exclude<ContestDifficulty, 'all'>, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

function formatDuration(minutes: number) {
  if (minutes % 60 === 0) {
    return `${minutes} 分钟 · ${minutes / 60}h`
  }

  const hours = (minutes / 60).toFixed(1).replace('.0', '')
  return `${minutes} 分钟 · ${hours}h`
}

function timeHint(status: Exclude<ContestStatus, 'all'>, startTime: string, endTime: string) {
  const now = Date.now()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  if (status === 'upcoming') {
    return `${Math.max(Math.ceil((start - now) / (1000 * 60 * 60 * 24)), 0)} 天后开始`
  }
  if (status === 'ongoing') {
    const remainingHours = Math.max((end - now) / (1000 * 60 * 60), 0).toFixed(1)
    return `剩余 ${remainingHours}h`
  }
  return '已归档'
}

function actionLabel(status: Exclude<ContestStatus, 'all'>) {
  if (status === 'ongoing') return '立即加入'
  if (status === 'upcoming') return '立即注册'
  return '查看结果'
}

export function ContestList() {
  const [status, setStatus] = useState<ContestStatus>('all')
  const [difficulty, setDifficulty] = useState<ContestDifficulty>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['contests', status, difficulty, search],
    queryFn: () => contestsService.getContests({ status, difficulty, search: search || undefined }),
  })

  const contests = data?.contests ?? []

  const stats = useMemo(() => {
    return {
      total: data?.total ?? contests.length,
      live: contests.filter((contest) => contest.status === 'ongoing').length,
      upcoming: contests.filter((contest) => contest.status === 'upcoming').length,
    }
  }, [contests, data?.total])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <SurfaceCard className="text-sm text-[#6b7ca7]">加载中...</SurfaceCard>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <SurfaceCard className="space-y-4 bg-[rgba(255,247,247,0.95)]">
          <div>
            <h1 className="font-['Manrope'] text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#7b1e2b]">加载失败</h1>
            <p className="mt-2 text-sm text-[#7d5260]">当前无法读取竞赛目录。</p>
          </div>
          <Button onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
            重试
          </Button>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Contest System"
          title="竞赛目录"
          description="把比赛入口压成一页紧凑目录，直接看状态、时长、人数和动作，不做重复 hero 展示。"
          actions={(
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
              刷新
            </Button>
          )}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <SurfaceCard>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">总竞赛数</p>
            <div className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{stats.total}</div>
            <p className="mt-2 text-sm text-[#65748d]">contest entries</p>
          </SurfaceCard>
          <SurfaceCard tone="muted">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">进行中</p>
            <div className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{stats.live}</div>
            <p className="mt-2 text-sm text-[#65748d]">ongoing contests</p>
          </SurfaceCard>
          <SurfaceCard tone="muted">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">即将开始</p>
            <div className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{stats.upcoming}</div>
            <p className="mt-2 text-sm text-[#65748d]">upcoming contests</p>
          </SurfaceCard>
        </div>

        <SurfaceCard tone="muted" className="space-y-4">
          <FilterBar>
            <input
              type="search"
              aria-label="搜索竞赛"
              placeholder="搜索竞赛名称"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 min-w-[240px] flex-1 rounded-[8px] bg-white/92 px-4 text-sm text-[#17305e] shadow-[0_10px_24px_rgba(19,27,46,0.04)] outline-none placeholder:text-[#93a0bb]"
            />
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'upcoming', 'ongoing', 'completed'] as ContestStatus[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    item === status ? 'bg-[#003d9b] text-white' : 'bg-white/92 text-[#445472] hover:bg-white',
                  )}
                >
                  {item === 'all' ? '全部' : statusLabels[item]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-[#65748d]">
              <span>难度</span>
              <select
                aria-label="难度"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as ContestDifficulty)}
                className="h-11 rounded-[8px] bg-white/92 px-3 text-sm font-semibold text-[#17305e] outline-none shadow-[0_10px_24px_rgba(19,27,46,0.04)]"
              >
                <option value="all">全部</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </FilterBar>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <h2 className="font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">竞赛目录</h2>

          {contests.length === 0 ? (
            <div className="rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-5 text-sm text-[#65748d]">暂无竞赛。</div>
          ) : (
            contests.map((contest) => (
              <div key={contest.id} className="grid gap-4 rounded-[8px] bg-[rgba(242,243,255,0.56)] px-4 py-4 md:grid-cols-[minmax(0,1.4fr)_140px_180px_160px_120px] md:items-center">
                <div className="min-w-0">
                  <Link to={`/contests/${contest.id}`} className="truncate text-sm font-semibold text-[#131b2e] hover:text-[#003d9b]">
                    {contest.name}
                  </Link>
                  <p className="mt-1 text-xs text-[#65748d]">{contest.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#445472]">
                      {statusLabels[contest.status]}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#445472]">
                      {difficultyLabels[contest.difficulty]}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-[#445472]">{formatDuration(contest.duration_minutes)}</div>
                <div className="text-sm text-[#445472]">{new Date(contest.start_time).toLocaleString()}</div>
                <div className="text-sm text-[#445472]">
                  <div>{contest.participants_count} 人</div>
                  <div className="mt-1">{contest.problems_count} 题</div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#003d9b]">{timeHint(contest.status, contest.start_time, contest.end_time)}</p>
                  <Link to={`/contests/${contest.id}`} className="mt-2 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#17305e] shadow-[0_8px_18px_rgba(19,27,46,0.04)]">
                    {actionLabel(contest.status)}
                  </Link>
                </div>
              </div>
            ))
          )}
        </SurfaceCard>
      </div>
    </div>
  )
}

export default ContestList
