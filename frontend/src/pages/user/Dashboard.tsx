import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { problemsService } from '@/services/problemsService'
import { rankingService } from '@/services/rankingService'
import { contestsService } from '@/services/contestsService'
import Loading from '@/components/ui/Loading'
import StatusBadge from '@/components/ui/StatusBadge'

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: () => rankingService.userStats(user!.id),
    enabled: !!user?.id,
  })

  const { data: submissions, isLoading: subsLoading } = useQuery({
    queryKey: ['recent-submissions'],
    queryFn: () => problemsService.getSubmissions({ limit: 5 }),
  })

  const { data: contests, isLoading: contestsLoading } = useQuery({
    queryKey: ['active-contests'],
    queryFn: () => contestsService.list({ status: 'running', limit: 3 }),
  })

  const stats = userStats || { solved: 0, total_submissions: 0, acceptance_rate: 0, rating: 0 }
  const loading = statsLoading || subsLoading || contestsLoading
  const acceptanceRate = Number(stats.acceptance_rate ?? 0)

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="action-gradient rounded-xl p-6 text-white">
        <h1 className="font-display font-bold text-2xl mb-1">
          欢迎回来, {user?.username || '用户'}
        </h1>
        <p className="text-white/80 text-sm">继续你的编程之旅</p>
        <div className="flex gap-3 mt-4">
          <Link to="/problems" className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
            开始做题
          </Link>
          <Link to="/contests" className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
            参加比赛
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-6">
          <p className="text-sm text-on-surface-variant mb-1">已解决问题</p>
          <p className="font-display font-bold text-3xl text-primary">{stats.solved ?? 0}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-on-surface-variant mb-1">总提交数</p>
          <p className="font-display font-bold text-3xl text-primary">{stats.total_submissions ?? 0}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-on-surface-variant mb-1">通过率</p>
          <p className="font-display font-bold text-3xl text-primary">{acceptanceRate.toFixed(1)}%</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-on-surface-variant mb-1">当前 Rating</p>
          <p className="font-display font-bold text-3xl text-primary">{stats.rating ?? user?.rating ?? 0}</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-4">最近提交</h2>
        {submissions?.submissions && submissions.submissions.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>题目</th>
                <th>状态</th>
                <th>语言</th>
                <th>用时</th>
                <th>提交时间</th>
              </tr>
            </thead>
            <tbody>
              {submissions.submissions.map((sub: any) => (
                <tr key={sub.id}>
                  <td className="text-on-surface">{sub.problem_title || sub.problem_id}</td>
                  <td><StatusBadge status={sub.status} /></td>
                  <td className="text-on-surface-variant text-sm">{sub.language}</td>
                  <td className="text-on-surface-variant text-sm">{sub.time_ms ? `${sub.time_ms}ms` : '-'}</td>
                  <td className="text-on-surface-variant text-sm">{new Date(sub.created_at).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-on-surface-variant text-sm text-center py-8">暂无提交记录</p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-4">进行中的比赛</h2>
        {contests?.contests && contests.contests.length > 0 ? (
          <div className="space-y-3">
            {contests.contests.map((contest: any) => (
              <Link
                key={contest.id}
                to={`/contests/${contest.id}`}
                className="flex items-center justify-between p-4 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors block"
              >
                <div>
                  <p className="font-semibold text-on-surface">{contest.title}</p>
                  <p className="text-sm text-on-surface-variant">
                    {new Date(contest.start_time).toLocaleString('zh-CN')} - {new Date(contest.end_time).toLocaleString('zh-CN')}
                  </p>
                </div>
                <span className="badge-accepted px-3 py-1 rounded-full text-xs font-semibold">进行中</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-on-surface-variant text-sm text-center py-8">暂无进行中的比赛</p>
        )}
      </div>
    </div>
  )
}
