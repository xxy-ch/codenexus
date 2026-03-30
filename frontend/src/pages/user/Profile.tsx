import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { usersService } from '@/services/users'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

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
    mutationFn: (payload: { display_name?: string; email?: string }) =>
      usersService.updateMyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsEditing(false)
    },
  })

  const summaryCards = useMemo(
    () => [
      { label: '已解题目', value: stats?.unique_problems_solved ?? 0, helper: '累计通过的独立题目数' },
      { label: '提交总数', value: stats?.total_submissions ?? 0, helper: '包含全部历史提交' },
      { label: '通过率', value: `${Math.round((stats?.accuracy_rate ?? 0) * 100)}%`, helper: '按当前统计接口计算' },
      { label: '当前名次', value: stats?.ranking ?? '-', helper: '来自排行榜数据' },
    ],
    [stats],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingState message="加载个人工作台..." />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState title="个人档案缺失" description="当前账号信息暂时无法读取。" />
      </div>
    )
  }

  const getActivityLabel = (type: string) => {
    if (type === 'submission') return '提交'
    if (type === 'contest_registration') return '竞赛'
    if (type === 'achievement') return '成就'
    if (type === 'comment') return '评论'
    return '活动'
  }

  const getRoleLabel = (role: string) => {
    if (role === 'student') return '学生'
    if (role === 'teacher') return '教师'
    if (role === 'admin') return '管理员'
    return role
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            个人 / 工作台
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            个人工作台
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            当前登录账号的身份信息、统计概览与最近活动。
          </p>
        </div>
        {currentUser?.id === profile.id ? (
          <Button
            variant="outline"
            onClick={() => setIsEditing((prev) => !prev)}
          >
            <span className="material-symbols-outlined text-base">{isEditing ? 'close' : 'edit'}</span>
            {isEditing ? '收起编辑' : '编辑档案'}
          </Button>
        ) : null}
      </div>

      <div className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">个人档案</div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((item) => (
          <Card key={item.label} variant="surface" className="p-5">
            <p className="text-sm font-medium text-on-surface-variant">{item.label}</p>
            <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{item.value}</p>
            <p className="mt-2 text-sm text-on-surface-variant">{item.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Identity Cards */}
          <Card variant="default" className="p-6">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">身份台账</h2>
            <p className="mt-1 text-sm text-on-surface-variant">聚焦当前账号的身份信息和基础归属。</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Card variant="surface" className="p-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl text-primary">shield</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">角色</p>
                    <p className="mt-1 text-sm text-on-surface-variant">{getRoleLabel(profile.role)}</p>
                  </div>
                </div>
              </Card>
              <Card variant="surface" className="p-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl text-secondary">badge</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">组织</p>
                    <p className="mt-1 text-sm text-on-surface-variant">组织 #{profile.organization_id}</p>
                  </div>
                </div>
              </Card>
              <Card variant="surface" className="p-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl text-tertiary">mail</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">邮箱</p>
                    <p className="mt-1 text-sm text-on-surface-variant">{profile.email || '未设置'}</p>
                  </div>
                </div>
              </Card>
              <Card variant="surface" className="p-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant">calendar_today</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">注册时间</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card variant="default" className="p-6">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">最近活动</h2>
            <p className="mt-1 text-sm text-on-surface-variant">展示最近 10 条真实活动记录。</p>
            <div className="mt-5 space-y-3">
              {(activities || []).map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{getActivityLabel(activity.type)}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {activity.problem_title || activity.contest_name || activity.achievement_name || '-'}
                      </p>
                    </div>
                    <span className="text-xs text-on-surface-variant">
                      {new Date(activity.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))}
              {(activities || []).length === 0 ? (
                <p className="text-sm text-on-surface-variant">最近暂无活动记录。</p>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card variant="surface" className="p-5">
            <h2 className="font-headline text-lg font-extrabold text-on-surface">账号信息</h2>
            <p className="mt-1 text-sm text-on-surface-variant">当前系统已落库的账号字段。</p>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">用户名</p>
                <p className="mt-1 font-semibold text-on-surface">{profile.username}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">校区</p>
                <p className="mt-1 font-semibold text-on-surface">
                  {profile.campus_id ? `校区 #${profile.campus_id}` : '未绑定'}
                </p>
              </div>
            </div>
          </Card>

          {/* Edit Form */}
          {isEditing ? (
            <Card variant="default" className="p-6">
              <h2 className="font-headline text-lg font-extrabold text-on-surface">档案编辑</h2>
              <p className="mt-1 text-sm text-on-surface-variant">仅保存当前后端已支持的显示名称和邮箱字段。</p>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">显示名称</label>
                  <Input
                    value={editForm.display_name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, display_name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">邮箱</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={() =>
                      updateProfileMutation.mutate({
                        display_name: editForm.display_name || undefined,
                        email: editForm.email || undefined,
                      })
                    }
                    disabled={updateProfileMutation.isPending}
                  >
                    <span className="material-symbols-outlined text-base">
                      {updateProfileMutation.isPending ? 'hourglass_empty' : 'save'}
                    </span>
                    {updateProfileMutation.isPending ? '保存中...' : '保存档案'}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
