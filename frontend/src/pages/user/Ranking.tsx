import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { rankingService } from '@/services/ranking'
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

const MEDAL_ICONS = {
  1: { icon: 'emoji_events', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  2: { icon: 'military_tech', color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
  3: { icon: 'workspace_premium', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900/30' },
}

export function Ranking() {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<RankingTab>('global')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<string>('all')
  const [timePeriod, setTimePeriod] = useState<string>('all')
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ranking', activeTab, page, schoolFilter, timePeriod],
    queryFn: () =>
      activeTab === 'global'
        ? rankingService.getGlobalRanking({
            page,
            limit,
            ...(schoolFilter !== 'all' && { school_id: schoolFilter }),
            ...(timePeriod !== 'all' && { time_period: timePeriod as any }),
          })
        : rankingService.getOrganizationRanking({
            page,
            limit,
            ...(timePeriod !== 'all' && { time_period: timePeriod as any }),
          }),
  })

  // 搜索功能
  const { data: searchResults } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: () => rankingService.searchUsers(searchQuery),
    enabled: searchQuery.length > 0,
  })

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(1)
  }

  const handleSchoolFilter = (schoolId: string) => {
    setSchoolFilter(schoolId)
    setPage(1)
  }

  const handleTimePeriodChange = (period: string) => {
    setTimePeriod(period)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getMedalIcon = (ranking: number) => {
    if (ranking >= 1 && ranking <= 3) {
      const medal = MEDAL_ICONS[ranking as 1 | 2 | 3]
      return (
        <div className={cn('flex items-center justify-center w-8 h-8 rounded-full', medal.bg)}>
          <span className={cn('material-symbols-outlined text-lg', medal.color)}>
            {medal.icon}
          </span>
        </div>
      )
    }
    return <span className="text-lg font-bold text-slate-600 dark:text-slate-400">#{ranking}</span>
  }

  const getRankingChange = (ranking: number) => {
    // 模拟排名变化（实际应从API获取）
    if (ranking <= 3) return { change: 0, icon: 'remove', color: 'text-slate-400' }
    if (ranking % 2 === 0) return { change: 1, icon: 'arrow_upward', color: 'text-green-500' }
    return { change: -1, icon: 'arrow_downward', color: 'text-red-500' }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          加载失败
        </h3>
        <Button variant="primary" onClick={() => refetch()}>
          重试
        </Button>
      </div>
    )
  }

  const displayUsers = searchQuery.length > 0 ? (searchResults?.users || []) : (data?.users || [])
  const totalPages = Math.ceil((data?.total || 0) / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            排行榜
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            查看全球用户的排名和积分
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-green-500 text-sm">autorenew</span>
          <span className="text-xs text-slate-500">实时更新</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('global')}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'global'
                ? 'bg-primary text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <span className="material-symbols-outlined text-sm mr-2">public</span>
            全局排行
          </button>
          <button
            onClick={() => setActiveTab('organization')}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'organization'
                ? 'bg-primary text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <span className="material-symbols-outlined text-sm mr-2">apartment</span>
            组织排行
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="搜索用户..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* School Filter */}
          {activeTab === 'global' && (
            <div className="flex items-center gap-2">
              <label htmlFor="school-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                学校:
              </label>
              <select
                id="school-filter"
                value={schoolFilter}
                onChange={(e) => handleSchoolFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">全部学校</option>
                <option value="1">MIT</option>
                <option value="2">Stanford</option>
                <option value="3">Harvard</option>
                <option value="4">CMU</option>
                <option value="5">Berkeley</option>
              </select>
            </div>
          )}

          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="time-period" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              时间:
            </label>
            <select
              id="time-period"
              value={timePeriod}
              onChange={(e) => handleTimePeriodChange(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">全部时间</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="year">今年</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {displayUsers.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
              leaderboard
            </span>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {searchQuery ? '未找到匹配的用户' : '暂无排行数据'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      排名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      积分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      解题数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      准确率
                    </th>
                    {activeTab === 'global' && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        学校
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {displayUsers.map((user) => {
                    const rankingChange = getRankingChange(user.ranking)
                    const isCurrentUser = currentUser?.id === user.id

                    return (
                      <tr
                        key={user.id}
                        className={cn(
                          'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                          isCurrentUser && 'bg-primary/5 dark:bg-primary/10'
                        )}
                      >
                        {/* Ranking */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getMedalIcon(user.ranking)}
                            {user.ranking > 3 && (
                              <>
                                <span className="text-lg font-bold text-slate-600 dark:text-slate-400">
                                  #{user.ranking}
                                </span>
                                <span className={cn('material-symbols-outlined text-sm', rankingChange.color)}>
                                  {rankingChange.icon}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* User */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                              user.ranking === 1 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                              user.ranking === 2 ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400' :
                              user.ranking === 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                            )}>
                              {user.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/users/${user.id}`}
                                  className="text-sm font-medium text-slate-900 dark:text-white hover:text-primary"
                                >
                                  {user.username}
                                </Link>
                                {isCurrentUser && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                    你
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {user.first_name} {user.last_name}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Points */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {user.points.toLocaleString()}
                            </span>
                            <span className="text-slate-500 ml-1">分</span>
                          </div>
                        </td>

                        {/* Problems Solved */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-700 dark:text-slate-300">
                            {user.problems_solved} 题
                          </div>
                          <div className="text-xs text-slate-500">
                            {user.submissions} 次提交
                          </div>
                        </td>

                        {/* Accuracy */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={cn(
                            'text-sm font-medium',
                            user.accuracy >= 50 ? 'text-green-600 dark:text-green-400' :
                            user.accuracy >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          )}>
                            {user.accuracy.toFixed(1)}%
                          </div>
                        </td>

                        {/* School */}
                        {activeTab === 'global' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                              {user.school_name || '-'}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && !searchQuery && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  第 {page} 页，共 {totalPages} 页 ({data?.total} 位用户)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                  >
                    下一页
                    <span className="material-symbols-outlined">chevron_right</span>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats Footer */}
      {data && data.users.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl border border-primary/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-primary mb-1">
                {data.total.toLocaleString()}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                总用户数
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500 mb-1">
                {data.users.reduce((sum, user) => sum + user.problems_solved, 0).toLocaleString()}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                总解题数
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500 mb-1">
                {Math.round(data.users.reduce((sum, user) => sum + user.accuracy, 0) / data.users.length)}%
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                平均准确率
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}