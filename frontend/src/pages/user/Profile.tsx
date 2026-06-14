import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, IdCard, Mail, PencilLine, ShieldCheck, Sparkles, User } from 'lucide-react'
import { useAuthStore } from '@/shared/store/authStore'
import { usersService } from '@/services/users'
import { Button } from '@/shared/components/Button'
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton'
import { EmptyState } from '@/shared/components/EmptyState'
import { InlineError } from '@/shared/components/InlineError'

export function Profile() {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    email: '',
  })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', currentUser?.id],
    queryFn: () => usersService.getMyProfile(),
    enabled: !!currentUser?.id,
  })

  const { data: stats } = useQuery({
    queryKey: ['profile-stats', currentUser?.id],
    queryFn: () => usersService.getUserStats(),
    enabled: !!currentUser?.id,
  })

  const { data: activities } = useQuery({
    queryKey: ['profile-activity', currentUser?.id],
    queryFn: () => usersService.getUserActivity(10),
    enabled: !!currentUser?.id,
  })

  useEffect(() => {
    if (!profile) return
    setEditForm({
      display_name: profile.display_name || '',
      email: profile.email || '',
    })
  }, [profile])

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { display_name?: string; email?: string }) => usersService.updateMyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsEditing(false)
    },
  })

  const summaryCards = useMemo(
    () => [
      { label: '已解决题目', value: stats?.unique_problems_solved ?? 0, icon: '🎯' },
      { label: '提交次数', value: stats?.total_submissions ?? 0, icon: '📝' },
      { label: '通过率', value: `${Math.round((stats?.accuracy_rate ?? 0) * 100)}%`, icon: '✅' },
      { label: '全站排名', value: stats?.ranking ?? '-', icon: '🏆' },
    ],
    [stats]
  )

  if (isLoading) return <ProfileSkeleton />
  if (!profile) return <InlineError title="用户信息加载失败" message="用户不存在或加载失败" />

  const getActivityLabel = (type: string) => {
    if (type === 'submission') return '提交'
    if (type === 'contest_registration') return '竞赛'
    if (type === 'achievement') return '成就'
    if (type === 'comment') return '评论'
    return '活动'
  }

  return (
    <div className="space-y-6">
      {/* Profile hero card — warm editorial feel */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-xl font-semibold text-primary shrink-0">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-medium text-primary">个人中心</span>
                </div>
                <h1 className="text-2xl font-semibold text-card-foreground leading-relaxed truncate">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-sm font-normal text-muted-foreground leading-relaxed">
                  @{profile.username}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {profile.role}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <IdCard className="h-3.5 w-3.5" />
                    组织 #{profile.organization_id}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {currentUser?.id === profile.id && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing((prev) => !prev)} className="shrink-0">
                <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                {isEditing ? '取消编辑' : '编辑资料'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm">
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-card-foreground tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Recent activity */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-card-foreground">最近活动</h2>
            <span className="text-xs font-medium text-muted-foreground">近期动态</span>
          </div>
          <div className="space-y-3">
            {(activities || []).map((activity) => (
              <div key={activity.id} className="rounded-lg bg-muted/50 px-4 py-3 transition-colors hover:bg-muted">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{getActivityLabel(activity.type)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground truncate">
                      {activity.problem_title || activity.contest_name || activity.achievement_name || '-'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {new Date(activity.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
            {(activities || []).length === 0 && <EmptyState icon={User} title="暂无活动" description="该用户还没有提交过代码" />}
          </div>
        </div>

        {/* Sidebar: identity + edit form */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">身份信息</h3>
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">用户名</p>
                <p className="mt-0.5 text-sm font-medium text-card-foreground">{profile.username}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">邮箱</p>
                <p className="mt-0.5 text-sm font-medium text-card-foreground">{profile.email || '未设置'}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">校区</p>
                <p className="mt-0.5 text-sm font-medium text-card-foreground">{profile.campus_id ? `校区 #${profile.campus_id}` : '未绑定'}</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Mail className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-card-foreground">编辑资料</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">显示名称</label>
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, display_name: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">邮箱</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      updateProfileMutation.mutate({
                        display_name: editForm.display_name || undefined,
                        email: editForm.email || undefined,
                      })
                    }
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? '保存中...' : '保存更改'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
