import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { contestsService } from '@/services/contests'
import { Button } from '@/shared/components/Button'
import { cn } from '@/shared/lib/utils'
import { DetailSkeleton } from '@/shared/components/DetailSkeleton'
import { InlineError } from '@/shared/components/InlineError'
import { ArrowLeft, Clock, Timer, Code2, BarChart3, Play, UserCheck, CircleCheck, Share2, Calendar, Flame, Trophy } from 'lucide-react'

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
    bgColor: 'bg-status-pending/10',
    textColor: 'text-status-pending',
    borderColor: 'border-status-pending/20',
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
    bgColor: 'bg-difficulty-medium/10',
    textColor: 'text-difficulty-medium',
    borderColor: 'border-difficulty-medium/20',
  },
  hard: {
    label: '困难',
    bgColor: 'bg-difficulty-hard/10',
    textColor: 'text-difficulty-hard',
    borderColor: 'border-difficulty-hard/20',
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
      <div className="relative overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(94,106,210,0.15),_transparent_40%)]" />
        {isLive && (
          <div className="h-[2px] bg-gradient-to-r from-status-accepted via-primary to-status-accepted animate-pulse" />
        )}
        <div className="relative px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="shrink-0 button-press rounded-xl hover:bg-muted"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center flex-wrap gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                    {contest.name}
                  </h1>
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-[13px] font-semibold',
                    difficultyConfig.bgColor,
                    difficultyConfig.textColor,
                    difficultyConfig.borderColor
                  )}>
                    {difficultyConfig.label}
                  </span>
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[13px] font-semibold',
                    statusConfig.bgColor,
                    statusConfig.textColor,
                    statusConfig.borderColor
                  )}>
                    {isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-accepted opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-status-accepted"></span>
                      </span>
                    )}
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground font-semibold">
                  竞赛 ID: <span className="font-mono text-primary/80">{contest.id}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown — oversized bold timer */}
      {countdown && contest.status !== 'completed' && (
        <div className={cn(
          'rounded-xl border px-6 py-5 text-center transition-all glass shadow-sm',
          isLive
            ? 'bg-status-accepted/5 border-status-accepted/20 text-status-accepted shadow-[0_0_20px_rgba(16,185,129,0.06)]'
            : 'bg-primary/5 border-primary/20 text-primary'
        )}>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {contest.status === 'upcoming' ? '距离竞赛开始还有' : '竞赛剩余时间'}
          </p>
          <p className={cn(
            'text-2xl font-extrabold tabular-nums tracking-tight',
            isLive ? 'text-status-accepted' : 'text-primary'
          )}>
            {countdown}
          </p>
        </div>
      )}

      {/* Contest Stats — oversized numbers, ClickHouse energy */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 text-center hover-lift transition-card-hover">
          <div className="mx-auto mb-2 w-fit rounded-xl bg-primary/10 border border-primary/20 p-2">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground font-medium">开始时间</p>
          <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
            {new Date(contest.start_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 text-center hover-lift transition-card-hover">
          <div className="mx-auto mb-2 w-fit rounded-xl bg-difficulty-medium/10 border border-difficulty-medium/20 p-2">
            <Timer className="w-5 h-5 text-difficulty-medium" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground font-medium">竞赛时长</p>
          <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
            {formatDuration(contest.duration_minutes)}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 text-center hover-lift transition-card-hover">
          <div className="mx-auto mb-2 w-fit rounded-xl bg-status-accepted/10 border border-status-accepted/20 p-2">
            <Code2 className="w-5 h-5 text-status-accepted" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground font-medium">题目数量</p>
          <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
            {contest.problems_count} 题
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 text-center hover-lift transition-card-hover">
          <div className="mx-auto mb-2 w-fit rounded-xl bg-difficulty-hard/10 border border-difficulty-hard/20 p-2">
            <Trophy className="w-5 h-5 text-difficulty-hard" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground font-medium">参与人数</p>
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
              variant="default"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              className="font-bold button-press px-5 rounded-xl shadow-md shadow-primary/20"
            >
              {registerMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
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
            <Button variant="outline" disabled className="px-5 rounded-xl">
              <CircleCheck className="w-4 h-4 mr-2" />
              已注册
            </Button>
          )}

          {contest.status === 'ongoing' && contest.is_registered && (
            <Button
              variant="default"
              onClick={() => enterMutation.mutate()}
              disabled={enterMutation.isPending}
              className="font-bold button-press px-6 rounded-xl bg-status-accepted text-slate-950 hover:bg-status-accepted/90 shadow-md shadow-status-accepted/20"
            >
              {enterMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-950 mr-2"></div>
                  进入中...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 mr-2 text-slate-950 animate-pulse" />
                  进入竞赛
                </>
              )}
            </Button>
          )}

          <Link to={`/contests/${contest.id}/scoreboard`}>
            <Button variant="outline" className="font-bold button-press px-5 rounded-xl">
              <BarChart3 className="w-4 h-4 mr-2" />
              查看榜单
            </Button>
          </Link>
        </div>

        <Button variant="ghost" size="sm" className="button-press rounded-xl text-muted-foreground hover:text-foreground">
          <Share2 className="w-4 h-4 mr-2" />
          分享
        </Button>
      </div>

      {/* Description */}
      <div className="bg-background/60 backdrop-blur-xl border border-border/40 rounded-xl p-5 shadow-sm">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          竞赛介绍
        </h3>
        <p className="text-sm leading-7 text-muted-foreground font-normal">
          {contest.description}
        </p>

        {/* Rules */}
        {contest.rules && (
          <div className="mt-5 rounded-xl border border-border/40 bg-muted/30 p-5 glass">
            <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              竞赛规则
            </h3>
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {contest.rules}
            </pre>
          </div>
        )}

        {/* Prizes */}
        {contest.prizes && (
          <div className="mt-5 rounded-xl border border-difficulty-medium/20 bg-difficulty-medium/5 p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-widest text-difficulty-medium mb-3">
              奖励
            </h3>
            <p className="text-sm text-difficulty-medium font-semibold leading-relaxed">
              {contest.prizes}
            </p>
          </div>
        )}
      </div>

      {/* Problems List — prominent cards */}
      <div className="bg-background/60 backdrop-blur-xl border border-border/40 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/30">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            竞赛题目
          </h2>
        </div>
        <div className="divide-y divide-border/60">
          {contest.problems.map((problem, index) => {
            const problemDifficultyConfig = DIFFICULTY_CONFIG[problem.difficulty]
            const passRate = getPassRate(problem.accepted_count, problem.submission_count)

            return (
              <Link
                key={problem.id}
                to={`/contests/${contestId}/problems/${problem.id}/solve`}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <span className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-xl text-sm font-extrabold tabular-nums border',
                    problemDifficultyConfig.bgColor,
                    problemDifficultyConfig.textColor,
                    problemDifficultyConfig.borderColor
                  )}>
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                      {problem.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-[13px] font-semibold border',
                        problemDifficultyConfig.bgColor,
                        problemDifficultyConfig.textColor,
                        problemDifficultyConfig.borderColor
                      )}>
                        {problemDifficultyConfig.label}
                      </span>
                      <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
                        {problem.points} 分
                      </span>
                      <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
                        通过率 {passRate}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 transition-transform group-hover:translate-x-[-4px]">
                  <p className="text-sm font-extrabold tabular-nums text-foreground">
                    {problem.accepted_count} <span className="text-muted-foreground font-normal">/ {problem.submission_count}</span>
                  </p>
                  <p className="text-[13px] text-muted-foreground uppercase tracking-wider font-semibold">
                    通过 / 提交
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Contest Statistics — oversized numbers */}
      <div className="bg-background/60 backdrop-blur-xl border border-border/40 rounded-xl p-5 shadow-sm">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-5">
          竞赛统计
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center rounded-xl bg-muted/20 border border-border/40 py-4 hover-lift transition-card-hover">
            <p className="text-2xl font-extrabold tabular-nums text-primary mb-1">
              {contest.participants_count}
            </p>
            <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
              参与人数
            </p>
          </div>
          <div className="text-center rounded-xl bg-muted/20 border border-border/40 py-4 hover-lift transition-card-hover">
            <p className="text-2xl font-extrabold tabular-nums text-status-accepted mb-1">
              {contest.problems_count}
            </p>
            <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
              题目总数
            </p>
          </div>
          <div className="text-center rounded-xl bg-muted/20 border border-border/40 py-4 hover-lift transition-card-hover">
            <p className="text-2xl font-extrabold tabular-nums text-difficulty-medium mb-1">
              {contest.problems.reduce((sum, p) => sum + p.points, 0)}
            </p>
            <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
              总分值
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
