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
      {/* PostHog warm hero banner */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(94,106,210,0.15),_transparent_40%)] px-6 py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                Global User Rankings
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">排行榜</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  展示真实榜单、组织排行和当前用户位置。保留真实 leaderboard 数据，采用微动画与高对比度磨砂设计。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 hover-lift transition-card-hover">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Visible Users</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{displayUsers.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 hover-lift transition-card-hover">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Your Rank</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{currentUserEntry?.ranking ?? '-'}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 hover-lift transition-card-hover">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Solved</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{currentUserEntry?.problems_solved ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* Tab bar and filters */}
          <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm glass">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('global')
                    setPage(1)
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition button-press',
                    activeTab === 'global'
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition button-press',
                    activeTab === 'organization'
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  组织榜
                </button>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    placeholder="搜索用户"
                    className="w-full md:w-64 rounded-full border border-border bg-muted/60 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </label>
                <select
                  value={timePeriod}
                  onChange={(e) => {
                    setTimePeriod(e.target.value)
                    setPage(1)
                  }}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none cursor-pointer"
                >
                  <option value="all">全部时间</option>
                  <option value="week">本周</option>
                  <option value="month">本月</option>
                  <option value="year">今年</option>
                </select>
              </div>
            </div>
          </div>

          {/* Top 3 podium cards */}
          <div className="grid gap-4 lg:grid-cols-3">
            {topThree.map((user, index) => {
              const isRank1 = index === 0
              const isRank2 = index === 1
              const isRank3 = index === 2
              return (
                <div
                  key={user.id}
                  className={cn(
                    'relative overflow-hidden rounded-2xl border p-6 glass-interactive hover-lift transition-card-hover',
                    isRank1 && 'border-amber-500/30 bg-gradient-to-br from-primary/15 via-amber-500/5 to-card shadow-[0_0_20px_rgba(245,158,11,0.08)]',
                    isRank2 && 'border-slate-400/30 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-card',
                    isRank3 && 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-card'
                  )}
                >
                  {isRank1 && (
                    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black',
                        isRank1 && 'bg-amber-500 text-black',
                        isRank2 && 'bg-slate-400 text-black',
                        isRank3 && 'bg-orange-500 text-black'
                      )}
                    >
                      #{user.ranking}
                    </span>
                    {isRank1 ? (
                      <Crown className="h-6 w-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-bounce" style={{ animationDuration: '3s' }} />
                    ) : (
                      <Medal className={cn('h-5 w-5', isRank2 ? 'text-slate-400' : 'text-orange-400')} />
                    )}
                  </div>
                  <div className="mt-6">
                    <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-1.5">
                      {user.username}
                      {isRank1 && <Sparkles className="h-4 w-4 text-amber-400" />}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {user.first_name} {user.last_name}
                    </p>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-border/40 bg-muted/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">积分</p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">{user.points}</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-muted/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">已解决</p>
                      <p className="mt-0.5 text-lg font-bold text-foreground">{user.problems_solved}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ranking table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {displayUsers.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title={searchQuery ? '未找到匹配用户' : '暂无排行数据'}
                description={searchQuery ? '尝试调整搜索条件' : '还没有用户提交过代码'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      <th className="px-6 py-4">排名</th>
                      <th className="px-6 py-4">用户</th>
                      <th className="px-6 py-4">积分</th>
                      <th className="px-6 py-4">已解决</th>
                      <th className="px-6 py-4">准确率</th>
                      <th className="px-6 py-4">提交数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {displayUsers.map((user) => {
                      const isCurrentUser = currentUser?.id === user.id
                      return (
                        <tr
                          key={user.id}
                          className={cn(
                            'transition hover:bg-muted/30',
                            isCurrentUser && 'bg-primary/5 border-l-2 border-l-primary'
                          )}
                        >
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                'text-sm font-bold',
                                user.ranking === 1 && 'text-amber-500',
                                user.ranking === 2 && 'text-slate-400',
                                user.ranking === 3 && 'text-orange-500',
                                user.ranking > 3 && 'text-foreground'
                              )}
                            >
                              #{user.ranking}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                                {user.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">{user.username}</p>
                                <p className="text-xs text-muted-foreground">
                                  {user.first_name} {user.last_name} {isCurrentUser ? '· 你' : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-foreground">{user.points}</td>
                          <td className="px-6 py-4 text-sm text-foreground">{user.problems_solved}</td>
                          <td className="px-6 py-4 text-sm text-foreground">{Math.round(user.accuracy * 100)}%</td>
                          <td className="px-6 py-4 text-sm text-foreground">{user.submissions}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {searchQuery.trim().length === 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-sm shadow-sm">
              <span className="text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="button-press"
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="button-press"
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">你的数据</p>
            <h2 className="mt-3 text-lg font-bold text-foreground">当前用户位置</h2>
            {currentUserEntry ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">排名</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">#{currentUserEntry.ranking}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">积分</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{currentUserEntry.points}</p>
                  </div>
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">已解决</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{currentUserEntry.problems_solved}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">当前页没有命中你的排名信息。</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-5 glass">
            <div className="flex items-start gap-3">
              <ArrowRight className="mt-0.5 h-4 w-4 text-primary animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-foreground">交付边界</p>
                <p className="mt-2 text-sm text-muted-foreground">
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
