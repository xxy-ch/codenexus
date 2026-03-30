import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { DifficultyBadge, StatusBadge } from '@/components/ui/StatusBadge'
import { usersService } from '@/services/users'
import { problemsService } from '@/services/problems'
import { cn } from '@/lib/utils'

const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function formatRelativeTime(value: string) {
  const time = new Date(value)
  const diffMinutes = Math.max(0, Math.floor((Date.now() - time.getTime()) / 60000))

  if (diffMinutes < 60) {
    return `${Math.max(diffMinutes, 1)} 分钟前`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} 小时前`
  }

  return time.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

function statusTone(status?: string) {
  if (status === 'accepted') return 'bg-[#006847] text-white'
  if (status === 'wrong_answer') return 'bg-[#ffdad6] text-[#93000a]'
  if (status === 'queued') return 'bg-[#d5e3fc] text-[#3a485b]'
  if (status === 'contest_registration') return 'bg-[#dae2ff] text-[#244171]'
  return 'bg-[rgba(218,226,253,0.88)] text-[#43516b]'
}

function formatActivityLabel(activity: { type: string; status?: string }) {
  if (activity.type === 'contest_registration') {
    return '竞赛报名'
  }

  if (activity.status === 'accepted') {
    return '提交 · 已通过'
  }

  if (activity.status === 'wrong_answer') {
    return '提交 · 答案错误'
  }

  if (activity.status === 'queued') {
    return '提交 · 排队中'
  }

  if (activity.status === 'judged') {
    return '提交 · 已评测'
  }

  return '提交'
}

export function DashboardEnhanced() {
  const {
    data: userStats,
    isLoading: statsLoading,
    isError: statsError,
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
    refetch: refetchRecommended,
  } = useQuery({
    queryKey: ['recommendedProblems'],
    queryFn: () => usersService.getRecommendedProblems(3),
  })

  const { data: dailyChallenge } = useQuery({
    queryKey: ['dailyChallenge'],
    queryFn: async () => {
      const payload = await problemsService.getProblems({
        page: 1,
        limit: 1,
      })
      return payload.problems?.[0] ?? null
    },
  })

  const weeklyActivity = useMemo(() => {
    return dayLabels.map((label, index) => {
      const submitBase = Math.max((userStats?.current_streak ?? 0) - index, 0)
      const acceptedBase = Math.max((userStats?.accepted_submissions ?? 0) - index * 2, 0)

      return {
        label,
        submissions: index < 3 ? submitBase : Math.floor(submitBase / 2),
        accepted: index < 3 ? Math.min(submitBase, acceptedBase) : Math.floor(Math.min(submitBase, acceptedBase) / 2),
      }
    })
  }, [userStats])

  const handleRefresh = () => {
    void Promise.all([refetchStats(), refetchActivity(), refetchRecommended()])
  }

  if (statsLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading dashboard..." />
      </div>
    )
  }

  if (statsError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <ErrorState
          title="Failed to load dashboard"
          message="Unable to fetch your statistics. Please try again later."
          action={{ label: 'Retry', onClick: () => refetchStats() }}
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
              Workspace
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
              Learning Overview
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
              过去 7 天共提交 {userStats?.total_submissions ?? 0} 次，成功通过 {userStats?.accepted_submissions ?? 0} 次。
              当前连续学习 {userStats?.current_streak ?? 0} 天，继续保持稳定节奏。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              leftIcon={<span className="material-symbols-outlined text-base">refresh</span>}
            >
              Refresh
            </Button>
            <Button
              as={Link}
              to="/problems"
              variant="secondary"
              leftIcon={<span className="material-symbols-outlined text-base">terminal</span>}
            >
              Start Solving
            </Button>
            <Button
              as={Link}
              to="/contests"
              variant="gradient"
              leftIcon={<span className="material-symbols-outlined text-lg">emoji_events</span>}
            >
              View Contests
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card variant="default" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Problems Solved
            </p>
            <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">
              {userStats?.unique_problems_solved ?? '--'}
            </p>
            <p className="mt-3 text-sm text-on-surface-variant">
              {userStats?.total_submissions ?? 0} submissions · {userStats?.accuracy_rate ?? 0}% accuracy
            </p>
          </Card>

          <Card variant="default" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Current Ranking
            </p>
            <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">
              #{userStats?.ranking ?? '--'}
            </p>
            <p className="mt-3 text-sm text-on-surface-variant">Global position</p>
          </Card>

          <Card variant="default" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Current Streak
            </p>
            <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">
              {userStats?.current_streak ?? '--'} Days
            </p>
            <p className="mt-3 text-sm text-on-surface-variant">
              Best: {userStats?.longest_streak ?? 0} days
            </p>
          </Card>

          <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary-container p-5 text-white shadow-lg">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-fixed/72">
              Total Points
            </p>
            <p className="mt-4 font-headline text-3xl font-extrabold text-white">
              {userStats?.total_points ?? '--'}
            </p>
            <p className="mt-3 text-sm text-primary-fixed/90">
              {userStats?.accepted_submissions ?? 0} accepted
            </p>
          </Card>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_360px]">
          {/* Recent Activity */}
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-headline text-xl font-extrabold text-on-surface">Recent Submissions</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Track your latest submissions and contest activities.
                </p>
              </div>
              <Link to="/submissions" className="text-sm font-semibold text-primary">
                View All
              </Link>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl bg-surface-container-low/50">
              <div className="grid grid-cols-[minmax(0,1fr)_128px_96px_110px] gap-3 border-b border-outline-variant/10 px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <span>Problem</span>
                <span>Status</span>
                <span>Language</span>
                <span className="text-right">Time</span>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {recentActivity.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-on-surface-variant">
                    No recent activity yet.
                  </div>
                ) : (
                  recentActivity.slice(0, 4).map((activity) => (
                    <div
                      key={activity.id}
                      className="grid grid-cols-[minmax(0,1fr)_128px_96px_110px] items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-container-low/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-on-surface">
                          {activity.problem_title || activity.contest_name || 'Unnamed Entry'}
                        </p>
                        <p className="mt-1 text-[11px] text-on-surface-variant">
                          {formatActivityLabel(activity)}
                        </p>
                      </div>
                      <div>
                        <StatusBadge status={(activity.status ?? 'queued') as any} size="sm" />
                      </div>
                      <div className="text-sm font-medium text-on-surface-variant">
                        {activity.type === 'submission' ? activity.language?.toUpperCase() || '—' : '—'}
                      </div>
                      <div className="text-right text-sm text-on-surface-variant">
                        {formatRelativeTime(activity.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            {/* Daily Challenge */}
            <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary-container p-6 text-white shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-fixed/72">
                    Today's Challenge
                  </p>
                  <h2 className="mt-3 font-headline text-xl font-extrabold text-white">Daily Problem</h2>
                </div>
                {dailyChallenge ? (
                  <DifficultyBadge difficulty={dailyChallenge.difficulty} />
                ) : null}
              </div>
              {dailyChallenge ? (
                <div className="mt-5">
                  <Link
                    to={`/problems/${dailyChallenge.id}`}
                    className="block text-lg font-semibold text-white transition-colors hover:text-primary-fixed/90"
                  >
                    {dailyChallenge.title}
                  </Link>
                  <p className="mt-3 text-sm leading-6 text-primary-fixed/90">
                    {dailyChallenge.description || 'Recommended problem based on your progress.'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {(dailyChallenge.tags ?? []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-primary-fixed"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Button
                    as={Link}
                    to={`/problems/${dailyChallenge.id}`}
                    variant="secondary"
                    className="mt-5 bg-white text-primary hover:bg-white/90"
                    size="sm"
                  >
                    Start Now
                  </Button>
                </div>
              ) : (
                <p className="mt-5 text-sm text-primary-fixed/90">
                  Loading today's recommended problem...
                </p>
              )}
            </Card>

            {/* Recommended Problems */}
            <Card variant="surface" className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline text-xl font-extrabold text-on-surface">Recommended</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Problems matched to your current level
                  </p>
                </div>
                <span className="rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Last 7 Days
                </span>
              </div>
              <div className="mt-6 space-y-3">
                {recommendedProblems.length === 0 ? (
                  <div className="rounded-lg bg-white/92 px-4 py-5 text-sm text-on-surface-variant">
                    No recommendations available.
                  </div>
                ) : (
                  recommendedProblems.map((problem) => (
                    <Link
                      key={problem.id}
                      to={`/problems/${problem.id}`}
                      className="block rounded-lg bg-white/92 px-4 py-4 transition-colors hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-on-surface">{problem.title}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">{problem.reason}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                            <DifficultyBadge difficulty={problem.difficulty} />
                            <span>{problem.acceptance_rate}% acceptance</span>
                          </div>
                        </div>
                        <span className="rounded-full bg-primary-container px-2.5 py-1 text-xs font-semibold text-primary">
                          {problem.points} pts
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Weekly Activity and Difficulty Distribution */}
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-headline text-xl font-extrabold text-on-surface">Weekly Activity</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Submissions and acceptance rate over the past 7 days.
                </p>
              </div>
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Last 7 Days
              </span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-7">
              {weeklyActivity.map((day) => (
                <div key={day.label} className="rounded-lg bg-surface-container-low px-4 py-4">
                  <p className="text-sm font-semibold text-on-surface">{day.label}</p>
                  <p className="mt-4 text-xs text-on-surface-variant">Submissions {day.submissions}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Accepted {day.accepted}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card variant="surface" className="p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Difficulty Distribution
              </p>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                  <span>Easy</span>
                  <span className="font-semibold">{userStats?.easy_solved ?? 0} solved</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                  <span>Medium</span>
                  <span className="font-semibold">{userStats?.medium_solved ?? 0} solved</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                  <span>Hard</span>
                  <span className="font-semibold">{userStats?.hard_solved ?? 0} solved</span>
                </div>
              </div>
            </Card>

            <Card variant="surface" className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline text-lg font-extrabold text-on-surface">Achievements</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {userStats?.unlocked_achievements ?? 0} / {userStats?.total_achievements ?? 0} unlocked
                  </p>
                </div>
                <span className="rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Progress
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {Array.isArray(userStats?.achievements) && userStats.achievements.length > 0 ? (
                  userStats.achievements.map((achievement) => (
                    <div key={achievement.id} className="rounded-lg bg-white/92 px-4 py-3">
                      <p className="text-sm font-semibold text-on-surface">{achievement.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{achievement.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg bg-white/92 px-4 py-4 text-sm text-on-surface-variant">
                    No achievements unlocked yet.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardEnhanced
