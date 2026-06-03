import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { rankingService } from '@/services/rankingService'
import Loading from '@/components/ui/Loading'
import Pagination from '@/components/ui/Pagination'
import Avatar from '@/components/ui/Avatar'

const medalColor = (rank: number) => {
  if (rank === 1) return 'text-yellow-500'
  if (rank === 2) return 'text-gray-400'
  if (rank === 3) return 'text-amber-700'
  return 'text-on-surface'
}

export default function UserRankings() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['rankings', page],
    queryFn: () => rankingService.global({ page, limit }),
  })

  const entries = data?.entries ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  const top3 = entries.slice(0, 3)

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl text-on-surface">排行榜</h1>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {top3.map((entry) => (
                <div key={entry.user_id} className="card p-6 text-center">
                  <div className={`text-4xl font-display font-bold mb-3 ${medalColor(entry.rank)}`}>
                    #{entry.rank}
                  </div>
                  <div className="flex justify-center mb-3">
                    <Avatar name={entry.username} src={entry.avatar} size="lg" />
                  </div>
                  <p className="font-display font-bold text-on-surface">{entry.username}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{entry.rating}</p>
                  <p className="text-sm text-on-surface-variant mt-1">{entry.solved} 题已解决</p>
                </div>
              ))}
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-16">排名</th>
                  <th>用户</th>
                  <th className="w-24">Rating</th>
                  <th className="w-24">已解决</th>
                  <th className="w-24">提交数</th>
                  <th className="w-24">通过率</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.user_id} className={entry.rank <= 3 ? 'bg-surface-container-low/50' : ''}>
                    <td className={`font-bold ${medalColor(entry.rank)}`}>#{entry.rank}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={entry.username} src={entry.avatar} size="sm" />
                        <span className="text-on-surface font-medium">{entry.username}</span>
                      </div>
                    </td>
                    <td className="text-primary font-bold">{entry.rating}</td>
                    <td className="text-on-surface-variant">{entry.solved}</td>
                    <td className="text-on-surface-variant">{entry.submissions}</td>
                    <td className="text-on-surface-variant">{entry.acceptance_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}
