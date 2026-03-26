import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, IdCard, Mail, PencilLine, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usersService } from '@/services/users'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading message="加载个人工作台..." />
      </div>
    )
  }

  if (!profile) {
    return <EmptyState title="个人档案缺失" description="当前账号信息暂时无法读取。" />
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="个人工作台"
        title="个人工作台"
        description="当前登录账号的身份信息、统计概览与最近活动。"
        actions={
          currentUser?.id === profile.id ? (
            <Button variant="outline" onClick={() => setIsEditing((prev) => !prev)}>
              <PencilLine className="h-4 w-4" />
              {isEditing ? '收起编辑' : '编辑档案'}
            </Button>
          ) : null
        }
      />

      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">个人档案</div>

      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionBlock title="身份台账" description="聚焦当前账号的身份信息和基础归属。">
            <div className="grid gap-4 md:grid-cols-2">
              <SurfaceCard tone="muted" className="p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">角色</p>
                    <p className="mt-1 text-sm text-slate-600">{getRoleLabel(profile.role)}</p>
                  </div>
                </div>
              </SurfaceCard>
              <SurfaceCard tone="muted" className="p-5">
                <div className="flex items-start gap-3">
                  <IdCard className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">组织</p>
                    <p className="mt-1 text-sm text-slate-600">组织 #{profile.organization_id}</p>
                  </div>
                </div>
              </SurfaceCard>
              <SurfaceCard tone="muted" className="p-5">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">邮箱</p>
                    <p className="mt-1 text-sm text-slate-600">{profile.email || '未设置'}</p>
                  </div>
                </div>
              </SurfaceCard>
              <SurfaceCard tone="muted" className="p-5">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">注册时间</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </SectionBlock>

          <SectionBlock title="最近活动" description="展示最近 10 条真实活动记录。">
            <div className="space-y-3">
              {(activities || []).map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{getActivityLabel(activity.type)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {activity.problem_title || activity.contest_name || activity.achievement_name || '-'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(activity.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))}
              {(activities || []).length === 0 ? (
                <p className="text-sm text-slate-500">最近暂无活动记录。</p>
              ) : null}
            </div>
          </SectionBlock>
        </div>

        <div className="space-y-6">
          <SectionBlock title="账号信息" description="当前系统已落库的账号字段。">
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">用户名</p>
                <p className="mt-1 font-semibold text-slate-950">{profile.username}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">校区</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {profile.campus_id ? `校区 #${profile.campus_id}` : '未绑定'}
                </p>
              </div>
            </div>
          </SectionBlock>

          {isEditing ? (
            <SectionBlock title="档案编辑" description="仅保存当前后端已支持的显示名称和邮箱字段。">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">显示名称</label>
                  <Input
                    value={editForm.display_name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, display_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">邮箱</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    取消
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() =>
                      updateProfileMutation.mutate({
                        display_name: editForm.display_name || undefined,
                        email: editForm.email || undefined,
                      })
                    }
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? '保存中...' : '保存档案'}
                  </Button>
                </div>
              </div>
            </SectionBlock>
          ) : null}
        </div>
      </div>
    </div>
  )
}
