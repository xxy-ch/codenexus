import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, KeyRound, RotateCcw, ShieldPlus, UserCog, Users } from 'lucide-react'
import { EmptyState } from '@/components/page/EmptyState'
import { FieldGroup } from '@/components/page/FieldGroup'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { adminService } from '@/services/admin'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import type { BatchCreateAdminUser } from '@/types/admin'

type RoleType = 'user' | 'admin' | 'teacher'
type SortType = 'recent' | 'name' | 'submissions' | 'rating'

export function UserManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [page, setPage] = useState(1)
  const [bulkInput, setBulkInput] = useState('')
  const [defaultPassword, setDefaultPassword] = useState('ChangeMe123')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminUsers', search, role, status, sortBy, page],
    queryFn: () =>
      adminService.getUsers({
        search: search || undefined,
        role: role === 'all' ? undefined : (role as RoleType),
        status: status === 'all' ? undefined : status,
        sort: sortBy,
        page,
        limit: 20,
      }),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: RoleType }) => adminService.updateUserRole(userId, role),
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

  const getRoleBadge = (roleValue: RoleType) => {
    const config = {
      admin: { label: '管理员', color: 'bg-rose-100 text-rose-700' },
      teacher: { label: '教师', color: 'bg-blue-100 text-blue-700' },
      user: { label: '学生', color: 'bg-slate-100 text-slate-700' },
    }[roleValue]

    return <span className={cn('rounded-full px-3 py-1 text-xs font-medium', config.color)}>{config.label}</span>
  }

  const getStatusBadge = (statusValue: string) => {
    const map = {
      active: 'bg-emerald-100 text-emerald-700',
      inactive: 'bg-slate-100 text-slate-700',
      banned: 'bg-rose-100 text-rose-700',
    }

    return (
      <span className={cn('rounded-full px-3 py-1 text-xs font-medium', map[statusValue as keyof typeof map] ?? map.inactive)}>
        {statusValue === 'active' ? '活跃' : statusValue === 'inactive' ? '停用' : '封禁'}
      </span>
    )
  }

  if (isLoading) {
    return <Loading message="加载用户管理视图..." />
  }

  if (error) {
    return (
      <EmptyState
        title="用户管理加载失败"
        description="当前无法读取真实用户列表。"
        action={<Button onClick={() => refetch()}>重试</Button>}
        className="border-rose-200 bg-rose-50"
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        breadcrumb={['Identity']}
        title="用户管理"
        description="账号后台切到更高密度的管理视图。查询、角色切换、状态开关和批量建号仍走现有真实接口，不改 payload 和查询语义。"
        actions={
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              共 {total} 名用户
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4" />
              刷新
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Users" value={overview.activeCount} helper="当前筛选结果中的活跃账号。" />
        <StatCard label="Admins" value={<span className="text-rose-600">{overview.adminCount}</span>} helper="具备后台权限的账号数。" />
        <StatCard label="Teachers" value={<span className="text-blue-600">{overview.teacherCount}</span>} helper="教师角色账号数量。" />
        <StatCard label="User Codes" value={<span className="text-emerald-600">{overview.codedCount}</span>} helper="已分配业务号的账号数。" />
      </div>

      <SurfaceCard tone="muted" className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950">业务号与内部主键保持分离</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              批量创建只录入 `user_code`、展示名、邮箱和角色。系统继续自动生成内部 UUID 主键，避免把业务号直接作为数据库主键。
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          UUID + 12-digit user_code
        </div>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionBlock title="用户列表" description="统一后的管理列表保留原有搜索、筛选、分页和角色操作。">
          <div className="space-y-5">
            <FilterBar>
              <div className="min-w-[260px] flex-1">
                <input
                  aria-label="搜索用户"
                  type="search"
                  placeholder="搜索 user_code、用户名、邮箱..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <select
                aria-label="角色筛选"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)
                  setPage(1)
                }}
                className="h-11 min-w-[140px] rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">所有角色</option>
                <option value="admin">管理员</option>
                <option value="teacher">教师</option>
                <option value="user">学生</option>
              </select>
              <select
                aria-label="状态筛选"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="h-11 min-w-[140px] rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">停用</option>
                <option value="banned">封禁</option>
              </select>
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
                      'rounded-full px-4 py-2 text-sm font-medium transition',
                      sortBy === option.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </FilterBar>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 bg-white">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Identity</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Activity</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Created</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="align-top transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                            {(user.display_name || user.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-950">{user.display_name || user.username}</p>
                            <p className="mt-1 text-xs text-slate-500">@{user.username}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {user.user_code || 'No user_code'} · {user.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          {getRoleBadge(user.role)}
                          <select
                            aria-label={`更新 ${user.username} 角色`}
                            value={user.role}
                            onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value as RoleType })}
                            disabled={updateRoleMutation.isPending}
                            className="block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                          >
                            <option value="user">学生</option>
                            <option value="teacher">教师</option>
                            <option value="admin">管理员</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(user.status)}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        <div>{user.submissions_count} submissions</div>
                        <div className="mt-1 text-slate-500">{user.problems_solved} solved</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
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
              <EmptyState
                title="未找到用户"
                description="尝试调整搜索条件，或者确认当前环境是否已导入演示账号。"
                className="shadow-none"
              />
            ) : null}

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">
                当前页 {page} / {totalPages}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                  上一页
                </Button>
                <Button variant="primary" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                  下一页
                </Button>
              </div>
            </div>
          </div>
        </SectionBlock>

        <SectionBlock title="批量创建账户" description="格式保持 `user_code,display_name,email,role`，继续走现有批量建号接口。">
          <div className="space-y-4">
            <FieldGroup label="批量输入" description="每行一条，user_code 必填。">
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={10}
                placeholder={'240101070014,张三,zhangsan@example.com,user\n240101070015,李四,,teacher'}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </FieldGroup>

            <FieldGroup label="默认密码">
              <input
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </FieldGroup>

            <div className="grid gap-3 sm:grid-cols-2">
              <SurfaceCard className="rounded-2xl p-4 shadow-none">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pending</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{parsedBulkUsers.length}</div>
              </SurfaceCard>
              <SurfaceCard className="rounded-2xl p-4 shadow-none">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Skipped</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{batchCreateMutation.data?.skipped?.length ?? 0}</div>
              </SurfaceCard>
            </div>

            <Button
              fullWidth
              disabled={parsedBulkUsers.length === 0 || batchCreateMutation.isPending}
              onClick={() => batchCreateMutation.mutate(parsedBulkUsers)}
            >
              {batchCreateMutation.isPending ? '创建中...' : '批量创建'}
            </Button>

            {batchCreateMutation.data?.skipped?.length ? (
              <SurfaceCard className="rounded-2xl border-amber-200 bg-amber-50 p-4 shadow-none">
                <div className="space-y-1 text-sm text-amber-800">
                  {batchCreateMutation.data.skipped.map((item: { user_code: string; reason: string }) => (
                    <p key={`${item.user_code}-${item.reason}`}>
                      {item.user_code}: {item.reason}
                    </p>
                  ))}
                </div>
              </SurfaceCard>
            ) : null}
          </div>
        </SectionBlock>
      </div>
    </div>
  )
}
