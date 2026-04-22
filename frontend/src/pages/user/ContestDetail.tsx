import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { contestsService } from '@/services/contests'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { InlineError } from '@/components/ui/InlineError'
import { ArrowLeft, Clock, Timer, Code2, BarChart3, Play, UserCheck, CircleCheck, Share2, Calendar, Zap, Flame, Trophy } from 'lucide-react'

interface ContestProblem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  accepted_count: number
  submission_count: number
}

interface ContestDetail {
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
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    icon: Calendar,
  },
  ongoing: {
    label: '进行中',
    bgColor: 'bg-[#3ecf8e]/10',
    textColor: 'text-[#3ecf8e]',
    borderColor: 'border-[#3ecf8e]/30',
    icon: Play,
  },
  completed: {
    label: '已结束',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
    icon: CircleCheck,
  },
}

const DIFFICULTY_CONFIG = {
  easy: {
    label: '简单',
    bgColor: 'bg-[#3ecf8e]/10',
    textColor: 'text-[#3ecf8e]',
    borderColor: 'border-[#3ecf8e]/20',
  },
  medium: {
    label: '中等',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/20',
  },
  hard: {
    label: '困难',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/20',
  },
}

export function ContestDetail() {
  const { contestId } = useParams<{ contestId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [countdown, setCountdown] = useState('')

  const { data: contest, isLoading, error, refetch } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: () => contestsService.getContestDetail(contestId!),
    enabled: !!contestId,
    refetchInterval: 30000,
  })

  // 注册竞赛
  const registerMutation = useMutation({
    mutationFn: () => contestsService.registerContest(contestId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] })
    },
  })

  // 进入竞赛
  const enterMutation = useMutation({
    mutationFn: () => contestsService.enterContest(contestId!),
    onSuccess: () => {
      // 进入竞赛页面或跳转到第一个题目（包含 contestId 以启用优先队列）
      if (contest?.problems && contest.problems.length > 0) {
        navigate(`/contests/${contestId}/problems/${contest.problems[0].id}/solve`)
      }
    },
  })

  // 倒计时逻辑
  useEffect(() => {
    if (!contest) return

    const updateCountdown = () => {
      const now = new Date()
      const startTime = new Date(contest.start_time)
      const endTime = new Date(contest.end_time)

      if (contest.status === 'upcoming') {
        const diff = startTime.getTime() - now.getTime()
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24))
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)

          if (days > 0) {
            setCountdown(`${days}天 ${hours}小时 ${minutes}分钟`)
          } else if (hours > 0) {
            setCountdown(`${hours}小时 ${minutes}分钟 ${seconds}秒`)
          } else {
            setCountdown(`${minutes}分钟 ${seconds}秒`)
          }
        } else {
          setCountdown('即将开始')
        }
      } else if (contest.status === 'ongoing') {
        const diff = endTime.getTime() - now.getTime()
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)
          setCountdown(`${hours}小时 ${minutes}分钟 ${seconds}秒`)
        } else {
          setCountdown('即将结束')
        }
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [contest])

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (error || !contest) {
    return (
      <InlineError
        title="竞赛详情加载失败"
        message="请检查竞赛ID或返回竞赛列表"
        onRetry={() => refetch()}
      />
    )
  }

  const statusConfig = STATUS_CONFIG[contest.status]
  const difficultyConfig = DIFFICULTY_CONFIG[contest.difficulty]
  const isLive = contest.status === 'ongoing'

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}小时 ${mins}分钟` : `${hours}小时`
    }
    return `${minutes}分钟`
  }

  const getPassRate = (accepted: number, submissions: number) => {
    if (submissions === 0) return '0%'
    return `${Math.round((accepted / submissions) * 100)}%`
  }

  return (
    <div className="space-y-5">
      {/* Hero Header — ClickHouse high-energy */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[#3ecf8e]/5" />
        {isLive && (
          <div className="h-1 bg-gradient-to-r from-[#3ecf8e] via-primary to-[#3ecf8e]" />
        )}
        <div className="relative px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <Button variant="ghost" size="small" onClick={() => navigate(-1)} className="shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-black tracking-tight text-foreground truncate">
                    {contest.name}
                  </h1>
                  <span className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold border shrink-0',
                    difficultyConfig.bgColor,
                    difficultyConfig.textColor,
                    difficultyConfig.borderColor
                  )}>
                    {difficultyConfig.label}
                  </span>
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border shrink-0',
                    statusConfig.bgColor,
                    statusConfig.textColor,
                    statusConfig.borderColor
                  )}>
                    {isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ecf8e] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3ecf8e]"></span>
                      </span>
                    )}
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  竞赛 ID: <span className="font-mono">{contest.id}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown — oversized bold timer */}
      {countdown && contest.status !== 'completed' && (
        <div className={cn(
          'rounded-xl border-2 px-6 py-5 text-center',
          isLive
            ? 'bg-[#3ecf8e]/5 border-[#3ecf8e]/20'
            : 'bg-blue-500/5 border-blue-500/20'
        )}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {contest.status === 'upcoming' ? '距离竞赛开始还有' : '竞赛剩余时间'}
          </p>
          <p className={cn(
            'text-4xl font-black tabular-nums tracking-tight',
            isLive ? 'text-[#3ecf8e]' : 'text-blue-400'
          )}>
            {countdown}
          </p>
        </div>
      )}

      {/* Contest Stats — oversized numbers, ClickHouse energy */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="mx-auto mb-2 w-fit rounded-lg bg-primary/10 p-2">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">开始时间</p>
          <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
            {new Date(contest.start_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="mx-auto mb-2 w-fit rounded-lg bg-amber-500/10 p-2">
            <Timer className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">竞赛时长</p>
          <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
            {formatDuration(contest.duration_minutes)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="mx-auto mb-2 w-fit rounded-lg bg-[#3ecf8e]/10 p-2">
            <Code2 className="w-5 h-5 text-[#3ecf8e]" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">题目数量</p>
          <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
            {contest.problems_count} 题
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="mx-auto mb-2 w-fit rounded-lg bg-red-500/10 p-2">
            <Trophy className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">参与人数</p>
          <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
            {contest.participants_count} 人
          </p>
        </div>
      </div>

      {/* Action Buttons — prominent CTAs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {contest.status === 'upcoming' && !contest.is_registered && (
            <Button
              variant="primary"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              className="font-bold"
            >
              {registerMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  注册中...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  立即注册
                </>
              )}
            </Button>
          )}

          {contest.status === 'upcoming' && contest.is_registered && (
            <Button variant="outline" disabled>
              <CircleCheck className="w-4 h-4 mr-2" />
              已注册
            </Button>
          )}

          {contest.status === 'ongoing' && contest.is_registered && (
            <Button
              variant="primary"
              onClick={() => enterMutation.mutate()}
              disabled={enterMutation.isPending}
              className="font-bold bg-[#3ecf8e] text-slate-950 hover:bg-[#3ecf8e]/90"
            >
              {enterMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-950 mr-2"></div>
                  进入中...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 mr-2" />
                  进入竞赛
                </>
              )}
            </Button>
          )}

          <Link to={`/contests/${contest.id}/scoreboard`}>
            <Button variant="outline" className="font-bold">
              <BarChart3 className="w-4 h-4 mr-2" />
              查看榜单
            </Button>
          </Link>
        </div>

        <Button variant="ghost" size="small">
          <Share2 className="w-4 h-4 mr-2" />
          分享
        </Button>
      </div>

      {/* Description */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          竞赛介绍
        </h3>
        <p className="text-sm leading-6 text-foreground font-normal">
          {contest.description}
        </p>

        {/* Rules */}
        {contest.rules && (
          <div className="mt-5 rounded-lg border border-border bg-background p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              竞赛规则
            </h3>
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
              {contest.rules}
            </pre>
          </div>
        )}

        {/* Prizes */}
        {contest.prizes && (
          <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-2">
              奖励
            </h3>
            <p className="text-sm text-amber-500">
              {contest.prizes}
            </p>
          </div>
        )}
      </div>

      {/* Problems List — prominent cards */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            竞赛题目
          </h2>
        </div>
        <div className="divide-y divide-border">
          {contest.problems.map((problem, index) => {
            const problemDifficultyConfig = DIFFICULTY_CONFIG[problem.difficulty]
            const passRate = getPassRate(problem.accepted_count, problem.submission_count)

            return (
              <Link
                key={problem.id}
                to={`/contests/${contestId}/problems/${problem.id}/solve`}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <span className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold tabular-nums',
                    problemDifficultyConfig.bgColor,
                    problemDifficultyConfig.textColor
                  )}>
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {problem.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        problemDifficultyConfig.bgColor,
                        problemDifficultyConfig.textColor
                      )}>
                        {problemDifficultyConfig.label}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                        {problem.points} 分
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        通过率 {passRate}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {problem.accepted_count} <span className="text-muted-foreground font-normal">/ {problem.submission_count}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
                    通过 / 提交
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Contest Statistics — oversized numbers */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
          竞赛统计
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-4xl font-black tabular-nums text-primary mb-1">
              {contest.participants_count}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              参与人数
            </p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black tabular-nums text-[#3ecf8e] mb-1">
              {contest.problems_count}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              题目总数
            </p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black tabular-nums text-amber-500 mb-1">
              {contest.problems.reduce((sum, p) => sum + p.points, 0)}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              总分值
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
