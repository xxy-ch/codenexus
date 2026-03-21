import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { usersService } from '@/services/users'
import { problemsService } from '@/services/problems'
import { cn } from '@/lib/utils'

const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function statusTone(status?: string) {
  if (status === 'accepted') return 'bg-[#006847] text-white'
  if (status === 'wrong_answer') return 'bg-[#ffdad6] text-[#93000a]'
  if (status === 'queued') return 'bg-[#d5e3fc] text-[#3a485b]'
  return 'bg-[rgba(218,226,253,0.88)] text-[#43516b]'
}

function formatActivityLabel(activity: { type: string; status?: string }) {
  if (activity.type === 'contest_registration') {
    return '竞赛报名'
  }

  if (activity.status === 'accepted') {
    return '提交 · Accepted'
  }

  if (activity.status === 'wrong_answer') {
    return '提交 · Wrong Answer'
  }

  if (activity.status === 'queued') {
    return '提交 · Queued'
  }

  return '提交'
}

function difficultyBadgeTone(difficulty?: string) {
  if (difficulty === 'hard') return 'bg-[#ffe7e1] text-[#93000a]'
  if (difficulty === 'medium') return 'bg-[#dae2ff] text-[#244171]'
  return 'bg-[#d8f8e3] text-[#006847]'
}

function difficultyLabel(difficulty?: string) {
  if (difficulty === 'hard') return '困难'
  if (difficulty === 'medium') return '中等'
  return '简单'
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

  const statCards = [
    {
      label: '总提交数',
      value: `${userStats?.total_submissions ?? '--'} 次提交`,
      helper: `${userStats?.accepted_submissions ?? 0} 次通过`,
    },
    {
      label: '已解决',
      value: `${userStats?.unique_problems_solved ?? '--'} 道题`,
      helper: '当前累计通过题目数',
    },
    {
      label: '准确率',
      value: `${userStats?.accuracy_rate ?? '--'}%`,
      helper: '基于当前提交历史计算',
    },
    {
      label: '连续学习',
      value: `${userStats?.current_streak ?? '--'} 天`,
      helper: `最高 ${userStats?.longest_streak ?? 0} 天`,
    },
    {
      label: '当前名次',
      value: `#${userStats?.ranking ?? '--'}`,
      helper: '全站位置',
    },
    {
      label: '总积分',
      value: `${userStats?.total_points ?? '--'} 分`,
      helper: '完成题目与竞赛累计',
    },
  ]

  if (statsLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <SurfaceCard className="text-sm text-[#6b7ca7]">页面加载中...</SurfaceCard>
      </div>
    )
  }

  if (statsError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <SurfaceCard className="space-y-4 bg-[rgba(255,247,247,0.95)] text-[#5c2230]">
          <div>
            <h1 className="font-['Manrope'] text-[1.9rem] font-extrabold tracking-[-0.04em] text-[#7b1e2b]">加载失败</h1>
            <p className="mt-2 text-sm text-[#7d5260]">当前无法读取学习总览，请重新拉取统计数据。</p>
          </div>
          <Button onClick={() => refetchStats()}>重试</Button>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Workspace"
          title="学习总览"
          description={`过去 7 天共提交 ${userStats?.total_submissions ?? 0} 次，成功通过 ${userStats?.accepted_submissions ?? 0} 次。当前连续学习 ${userStats?.current_streak ?? 0} 天，继续保持稳定节奏。`}
          actions={(
            <>
              <button
                type="button"
                aria-label="刷新"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-[8px] bg-white px-4 py-2.5 text-sm font-semibold text-[#244171] shadow-[0_10px_24px_rgba(19,27,46,0.05)]"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
                <span>刷新</span>
              </button>
              <Link to="/problems" className="inline-flex items-center gap-2 rounded-[8px] bg-[rgba(226,231,255,0.88)] px-4 py-2.5 text-sm font-semibold text-[#244171]">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">terminal</span>
                <span>开始刷题</span>
              </Link>
              <Link to="/contests" className="inline-flex items-center gap-2 rounded-[8px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,61,155,0.16)]">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">emoji_events</span>
                <span>查看竞赛</span>
              </Link>
            </>
          )}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {statCards.map((card) => (
            <SurfaceCard key={card.label} className="min-h-[140px] overflow-hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">{card.label}</p>
              <div className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-[#131b2e]">
                {card.value}
              </div>
              <p className="mt-3 text-sm text-[#65748d]">{card.helper}</p>
            </SurfaceCard>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <SurfaceCard className="overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-['Manrope'] text-[1.45rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">最近活动</h2>
                <p className="mt-1 text-sm text-[#65748d]">保留最近提交和竞赛动作，方便快速回看。</p>
              </div>
              <Link to="/submissions" className="text-sm font-semibold text-[#003d9b]">查看全部</Link>
            </div>
            <div className="mt-6 space-y-3">
              {recentActivity.length === 0 ? (
                <div className="rounded-[8px] bg-[rgba(242,243,255,0.84)] px-4 py-5 text-sm text-[#65748d]">最近还没有新的活动记录。</div>
              ) : (
                recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start justify-between gap-4 rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#131b2e]">
                        {activity.problem_title || activity.contest_name || 'Recent activity'}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#244171]">
                        {formatActivityLabel(activity)}
                      </p>
                      <p className="mt-1 text-xs text-[#6b7ca7]">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                    {activity.type === 'submission' ? (
                      <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]', statusTone(activity.status))}>
                        {activity.language?.toUpperCase() || 'CODE'}
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard tone="muted">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-['Manrope'] text-[1.45rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">推荐题目</h2>
                <p className="mt-1 text-sm text-[#65748d]">按当前节奏补同难度和相邻主题。</p>
              </div>
              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">最近 7 天</span>
            </div>
            <div className="mt-6 space-y-3">
              {recommendedProblems.length === 0 ? (
                <div className="rounded-[8px] bg-white/92 px-4 py-5 text-sm text-[#65748d]">当前没有推荐题目。</div>
              ) : (
                recommendedProblems.map((problem) => (
                  <Link key={problem.id} to={`/problems/${problem.id}`} className="block rounded-[8px] bg-white/92 px-4 py-4 transition-colors hover:bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#131b2e]">{problem.title}</p>
                        <p className="mt-1 text-xs text-[#65748d]">{problem.reason}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6b7ca7]">
                          <span className={cn('rounded-full px-2.5 py-1 font-semibold', difficultyBadgeTone(problem.difficulty))}>
                            {difficultyLabel(problem.difficulty)}
                          </span>
                          <span>{problem.acceptance_rate}% 通过率</span>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#dae2ff] px-2.5 py-1 text-xs font-semibold text-[#003d9b]">{problem.points} pts</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </SurfaceCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SurfaceCard className="architectural-grid overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-['Manrope'] text-[1.45rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">学习节奏</h2>
                <p className="mt-1 text-sm text-[#65748d]">最近 7 天的提交与通过节奏。</p>
              </div>
              <span className="rounded-full bg-[rgba(255,255,255,0.92)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">最近 7 天</span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-7">
              {weeklyActivity.map((day) => (
                <div key={day.label} className="rounded-[8px] bg-white/92 px-4 py-4 shadow-[0_8px_18px_rgba(19,27,46,0.04)]">
                  <p className="text-sm font-semibold text-[#17305e]">{day.label}</p>
                  <p className="mt-4 text-[13px] text-[#65748d]">提交 {day.submissions}</p>
                  <p className="mt-1 text-[13px] text-[#65748d]">通过 {day.accepted}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <div className="space-y-6">
            <SurfaceCard>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-['Manrope'] text-[1.3rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">今日建议</h2>
                  <p className="mt-1 text-sm text-[#65748d]">daily challenge</p>
                </div>
                {dailyChallenge ? (
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', difficultyBadgeTone(dailyChallenge.difficulty))}>
                    {dailyChallenge.difficulty}
                  </span>
                ) : null}
              </div>
              {dailyChallenge ? (
                <div className="mt-5 space-y-3">
                  <Link to={`/problems/${dailyChallenge.id}`} className="block text-lg font-semibold text-[#131b2e] transition-colors hover:text-[#003d9b]">
                    {dailyChallenge.title}
                  </Link>
                  <p className="text-sm leading-6 text-[#65748d]">{dailyChallenge.description}</p>
                </div>
              ) : (
                <p className="mt-5 text-sm text-[#65748d]">当前没有可展示的每日建议。</p>
              )}
            </SurfaceCard>

            <SurfaceCard tone="muted">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-['Manrope'] text-[1.3rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">成就进度</h2>
                  <p className="mt-1 text-sm text-[#65748d]">
                    {userStats?.unlocked_achievements ?? 0} / {userStats?.total_achievements ?? 0} achievements
                  </p>
                </div>
                <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">成长记录</span>
              </div>
              <div className="mt-5 space-y-3">
                {Array.isArray(userStats?.achievements) && userStats.achievements.length > 0 ? (
                  userStats.achievements.map((achievement) => (
                    <div key={achievement.id} className="rounded-[8px] bg-white/92 px-4 py-3">
                      <p className="text-sm font-semibold text-[#131b2e]">{achievement.name}</p>
                      <p className="mt-1 text-xs text-[#65748d]">{achievement.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[8px] bg-white/92 px-4 py-4 text-sm text-[#65748d]">当前还没有解锁成就。</div>
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>

        <section className="grid gap-4 xl:grid-cols-3">
          <SurfaceCard>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">难度分布</p>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-3 text-sm text-[#17305e]">
                <span>完成情况</span>
                <span>{userStats?.easy_solved ?? 0} 简单</span>
              </div>
              <div className="flex items-center justify-between rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-3 text-sm text-[#17305e]">
                <span>进阶练习</span>
                <span>{userStats?.medium_solved ?? 0} 中等</span>
              </div>
              <div className="flex items-center justify-between rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-3 text-sm text-[#17305e]">
                <span>挑战题</span>
                <span>{userStats?.hard_solved ?? 0} 困难</span>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">实时位置</p>
            <div className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-[#131b2e]">前 12%</div>
            <p className="mt-2 text-sm text-[#65748d]">当前正在向更高的排名区间推进。</p>
          </SurfaceCard>

          <SurfaceCard>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">Momentum</p>
            <div className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-[#131b2e]">{userStats?.current_streak ?? 0} 天</div>
            <p className="mt-2 text-sm text-[#65748d]">最近已经连续做题 {userStats?.current_streak ?? 0} 天。</p>
          </SurfaceCard>
        </section>
      </div>
    </div>
  )
}
