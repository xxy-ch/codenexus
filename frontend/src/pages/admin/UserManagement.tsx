import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BadgeCheck, ChevronRight, KeyRound, ShieldPlus, UserCog, Users } from 'lucide-react'
import { adminService } from '@/services/admin'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import type { BatchCreateAdminUser } from '@/types/admin'
import type { Role } from '@/types/auth'
import { isAdmin } from '@/types/auth'

type RoleType = Role
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
        role: (roleValue as RoleType | undefined) || 'student',
      }
    })
    .filter((item) => item.user_code)

  const overview = useMemo(() => {
    const adminCount = users.filter((u: any) => isAdmin(u.role)).length
    const teacherCount = users.filter((u: any) => u.role === 'teacher').length
    const activeCount = users.filter((u: any) => u.status === 'active').length
    const codedCount = users.filter((u: any) => u.user_code).length

    return { adminCount, teacherCount, activeCount, codedCount }
  }, [users])

  const getRoleBadge = (roleValue: RoleType) => {
    const config: Record<string, { label: string; color: string }> = {
      root: { label: '超级管理员', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
      organizationadmin: { label: '机构管理员', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
      campusadmin: { label: '校区管理员', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
      teacher: { label: '教师', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      teachingassistant: { label: '助教', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
      student: { label: '学生', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    }
    const c = config[roleValue] ?? config.student

    return <span className={cn('rounded-full px-3 py-1 text-xs font-medium', c.color)}>{c.label}</span>
  }

  const getStatusBadge = (statusValue: string) => {
    const map = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      banned: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    }

    return (
      <span className={cn('rounded-full px-3 py-1 text-xs font-medium', map[statusValue as keyof typeof map] ?? map.inactive)}>
        {statusValue === 'active' ? '活跃' : statusValue === 'inactive' ? '停用' : '封禁'}
      </span>
    )
  }

  if (isLoading) return <Loading message="加载用户管理视图..." />

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-950">用户管理加载失败</h2>
        <p className="mt-2 text-sm text-slate-600">当前无法读取真实用户列表。</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#eef2ff_100%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Admin</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-900">User Management</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">用户管理</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  按 reference 的后台账号页重做。当前已接入真实用户列表、角色切换、状态开关和批量建号流程，内部主键继续使用 UUID，
                  外部业务编号使用 12 位 `user_code`。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                共 {total} 名用户
              </div>
              <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                UUID + user_code
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Active Users</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{overview.activeCount}</div>
          <p className="mt-2 text-sm text-slate-600">当前筛选结果中的活跃账号。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Admins</span>
            <ShieldPlus className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-rose-600">{overview.adminCount}</div>
          <p className="mt-2 text-sm text-slate-600">具备后台权限的账号数。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Teachers</span>
            <UserCog className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-blue-600">{overview.teacherCount}</div>
          <p className="mt-2 text-sm text-slate-600">教师角色账号数量。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">User Codes</span>
            <BadgeCheck className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-emerald-600">{overview.codedCount}</div>
          <p className="mt-2 text-sm text-slate-600">已分配 12 位业务号的账号数。</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">业务号与内部主键已分离</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                批量创建仅录入 `user_code`、展示名、邮箱和角色。系统会自动生成内部 UUID 主键，避免把外部业务号直接作为数据库主键。
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            12-digit user_code only
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 border-b border-slate-200 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <input
                  type="search"
                  placeholder="搜索 user_code、用户名、邮箱..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)
                  setPage(1)
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">所有角色</option>
                <option value="root">管理员</option>
                <option value="teacher">教师</option>
                <option value="student">学生</option>
              </select>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">停用</option>
                <option value="banned">封禁</option>
              </select>
            </div>

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
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">批量创建账户</h2>
                <p className="mt-1 text-sm text-slate-500">格式：`user_code,display_name,email,role`</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                UUID auto
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={8}
                placeholder={'240101070014,张三,zhangsan@example.com,user\n240101070015,李四,,teacher'}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">默认密码</label>
                <input
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  待创建 <span className="font-semibold text-slate-950">{parsedBulkUsers.length}</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  跳过 <span className="font-semibold text-slate-950">{batchCreateMutation.data?.skipped?.length ?? 0}</span>
                </div>
              </div>

              <Button
                variant="primary"
                disabled={parsedBulkUsers.length === 0 || batchCreateMutation.isPending}
                onClick={() => batchCreateMutation.mutate(parsedBulkUsers)}
                className="w-full"
              >
                {batchCreateMutation.isPending ? '创建中...' : '批量创建'}
              </Button>
            </div>
          </div>
        </div>

        {batchCreateMutation.data?.skipped?.length ? (
          <div className="mx-6 mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {batchCreateMutation.data.skipped.map((item: { user_code: string; reason: string }) => (
              <p key={`${item.user_code}-${item.reason}`}>
                {item.user_code}: {item.reason}
              </p>
            ))}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Identity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((user) => (
                <tr key={user.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-4">
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
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {getRoleBadge(user.role)}
                      <select
                        value={user.role}
                        onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value as RoleType })}
                        disabled={updateRoleMutation.isPending}
                        className="block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="student">学生</option>
                        <option value="teacher">教师</option>
                        <option value="root">管理员</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">
                      <div>{user.submissions_count} submissions</div>
                      <div className="mt-1 text-slate-500">{user.problems_solved} solved</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
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

        {users.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="text-lg font-semibold text-slate-900">未找到用户</div>
            <p className="mt-2 text-sm text-slate-600">尝试调整搜索条件，或者确认当前环境是否已导入演示账号。</p>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-500">
            当前页 {page} / {totalPages}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
