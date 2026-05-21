import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, ChevronRight, KeyRound, ShieldPlus, UserCog, Users } from 'lucide-react'
import { adminService } from '@/services/admin'
import { gradesService } from '@/services/grades'
import { Button } from '@/components/ui/Button'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
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
  const [selectedGradeId, setSelectedGradeId] = useState<string>('')

  const { user } = useAuthStore()

  // Campus ID for grade filtering — derived from logged-in admin's JWT campus_id
  const gradeCampusId = user?.campus_id ?? 1

  const { data: gradesData } = useQuery({
    queryKey: ['grades', gradeCampusId],
    queryFn: () => gradesService.listGrades(gradeCampusId),
    staleTime: 5 * 60 * 1000,
  })

  const activeGrades = (gradesData?.grades || []).filter((g) => g.is_active)

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
        organization_id: user?.organization_id ?? 1,
        campus_id: user?.campus_id ?? 1,
        grade_id: selectedGradeId ? Number(selectedGradeId) : undefined,
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

  // Build a grade name lookup from the grades query data
  const gradeNameMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const g of activeGrades) {
      map.set(g.id, g.name)
    }
    return map
  }, [activeGrades])

  const getRoleBadge = (roleValue: RoleType) => {
    const config: Record<string, { label: string; color: string }> = {
      root: { label: '超级管理员', color: 'bg-destructive/10 text-destructive' },
      gradeAdmin: { label: '年级管理员', color: 'bg-difficulty-medium/10 text-difficulty-medium' },
      campusAdmin: { label: '校区管理员', color: 'bg-destructive/10 text-destructive' },
      teacher: { label: '教师', color: 'bg-primary/10 text-primary' },
      teachingAssistant: { label: '助教', color: 'bg-status-accepted/10 text-status-accepted' },
      student: { label: '学生', color: 'bg-muted text-muted-foreground' },
    }
    const c = config[roleValue] ?? config.student

    return <span className={cn('rounded-full px-3 py-1 text-[13px] font-medium', c.color)}>{c.label}</span>
  }

  const getStatusBadge = (statusValue: string) => {
    const map: Record<string, { label: string; color: string }> = {
      active: { label: '活跃', color: 'bg-status-accepted/10 text-status-accepted' },
      inactive: { label: '停用', color: 'bg-muted text-muted-foreground' },
      banned: { label: '封禁', color: 'bg-destructive/10 text-destructive' },
    }
    const entry = map[statusValue] ?? map.inactive

    return <span className={cn('rounded-full px-3 py-1 text-[13px] font-medium', entry.color)}>{entry.label}</span>
  }

  if (isLoading) return <TableSkeleton rows={8} columns={7} />

  if (error) {
    return <InlineError title="用户管理加载失败" onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">用户管理</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">用户管理</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">
              管理平台用户账号、角色分配、状态开关和批量建号流程。内部主键使用 UUID，外部业务编号使用 12 位 user_code。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground">
              共 {total} 名用户
            </div>
            <div className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              UUID + user_code
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-secondary">活跃用户</span>
            <Users className="h-4 w-4 text-secondary" />
          </div>
          <div className="mt-4 text-2xl font-bold text-foreground">{overview.activeCount}</div>
          <p className="mt-2 text-[13px] text-tertiary">当前筛选结果中的活跃账号。</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-secondary">管理员</span>
            <ShieldPlus className="h-4 w-4 text-secondary" />
          </div>
          <div className="mt-4 text-2xl font-bold text-destructive">{overview.adminCount}</div>
          <p className="mt-2 text-[13px] text-tertiary">具备后台权限的账号数。</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-secondary">教师</span>
            <UserCog className="h-4 w-4 text-secondary" />
          </div>
          <div className="mt-4 text-2xl font-bold text-primary">{overview.teacherCount}</div>
          <p className="mt-2 text-[13px] text-tertiary">教师角色账号数量。</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-secondary">业务号</span>
            <BadgeCheck className="h-4 w-4 text-secondary" />
          </div>
          <div className="mt-4 text-2xl font-bold text-status-accepted">{overview.codedCount}</div>
          <p className="mt-2 text-[13px] text-tertiary">已分配 12 位业务号的账号数。</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-difficulty-medium/20 bg-difficulty-medium/5 px-5 py-4 shadow-whisper">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-difficulty-medium/10 text-difficulty-medium">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">业务号与内部主键已分离</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                批量创建仅录入 user_code、展示名、邮箱和角色。系统会自动生成内部 UUID 主键，避免把外部业务号直接作为数据库主键。
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-difficulty-medium/20 bg-difficulty-medium/10 px-3 py-2 text-[13px] font-semibold uppercase tracking-widest text-difficulty-medium">
            12-digit user_code
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-card">
        <div className="grid gap-6 border-b border-border/40 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* Filters */}
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
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)
                  setPage(1)
                }}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                    'rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
                    sortBy === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Create */}
          <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">批量创建账户</h2>
                <p className="mt-1 text-[13px] text-tertiary">格式：user_code,display_name,email,role</p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                UUID auto
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={8}
                placeholder={'240101070014,张三,zhangsan@example.com,user\n240101070015,李四,,teacher'}
                className="w-full rounded-lg border border-border/40 bg-transparent px-4 py-3 font-mono text-[13px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <div>
                <label className="mb-2 block text-[13px] font-medium text-muted-foreground">默认密码</label>
                <input
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  className="w-full rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-medium text-muted-foreground">指定年级</label>
                <select
                  value={selectedGradeId}
                  onChange={(e) => setSelectedGradeId(e.target.value)}
                  className="w-full rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">不指定年级</option>
                  {activeGrades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.academic_year})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  学生和教师角色需要指定年级；管理员角色无需指定。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[13px] text-muted-foreground">
                <div className="rounded-lg border border-border/40 bg-transparent px-3 py-2">
                  待创建 <span className="font-semibold text-foreground">{parsedBulkUsers.length}</span>
                </div>
                <div className="rounded-lg border border-border/40 bg-transparent px-3 py-2">
                  跳过 <span className="font-semibold text-foreground">{batchCreateMutation.data?.skipped?.length ?? 0}</span>
                </div>
              </div>

              <Button
                variant="default"
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
          <div className="mx-6 mt-5 rounded-lg border border-difficulty-medium/20 bg-difficulty-medium/5 p-4 text-sm text-difficulty-medium">
            {batchCreateMutation.data.skipped.map((item: { user_code: string; reason: string }) => (
              <p key={`${item.user_code}-${item.reason}`}>
                {item.user_code}: {item.reason}
              </p>
            ))}
          </div>
        ) : null}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/40">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-secondary">身份</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-secondary">角色</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-secondary">年级</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-secondary">状态</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-secondary">活动</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-secondary">创建时间</th>
                <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-secondary">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-transparent">
              {users.map((user) => (
                <tr key={user.id} className="transition hover:bg-muted/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground">
                        {(user.display_name || user.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.display_name || user.username}</p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">@{user.username}</p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                          {user.user_code || '无 user_code'} / {user.email || '无邮箱'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      {getRoleBadge(user.role)}
                      <select
                        value={user.role}
                        onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value as RoleType })}
                        disabled={updateRoleMutation.isPending}
                        className="block rounded-lg border border-border/40 bg-transparent px-3 py-2 text-[13px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="student">学生</option>
                        <option value="teacher">教师</option>
                        <option value="root">管理员</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {user.grade_id ? (gradeNameMap.get(Number(user.grade_id)) || `#${user.grade_id}`) : '--'}
                  </td>
                  <td className="px-5 py-4">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[13px] text-muted-foreground">
                      <div>{user.submissions_count} 次提交</div>
                      <div className="mt-0.5">{user.problems_solved} 题通过</div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
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

        {users.length === 0 && (
          <EmptyState icon={Users} title="未找到用户" description="尝试调整搜索条件" />
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-4 border-t border-border/40 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-[13px] text-muted-foreground">
            第 {page} 页 / 共 {totalPages} 页
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border/40 px-4 py-2 text-[13px] font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
