import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contestsService } from '@/features/contests/services/contests'
import { cn } from '@/shared/lib/utils'
import { Trophy, Search, CirclePlay, CalendarClock, CircleCheck } from 'lucide-react'
import { CardGridSkeleton } from '@/shared/components/CardGridSkeleton'
import { EmptyState } from '@/shared/components/EmptyState'
import { InlineError } from '@/shared/components/InlineError'
import { ContestCard } from '@/features/contests/components/ContestCard'

export function ContestList() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contests', statusFilter, difficultyFilter, searchQuery],
    queryFn: () =>
      contestsService.getContests({
        status: statusFilter as any,
        difficulty: difficultyFilter as any,
        search: searchQuery || undefined,
      }),
  })

  // 按状态分组竞赛
  const groupedContests = useMemo(() => {
    if (!data) return { ongoing: [], upcoming: [], completed: [] }

    return {
      ongoing: data.contests.filter(c => c.status === 'ongoing'),
      upcoming: data.contests.filter(c => c.status === 'upcoming'),
      completed: data.contests.filter(c => c.status === 'completed'),
    }
  }, [data])

  if (isLoading) {
    return <CardGridSkeleton cards={6} />
  }

  if (error) {
    return (
      <InlineError
        title="竞赛列表加载失败"
        message="无法加载竞赛列表，请稍后重试"
        onRetry={() => refetch()}
      />
    )
  }

  if (!data || data.contests.length === 0) {
    return (
      <EmptyState icon={Trophy} title="暂无竞赛" description="当前没有符合条件的竞赛" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Header — ClickHouse high-energy */}
      <div className="relative overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(94,106,210,0.15),_transparent_40%)]" />
        <div className="relative px-6 py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    CodeNexus 竞赛
                  </h1>
                  <p className="text-sm font-normal text-muted-foreground mt-1">
                    参加编程竞赛，与全站选手同台竞技
                  </p>
                </div>
              </div>
            </div>

            {/* Live stats in hero */}
            <div className="flex items-center gap-3">
              {data.contests.filter(c => c.status === 'ongoing').length > 0 && (
                <div className="flex items-center gap-2 rounded-full bg-status-accepted/10 border border-status-accepted/20 px-4 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-accepted opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-status-accepted"></span>
                  </span>
                  <span className="text-sm font-bold text-status-accepted">
                    {data.contests.filter(c => c.status === 'ongoing').length} 场进行中
                  </span>
                </div>
              )}
              <div className="rounded-full border border-border/40 bg-muted/30 px-4 py-2">
                <span className="text-sm font-semibold text-foreground">
                  {data.contests.length} 场竞赛
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters — bold, high-energy filter bar */}
      <div className="bg-background/60 backdrop-blur-xl/60 border border-border/40 rounded-xl p-4 glass">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索竞赛..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border/40 rounded-lg text-sm bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
              状态
            </span>
            <div className="flex gap-1.5 bg-muted/40 p-1 rounded-full border border-border/40">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition button-press',
                  statusFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                全部
              </button>
              <button
                onClick={() => setStatusFilter('ongoing')}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition button-press',
                  statusFilter === 'ongoing'
                    ? 'bg-status-accepted text-black shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                进行中
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition button-press',
                  statusFilter === 'upcoming'
                    ? 'bg-[#5e6ad2] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                即将开始
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition button-press',
                  statusFilter === 'completed'
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                已结束
              </button>
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="difficulty-filter" className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
              难度
            </label>
            <select
              id="difficulty-filter"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-3 py-1.5 text-[13px] font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none cursor-pointer"
            >
              <option value="all">全部</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contest Sections */}
      {statusFilter === 'all' ? (
        <>
          {/* Ongoing Contests — featured, high energy */}
          {groupedContests.ongoing.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-status-accepted/10 p-1.5">
                  <CirclePlay className="w-5 h-5 text-status-accepted animate-pulse" />
                </div>
                <h2 className="text-base font-bold text-foreground uppercase tracking-wide">
                  进行中
                </h2>
                <span className="rounded-full bg-status-accepted/10 px-2.5 py-1 text-[13px] font-bold text-status-accepted">
                  {groupedContests.ongoing.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 animate-slide-up">
                {groupedContests.ongoing.map((c) => <ContestCard key={c.id} contest={c} />)}
              </div>
            </div>
          )}

          {/* Upcoming Contests */}
          {groupedContests.upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <CalendarClock className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground uppercase tracking-wide">
                  即将开始
                </h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[13px] font-bold text-primary">
                  {groupedContests.upcoming.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 animate-slide-up">
                {groupedContests.upcoming.map((c) => <ContestCard key={c.id} contest={c} />)}
              </div>
            </div>
          )}

          {/* Completed Contests */}
          {groupedContests.completed.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-muted p-1.5">
                  <CircleCheck className="w-5 h-5 text-muted-foreground" />
                </div>
                <h2 className="text-base font-bold text-foreground uppercase tracking-wide">
                  已结束
                </h2>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[13px] font-bold text-muted-foreground">
                  {groupedContests.completed.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 animate-slide-up">
                {groupedContests.completed.map((c) => <ContestCard key={c.id} contest={c} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 animate-slide-up">
          {data.contests.map((c) => <ContestCard key={c.id} contest={c} />)}
        </div>
      )}
    </div>
  )
}
