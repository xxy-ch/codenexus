import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { rankingService } from '@/services/ranking'
import { EmptyState } from '@/components/page/EmptyState'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

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

  const displayUsers = searchQuery.trim().length > 0 ? searchResults?.users ?? [] : data?.users ?? []
  const topThree = displayUsers.slice(0, 3)
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit))
  const currentUserEntry = useMemo(
    () => displayUsers.find((entry) => entry.id === currentUser?.id) ?? null,
    [currentUser?.id, displayUsers],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loading message="加载排行榜中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <EmptyState
          title="排行榜加载失败"
          description="请重试或稍后再查看。"
          action={
            <Button variant="primary" onClick={() => refetch()}>
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
        eyebrow="Leaderboard"
        title="排行榜"
        description="展示真实榜单、组织排行和当前用户位置。页面收敛为过滤 + 榜单 + 摘要三层，不再使用独立 hero 视觉。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="当前结果" value={`${displayUsers.length} 人`} helper="当前视图可见用户数" />
        <StatCard label="你的排名" value={currentUserEntry ? `#${currentUserEntry.ranking}` : '-'} helper="按当前视图计算" />
        <StatCard label="已解决" value={`${currentUserEntry?.problems_solved ?? 0} 题`} helper="当前用户通过数" />
        <StatCard label="Tab" value={activeTab === 'global' ? '全局榜' : '组织榜'} helper={timePeriod === 'all' ? '全部时间' : timePeriod} />
      </div>

      <FilterBar>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActiveTab('global')
              setPage(1)
            }}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'global' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
          >
            全局榜
          </button>
          <button
            onClick={() => {
              setActiveTab('organization')
              setPage(1)
            }}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'organization'
                ? 'bg-slate-950 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
          >
            组织榜
          </button>
        </div>

        <label className="min-w-[220px] flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-700">搜索用户</span>
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setPage(1)
            }}
            placeholder="搜索用户"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span className="mb-2 block">时间范围</span>
          <select
            value={timePeriod}
            onChange={(event) => {
              setTimePeriod(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">全部时间</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">今年</option>
          </select>
        </label>
      </FilterBar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {topThree.map((entry, index) => (
              <SurfaceCard key={entry.id} tone={index === 0 ? 'default' : 'muted'} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold text-white">#{entry.ranking}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {index === 0 ? 'Leader' : `Top ${index + 1}`}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{entry.username}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {entry.first_name} {entry.last_name}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Points</p>
                    <p className="mt-1 font-semibold text-slate-950">{entry.points}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Solved</p>
                    <p className="mt-1 font-semibold text-slate-950">{entry.problems_solved}</p>
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>

          <SectionBlock title="榜单列表" description="实时榜单数据以表格为主，搜索和翻页行为保持不变。">
            {displayUsers.length === 0 ? (
              <EmptyState
                title={searchQuery ? '未找到匹配用户' : '暂无排行数据'}
                description={searchQuery ? '请尝试其他搜索词。' : '当前还没有可展示的排行记录。'}
                className="border-slate-200 bg-slate-50 py-10"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-6 py-3">Rank</th>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">Points</th>
                      <th className="px-6 py-3">Solved</th>
                      <th className="px-6 py-3">Accuracy</th>
                      <th className="px-6 py-3">Submissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayUsers.map((entry) => {
                      const isCurrentUser = currentUser?.id === entry.id

                      return (
                        <tr key={entry.id} className={cn('transition hover:bg-slate-50', isCurrentUser && 'bg-blue-50')}>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-950">#{entry.ranking}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                                {entry.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-950">{entry.username}</p>
                                <p className="text-xs text-slate-500">
                                  {entry.first_name} {entry.last_name} {isCurrentUser ? '· 你' : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">{entry.points}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{entry.problems_solved}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{Math.round(entry.accuracy * 100)}%</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{entry.submissions}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {searchQuery.trim().length === 0 ? (
              <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-5">
                <span className="text-sm text-slate-500">
                  第 {page} / {totalPages} 页
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            ) : null}
          </SectionBlock>
        </div>

        <div className="space-y-4">
          <SurfaceCard tone="muted">
            <h2 className="text-lg font-semibold text-slate-950">当前用户位置</h2>
            {currentUserEntry ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rank</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">#{currentUserEntry.ranking}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Points</p>
                    <p className="mt-1 font-semibold text-slate-950">{currentUserEntry.points}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Solved</p>
                    <p className="mt-1 font-semibold text-slate-950">{currentUserEntry.problems_solved}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">当前页没有命中你的排名信息。</p>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="text-lg font-semibold text-slate-950">交付边界</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              当前排行榜使用真实 leaderboard 数据。学校过滤和更细颗粒度榜单仍未开放，所以页面只保留已落地范围。
            </p>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
