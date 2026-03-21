import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { problemsService } from '@/services/problems'
import { usersService } from '@/services/users'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { SectionBlock } from '@/components/page/SectionBlock'
import { EmptyState } from '@/components/page/EmptyState'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import type { RecommendedProblem, UserActivity } from '@/types/users'

const DIFFICULTY_STYLES = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
} as const

const DIFFICULTY_BARS = {
  easy: 'bg-emerald-500',
  medium: 'bg-amber-500',
  hard: 'bg-rose-500',
} as const

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getActivityMeta(activity: UserActivity) {
  switch (activity.type) {
    case 'submission':
      return {
        label: activity.status === 'accepted' ? '提交 · Accepted' : '提交 · 未通过',
        icon: activity.status === 'accepted' ? 'check_circle' : 'cancel',
        tone:
          activity.status === 'accepted'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-rose-100 text-rose-700',
      }
    case 'contest_registration':
      return {
        label: '竞赛报名',
        icon: 'emoji_events',
        tone: 'bg-blue-100 text-blue-700',
      }
    case 'achievement':
      return {
        label: '成就解锁',
        icon: 'military_tech',
        tone: 'bg-amber-100 text-amber-700',
      }
    default:
      return {
        label: '动态',
        icon: 'radio_button_checked',
        tone: 'bg-slate-100 text-slate-700',
      }
  }
}

export function DashboardEnhanced() {
  const {
    data: userStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => usersService.getUserStats(),
  })

  const {
    data: recentActivity = [],
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ['userActivity'],
    queryFn: async () => {
      const activity = await usersService.getUserActivity(10)
      return activity ?? []
    },
  })

  const {
    data: recommendedProblems = [],
    refetch: refetchRecommendedProblems,
  } = useQuery({
    queryKey: ['recommendedProblems'],
    queryFn: async () => {
      const problems = await usersService.getRecommendedProblems(5)
      return problems ?? []
    },
  })

  const {
    data: dailyChallenge,
    refetch: refetchDailyChallenge,
  } = useQuery({
    queryKey: ['dashboardDailyChallenge'],
    queryFn: async () => {
      const response = await problemsService.getProblems({
        page: 1,
        limit: 1,
        sort: 'recent',
      })
      return response.problems[0] ?? null
    },
  })

  const weeklyActivity = useMemo(() => {
    const submissions = recentActivity.filter((activity) => activity.type === 'submission')

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      const dateKey = date.toISOString().slice(0, 10)
      const dayActivities = submissions.filter((activity) => activity.created_at.startsWith(dateKey))
      const acceptedCount = dayActivities.filter((activity) => activity.status === 'accepted').length

      return {
        day: WEEKDAY_LABELS[date.getDay()],
        submissions: dayActivities.length,
        accepted: acceptedCount,
      }
    })
  }, [recentActivity])

  const totalWeeklySubmissions = weeklyActivity.reduce((sum, item) => sum + item.submissions, 0)
  const totalWeeklyAccepted = weeklyActivity.reduce((sum, item) => sum + item.accepted, 0)
  const weeklyPeak = Math.max(1, ...weeklyActivity.map((item) => item.submissions))

  const difficultyRows = userStats
    ? [
        { label: '简单', value: userStats.easy_solved, difficulty: 'easy' as const },
        { label: '中等', value: userStats.medium_solved, difficulty: 'medium' as const },
        { label: '困难', value: userStats.hard_solved, difficulty: 'hard' as const },
      ]
    : []

  const achievements = userStats?.achievements ?? []

  const handleRefresh = async () => {
    await Promise.all([
      refetchStats(),
      refetchActivity(),
      refetchRecommendedProblems(),
      refetchDailyChallenge(),
    ])
  }

  if (statsLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (statsError || !userStats) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <EmptyState
          title="加载失败"
          description="无法加载学习总览，请稍后重试。"
          action={
            <Button variant="primary" onClick={() => refetchStats()}>
              重试
            </Button>
          }
          className="w-full max-w-xl"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="学习主页"
        title="学习总览"
        description={`过去 7 天共提交 ${totalWeeklySubmissions} 次，成功通过 ${totalWeeklyAccepted} 次。当前连续学习 ${userStats.current_streak} 天，继续保持就能稳步抬高排名。`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                void handleRefresh()
              }}
              aria-label="刷新面板"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              刷新
            </Button>
            <Button as={Link} to="/problems" variant="primary">
              <span className="material-symbols-outlined text-base">code</span>
              开始刷题
            </Button>
            <Button as={Link} to="/contests" variant="outline">
              <span className="material-symbols-outlined text-base">emoji_events</span>
              查看竞赛
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="已解决" value={`${userStats.unique_problems_solved} 道题`} helper="当前累计通过题目数" />
        <StatCard label="总提交" value={`${userStats.total_submissions} 次提交`} helper={`${userStats.accepted_submissions} 次通过`} />
        <StatCard label="准确率" value={`${userStats.accuracy_rate}%`} helper="基于当前提交历史计算" />
        <StatCard label="连续学习" value={`${userStats.current_streak} 天`} helper={`最高 ${userStats.longest_streak} 天`} />
        <StatCard label="当前排名" value={`#${userStats.ranking}`} helper="全站实时位置" />
        <StatCard label="总积分" value={`${userStats.total_points} 分`} helper="完成题目与竞赛累积" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <SurfaceCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">学习节奏</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                最近 7 天的提交与通过节奏。这里保留概览视角，不把列表页做成营销首页。
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              最近 7 天
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-7">
            {weeklyActivity.map((item) => {
              const height = Math.max(18, Math.round((item.submissions / weeklyPeak) * 112))

              return (
                <div key={item.day} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex h-32 items-end">
                    <div className="w-full rounded-xl bg-slate-200 p-1">
                      <div className="rounded-lg bg-slate-950/85" style={{ height }} />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{item.day}</p>
                    <p className="text-xs text-slate-500">提交 {item.submissions}</p>
                    <p className="text-xs text-slate-500">通过 {item.accepted}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </SurfaceCard>

        <SurfaceCard tone="muted">
          <h2 className="text-xl font-semibold text-slate-950">难度分布</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">当前已解决题目按难度拆分，保留真实进度口径。</p>
          <div className="mt-6 space-y-4">
            {difficultyRows.map((item) => {
              const totalSolved = Math.max(1, userStats.unique_problems_solved)
              const width = Math.max(10, Math.round((item.value / totalSolved) * 100))

              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{`${item.value} ${item.label}`}</span>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', DIFFICULTY_STYLES[item.difficulty])}>
                      {item.label}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-white">
                    <div className={cn('h-2.5 rounded-full', DIFFICULTY_BARS[item.difficulty])} style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {(userStats.unlocked_achievements || userStats.total_achievements) && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-sm font-medium text-slate-900">成就进度</p>
              <p className="mt-1 text-sm text-slate-600">
                {userStats.unlocked_achievements ?? 0}/{userStats.total_achievements ?? 0} achievements
              </p>
            </div>
          )}
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionBlock
          title="今日建议"
          description="从真实题库抓取 1 道建议题，方便直接回到练习流。"
        >
          {dailyChallenge ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', DIFFICULTY_STYLES[dailyChallenge.difficulty])}>
                  {dailyChallenge.difficulty}
                </span>
                {dailyChallenge.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
              <Link to={`/problems/${dailyChallenge.id}`} className="mt-4 block text-xl font-semibold text-slate-950 hover:text-primary">
                {dailyChallenge.title}
              </Link>
              <p className="mt-2 text-sm text-slate-600">{dailyChallenge.description}</p>
            </div>
          ) : (
            <EmptyState title="暂无建议题目" description="当前没有可展示的推荐题，请稍后再看。" className="border-slate-200 bg-slate-50 py-8" />
          )}
        </SectionBlock>

        <SectionBlock
          title="推荐题目"
          description="保留实时推荐结果，用列表视图收拢信息密度。"
        >
          {recommendedProblems.length > 0 ? (
            <div className="space-y-3">
              {recommendedProblems.map((problem: RecommendedProblem) => (
                <Link
                  key={problem.id}
                  to={`/problems/${problem.id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{problem.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{problem.reason}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>{problem.points} pts</p>
                      <p>{problem.acceptance_rate}% 通过率</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', DIFFICULTY_STYLES[problem.difficulty])}>
                      {problem.difficulty}
                    </span>
                    {problem.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="暂无推荐题目" description="当前推荐队列为空，继续提交后会自动更新。" className="border-slate-200 bg-slate-50 py-8" />
          )}
        </SectionBlock>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SectionBlock
          title="最近活动"
          description="保留题目、竞赛和成就三类动态，方便从概览页回到对应页面。"
        >
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity) => {
                const meta = getActivityMeta(activity)

                return (
                  <div key={activity.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm', meta.tone)}>
                          <span className="material-symbols-outlined text-base">{meta.icon}</span>
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{meta.label}</p>
                          {activity.type === 'submission' && activity.problem_id ? (
                            <Link to={`/problems/${activity.problem_id}`} className="mt-1 block text-sm text-slate-950 hover:text-primary">
                              {activity.problem_title}
                            </Link>
                          ) : null}
                          {activity.type === 'contest_registration' && activity.contest_id ? (
                            <Link to={`/contests/${activity.contest_id}`} className="mt-1 block text-sm text-slate-950 hover:text-primary">
                              {activity.contest_name}
                            </Link>
                          ) : null}
                          {activity.type === 'achievement' ? (
                            <p className="mt-1 text-sm text-slate-950">{activity.achievement_name}</p>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{formatActivityTime(activity.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="暂无最近活动" description="提交代码、报名竞赛或解锁成就后会出现在这里。" className="border-slate-200 bg-slate-50 py-8" />
          )}
        </SectionBlock>

        <SurfaceCard tone="muted">
          <h2 className="text-xl font-semibold text-slate-950">近期成就</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">成就和进度提示被压回右侧摘要，不干扰列表主体。</p>
          {achievements.length > 0 ? (
            <div className="mt-5 space-y-3">
              {achievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <span className="material-symbols-outlined text-base">{achievement.icon}</span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{achievement.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
              暂无最近成就，继续刷题后会自动展示。
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  )
}
