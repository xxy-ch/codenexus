import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminService } from '@/services/admin'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

export function AdminDashboard() {
  const { user } = useAuthStore()

  // 管理员权限检查
  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">lock</span>
        <h2 className="text-xl font-bold mb-2">访问被拒绝</h2>
        <p className="text-slate-600">您没有管理员权限</p>
      </div>
    )
  }

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminService.getStats(),
  })

  const { data: systemHealth } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 30000, // 每30秒刷新
  })

  if (isLoading) return <Loading message="加载中..." />
  if (error || !stats) return <div className="text-center py-12">加载失败</div>

  const healthConfig = {
    healthy: { label: '正常', color: 'text-green-500', bg: 'bg-green-100', icon: 'check_circle' },
    warning: { label: '警告', color: 'text-yellow-500', bg: 'bg-yellow-100', icon: 'warning' },
    error: { label: '错误', color: 'text-red-500', bg: 'bg-red-100', icon: 'error' },
  }[stats.system_health]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理员仪表板</h1>
          <p className="text-sm text-slate-600">系统管理和监控</p>
        </div>
        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg', healthConfig.bg)}>
          <span className={cn('material-symbols-outlined', healthConfig.color)}>{healthConfig.icon}</span>
          <span className={cn('text-sm font-medium', healthConfig.color)}>{healthConfig.label}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-2xl text-blue-500">people</span>
            <Link to="/admin/users" className="text-xs text-primary hover:underline">查看详情</Link>
          </div>
          <p className="text-2xl font-bold">{stats.total_users}</p>
          <p className="text-sm text-slate-600">总用户数</p>
          <p className="text-xs text-green-500 mt-1">+{stats.active_users_today} 今日活跃</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-2xl text-green-500">code</span>
            <Link to="/admin/problems" className="text-xs text-primary hover:underline">查看详情</Link>
          </div>
          <p className="text-2xl font-bold">{stats.total_problems}</p>
          <p className="text-sm text-slate-600">题目总数</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-2xl text-purple-500">upload</span>
            <Link to="/admin/submissions" className="text-xs text-primary hover:underline">查看详情</Link>
          </div>
          <p className="text-2xl font-bold">{stats.total_submissions}</p>
          <p className="text-sm text-slate-600">总提交数</p>
          <p className="text-xs text-blue-500 mt-1">+{stats.submissions_today} 今日</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-2xl text-orange-500">emoji_events</span>
            <Link to="/admin/contests" className="text-xs text-primary hover:underline">查看详情</Link>
          </div>
          <p className="text-2xl font-bold">{stats.total_contests}</p>
          <p className="text-sm text-slate-600">竞赛总数</p>
          {stats.pending_reports > 0 && (
            <p className="text-xs text-red-500 mt-1">{stats.pending_reports} 待处理</p>
          )}
        </div>
      </div>

      {/* System Health */}
      {systemHealth && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">monitor_heart</span>
            系统健康状态
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">CPU使用率</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', systemHealth.cpu_usage > 80 ? 'bg-red-500' : systemHealth.cpu_usage > 60 ? 'bg-yellow-500' : 'bg-green-500')}
                    style={{ width: `${systemHealth.cpu_usage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{systemHealth.cpu_usage}%</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">内存使用率</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', systemHealth.memory_usage > 80 ? 'bg-red-500' : systemHealth.memory_usage > 60 ? 'bg-yellow-500' : 'bg-green-500')}
                    style={{ width: `${systemHealth.memory_usage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{systemHealth.memory_usage}%</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">磁盘使用率</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', systemHealth.disk_usage > 80 ? 'bg-red-500' : systemHealth.disk_usage > 60 ? 'bg-yellow-500' : 'bg-green-500')}
                    style={{ width: `${systemHealth.disk_usage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{systemHealth.disk_usage}%</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">活跃判题机</p>
              <p className="text-2xl font-bold text-green-500">{systemHealth.active_judges}</p>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">队列长度</p>
              <p className="text-2xl font-bold">{systemHealth.queue_length}</p>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">平均响应</p>
              <p className="text-2xl font-bold">{systemHealth.avg_response_time}ms</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/admin/users" className="bg-white dark:bg-slate-900 rounded-xl border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl text-blue-500">manage_accounts</span>
            <div>
              <h3 className="font-semibold">用户管理</h3>
              <p className="text-sm text-slate-600">管理用户和权限</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/problems" className="bg-white dark:bg-slate-900 rounded-xl border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl text-green-500">library_books</span>
            <div>
              <h3 className="font-semibold">题目管理</h3>
              <p className="text-sm text-slate-600">创建和编辑题目</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/reports" className="bg-white dark:bg-slate-900 rounded-xl border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl text-orange-500">flag</span>
            <div>
              <h3 className="font-semibold">举报管理</h3>
              <p className="text-sm text-slate-600">{stats.pending_reports} 待处理</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
        <h3 className="font-semibold mb-4">最近活动</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined text-blue-500">person_add</span>
            <div className="flex-1">
              <p className="text-sm font-medium">新用户注册</p>
              <p className="text-xs text-slate-500">2分钟前</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined text-green-500">check_circle</span>
            <div className="flex-1">
              <p className="text-sm font-medium">题目审核通过</p>
              <p className="text-xs text-slate-500">15分钟前</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined text-purple-500">emoji_events</span>
            <div className="flex-1">
              <p className="text-sm font-medium">新竞赛创建</p>
              <p className="text-xs text-slate-500">1小时前</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}