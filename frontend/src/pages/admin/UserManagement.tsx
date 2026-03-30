import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { adminService } from '@/services/admin'
import { cn } from '@/lib/utils'
import type { BatchCreateAdminUser } from '@/types/admin'

type RoleType = 'user' | 'admin' | 'teacher'
type SortType = 'recent' | 'name' | 'submissions' | 'rating'

const ROLE_CONFIG: Record<RoleType, { label: string; className: string }> = {
  admin: { label: '管理员', className: 'bg-error-container text-on-error-container' },
  teacher: { label: '教师', className: 'bg-primary-container text-on-primary-container' },
  user: { label: '学生', className: 'bg-surface-container-low text-on-surface-variant' },
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: '活跃', className: 'bg-tertiary-container text-on-tertiary-fixed-variant' },
  inactive: { label: '停用', className: 'bg-surface-container-low text-on-surface-variant' },
  banned: { label: '封禁', className: 'bg-error-container text-on-error-container' },
}

export function UserManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [page, setPage] = useState(1)
  const [bulkInput, setBulkInput] = useState('')
  const [defaultPassword, setDefaultPassword] = useState('ChangeMe123')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminUsers', search, role, statusFilter, sortBy, page],
    queryFn: () =>
      adminService.getUsers({
        search: search || undefined,
        role: role === 'all' ? undefined : (role as RoleType),
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort: sortBy,
        page,
        limit: 20,
      }),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role: userRole }: { userId: string; role: RoleType }) => adminService.updateUserRole(userId, userRole),
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

  const batchCreateMutation = useMutation({
    mutationFn: (users: BatchCreateAdminUser[]) =>
      adminService.batchCreateUsers({
        users,
        default_password: defaultPassword,
        organization_id: 1,
        campus_id: 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      setBulkInput('')
    },
  })

  const users = data?.users || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const parsedBulkUsers = bulkInput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [user_code, display_name, email, roleValue] = line.split(',').map((part) => part?.trim())
      return {
        user_code,
        display_name: display_name || undefined,
        email: email || undefined,
        role: (roleValue as RoleType | undefined) || 'user',
      }
    })
    .filter((item) => item.user_code)

  const overview = useMemo(() => {
    const adminCount = users.filter((user) => user.role === 'admin').length
    const teacherCount = users.filter((user) => user.role === 'teacher').length
    const activeCount = users.filter((user) => user.status === 'active').length
    const codedCount = users.filter((user) => user.user_code).length

    return { adminCount, teacherCount, activeCount, codedCount }
  }, [users])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="加载用户管理视图..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <ErrorState
          title="用户管理加载失败"
          description="当前无法读取真实用户列表。"
          action={{ label: '重试', onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            管理台 / 身份管理
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            用户管理
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            账号后台切到更高密度的管理视图。查询、角色切换、状态开关和批量建号仍走现有真实接口，不改 payload 和查询语义。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface">
            共 {total} 名用户
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <span className="material-symbols-outlined text-base">refresh</span>
            刷新
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card variant="surface" className="flex flex-col gap-3 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tertiary-container text-tertiary">
            <span className="material-symbols-outlined text-2xl">key</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-on-surface">业务号与内部主键保持分离</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-on-surface-variant">
              批量创建只录入 user_code、展示名、邮箱和角色。系统继续自动生成内部 UUID 主键，避免把业务号直接作为数据库主键。
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-outline bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          UUID + 12 位学号
        </span>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">活跃用户</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{overview.activeCount}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前筛选结果中的活跃账号</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">管理员</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-error">{overview.adminCount}</p>
          <p className="mt-2 text-sm text-on-surface-variant">具备后台权限的账号数</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">教师</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{overview.teacherCount}</p>
          <p className="mt-2 text-sm text-on-surface-variant">教师角色账号数量</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">学号</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-tertiary">{overview.codedCount}</p>
          <p className="mt-2 text-sm text-on-surface-variant">已分配业务号的账号数</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* User List */}
        <Card variant="default" className="p-6">
          <div className="mb-5">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">用户列表</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              统一后的管理列表保留原有搜索、筛选、分页和角色操作
            </p>
          </div>

          <div className="space-y-5">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <Input
                    type="search"
                    aria-label="搜索用户"
                    placeholder="搜索 user_code、用户名、邮箱..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
                <select
                  aria-label="角色筛选"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value)
                    setPage(1)
                  }}
                  className="h-10 rounded-lg border border-outline-variant bg-surface px-4 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">所有角色</option>
                  <option value="admin">管理员</option>
                  <option value="teacher">教师</option>
                  <option value="user">学生</option>
                </select>
                <select
                  aria-label="状态筛选"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  className="h-10 rounded-lg border border-outline-variant bg-surface px-4 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">所有状态</option>
                  <option value="active">活跃</option>
                  <option value="inactive">停用</option>
                  <option value="banned">封禁</option>
                </select>
              </div>
            </Card>

            {/* Sort Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: 'recent', label: '最新' },
                { value: 'name', label: '名称' },
                { value: 'submissions', label: '提交数' },
                { value: 'rating', label: '评分' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortBy(option.value as SortType)}
                  className={cn(
                    'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
                    sortBy === option.value
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-outline-variant/10">
                  <thead className="bg-surface-container-low/50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">身份</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">角色</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">状态</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">活跃度</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">创建时间</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {users.map((user) => (
                      <tr key={user.id} className="align-top transition-colors hover:bg-surface-container-low/30">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                              {(user.display_name || user.username).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-on-surface">{user.display_name || user.username}</p>
                              <p className="mt-1 text-xs text-on-surface-variant">@{user.username}</p>
                              <p className="mt-1 text-sm text-on-surface-variant">
                                {user.user_code || '暂无学号'} · {user.email || '暂无邮箱'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', ROLE_CONFIG[user.role]?.className)}>
                              {ROLE_CONFIG[user.role]?.label ?? user.role}
                            </span>
                            <select
                              aria-label={`更新 ${user.username} 角色`}
                              value={user.role}
                              onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value as RoleType })}
                              disabled={updateRoleMutation.isPending}
                              className="block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              <option value="user">学生</option>
                              <option value="teacher">教师</option>
                              <option value="admin">管理员</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', STATUS_CONFIG[user.status]?.className ?? STATUS_CONFIG.inactive.className)}>
                            {STATUS_CONFIG[user.status]?.label ?? user.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-on-surface">
                          <div>{user.submissions_count} 次提交</div>
                          <div className="mt-1 text-on-surface-variant">{user.problems_solved} 题已通过</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant">{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
                        <td className="px-5 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate(user.id)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {user.status === 'active' ? '停用' : '启用'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 ? (
                <div className="p-12">
                  <EmptyState
                    title="未找到用户"
                    description="尝试调整搜索条件，或者确认当前环境是否已导入基础账号数据。"
                    icon={<span className="material-symbols-outlined text-6xl text-on-surface-variant">person_off</span>}
                  />
                </div>
              ) : null}
            </Card>

            {/* Pagination */}
            <div className="flex flex-col gap-4 rounded-lg border border-outline-variant/20 bg-surface-container-low/50 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-on-surface-variant">
                当前页 {page} / {totalPages}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                  上一页
                </Button>
                <Button onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                  下一页
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Bulk Create Card */}
        <Card variant="default" className="p-6">
          <div className="mb-4">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">批量创建账户</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              格式保持 user_code,display_name,email,role，继续走现有批量建号接口
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">批量输入</label>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={10}
                placeholder={'240101070014,张三,zhangsan@example.com,user\n240101070015,李四,,teacher'}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-on-surface-variant">每行一条，user_code 必填</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">默认密码</label>
              <Input
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card variant="surface" className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">待导入</p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">{parsedBulkUsers.length}</p>
              </Card>
              <Card variant="surface" className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">已跳过</p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">{batchCreateMutation.data?.skipped?.length ?? 0}</p>
              </Card>
            </div>

            <Button
              fullWidth
              disabled={parsedBulkUsers.length === 0 || batchCreateMutation.isPending}
              onClick={() => batchCreateMutation.mutate(parsedBulkUsers)}
            >
              <span className="material-symbols-outlined text-base">group_add</span>
              {batchCreateMutation.isPending ? '创建中...' : '批量创建'}
            </Button>

            {batchCreateMutation.data?.skipped?.length ? (
              <Card variant="surface" className="border-tertiary-container bg-tertiary-container/20 p-4">
                <p className="text-sm font-semibold text-on-tertiary-fixed-variant">跳过记录</p>
                <div className="mt-3 space-y-1 text-sm text-on-tertiary-fixed-variant">
                  {batchCreateMutation.data.skipped.map((item: { user_code: string; reason: string }) => (
                    <p key={`${item.user_code}-${item.reason}`}>
                      {item.user_code}: {item.reason}
                    </p>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default UserManagement
