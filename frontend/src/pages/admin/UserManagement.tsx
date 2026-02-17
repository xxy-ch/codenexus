import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

type RoleType = 'user' | 'admin' | 'moderator'
type SortType = 'recent' | 'name' | 'submissions' | 'rating'

export function UserManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminUsers', search, role, status, sortBy, page],
    queryFn: () => adminService.getUsers({
      search: search || undefined,
      role: role === 'all' ? undefined : (role as RoleType),
      status: status === 'all' ? undefined : status,
      sort: sortBy,
      page,
      limit: 20,
    }),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: RoleType }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (userId: string) => adminService.toggleUserStatus(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
    },
  })

  if (isLoading) return <Loading message="加载中..." />
  if (error) return <div className="text-center py-12">加载失败</div>

  const users = data?.users || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 20)

  const getRoleBadge = (role: RoleType) => {
    const config = {
      admin: { label: '管理员', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      moderator: { label: '版主', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      user: { label: '用户', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
    }[role]

    return (
      <span className={cn('px-2 py-1 rounded text-xs font-medium', config.color)}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-sm text-slate-600">管理用户权限和状态</p>
        </div>
        <div className="text-sm text-slate-600">
          共 {total} 名用户
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="search"
              placeholder="搜索用户名、邮箱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {/* Role Filter */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">所有角色</option>
            <option value="admin">管理员</option>
            <option value="moderator">版主</option>
            <option value="user">普通用户</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">所有状态</option>
            <option value="active">活跃</option>
            <option value="inactive">停用</option>
            <option value="banned">封禁</option>
          </select>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-slate-600">排序：</span>
          <div className="flex gap-2">
            {[
              { value: 'recent', label: '最新' },
              { value: 'name', label: '名称' },
              { value: 'submissions', label: '提交数' },
              { value: 'rating', label: '评分' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as SortType)}
                className={cn(
                  'px-3 py-1 rounded text-sm transition-colors',
                  sortBy === option.value
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">统计</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">注册时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-white font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value as RoleType })}
                      disabled={updateRoleMutation.isPending}
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer',
                        'focus:ring-2 focus:ring-primary'
                      )}
                    >
                      <option value="user">用户</option>
                      <option value="moderator">版主</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        user.status === 'active' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        user.status === 'inactive' && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
                        user.status === 'banned' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}
                    >
                      {user.status === 'active' ? '活跃' : user.status === 'inactive' ? '停用' : '封禁'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p>{user.submissions_count} 提交</p>
                      <p className="text-slate-500">{user.problems_solved} 已解决</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatusMutation.mutate(user.id)}
                        disabled={toggleStatusMutation.isPending}
                      >
                        {user.status === 'active' ? '停用' : '启用'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">search_off</span>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">未找到用户</p>
            <p className="text-sm text-slate-600">尝试调整搜索条件</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="px-4 py-2 text-sm text-slate-600">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
