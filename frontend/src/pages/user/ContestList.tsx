import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contestsService } from '@/services/contests'
import { Button } from '@/shared/components/Button'
import { cn } from '@/shared/lib/utils'
import { Trophy, Search, Clock, Code2, Users, Calendar, Play, UserCheck, BarChart3, CalendarClock, CircleCheck, CirclePlay, Zap, Flame } from 'lucide-react'
import { CardGridSkeleton } from '@/shared/components/CardGridSkeleton'
import { EmptyState } from '@/shared/components/EmptyState'
import { InlineError } from '@/shared/components/InlineError'

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

const STATUS_CONFIG = {
  upcoming: {
    label: '即将开始',
    bgColor: 'bg-primary/10 border border-primary/20',
    textColor: 'text-primary',
    icon: CalendarClock,
    glow: '',
  },
  ongoing: {
    label: '进行中',
    bgColor: 'bg-status-accepted/10 border border-status-accepted/20',
    textColor: 'text-status-accepted',
    icon: CirclePlay,
    glow: 'animate-pulse',
  },
  completed: {
    label: '已结束',
    bgColor: 'bg-muted border border-border/60',
    textColor: 'text-muted-foreground',
    icon: CircleCheck,
    glow: '',
  },
}

const DIFFICULTY_CONFIG = {
  easy: {
    label: '简单',
    bgColor: 'bg-status-accepted/10 border border-status-accepted/20',
    textColor: 'text-status-accepted',
  },
  medium: {
    label: '中等',
    bgColor: 'bg-difficulty-medium/10 border border-difficulty-medium/20',
    textColor: 'text-difficulty-medium',
  },
  hard: {
    label: '困难',
    bgColor: 'bg-difficulty-hard/10 border border-difficulty-hard/20',
    textColor: 'text-difficulty-hard',
  },
}

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

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const getCountdown = (startTime: string) => {
    const now = new Date()
    const start = new Date(startTime)
    const diff = start.getTime() - now.getTime()

    if (diff <= 0) return null

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}天${hours}小时`
    if (hours > 0) return `${hours}小时${minutes}分钟`
    return `${minutes}分钟`
  }

  const getRemainingTime = (endTime: string) => {
    const now = new Date()
    const end = new Date(endTime)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return '已结束'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `剩余 ${hours}h ${minutes}m`
  }

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

  const renderContestCard = (contest: Contest) => {
    const statusConfig = STATUS_CONFIG[contest.status]
    const difficultyConfig = DIFFICULTY_CONFIG[contest.difficulty]
    const countdown = contest.status === 'upcoming' ? getCountdown(contest.start_time) : null
    const remaining = contest.status === 'ongoing' ? getRemainingTime(contest.end_time) : null
    const StatusIcon = statusConfig.icon
    const isLive = contest.status === 'ongoing'

    return (
      <Link
        key={contest.id}
        to={`/contests/${contest.id}`}
        className={cn(
          'relative block bg-background/60 backdrop-blur-xl border border-border/40 rounded-xl overflow-hidden glass-interactive hover-lift transition-card-hover'
        )}
      >
        {/* Live indicator bar for ongoing contests */}
        {isLive && (
          <div className="h-[2px] bg-gradient-to-r from-status-accepted via-primary to-status-accepted animate-pulse" />
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center flex-wrap gap-2.5">
                <h3 className="text-base font-bold text-foreground tracking-tight hover:text-primary transition-colors">
                  {contest.name}
                </h3>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[13px] font-semibold',
                  difficultyConfig.bgColor,
                  difficultyConfig.textColor
                )}>
                  {difficultyConfig.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {contest.description}
              </p>
            </div>
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold tracking-wide self-start sm:self-auto',
              statusConfig.bgColor,
              statusConfig.textColor,
              statusConfig.glow
            )}>
               <StatusIcon className="w-3.5 h-3.5" />
               {statusConfig.label}
            </span>
          </div>

          {/* Stats row — oversized numbers, ClickHouse energy */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl border border-border/40 bg-muted/40 px-3 py-2.5 text-center">
              <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground font-medium">时长</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-foreground">
                {formatDuration(contest.duration_minutes)}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/40 px-3 py-2.5 text-center">
              <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground font-medium">题目</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-foreground">
                {contest.problems_count}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/40 px-3 py-2.5 text-center">
              <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground font-medium">参与</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-foreground">
                {contest.participants_count}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/40 px-3 py-2.5 text-center">
              <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground font-medium">日期</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-foreground">
                {new Date(contest.start_time).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Countdown or Timer — bold, urgent */}
          {(countdown || remaining) && (
            <div className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold font-mono tracking-wide',
              contest.status === 'upcoming'
                ? 'bg-primary/5 border-primary/20 text-primary'
                : 'bg-status-accepted/5 border-status-accepted/20 text-status-accepted'
            )}>
              {isLive ? <Zap className="w-4 h-4 text-status-accepted animate-bounce" /> : <Clock className="w-4 h-4" />}
              {countdown && `距开始还有 ${countdown}`}
              {remaining && remaining}
            </div>
          )}

          {/* Action Button */}
          <div className="mt-5 flex items-center justify-between border-t border-border/30 pt-4">
            <div className="text-[13px] text-muted-foreground font-semibold">
              {new Date(contest.start_time).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <Button
              variant={isLive ? 'primary' : 'outline'}
              size="sm"
              className="button-press font-bold px-4"
            >
              {contest.status === 'ongoing' && (
                <>
                  <Flame className="w-4 h-4 mr-2 text-amber-400 animate-pulse" />
                  立即加入
                </>
              )}
              {contest.status === 'upcoming' && (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  立即注册
                </>
              )}
              {contest.status === 'completed' && (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  查看结果
                </>
              )}
            </Button>
          </div>
        </div>
      </Link>
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
                {groupedContests.ongoing.map(renderContestCard)}
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
                {groupedContests.upcoming.map(renderContestCard)}
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
                {groupedContests.completed.map(renderContestCard)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 animate-slide-up">
          {data.contests.map(renderContestCard)}
        </div>
      )}
    </div>
  )
}
