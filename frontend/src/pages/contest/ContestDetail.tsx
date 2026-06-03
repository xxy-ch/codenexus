import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { contestsService } from '@/services/contestsService'
import { useToast } from '@/components/ui/Toast'
import Loading from '@/components/ui/Loading'

const statusLabel = (s: string) => {
  const map: Record<string, string> = { not_started: '未开始', running: '进行中', ended: '已结束' }
  return map[s] || s
}

export default function ContestDetail() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [tab, setTab] = useState<'problems' | 'rankings' | 'submissions'>('problems')

  const { data: contest, isLoading: contestLoading } = useQuery({
    queryKey: ['contest', id],
    queryFn: () => contestsService.get(id!),
    enabled: !!id,
  })

  const { data: problems } = useQuery({
    queryKey: ['contest-problems', id],
    queryFn: () => contestsService.getProblems(id!),
    enabled: !!id,
  })

  const { data: rankings } = useQuery({
    queryKey: ['contest-rankings', id],
    queryFn: () => contestsService.getRankings(id!),
    enabled: !!id,
  })

  const registerMutation = useMutation({
    mutationFn: () => contestsService.register(id!),
    onSuccess: () => showToast('报名成功', 'success'),
    onError: () => showToast('报名失败', 'error'),
  })

  if (contestLoading) return <Loading />
  if (!contest) return <div className="card p-12 text-center text-on-surface-variant">竞赛不存在</div>

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl text-on-surface">{contest.title}</h1>
            <p className="text-on-surface-variant mt-1">{contest.description}</p>
            <div className="flex gap-4 mt-3 text-sm text-on-surface-variant">
              <span>开始: {new Date(contest.start_time).toLocaleString('zh-CN')}</span>
              <span>结束: {new Date(contest.end_time).toLocaleString('zh-CN')}</span>
              <span>参赛: {contest.participants ?? 0} 人</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge-${contest.status === 'running' ? 'accepted' : contest.status === 'ended' ? 'compilation' : 'pending'}`}>
              {statusLabel(contest.status)}
            </span>
            {contest.status === 'running' && (
              <button className="btn-primary" onClick={() => registerMutation.mutate()} disabled={registerMutation.isPending}>
                {registerMutation.isPending ? '报名中...' : '报名参赛'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {([['problems', '题目列表'], ['rankings', '排行榜'], ['submissions', '我的提交']] as const).map(([key, label]) => (
          <button
            key={key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'problems' && (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">题号</th>
                <th>题目</th>
                <th className="w-20">分值</th>
                <th className="w-20">通过率</th>
              </tr>
            </thead>
            <tbody>
              {problems?.map((p: any, i: number) => (
                <tr key={p.problem_id || i}>
                  <td className="font-bold text-primary">{String.fromCharCode(65 + i)}</td>
                  <td>
                    <Link to={`/problems/${p.problem_id}`} className="text-primary hover:underline">
                      {p.problem_title || p.title}
                    </Link>
                  </td>
                  <td className="text-on-surface-variant">{p.points ?? '-'}</td>
                  <td className="text-on-surface-variant">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rankings' && (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">排名</th>
                <th>用户</th>
                <th className="w-20">总分</th>
                <th className="w-20">已解决</th>
                <th className="w-20">罚时</th>
              </tr>
            </thead>
            <tbody>
              {rankings?.map((entry: any) => (
                <tr key={entry.user_id}>
                  <td className="font-bold text-on-surface">#{entry.rank}</td>
                  <td className="text-on-surface">{entry.username}</td>
                  <td className="text-primary font-bold">{entry.score}</td>
                  <td className="text-on-surface-variant">{entry.solved}</td>
                  <td className="text-on-surface-variant">{entry.penalty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'submissions' && (
        <div className="card p-12 text-center">
          <p className="text-on-surface-variant">暂无提交记录</p>
        </div>
      )}
    </div>
  )
}
