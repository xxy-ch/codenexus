import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { DifficultyBadge } from '@/components/ui/StatusBadge'
import { contestsService } from '@/services/contests'
import { cn } from '@/lib/utils'

interface ContestProblem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  accepted_count: number
  submission_count: number
}

interface ContestDetailData {
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
  rules?: string
  prizes?: string
  problems: ContestProblem[]
  is_registered: boolean
  created_at: string
}

const STATUS_CONFIG = {
  upcoming: {
    label: '即将开始',
    className: 'bg-secondary-container text-on-secondary-container',
    summary: '等待开赛',
  },
  ongoing: {
    label: '进行中',
    className: 'bg-tertiary-container text-on-tertiary-fixed-variant',
    summary: '可以进入比赛',
  },
  completed: {
    label: '已结束',
    className: 'bg-surface-container-low text-on-surface-variant',
    summary: '可查看结果',
  },
} as const

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(dateString))
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}小时 ${mins}分钟` : `${hours}小时`
  }
  return `${minutes}分钟`
}

function getPassRate(accepted: number, submissions: number) {
  if (submissions === 0) return '0%'
  return `${Math.round((accepted / submissions) * 100)}%`
}

export function ContestDetail() {
  const { contestId } = useParams<{ contestId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [countdown, setCountdown] = useState('')

  const {
    data: contest,
    isLoading,
    error,
    refetch,
  } = useQuery<ContestDetailData>({
    queryKey: ['contest', contestId],
    queryFn: () => contestsService.getContestDetail(contestId!),
    enabled: !!contestId,
    refetchInterval: 30000,
  })

  const registerMutation = useMutation({
    mutationFn: () => contestsService.registerContest(contestId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] })
    },
  })

  const enterMutation = useMutation({
    mutationFn: () => contestsService.enterContest(contestId!),
    onSuccess: () => {
      if (contest?.problems && contest.problems.length > 0) {
        navigate(`/problems/${contest.problems[0].id}/solve`)
      }
    },
  })

  useEffect(() => {
    if (!contest) return

    const updateCountdown = () => {
      const now = Date.now()
      const startTime = new Date(contest.start_time).getTime()
      const endTime = new Date(contest.end_time).getTime()

      if (contest.status === 'upcoming') {
        const diff = startTime - now
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24))
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          if (days > 0) {
            setCountdown(`${days}天 ${hours}小时 ${minutes}分钟`)
          } else {
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)
            setCountdown(`${hours}小时 ${minutes}分钟 ${seconds}秒`)
          }
          return
        }
        setCountdown('即将开始')
        return
      }

      if (contest.status === 'ongoing') {
        const diff = endTime - now
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)
          setCountdown(`剩余 ${hours}小时 ${minutes}分钟 ${seconds}秒`)
          return
        }
        setCountdown('即将结束')
      }
    }

    updateCountdown()
    const interval = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(interval)
  }, [contest])

  const totalPoints = useMemo(
    () => contest?.problems.reduce((sum, problem) => sum + problem.points, 0) ?? 0,
    [contest],
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading contest..." />
      </div>
    )
  }

  if (error || !contest) {
    const notFound = error instanceof Error && /not found/i.test(error.message)
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <ErrorState
          title={notFound ? 'Contest not found' : 'Failed to load contest'}
          description={error instanceof Error ? error.message : 'Please check the contest ID or return to the contest list.'}
          action={{
            label: 'Back to Contests',
            onClick: () => navigate('/contests'),
          }}
        />
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[contest.status]
  const scoreboardLabel = contest.status === 'completed' ? '查看结果' : '查看榜单'

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-on-surface-variant">
          <Link to="/contests" className="hover:text-primary transition-colors">
            Contests
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="font-bold text-primary">{contest.name}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Contest Console
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
              {contest.name}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">{contest.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DifficultyBadge difficulty={contest.difficulty} />
            <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', statusConfig.className)}>
              {statusConfig.label}
            </span>
            <span className="text-sm text-on-surface-variant">
              ID: {contest.id} · {contest.participants_count} participants
            </span>
          </div>
        </div>

        {/* Main Overview Card */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary-container p-0 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-fixed/72">
                      Contest Console
                    </span>
                    <span className={cn(
                      'rounded-full border px-3 py-1 text-sm font-semibold',
                      contest.status === 'completed'
                        ? 'border-white/18 bg-white/12 text-white'
                        : contest.status === 'ongoing'
                          ? 'border-tertiary-fixed bg-tertiary-fixed/30 text-white'
                          : 'border-primary-fixed bg-white/12 text-white',
                    )}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <h2 className="mt-4 font-headline text-2xl font-extrabold tracking-tight text-white">
                    竞赛主控台
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-primary-fixed/90">
                    当前页按主控台视角组织信息，优先展示赛程状态、时间与可执行动作，再向下钻取到题目、规则与参赛说明。
                  </p>
                </div>
                <div className="flex flex-wrap gap-6 border-t border-white/12 pt-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-fixed/72">Start Time</p>
                    <p className="mt-1 text-lg font-semibold text-white">{formatDateTime(contest.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-fixed/72">Duration</p>
                    <p className="mt-1 text-lg font-semibold text-white">{formatDuration(contest.duration_minutes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-fixed/72">Participants</p>
                    <p className="mt-1 text-lg font-semibold text-white">{contest.participants_count} 人</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {countdown && contest.status !== 'completed' ? (
              <Card className={cn(
                'p-5',
                contest.status === 'upcoming'
                  ? 'border-secondary-container bg-secondary-container/20'
                  : 'border-tertiary-container bg-tertiary-container/20',
              )}>
                <p className="text-sm font-medium text-on-surface-variant">倒计时提示</p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">{countdown}</p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {contest.status === 'upcoming' ? '距离竞赛开始还有' : '竞赛剩余时间'}
                </p>
              </Card>
            ) : null}

            <Card variant="surface" className="space-y-3 p-5">
              <p className="text-sm font-semibold text-on-surface">参赛指引</p>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <p>赛程状态：{statusConfig.summary}</p>
                <p>题目数量：{contest.problems_count} 题</p>
                <p>可进入榜单：{scoreboardLabel}</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Bar */}
        <Card className="flex flex-wrap items-center gap-3 px-6 py-4">
          {contest.status === 'upcoming' && !contest.is_registered ? (
            <Button
              variant="gradient"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? '注册中...' : '立即注册'}
            </Button>
          ) : null}

          {contest.status === 'upcoming' && contest.is_registered ? (
            <Button variant="outline" disabled>
              已注册
            </Button>
          ) : null}

          {contest.status === 'ongoing' && contest.is_registered ? (
            <Button
              variant="gradient"
              onClick={() => enterMutation.mutate()}
              disabled={enterMutation.isPending}
            >
              {enterMutation.isPending ? '进入中...' : '进入竞赛'}
            </Button>
          ) : null}

          <Link to={`/contests/${contest.id}/scoreboard`} className="ml-auto">
            <Button variant="outline">{scoreboardLabel}</Button>
          </Link>
        </Card>

        {/* Content Sections */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <div className="space-y-6">
            {/* Contest Description */}
            <Card variant="default" className="space-y-6 p-6">
              <div>
                <h2 className="font-headline text-xl font-extrabold text-on-surface">赛程说明</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-on-surface-variant">
                  {contest.description}
                </p>
              </div>

              {contest.rules ? (
                <Card variant="surface" className="p-4">
                  <h3 className="text-sm font-semibold text-on-surface">竞赛规则</h3>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-on-surface-variant">
                    {contest.rules}
                  </pre>
                </Card>
              ) : null}

              {contest.prizes ? (
                <Card className="border-tertiary-container bg-tertiary-container/20 p-4">
                  <h3 className="text-sm font-semibold text-on-tertiary-fixed-variant">奖励</h3>
                  <p className="mt-2 text-sm leading-6 text-on-tertiary-fixed-variant">{contest.prizes}</p>
                </Card>
              ) : null}
            </Card>

            {/* Problems List */}
            <Card variant="default" className="space-y-4 p-6">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">题目编排</h2>
              <div className="space-y-3">
                {contest.problems.map((problem, index) => {
                  const passRate = getPassRate(problem.accepted_count, problem.submission_count)

                  return (
                    <Link
                      key={problem.id}
                      to={`/problems/${problem.id}`}
                      className="block rounded-xl border border-outline-variant/20 bg-surface-container-low/50 p-4 transition hover:border-primary hover:bg-surface-container-low"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-on-surface text-sm font-semibold text-white">
                            {index + 1}
                          </span>
                          <div>
                            <h3 className="font-medium text-on-surface">{problem.title}</h3>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                              <DifficultyBadge difficulty={problem.difficulty} />
                              <span>{problem.points} pts</span>
                              <span>通过率 {passRate}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-on-surface-variant">
                          <p className="font-medium text-on-surface">
                            {problem.accepted_count} / {problem.submission_count}
                          </p>
                          <p className="text-xs">通过 / 提交</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card variant="surface" className="space-y-3 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">赛程时间轴</p>
              <div className="space-y-2 text-sm text-on-surface-variant">
                <p>开始时间 {formatDateTime(contest.start_time)}</p>
                <p>结束时间 {formatDateTime(contest.end_time)}</p>
                <p>创建时间 {formatDateTime(contest.created_at)}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContestDetail
