import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersService } from '@/services/users'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import type { UserActivity } from '@/types/users'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function DashboardEnhanced() {
  const queryClient = useQueryClient()

  // 获取用户统计
  const { data: userStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => usersService.getUserStats(),
  })

  // 获取用户活动
  const { data: recentActivity } = useQuery({
    queryKey: ['userActivity'],
    queryFn: () => usersService.getUserActivity(10),
  })

  // 获取推荐题目
  const { data: recommendedProblems } = useQuery({
    queryKey: ['recommendedProblems'],
    queryFn: () => usersService.getRecommendedProblems(5),
  })

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (statsError || !userStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          加载失败
        </h3>
        <Button
          variant="primary"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['userStats'] })}
        >
          重试
        </Button>
      </div>
    )
  }

  const DIFFICULTY_COLORS = {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444',
  }

  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const submissionActivities = (recentActivity ?? []).filter(
    (activity) => activity.type === 'submission'
  )

  const weeklyActivity = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const dateKey = date.toISOString().slice(0, 10)

    const dailyActivities = submissionActivities.filter((activity) =>
      activity.created_at.startsWith(dateKey)
    )
    const acceptedCount = dailyActivities.filter(
      (activity) => activity.status === 'accepted'
    ).length

    return {
      day: weekNames[date.getDay()],
      提交: dailyActivities.length,
      通过: acceptedCount,
    }
  })

  // 难度分布数据
  const difficultyDistribution = [
    { name: '简单', value: userStats.easy_solved, color: DIFFICULTY_COLORS.easy },
    { name: '中等', value: userStats.medium_solved, color: DIFFICULTY_COLORS.medium },
    { name: '困难', value: userStats.hard_solved, color: DIFFICULTY_COLORS.hard },
  ]

  const getActivityIcon = (activity: UserActivity) => {
    switch (activity.type) {
      case 'submission':
        return activity.status === 'accepted' ? 'check_circle' : 'cancel'
      case 'contest_registration':
        return 'emoji_events'
      case 'achievement':
        return 'military_tech'
      default:
        return 'activity'
    }
  }

  const getActivityColor = (activity: UserActivity) => {
    switch (activity.type) {
      case 'submission':
        return activity.status === 'accepted' ? 'text-green-500' : 'text-red-500'
      case 'contest_registration':
        return 'text-yellow-500'
      case 'achievement':
        return 'text-purple-500'
      default:
        return 'text-slate-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            欢迎回来! 👋
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            继续保持学习热情，今天也要加油！
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/problems">
            <Button variant="primary">
              <span className="material-symbols-outlined mr-2">code</span>
              开始刷题
            </Button>
          </Link>
          <Link to="/contests">
            <Button variant="outline">
              <span className="material-symbols-outlined mr-2">emoji_events</span>
              查看竞赛
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Problems Solved */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-3xl text-green-500">
              check_circle
            </span>
            <span className="text-xs text-slate-500">已解决</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {userStats.unique_problems_solved}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            道题目
          </p>
        </div>

        {/* Submissions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-3xl text-blue-500">
              upload
            </span>
            <span className="text-xs text-slate-500">总提交</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {userStats.total_submissions}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            次提交
          </p>
        </div>

        {/* Accuracy */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-3xl text-purple-500">
              precision_manufacturing
            </span>
            <span className="text-xs text-slate-500">准确率</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {userStats.accuracy_rate}%
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            通过率
          </p>
        </div>

        {/* Streak */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-3xl text-orange-500">
              local_fire_department
            </span>
            <span className="text-xs text-slate-500">连续天数</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {userStats.current_streak}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            天 (最高 {userStats.longest_streak} 天)
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            本周学习活动
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="day" className="text-slate-600 dark:text-slate-400" />
              <YAxis className="text-slate-600 dark:text-slate-400" />
              <Tooltip />
              <Legend />
              <Bar dataKey="提交" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="通过" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            难度分布
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={difficultyDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {difficultyDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            {difficultyDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              最近活动
            </h3>
            <Link to="/submissions" className="text-sm text-primary hover:underline">
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className={cn('material-symbols-outlined text-xl', getActivityColor(activity))}>
                    {getActivityIcon(activity)}
                  </span>
                  <div className="flex-1 min-w-0">
                    {activity.type === 'submission' && (
                      <Link
                        to={`/problems/${activity.problem_id}`}
                        className="text-sm font-medium text-slate-900 dark:text-white hover:text-primary truncate block"
                      >
                        {activity.problem_title}
                      </Link>
                    )}
                    {activity.type === 'contest_registration' && (
                      <Link
                        to={`/contests/${activity.contest_id}`}
                        className="text-sm font-medium text-slate-900 dark:text-white hover:text-primary truncate block"
                      >
                        {activity.contest_name}
                      </Link>
                    )}
                    {activity.type === 'achievement' && (
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        解锁成就: {activity.achievement_name}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {new Date(activity.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                暂无最近活动
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Ranking & Points */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              排名与积分
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-500">
                    trophy
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">当前排名</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  #{userStats.ranking}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    stars
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">总积分</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {userStats.total_points}
                </span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          {userStats.achievements && userStats.achievements.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  最近成就
                </h3>
                <span className="text-xs text-slate-500">
                  {userStats.unlocked_achievements}/{userStats.total_achievements}
                </span>
              </div>
              <div className="space-y-2">
                {userStats.achievements.slice(0, 3).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20"
                  >
                    <span className="material-symbols-outlined text-2xl text-yellow-500">
                      {achievement.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {achievement.name}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Problems */}
      {recommendedProblems && recommendedProblems.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                推荐题目
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                根据您的学习进度智能推荐
              </p>
            </div>
            <Link to="/problems" className="text-sm text-primary hover:underline">
              浏览更多题目
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {recommendedProblems.map((problem) => {
              const difficultyColor = {
                easy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                hard: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
              }[problem.difficulty]

              const difficultyLabel = {
                easy: '简单',
                medium: '中等',
                hard: '困难',
              }[problem.difficulty]

              return (
                <Link
                  key={problem.id}
                  to={`/problems/${problem.id}`}
                  className="block border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-2">
                      {problem.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', difficultyColor)}>
                      {difficultyLabel}
                    </span>
                    <span className="text-xs text-slate-500">
                      {problem.points} 分
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>通过率 {problem.acceptance_rate}%</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-1">
                    {problem.reason}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
