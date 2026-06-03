import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { contestsService } from '@/services/contestsService'
import Loading from '@/components/ui/Loading'
import Pagination from '@/components/ui/Pagination'

const statusConfig: Record<string, { label: string; badge: string }> = {
  not_started: { label: '未开始', badge: 'badge-pending' },
  running: { label: '进行中', badge: 'badge-accepted' },
  ended: { label: '已结束', badge: 'badge-compilation' },
}

export default function ContestList() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const limit = 12

  const { data, isLoading } = useQuery({
    queryKey: ['contests', page, status],
    queryFn: () => contestsService.list({ page, limit, status: status || undefined }),
  })

  const contests = data?.contests ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl text-on-surface">竞赛</h1>

      <div className="flex gap-2">
        {['', 'not_started', 'running', 'ended'].map((s) => (
          <button
            key={s}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === s
                ? 'bg-primary text-white'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
            onClick={() => { setStatus(s); setPage(1) }}
          >
            {s === '' ? '全部' : statusConfig[s]?.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : contests.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contests.map((contest: any) => {
              const cfg = statusConfig[contest.status] || statusConfig.not_started
              return (
                <div key={contest.id} className="card p-5 flex flex-col">
                  <h3 className="font-display font-bold text-lg text-on-surface mb-2">{contest.title}</h3>
                  <div className="text-sm text-on-surface-variant space-y-1 mb-3 flex-1">
                    <p>开始: {new Date(contest.start_time).toLocaleString('zh-CN')}</p>
                    <p>结束: {new Date(contest.end_time).toLocaleString('zh-CN')}</p>
                    <p>参赛人数: {contest.participants ?? 0}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cfg.badge}>{cfg.label}</span>
                    <Link to={`/contests/${contest.id}`} className="btn-secondary text-xs px-3 py-1.5">
                      查看详情
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-on-surface-variant">暂无竞赛</p>
        </div>
      )}
    </div>
  )
}
