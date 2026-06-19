import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import type { UserActivity } from '@/features/users/types/users'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Activity, Code2, Trophy, Flame, CheckCircle, XCircle, Upload, Cpu, Star, Award } from 'lucide-react'
import { DashboardSkeleton } from '@/features/dashboard/DashboardSkeleton'
import { EmptyState } from '@/shared/components/EmptyState'
import { InlineError } from '@/shared/components/InlineError'
import { Button } from '@/shared/components/Button'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { ActivityHeatmap } from '@/features/dashboard/components/ActivityHeatmap'

export function DashboardEnhanced() {
  const queryClient = useQueryClient()
  const {
    userStats,
    recentActivity,
    recommendedProblems,
    statsLoading,
    statsError,
    weeklyActivity,
    solvedThisWeek,
    totalWeeklySubmissions,
    weeks,
    monthLabels,
  } = useDashboardData()

  if (statsLoading) {
    return <DashboardSkeleton />
  }

  if (statsError || !userStats) {
    return (
      <InlineError
        title="仪表盘加载失败"
        message="无法加载仪表盘数据，请稍后重试"
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['userStats'] })}
      />
    )
  }

  const DIFFICULTY_COLORS = {
    easy: 'var(--difficulty-easy)',
    medium: 'var(--difficulty-medium)',
    hard: 'var(--difficulty-hard)',
  }

  const getActivityIcon = (activity: UserActivity) => {
    switch (activity.type) {
      case 'submission':
        return activity.status === 'accepted' ? CheckCircle : XCircle
      case 'contest_registration':
        return Trophy
      case 'achievement':
        return Award
      default:
        return Activity
    }
  }

  const getActivityColor = (activity: UserActivity) => {
    switch (activity.type) {
      case 'submission':
        return activity.status === 'accepted' ? 'text-status-accepted' : 'text-destructive'
      case 'contest_registration':
        return 'text-difficulty-medium'
      case 'achievement':
        return 'text-status-re'
      default:
        return 'text-muted-foreground'
    }
  }

  // 难度分布数据
  const difficultyDistribution = [
    { name: '简单', value: userStats.easy_solved, color: DIFFICULTY_COLORS.easy },
    { name: '中等', value: userStats.medium_solved, color: DIFFICULTY_COLORS.medium },
    { name: '困难', value: userStats.hard_solved, color: DIFFICULTY_COLORS.hard },
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section — Premium dark design with warm details */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-prominent glass-interactive hover-lift transition-all duration-300">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold uppercase tracking-widest text-primary">
                仪表盘概览
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground to-primary/80 bg-clip-text text-transparent">
                  欢迎回来，继续把这周的通过数往上推。
                </h1>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  过去 7 天共提交 {totalWeeklySubmissions} 次，成功通过 {solvedThisWeek} 次。当前连续活跃 {userStats.current_streak} 天，保持今天的节奏就能继续拉高排名。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-8">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">全球排名</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">#{userStats.ranking}</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">总积分</p>
                  <p className="mt-1 text-2xl font-bold text-primary">{userStats.total_points}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-52 items-end gap-2 self-stretch sm:w-52">
              {weeklyActivity.map((item) => {
                const height = Math.max(20, item['提交'] * 14)

                return (
                  <div key={item.day} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div
                      className="w-full rounded-sm bg-primary/15 transition-all duration-200 hover:bg-primary/35 hover:scale-x-105"
                      style={{ height }}
                    />
                    <span className="text-[13px] font-medium text-muted-foreground">{item.day}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-prominent glass-interactive hover-lift transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">当前连续</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{userStats.current_streak} <span className="text-base font-semibold text-muted-foreground">天</span></p>
              <p className="mt-2 text-sm text-muted-foreground">最高纪录 {userStats.longest_streak} 天，今天再完成 1 道题就能继续保持。</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse">
              <Flame className="w-6 h-6 fill-primary/30" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 text-center text-[13px] text-muted-foreground">
            {weeklyActivity.map((item, index) => (
              <div key={item.day} className="space-y-2">
                <div>{item.day}</div>
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border text-[13px] font-semibold transition-all duration-200',
                  index === 6
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:scale-110'
                    : item['提交'] > 0
                      ? 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/20'
                      : 'border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/60'
                )}>
                  {item['提交'] > 0 ? item['提交'] : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark CTA buttons */}
      <div className="flex flex-wrap gap-3">
        <Link to="/problems">
          <Button variant="default" className="bg-primary text-primary-foreground font-semibold button-press hover-lift">
            <Code2 className="w-5 h-5 mr-2" />
            开始刷题
          </Button>
        </Link>
        <Link to="/contests">
          <Button variant="outline" className="border-border/40 text-foreground font-semibold hover:bg-muted/40 button-press hover-lift">
            <Trophy className="w-5 h-5 mr-2 text-primary" />
            查看竞赛
          </Button>
        </Link>
      </div>

      {/* ─── 年度提交热力图面板 ─── */}
      <ActivityHeatmap
        weeks={weeks}
        monthLabels={monthLabels}
        totalSubmissions={userStats.total_submissions}
        solvedThisWeek={solvedThisWeek}
      />

      {/* PostHog-style large metric cards */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-card glass-interactive hover-lift transition-all duration-300">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-widest text-primary">本周重点</p>
              <h2 className="mt-2 text-base font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">本周推进面板</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                活跃天数、推荐题和最近提交放在同一层级，减少来回跳页。
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold uppercase tracking-widest text-primary">
              实时数据
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-muted/20 p-4 border border-border-subtle hover:bg-muted/40 transition-colors duration-200">
              <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">本周通过</p>
              <p className="mt-3 text-2xl font-bold text-foreground">{solvedThisWeek}</p>
              <p className="mt-2 text-[13px] text-muted-foreground">来自最近 7 天的通过记录。</p>
            </div>
            <div className="rounded-xl bg-muted/20 p-4 border border-border-subtle hover:bg-muted/40 transition-colors duration-200">
              <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">推荐队列</p>
              <p className="mt-3 text-2xl font-bold text-foreground">{recommendedProblems?.length ?? 0}</p>
              <p className="mt-2 text-[13px] text-muted-foreground">当前实时推荐题目数量。</p>
            </div>
            <div className="rounded-xl bg-muted/20 p-4 border border-border-subtle hover:bg-muted/40 transition-colors duration-200">
              <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">最近活动</p>
              <p className="mt-3 text-2xl font-bold text-foreground">{recentActivity?.length ?? 0}</p>
              <p className="mt-2 text-[13px] text-muted-foreground">最新活动流条目数。</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-card glass-interactive hover-lift transition-all duration-300">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-primary">进度快照</p>
          <h2 className="mt-2 text-base font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">刷题进度快照</h2>
          <div className="mt-5 space-y-4">
            {[
              { label: '简单', value: userStats.easy_solved, color: 'bg-difficulty-easy shadow-[0_0_8px_rgba(16,185,129,0.3)]' },
              { label: '中等', value: userStats.medium_solved, color: 'bg-difficulty-medium shadow-[0_0_8px_rgba(245,158,11,0.3)]' },
              { label: '困难', value: userStats.hard_solved, color: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]' },
            ].map((item) => {
              const totalSolved = Math.max(1, userStats.unique_problems_solved)
              const width = Math.max(8, Math.round((item.value / totalSolved) * 100))

              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{item.label}</span>
                    <span className="text-muted-foreground font-semibold">{item.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div className={cn('h-2 rounded-full transition-all duration-500', item.color)} style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* PostHog oversized metric cards — Re-styled with Linear Premium Glass */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-card glass-interactive hover-lift transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-accepted/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <CheckCircle className="w-5 h-5 text-status-accepted" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">已解决</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-status-accepted/80 bg-clip-text text-transparent">
            {userStats.unique_problems_solved}
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-muted-foreground uppercase tracking-widest">
            道题目
          </p>
        </div>

        <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-card glass-interactive hover-lift transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shadow-[0_0_12px_rgba(159,79,36,0.2)]">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">总提交</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
            {userStats.total_submissions}
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-muted-foreground uppercase tracking-widest">
            次提交
          </p>
        </div>

        <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-card glass-interactive hover-lift transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-re/10 shadow-[0_0_12px_rgba(167,139,250,0.2)]">
              <Cpu className="w-5 h-5 text-status-re" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">准确率</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-status-re/80 bg-clip-text text-transparent">
            {userStats.accuracy_rate}%
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-muted-foreground uppercase tracking-widest">
            通过率
          </p>
        </div>

        <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-card glass-interactive hover-lift transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">连续天数</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-amber-500 bg-clip-text text-transparent">
            {userStats.current_streak}
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-muted-foreground uppercase tracking-widest">
            天 (最高 {userStats.longest_streak} 天)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-whisper">
          <h3 className="text-base font-bold tracking-tight text-foreground mb-4">
            本周学习活动
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" className="text-muted-foreground" />
              <YAxis className="text-muted-foreground" />
              <Tooltip />
              <Legend />
              <Bar dataKey="提交" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="通过" fill="var(--status-accepted)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-whisper">
          <h3 className="text-base font-bold tracking-tight text-foreground mb-4">
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
                <span className="text-sm text-muted-foreground">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-whisper">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold tracking-tight text-foreground">
              最近活动
            </h3>
            <Link to="/submissions" className="text-sm text-primary hover:underline">
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((activity) => {
                const IconComponent = getActivityIcon(activity)
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg border-b border-border-subtle last:border-b-0 hover:bg-background-alt transition-colors duration-150"
                  >
                    <IconComponent className={cn('w-5 h-5', getActivityColor(activity))} />
                    <div className="flex-1 min-w-0">
                      {activity.type === 'submission' && (
                        <Link
                          to={`/problems/${activity.problem_id}`}
                          className="text-sm font-medium text-foreground hover:text-primary truncate block"
                        >
                          {activity.problem_title}
                        </Link>
                      )}
                      {activity.type === 'contest_registration' && (
                        <Link
                          to={`/contests/${activity.contest_id}`}
                          className="text-sm font-medium text-foreground hover:text-primary truncate block"
                        >
                          {activity.contest_name}
                        </Link>
                      )}
                      {activity.type === 'achievement' && (
                        <p className="text-sm font-medium text-foreground truncate">
                          解锁成就: {activity.achievement_name}
                        </p>
                      )}
                      <p className="text-[13px] text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <EmptyState icon={Activity} title="暂无最近活动" description="开始做题后这里会显示你的活动记录" />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-whisper">
            <h3 className="text-base font-bold tracking-tight text-foreground mb-4">
              排名与积分
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-difficulty-medium" />
                  <span className="text-sm text-muted-foreground">当前排名</span>
                </div>
                <span className="text-2xl font-bold text-foreground">
                  #{userStats.ranking}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">总积分</span>
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {userStats.total_points}
                </span>
              </div>
            </div>
          </div>

          {userStats.achievements && userStats.achievements.length > 0 && (
            <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-whisper">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  最近成就
                </h3>
                <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {userStats.unlocked_achievements}/{userStats.total_achievements}
                </span>
              </div>
              <div className="space-y-2">
                {userStats.achievements.slice(0, 3).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20"
                  >
                    <Award className="w-6 h-6 text-difficulty-medium" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {achievement.name}
                      </p>
                      <p className="text-[13px] text-muted-foreground truncate">
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

      {recommendedProblems && recommendedProblems.length > 0 && (
        <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-border/40 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                推荐题目
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
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
                easy: 'bg-difficulty-easy/10 text-difficulty-easy',
                medium: 'bg-difficulty-medium/10 text-difficulty-medium',
                hard: 'bg-difficulty-hard/10 text-difficulty-hard',
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
                  className="block border border-border/40 rounded-lg p-4 hover:-translate-y-0.5 hover:shadow-elevated transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground text-sm line-clamp-2">
                      {problem.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('px-2 py-0.5 rounded-full text-[13px] font-medium', difficultyColor)}>
                      {difficultyLabel}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {problem.points} 分
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                    <span>通过率 {problem.acceptance_rate}%</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-2 line-clamp-1">
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
