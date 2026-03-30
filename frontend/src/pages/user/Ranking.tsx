import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { rankingService } from '@/services/ranking'
import { cn } from '@/lib/utils'

function podiumTone(rank: number) {
  if (rank === 1) return 'bg-gradient-to-br from-primary to-primary-container text-white'
  if (rank === 2) return 'bg-gradient-to-br from-[#edf2ff] to-[#dae2ff] text-on-surface'
  return 'bg-gradient-to-br from-[#f6f7ff] to-[#eef2ff] text-on-surface'
}

export function Ranking() {
  const [timePeriod, setTimePeriod] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ranking', timePeriod],
    queryFn: () => rankingService.getGlobalRanking({ page: 1, limit: 50, time_period: timePeriod }),
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
  const topUser = filteredUsers[0]

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading rankings..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <ErrorState
          title="Failed to load rankings"
          message="Unable to fetch ranking data. Please try again later."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Rankings
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Global Leaderboard
            </h1>
            <p className="max-w-xl text-sm leading-6 text-on-surface-variant">
              Top performers from around the world, ranked by points and problems solved.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => refetch()}
            leftIcon={<span className="material-symbols-outlined text-base">refresh</span>}
          >
            Refresh
          </Button>
        </div>

        {/* Main Overview Card */}
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary-container px-6 py-6 text-white shadow-lg">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-fixed/72">
                  Top Performers
                </p>
                <h2 className="mt-3 font-headline text-3xl font-extrabold tracking-tight">
                  Leaderboard Podium
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-primary-fixed/90">
                  Celebrating the best programmers on the platform with their achievements and statistics.
                </p>
              </div>
              <div className="rounded-xl border border-white/16 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  Top Ranker
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {topUser?.username ?? 'Loading...'}
                </p>
                <p className="mt-2 text-sm text-white/74">
                  {topUser
                    ? `${topUser.problems_solved} solved, ${topUser.points} points`
                    : 'Loading leaderboard data...'}
                </p>
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <Card variant="surface" className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Total Users
              </p>
              <p className="mt-3 text-3xl font-semibold text-on-surface">{filteredUsers.length}</p>
              <p className="mt-2 text-sm text-on-surface-variant">Visible in current filter</p>
            </Card>

            <Card variant="surface" className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Top Score
              </p>
              <p className="mt-3 text-3xl font-semibold text-on-surface">{topUser?.points ?? 0}</p>
              <p className="mt-2 text-sm text-on-surface-variant">Highest score achieved</p>
            </Card>

            <Card variant="surface" className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Avg Accuracy
              </p>
              <p className="mt-3 text-3xl font-semibold text-on-surface">
                {filteredUsers.length > 0
                  ? `${Math.round(filteredUsers.reduce((sum, user) => sum + (user.accuracy || 0), 0) / filteredUsers.length)}%`
                  : '0%'}
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">Overall performance</p>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <Input
                type="search"
                aria-label="Search users"
                placeholder="Search by username..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: 'all', label: 'All Time' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'year', label: 'This Year' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTimePeriod(item.value as any)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    timePeriod === item.value
                      ? 'bg-primary text-on-primary shadow-md'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Podium Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Top 3
              </p>
              <h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
                Podium Winners
              </h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {podium.map((user, index) => (
              <Card
                key={user.id}
                className={cn('bg-gradient-to-br p-6 text-white shadow-md', podiumTone(user.ranking || index + 1))}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                      Rank #{user.ranking}
                    </p>
                    <h2 className="mt-3 font-headline text-2xl font-extrabold">
                      {user.username}
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {user.school_name ? (
                        <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold">
                          {user.school_name}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold">
                        {user.problems_solved} solved
                      </span>
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                    <span className="material-symbols-outlined text-2xl">emoji_events</span>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Points</p>
                    <p className="mt-1 font-semibold">{user.points}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Solved</p>
                    <p className="mt-1 font-semibold">{user.problems_solved}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Accuracy</p>
                    <p className="mt-1 font-semibold">{user.accuracy || 0}%</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Full Leaderboard */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-outline-variant/10 px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Full Leaderboard
            </p>
            <h2 className="mt-2 font-headline text-xl font-extrabold text-on-surface">
              Global Rankings
            </h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No rankings found"
                description="Try adjusting your filters or check back later."
                icon={
                  <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                    leaderboard
                  </span>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Solved</th>
                    <th className="px-4 py-3">Submissions</th>
                    <th className="px-4 py-3">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-outline-variant/10 text-sm text-on-surface hover:bg-surface-container-low/30 transition-colors"
                    >
                      <td className="px-4 py-4 font-semibold">#{user.ranking}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm" />
                          <div>
                            <p className="font-semibold text-on-surface">{user.username}</p>
                            {user.school_name ? (
                              <p className="text-xs text-on-surface-variant">{user.school_name}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold">{user.points}</td>
                      <td className="px-4 py-4">{user.problems_solved}</td>
                      <td className="px-4 py-4 text-on-surface-variant">{user.submissions || 0}</td>
                      <td className="px-4 py-4 text-on-surface-variant">{user.accuracy || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default Ranking
