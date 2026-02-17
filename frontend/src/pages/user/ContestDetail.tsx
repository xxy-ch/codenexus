import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { contestsService } from '@/services/contests'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

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
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: 'upcoming',
  },
  ongoing: {
    label: '进行中',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-300 dark:border-green-700',
    icon: 'play_circle',
  },
  completed: {
    label: '已结束',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-700',
    icon: 'check_circle',
  },
}

const DIFFICULTY_CONFIG = {
  easy: {
    label: '简单',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-300 dark:border-green-700',
  },
  medium: {
    label: '中等',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
  },
  hard: {
    label: '困难',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
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
    refetchInterval: (data) => {
      // 如果进行中，每分钟更新一次
      if (data?.status === 'ongoing') {
        return 60000
      }
      // 如果即将开始，每秒更新倒计时
      if (data?.status === 'upcoming') {
        return 1000
      }
      return false
    },
  })

  // 注册竞赛
  const registerMutation = useMutation({
    mutationFn: () => contestsService.registerContest(contestId!),
    onSuccess: () => {
      queryClient.invalidateQueries(['contest', contestId])
    },
  })

  // 进入竞赛
  const enterMutation = useMutation({
    mutationFn: () => contestsService.enterContest(contestId!),
    onSuccess: () => {
      // 进入竞赛页面或跳转到第一个题目
      if (contest?.problems && contest.problems.length > 0) {
        navigate(`/problems/${contest.problems[0].id}/solve`)
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
          setCountdown(`剩余 ${hours}小时 ${minutes}分钟 ${seconds}秒`)
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (error || !contest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          竞赛不存在
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          请检查竞赛ID或返回竞赛列表
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined">arrow_back</span>
            返回
          </Button>
          <Button variant="primary" onClick={() => refetch()}>
            重试
          </Button>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[contest.status]
  const difficultyConfig = DIFFICULTY_CONFIG[contest.difficulty]

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {contest.name}
            </h1>
            <span className={cn(
              'px-2 py-1 rounded-lg text-xs font-medium border',
              difficultyConfig.bgColor,
              difficultyConfig.textColor,
              difficultyConfig.borderColor
            )}>
              {difficultyConfig.label}
            </span>
            <span className={cn(
              'px-2 py-1 rounded-lg text-xs font-medium border',
              statusConfig.bgColor,
              statusConfig.textColor,
              statusConfig.borderColor
            )}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            竞赛 ID: {contest.id} • {contest.participants_count} 人参与
          </p>
        </div>
      </div>

      {/* Contest Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Time */}
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl text-slate-400">
              schedule
            </span>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                开始时间
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {new Date(contest.start_time).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl text-slate-400">
              timer
            </span>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                竞赛时长
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {formatDuration(contest.duration_minutes)}
              </p>
            </div>
          </div>

          {/* Problems */}
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl text-slate-400">
              code
            </span>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                题目数量
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {contest.problems_count} 题
              </p>
            </div>
          </div>

          {/* Difficulty */}
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl text-slate-400">
              bar_chart
            </span>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                难度等级
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {difficultyConfig.label}
              </p>
            </div>
          </div>
        </div>

        {/* Countdown or Timer */}
        {countdown && contest.status !== 'completed' && (
          <div className={cn(
            'mt-6 px-6 py-4 rounded-lg text-center',
            contest.status === 'upcoming'
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-green-100 dark:bg-green-900/30'
          )}>
            <p className="text-sm font-medium mb-2">
              {contest.status === 'upcoming' ? '距离竞赛开始还有' : '竞赛剩余时间'}
            </p>
            <p className="text-2xl font-bold">
              {countdown}
            </p>
          </div>
        )}

        {/* Description */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            竞赛介绍
          </h3>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {contest.description}
          </p>
        </div>

        {/* Rules */}
        {contest.rules && (
          <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              竞赛规则
            </h3>
            <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
              {contest.rules}
            </pre>
          </div>
        )}

        {/* Prizes */}
        {contest.prizes && (
          <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              🏆 奖励
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {contest.prizes}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {contest.status === 'upcoming' && !contest.is_registered && (
            <Button
              variant="primary"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  注册中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2">how_to_reg</span>
                  立即注册
                </>
              )}
            </Button>
          )}

          {contest.status === 'upcoming' && contest.is_registered && (
            <Button variant="outline" disabled>
              <span className="material-symbols-outlined mr-2">check_circle</span>
              已注册
            </Button>
          )}

          {contest.status === 'ongoing' && contest.is_registered && (
            <Button
              variant="primary"
              onClick={() => enterMutation.mutate()}
              disabled={enterMutation.isPending}
            >
              {enterMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  进入中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2">play_arrow</span>
                  进入竞赛
                </>
              )}
            </Button>
          )}

          {contest.status === 'completed' && (
            <Button variant="outline">
              <span className="material-symbols-outlined mr-2">leaderboard</span>
              查看排名
            </Button>
          )}
        </div>

        <Button variant="ghost" size="sm">
          <span className="material-symbols-outlined mr-2">share</span>
          分享
        </Button>
      </div>

      {/* Problems List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          竞赛题目
        </h2>
        <div className="space-y-3">
          {contest.problems.map((problem, index) => {
            const problemDifficultyConfig = DIFFICULTY_CONFIG[problem.difficulty]
            const passRate = getPassRate(problem.accepted_count, problem.submission_count)

            return (
              <Link
                key={problem.id}
                to={`/problems/${problem.id}`}
                className="block border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                      problemDifficultyConfig.bgColor,
                      problemDifficultyConfig.textColor
                    )}>
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {problem.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium border',
                          problemDifficultyConfig.bgColor,
                          problemDifficultyConfig.textColor,
                          problemDifficultyConfig.borderColor
                        )}>
                          {problemDifficultyConfig.label}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {problem.points} 分
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          通过率 {passRate}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {problem.accepted_count} / {problem.submission_count}
                    </p>
                    <p className="text-xs text-slate-500">
                      通过 / 提交
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Contest Statistics */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          竞赛统计
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary mb-2">
              {contest.participants_count}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              参与人数
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-500 mb-2">
              {contest.problems_count}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              题目总数
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-500 mb-2">
              {contest.problems.reduce((sum, p) => sum + p.points, 0)}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              总分值
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}