import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { contestsService } from '@/services/contests'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { ActionBar } from '@/components/page/ActionBar'
import { EmptyState } from '@/components/page/EmptyState'
import { MetaStrip } from '@/components/page/MetaStrip'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { SurfaceCard } from '@/components/page/SurfaceCard'
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
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    summary: '等待开赛',
  },
  ongoing: {
    label: '进行中',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    summary: '可以进入比赛',
  },
  completed: {
    label: '已结束',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
    summary: '可查看结果',
  },
} as const

const DIFFICULTY_CONFIG = {
  easy: {
    label: '简单',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  medium: {
    label: '中等',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  hard: {
    label: '困难',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
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

  const shareContest = async () => {
    const shareUrl = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: contest?.name || 'Contest', url: shareUrl })
        return
      }
      await navigator.clipboard.writeText(shareUrl)
    } catch (shareError) {
      console.error('Failed to share contest:', shareError)
    }
  }

  const totalPoints = useMemo(
    () => contest?.problems.reduce((sum, problem) => sum + problem.points, 0) ?? 0,
    [contest],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (error || !contest) {
    const notFound = error instanceof Error && /not found/i.test(error.message)
    return (
      <EmptyState
        title={notFound ? '竞赛不存在' : '加载失败'}
        description={error instanceof Error ? error.message : '请检查竞赛ID或返回竞赛列表'}
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              返回
            </Button>
            <Button variant="primary" onClick={() => refetch()}>
              重试
            </Button>
          </div>
        }
      />
    )
  }

  const statusConfig = STATUS_CONFIG[contest.status]
  const difficultyConfig = DIFFICULTY_CONFIG[contest.difficulty]
  const scoreboardLabel = contest.status === 'completed' ? '查看结果' : '查看榜单'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="竞赛主控台"
        breadcrumb={['竞赛中心', contest.name]}
        title={contest.name}
        description={contest.description}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate(-1)} aria-label="返回">
              返回
            </Button>
            <button
              type="button"
              onClick={shareContest}
              aria-label="分享"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              分享
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn('rounded-full border px-3 py-1 text-sm font-semibold', difficultyConfig.className)}
        >
          {difficultyConfig.label}
        </span>
        <span className={cn('rounded-full border px-3 py-1 text-sm font-semibold', statusConfig.className)}>
          {statusConfig.label}
        </span>
        <span className="text-sm text-slate-500">
          竞赛 ID: {contest.id} • {contest.participants_count} 人参与
        </span>
      </div>

      <MetaStrip
        items={[
          { label: '开始时间', value: formatDateTime(contest.start_time) },
          { label: '赛程时长', value: formatDuration(contest.duration_minutes) },
          { label: '题目数量', value: `${contest.problems_count} 题` },
          {
            label: '参赛人数',
            value: `${contest.participants_count} 人`,
            helper: statusConfig.summary,
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_320px]">
        <SurfaceCard className="overflow-hidden border-0 bg-[linear-gradient(135deg,#1e40af_0%,#2563eb_58%,#60a5fa_100%)] p-0 text-white shadow-[0_26px_54px_rgba(30,64,175,0.26)]">
          <div className="flex h-full flex-col justify-between gap-6 px-6 py-6 md:px-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-50">
                  赛程快照
                </span>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm font-semibold',
                    contest.status === 'completed'
                      ? 'border-white/18 bg-white/12 text-white'
                      : contest.status === 'ongoing'
                        ? 'border-emerald-200/40 bg-emerald-400/18 text-emerald-50'
                        : 'border-blue-100/35 bg-white/12 text-blue-50',
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
              <h2 className="mt-4 font-['Manrope'] text-[1.85rem] font-extrabold tracking-[-0.04em] text-white">竞赛主控台</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-50/86">
                当前页按主控台视角组织信息，优先展示赛程状态、时间与可执行动作，再向下钻取到题目、规则与参赛说明。
              </p>
            </div>
            <div className="flex flex-wrap gap-6 border-t border-white/12 pt-5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/72">开始时间</div>
                <div className="mt-1 text-lg font-semibold">{formatDateTime(contest.start_time)}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/72">赛程时长</div>
                <div className="mt-1 text-lg font-semibold">{formatDuration(contest.duration_minutes)}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/72">参赛人数</div>
                <div className="mt-1 text-lg font-semibold">{contest.participants_count} 人</div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <div className="space-y-4">
          {countdown && contest.status !== 'completed' ? (
            <SurfaceCard
              className={cn(
                'p-5',
                contest.status === 'upcoming'
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-emerald-200 bg-emerald-50',
              )}
            >
              <p className="text-sm font-medium text-slate-600">倒计时提示</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{countdown}</p>
              <p className="mt-2 text-sm text-slate-600">
                {contest.status === 'upcoming' ? '距离竞赛开始还有' : '竞赛剩余时间'}
              </p>
            </SurfaceCard>
          ) : null}

          <SurfaceCard className="space-y-3">
            <p className="text-sm font-semibold text-slate-950">参赛指引</p>
            <div className="space-y-3 text-sm text-slate-600">
              <p>赛程状态：{statusConfig.summary}</p>
              <p>题目数量：{contest.problems_count} 题</p>
              <p>难度层级：{difficultyConfig.label}</p>
              <p>可进入榜单：{scoreboardLabel}</p>
            </div>
          </SurfaceCard>
        </div>
      </div>

      <ActionBar className="justify-start">
        {contest.status === 'upcoming' && !contest.is_registered ? (
          <Button
            variant="primary"
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
          <Button variant="primary" onClick={() => enterMutation.mutate()} disabled={enterMutation.isPending}>
            {enterMutation.isPending ? '进入中...' : '进入竞赛'}
          </Button>
        ) : null}

        <Link to={`/contests/${contest.id}/scoreboard`}>
          <Button variant="outline">{scoreboardLabel}</Button>
        </Link>
      </ActionBar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="space-y-6">
          <SectionBlock title="赛程说明" description="介绍、规则和奖励统一收纳在同一阅读区域。">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">竞赛介绍</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {contest.description}
                </p>
              </div>

              {contest.rules ? (
                <SurfaceCard tone="muted" className="p-4">
                  <h3 className="text-sm font-semibold text-slate-950">竞赛规则</h3>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">
                    {contest.rules}
                  </pre>
                </SurfaceCard>
              ) : null}

              {contest.prizes ? (
                <SurfaceCard className="border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-sm font-semibold text-amber-900">奖励</h3>
                  <p className="mt-2 text-sm leading-6 text-amber-800">{contest.prizes}</p>
                </SurfaceCard>
              ) : null}
            </div>
          </SectionBlock>

          <SectionBlock title="题目编排" description="题目卡片直接链接到对应题面。">
            <div className="space-y-3">
              {contest.problems.map((problem, index) => {
                const problemDifficultyConfig = DIFFICULTY_CONFIG[problem.difficulty]
                const passRate = getPassRate(problem.accepted_count, problem.submission_count)

                return (
                  <Link
                    key={problem.id}
                    to={`/problems/${problem.id}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-medium text-slate-950">{problem.title}</h3>
                          <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto text-xs text-slate-500 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <span
                              className={cn(
                                'shrink-0 rounded-full border px-2.5 py-1 font-semibold',
                                problemDifficultyConfig.className,
                              )}
                            >
                              {problemDifficultyConfig.label}
                            </span>
                            <span className="shrink-0">{problem.points} 分</span>
                            <span className="shrink-0">通过率 {passRate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p className="font-medium text-slate-950">
                          {problem.accepted_count} / {problem.submission_count}
                        </p>
                        <p className="text-xs">通过 / 提交</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </SectionBlock>
        </div>

        <div className="space-y-6">
          <SectionBlock title="参赛指引" description="维持真实接口可提供的统计维度。">
            <p className="text-sm leading-6 text-slate-600">
              关键统计已经收到顶部横向信息带，右栏保留给比赛时间、状态和后续操作，避免重复的大号统计卡把页面拉长。
            </p>
          </SectionBlock>

          <SurfaceCard tone="muted" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">赛程时间轴</p>
            <div className="text-sm text-slate-600">
              <p>开始时间 {formatDateTime(contest.start_time)}</p>
              <p className="mt-2">结束时间 {formatDateTime(contest.end_time)}</p>
              <p className="mt-2">创建时间 {formatDateTime(contest.created_at)}</p>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
