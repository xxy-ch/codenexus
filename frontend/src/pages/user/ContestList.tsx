import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
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

function statusTone(status: Exclude<ContestStatus, 'all'>) {
  if (status === 'upcoming') return 'bg-secondary-container text-on-secondary-container'
  if (status === 'ongoing') return 'bg-tertiary-container text-on-tertiary-fixed-variant'
  return 'bg-surface-container-low text-on-surface-variant'
}

function difficultyTone(difficulty: Exclude<ContestDifficulty, 'all'>) {
  if (difficulty === 'hard') return 'bg-error-container text-on-error-container'
  if (difficulty === 'medium') return 'bg-secondary-container text-on-secondary-container'
  return 'bg-tertiary-container text-on-tertiary-fixed-variant'
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${minutes}m`
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

  const featuredContest = useMemo(() => {
    if (contests.length === 0) return null
    return (
      contests.find((contest) => contest.status === 'ongoing') ??
      contests.find((contest) => contest.status === 'upcoming') ??
      contests[0]
    )
  }, [contests])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading contests..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <ErrorState
          title="Failed to load contests"
          message="Unable to fetch contest data. Please try again later."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Contests
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
              竞赛总览
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
              Browse upcoming and ongoing competitions. Register for contests and compete with programmers worldwide.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            leftIcon={<span className="material-symbols-outlined text-base">refresh</span>}
          >
            Refresh
          </Button>
        </div>

        {/* Featured Contest */}
        {featuredContest ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary-container p-0 text-white shadow-lg">
              <CardContent className="p-6 md:p-8">
                <div className="flex h-full flex-col justify-between gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-fixed">
                        Featured Contest
                      </span>
                      <span className="text-sm font-medium text-primary-fixed/90">
                        {statusLabels[featuredContest.status]}
                      </span>
                    </div>
                    <h2 className="mt-4 font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                      {featuredContest.name}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-primary-fixed/90">
                      {featuredContest.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/12 pt-5">
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-fixed/72">
                          Duration
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {formatDuration(featuredContest.duration_minutes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-fixed/72">
                          Start Time
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {new Date(featuredContest.start_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      as={Link}
                      to={`/contests/${featuredContest.id}`}
                      variant="secondary"
                      className="bg-white text-primary hover:bg-white/90"
                    >
                      {actionLabel(featuredContest.status)}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="surface" className="space-y-4 p-5">
              <p className="text-sm font-semibold text-on-surface">Contest Snapshot</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                  <span className="text-sm text-on-surface-variant">Total</span>
                  <span className="font-semibold text-on-surface">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                  <span className="text-sm text-on-surface-variant">Live Now</span>
                  <span className="font-semibold text-on-surface">{stats.live}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                  <span className="text-sm text-on-surface-variant">Upcoming</span>
                  <span className="font-semibold text-on-surface">{stats.upcoming}</span>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="default" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Total Contests
            </p>
            <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{stats.total}</p>
            <p className="mt-2 text-sm text-on-surface-variant">All contests in current view</p>
          </Card>
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Live Now
            </p>
            <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{stats.live}</p>
            <p className="mt-2 text-sm text-on-surface-variant">Currently in progress</p>
          </Card>
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Upcoming
            </p>
            <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{stats.upcoming}</p>
            <p className="mt-2 text-sm text-on-surface-variant">Scheduled to start</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <Input
                type="search"
                aria-label="Search contests"
                placeholder="Search by name or description..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'upcoming', 'ongoing', 'completed'] as ContestStatus[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors',
                    item === status
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  {item === 'all' ? 'All' : statusLabels[item]}
                </button>
              ))}
            </div>
            <select
              aria-label="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as ContestDifficulty)}
              className="h-9 rounded-lg bg-surface-container-low px-4 text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </Card>

        {/* Contest List */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-outline-variant/10 px-6 py-4">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">All Contests</h2>
          </div>

          {contests.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No contests found"
                description="Try adjusting your filters or check back later."
                icon={
                  <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                    emoji_events
                  </span>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {contests.map((contest) => (
                <div
                  key={contest.id}
                  className="grid gap-4 px-6 py-4 md:grid-cols-[minmax(0,1.4fr)_140px_180px_160px_120px] md:items-center hover:bg-surface-container-low/30 transition-colors"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/contests/${contest.id}`}
                      className="block truncate text-sm font-semibold text-on-surface hover:text-primary transition-colors"
                    >
                      {contest.name}
                    </Link>
                    <p className="mt-1 text-xs text-on-surface-variant line-clamp-1">{contest.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider', statusTone(contest.status))}>
                        {statusLabels[contest.status]}
                      </span>
                      <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider', difficultyTone(contest.difficulty))}>
                        {difficultyLabels[contest.difficulty]}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-on-surface-variant">{formatDuration(contest.duration_minutes)}</div>
                  <div className="text-sm text-on-surface-variant">{new Date(contest.start_time).toLocaleString()}</div>
                  <div className="text-sm text-on-surface-variant">
                    <div>{contest.participants_count} participants</div>
                    <div className="mt-1">{contest.problems_count} problems</div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{timeHint(contest.status, contest.start_time, contest.end_time)}</p>
                    <Button
                      as={Link}
                      to={`/contests/${contest.id}`}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      {actionLabel(contest.status)}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default ContestList
