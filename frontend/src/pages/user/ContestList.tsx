import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contestsService } from '@/services/contests'
import { EmptyState } from '@/components/page/EmptyState'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

interface Contest {
  id: string
  name: string
  description: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'upcoming' | 'ongoing' | 'completed'
  participants_count: number
  problems_count: number
  difficulty: 'easy' | 'medium' | 'hard'
  created_at: string
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'ongoing', label: '进行中' },
  { value: 'upcoming', label: '即将开始' },
  { value: 'completed', label: '已结束' },
] as const

const STATUS_BADGES = {
  upcoming: '待开始',
  ongoing: '比赛中',
  completed: '已完赛',
} as const

const DIFFICULTY_BADGES = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
} as const

const STATUS_STYLES = {
  upcoming: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-700',
} as const

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${minutes} 分钟 · ${hours}h ${remainingMinutes}m` : `${minutes} 分钟 · ${hours}h`
  }

  return `${minutes} 分钟`
}

function getCountdown(startTime: string) {
  const diff = new Date(startTime).getTime() - Date.now()

  if (diff <= 0) return null

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${minutes} 分钟`
}

function getRemainingTime(endTime: string) {
  const diff = new Date(endTime).getTime() - Date.now()

  if (diff <= 0) return '已结束'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `剩余 ${hours}h ${minutes}m`
}

export function ContestList() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contests', statusFilter, difficultyFilter, searchQuery],
    queryFn: () =>
      contestsService.getContests({
        status: statusFilter as never,
        difficulty: difficultyFilter as never,
        search: searchQuery || undefined,
      }),
  })

  const summary = useMemo(() => {
    const contests = data?.contests ?? []

    return {
      ongoing: contests.filter((contest) => contest.status === 'ongoing').length,
      upcoming: contests.filter((contest) => contest.status === 'upcoming').length,
      completed: contests.filter((contest) => contest.status === 'completed').length,
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <EmptyState
          title="加载失败"
          description="无法加载竞赛列表，请稍后重试。"
          action={
            <Button variant="primary" onClick={() => refetch()}>
              重试
            </Button>
          }
          className="w-full max-w-xl"
        />
      </div>
    )
  }

  if (!data || data.contests.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <EmptyState
          title="暂无竞赛"
          description="当前没有符合条件的竞赛。"
          className="w-full max-w-xl"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contest Directory"
        title="竞赛目录"
        description="统一浏览真实竞赛列表、过滤条件和倒计时信息。页面保留列表导向，不额外叠加装饰性分组。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="当前结果" value={`${data.total} 场`} helper="符合当前筛选条件的竞赛数" />
        <StatCard label="进行中" value={`${summary.ongoing} 场`} helper="可直接进入的比赛" />
        <StatCard label="即将开始" value={`${summary.upcoming} 场`} helper="临近开赛的比赛" />
        <StatCard label="已结束" value={`${summary.completed} 场`} helper="可回看结果的比赛" />
      </div>

      <FilterBar>
        <label className="min-w-[240px] flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-700">搜索竞赛</span>
          <input
            type="text"
            placeholder="搜索竞赛..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_24px_rgba(15,23,42,0.05)] outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">状态</span>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                    statusFilter === option.value
                      ? 'bg-blue-800 text-white shadow-[0_12px_24px_rgba(30,64,175,0.16)]'
                      : 'bg-[rgba(255,255,255,0.88)] text-slate-700 hover:bg-blue-50/80'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label htmlFor="difficulty-filter" className="flex items-end gap-2 text-sm font-medium text-slate-700">
          <span className="mb-2 block">难度</span>
          <select
            id="difficulty-filter"
            value={difficultyFilter}
            onChange={(event) => setDifficultyFilter(event.target.value)}
            className="rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_24px_rgba(15,23,42,0.05)] outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">全部难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
        </label>
      </FilterBar>

      <SectionBlock
        title="竞赛目录"
        description="列表保留必要信息：状态、时间、题量、人数和入口动作。"
      >
        <div className="grid gap-4">
          {data.contests.map((contest: Contest) => {
            const countdown = contest.status === 'upcoming' ? getCountdown(contest.start_time) : null
            const remaining = contest.status === 'ongoing' ? getRemainingTime(contest.end_time) : null

            return (
              <Link
                key={contest.id}
                to={`/contests/${contest.id}`}
                className="block rounded-[30px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,249,253,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)] transition-all duration-200 hover:border-blue-200 hover:shadow-[0_20px_38px_rgba(30,64,175,0.1)]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', STATUS_STYLES[contest.status])}>
                        {STATUS_BADGES[contest.status]}
                      </span>
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', DIFFICULTY_BADGES[contest.difficulty])}>
                        {contest.difficulty === 'easy' ? '简单' : contest.difficulty === 'medium' ? '中等' : '困难'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">{contest.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{contest.description}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-3 text-sm shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">时长</p>
                        <p className="mt-1 font-medium text-slate-900">{formatDuration(contest.duration_minutes)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-3 text-sm shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">题目</p>
                        <p className="mt-1 font-medium text-slate-900">{contest.problems_count} 题</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-3 text-sm shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">参与人数</p>
                        <p className="mt-1 font-medium text-slate-900">{contest.participants_count} 人</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-3 text-sm shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">开始时间</p>
                        <p className="mt-1 font-medium text-slate-900">
                          {new Date(contest.start_time).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-3 xl:w-56">
                    {countdown ? (
                      <div className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-medium text-blue-700">
                        距开始还有 {countdown}
                      </div>
                    ) : null}
                    {remaining ? (
                      <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-700">
                        {remaining}
                      </div>
                    ) : null}

                    <Button
                      variant={contest.status === 'ongoing' ? 'primary' : 'outline'}
                      size="sm"
                      className="w-full"
                    >
                      {contest.status === 'ongoing' ? '立即加入' : null}
                      {contest.status === 'upcoming' ? '立即注册' : null}
                      {contest.status === 'completed' ? '查看结果' : null}
                    </Button>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </SectionBlock>
    </div>
  )
}
