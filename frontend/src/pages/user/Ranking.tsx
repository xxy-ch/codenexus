import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { rankingService } from '@/services/ranking'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { ArrowRight, BarChart3, Building2, Crown, Medal, Search, Sparkles, Trophy } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'

interface RankingUser {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  ranking: number
  points: number
  problems_solved: number
  submissions: number
  accuracy: number
  school_id?: string
  school_name?: string
  avatar?: string | null
  created_at: string
}

interface RankingResponse {
  users: RankingUser[]
  total: number
  page: number
  limit: number
}

type RankingTab = 'global' | 'organization'

const TOP_GRADIENTS = [
  'from-amber-300 via-yellow-200 to-white',
  'from-slate-300 via-slate-100 to-white',
  'from-orange-300 via-amber-100 to-white',
]

export function Ranking() {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<RankingTab>('global')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [timePeriod, setTimePeriod] = useState<string>('all')
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery<RankingResponse>({
    queryKey: ['ranking', activeTab, page, timePeriod],
    queryFn: () =>
      activeTab === 'global'
        ? rankingService.getGlobalRanking({
            page,
            limit,
            ...(timePeriod !== 'all' && { time_period: timePeriod as never }),
          })
        : rankingService.getOrganizationRanking({
            page,
            limit,
            ...(timePeriod !== 'all' && { time_period: timePeriod as never }),
          }),
  })

  const { data: searchResults } = useQuery<RankingResponse>({
    queryKey: ['ranking-search', searchQuery],
    queryFn: () => rankingService.searchUsers(searchQuery),
    enabled: searchQuery.trim().length > 0,
  })

  const displayUsers = searchQuery.trim().length > 0 ? searchResults?.users || [] : data?.users || []
  const topThree = useMemo(() => displayUsers.slice(0, 3), [displayUsers])
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / limit))
  const currentUserEntry = useMemo(
    () => displayUsers.find((entry) => entry.id === currentUser?.id) || null,
    [currentUser?.id, displayUsers]
  )

  if (isLoading) {
    return <TableSkeleton rows={20} columns={4} />
  }

  if (error) {
    return (
      <InlineError
        title="排行榜加载失败"
        message="请重试或稍后再查看"
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.26),_transparent_32%),linear-gradient(140deg,#0f172a_0%,#172554_36%,#111827_100%)] px-6 py-8 text-white">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                Global User Rankings
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">排行榜</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/75">
                  展示真实榜单、组织排行和当前用户位置。保留真实 leaderboard 数据，不再混入 mock 名次变化。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Visible Users</p>
                <p className="mt-2 text-2xl font-semibold">{displayUsers.length}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Your Rank</p>
                <p className="mt-2 text-2xl font-semibold">{currentUserEntry?.ranking ?? '-'}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Solved</p>
                <p className="mt-2 text-2xl font-semibold">{currentUserEntry?.problems_solved ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('global')
                    setPage(1)
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
                    activeTab === 'global'
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  <Crown className="h-4 w-4" />
                  全局榜
                </button>
                <button
                  onClick={() => {
                    setActiveTab('organization')
                    setPage(1)
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
                    activeTab === 'organization'
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  组织榜
                </button>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    placeholder="搜索用户"
                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
                <select
                  value={timePeriod}
                  onChange={(e) => {
                    setTimePeriod(e.target.value)
                    setPage(1)
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="all">全部时间</option>
                  <option value="week">本周</option>
                  <option value="month">本月</option>
                  <option value="year">今年</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {topThree.map((user, index) => (
              <div
                key={user.id}
                className={cn(
                  'rounded-[24px] border border-slate-200 bg-gradient-to-br p-5 shadow-sm dark:border-slate-800',
                  TOP_GRADIENTS[index] || 'from-slate-100 to-white',
                  'dark:from-slate-900 dark:to-slate-950'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                    #{user.ranking}
                  </span>
                  <Medal className={cn('h-5 w-5', index === 0 ? 'text-amber-500' : 'text-slate-500')} />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-950 dark:text-white">{user.username}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.first_name} {user.last_name}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Points</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{user.points}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Solved</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{user.problems_solved}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {displayUsers.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title={searchQuery ? '未找到匹配用户' : '暂无排行数据'}
                description={searchQuery ? '尝试调整搜索条件' : '还没有用户提交过代码'}
              />
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/80">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Points</th>
                    <th className="px-6 py-4">Solved</th>
                    <th className="px-6 py-4">Accuracy</th>
                    <th className="px-6 py-4">Submissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {displayUsers.map((user) => {
                    const isCurrentUser = currentUser?.id === user.id
                    return (
                      <tr key={user.id} className={cn('transition hover:bg-slate-50 dark:hover:bg-slate-900/70', isCurrentUser && 'bg-amber-50/70 dark:bg-amber-950/10')}>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">#{user.ranking}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {user.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-950 dark:text-white">{user.username}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {user.first_name} {user.last_name} {isCurrentUser ? '· 你' : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{user.points}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{user.problems_solved}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{Math.round(user.accuracy * 100)}%</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{user.submissions}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {searchQuery.trim().length === 0 && (
            <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <span className="text-slate-500 dark:text-slate-400">
                第 {page} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Your Snapshot</p>
            <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">当前用户位置</h2>
            {currentUserEntry ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rank</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">#{currentUserEntry.ranking}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Points</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{currentUserEntry.points}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Solved</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{currentUserEntry.problems_solved}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">当前页没有命中你的排名信息。</p>
            )}
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-start gap-3">
              <ArrowRight className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">交付边界</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  当前排行榜使用真实 leaderboard 数据。学校过滤和更细颗粒度榜单仍未开放，所以页面只保留已落地范围。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
