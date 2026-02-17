import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contestsService } from '@/services/contests'
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
  },
  medium: {
    label: '中等',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  hard: {
    label: '困难',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          加载失败
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          无法加载竞赛列表，请稍后重试
        </p>
        <Button variant="primary" onClick={() => refetch()}>
          重试
        </Button>
      </div>
    )
  }

  if (!data || data.contests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
          emoji_events
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          暂无竞赛
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          当前没有符合条件的竞赛
        </p>
      </div>
    )
  }

  const renderContestCard = (contest: Contest) => {
    const statusConfig = STATUS_CONFIG[contest.status]
    const difficultyConfig = DIFFICULTY_CONFIG[contest.difficulty]
    const countdown = contest.status === 'upcoming' ? getCountdown(contest.start_time) : null
    const remaining = contest.status === 'ongoing' ? getRemainingTime(contest.end_time) : null

    return (
      <Link
        key={contest.id}
        to={`/contests/${contest.id}`}
        className="block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {contest.name}
                </h3>
                <span className={cn(
                  'px-2 py-1 rounded-lg text-xs font-medium',
                  difficultyConfig.bgColor,
                  difficultyConfig.textColor
                )}>
                  {difficultyConfig.label}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {contest.description}
              </p>
            </div>
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border',
              statusConfig.bgColor,
              statusConfig.textColor,
              statusConfig.borderColor
            )}>
              <span className="material-symbols-outlined text-sm">
                {statusConfig.icon}
              </span>
              {statusConfig.label}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-slate-400">
                schedule
              </span>
              <div>
                <p className="text-slate-600 dark:text-slate-400">时长</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {formatDuration(contest.duration_minutes)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-slate-400">
                code
              </span>
              <div>
                <p className="text-slate-600 dark:text-slate-400">题目</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {contest.problems_count} 题
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-slate-400">
                people
              </span>
              <div>
                <p className="text-slate-600 dark:text-slate-400">参与</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {contest.participants_count} 人
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-slate-400">
                event
              </span>
              <div>
                <p className="text-slate-600 dark:text-slate-400">开始时间</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {new Date(contest.start_time).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          </div>

          {/* Countdown or Time */}
          {(countdown || remaining) && (
            <div className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              contest.status === 'upcoming'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            )}>
              {countdown && `距开始还有 ${countdown}`}
              {remaining && remaining}
            </div>
          )}

          {/* Action Button */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {new Date(contest.start_time).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <Button
              variant={contest.status === 'ongoing' ? 'primary' : 'outline'}
              size="sm"
            >
              {contest.status === 'ongoing' && (
                <>
                  <span className="material-symbols-outlined mr-2">play_arrow</span>
                  立即加入
                </>
              )}
              {contest.status === 'upcoming' && (
                <>
                  <span className="material-symbols-outlined mr-2">how_to_reg</span>
                  立即注册
                </>
              )}
              {contest.status === 'completed' && (
                <>
                  <span className="material-symbols-outlined mr-2">leaderboard</span>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            竞赛
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            参加编程竞赛，提升编程技能
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="搜索竞赛..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              状态:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  statusFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                全部
              </button>
              <button
                onClick={() => setStatusFilter('ongoing')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  statusFilter === 'ongoing'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                进行中
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  statusFilter === 'upcoming'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                即将开始
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  statusFilter === 'completed'
                    ? 'bg-slate-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                已结束
              </button>
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="difficulty-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              难度:
            </label>
            <select
              id="difficulty-filter"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">全部难度</option>
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
          {/* Ongoing Contests */}
          {groupedContests.ongoing.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">play_circle</span>
                进行中 ({groupedContests.ongoing.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {groupedContests.ongoing.map(renderContestCard)}
              </div>
            </div>
          )}

          {/* Upcoming Contests */}
          {groupedContests.upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">upcoming</span>
                即将开始 ({groupedContests.upcoming.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {groupedContests.upcoming.map(renderContestCard)}
              </div>
            </div>
          )}

          {/* Completed Contests */}
          {groupedContests.completed.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500">check_circle</span>
                已结束 ({groupedContests.completed.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {groupedContests.completed.map(renderContestCard)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data.contests.map(renderContestCard)}
        </div>
      )}
    </div>
  )
}