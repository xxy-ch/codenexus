import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Crown, RefreshCcw } from 'lucide-react'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { rankingService } from '@/services/ranking'
import { cn } from '@/lib/utils'

function podiumTone(rank: number) {
  if (rank === 1) return 'from-[#003d9b] to-[#0052cc] text-white'
  if (rank === 2) return 'from-[#edf2ff] to-[#dae2ff] text-[#17305e]'
  return 'from-[#f6f7ff] to-[#eef2ff] text-[#17305e]'
}

export function Ranking() {
  const [timePeriod, setTimePeriod] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ranking', timePeriod],
    queryFn: () => rankingService.getGlobalRanking({ page: 1, limit: 20, time_period: timePeriod }),
  })

  const filteredUsers = useMemo(() => {
    const users = data?.users ?? []
    if (!search.trim()) {
      return users
    }

    const keyword = search.trim().toLowerCase()
    return users.filter((user) => user.username.toLowerCase().includes(keyword))
  }, [data?.users, search])

  const podium = filteredUsers.slice(0, 3)
  const rest = filteredUsers.slice(3)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <SurfaceCard className="text-sm text-[#6b7ca7]">排行榜加载中...</SurfaceCard>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <SurfaceCard className="space-y-4 bg-[rgba(255,247,247,0.95)]">
          <div>
            <h1 className="font-['Manrope'] text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#7b1e2b]">排行榜加载失败</h1>
            <p className="mt-2 text-sm text-[#7d5260]">当前无法读取实时榜单。</p>
          </div>
          <Button onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
            重试
          </Button>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Leaderboard"
          title="排行榜"
          description="把排名做成清晰、可扫描、可对比的密集信息页，不再是单纯堆卡片。"
          actions={(
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
              刷新榜单
            </Button>
          )}
        />

        <SurfaceCard tone="muted">
          <FilterBar>
            <input
              type="search"
              aria-label="搜索用户名"
              placeholder="搜索用户名"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 min-w-[240px] flex-1 rounded-[8px] bg-white/92 px-4 text-sm text-[#17305e] shadow-[0_10px_24px_rgba(19,27,46,0.04)] outline-none placeholder:text-[#93a0bb]"
            />
            <div className="flex flex-wrap items-center gap-2">
              {[
                ['all', '全部'],
                ['week', '本周'],
                ['month', '本月'],
                ['year', '全年'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTimePeriod(value as 'all' | 'week' | 'month' | 'year')}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    timePeriod === value ? 'bg-[#003d9b] text-white' : 'bg-white/92 text-[#586988] hover:bg-white',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </FilterBar>
        </SurfaceCard>

        <div className="grid gap-4 lg:grid-cols-3">
          {podium.map((user) => (
            <SurfaceCard key={user.id} className={cn('bg-gradient-to-br', podiumTone(user.ranking))}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">Rank #{user.ranking}</p>
                  <h2 className="mt-3 font-['Manrope'] text-[1.8rem] font-extrabold tracking-[-0.05em]">{user.username}</h2>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    {user.school_name ? <span className="rounded-full bg-white/18 px-2.5 py-1">{user.school_name}</span> : null}
                    <span className="rounded-full bg-white/18 px-2.5 py-1">{user.problems_solved} solved</span>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <Crown className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] opacity-65">Points</p>
                  <p className="mt-1 font-semibold">{user.points}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] opacity-65">AC</p>
                  <p className="mt-1 font-semibold">{user.problems_solved}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] opacity-65">Accuracy</p>
                  <p className="mt-1 font-semibold">{user.accuracy}%</p>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>

        <SurfaceCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7ca7]">
                  <th className="px-4 py-3">排名</th>
                  <th className="px-4 py-3">用户</th>
                  <th className="px-4 py-3">积分</th>
                  <th className="px-4 py-3">AC 数</th>
                  <th className="px-4 py-3">提交数</th>
                  <th className="px-4 py-3">通过率</th>
                </tr>
              </thead>
              <tbody>
                {rest.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-sm text-[#65748d]" colSpan={6}>当前没有更多榜单用户。</td>
                  </tr>
                ) : (
                  rest.map((user) => (
                    <tr key={user.id} className="border-t border-[rgba(218,226,253,0.36)] text-sm text-[#17305e]">
                      <td className="px-4 py-4 font-semibold">#{user.ranking}</td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-[#131b2e]">{user.username}</p>
                          {user.school_name ? <p className="mt-1 text-xs text-[#6b7ca7]">{user.school_name}</p> : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">{user.points}</td>
                      <td className="px-4 py-4">{user.problems_solved}</td>
                      <td className="px-4 py-4">{user.submissions}</td>
                      <td className="px-4 py-4">{user.accuracy}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}
