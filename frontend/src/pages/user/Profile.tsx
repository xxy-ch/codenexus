import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, IdCard, Mail, PencilLine, ShieldCheck, Sparkles, User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usersService } from '@/services/users'
import { Button } from '@/components/ui/Button'
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'

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
      { label: '已解决题目', value: stats?.unique_problems_solved ?? 0 },
      { label: '提交次数', value: stats?.total_submissions ?? 0 },
      { label: '通过率', value: `${Math.round((stats?.accuracy_rate ?? 0) * 100)}%` },
      { label: '全站排名', value: stats?.ranking ?? '-' },
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
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,#eff6ff_0%,#eef2ff_50%,#ffffff_100%)] px-6 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#020617_100%)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-slate-950 text-3xl font-semibold text-white shadow-lg dark:bg-white dark:text-slate-950">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Account Center
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {profile.display_name || profile.username}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">@{profile.username}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 dark:bg-slate-900/70">
                    <ShieldCheck className="h-4 w-4" />
                    {profile.role}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 dark:bg-slate-900/70">
                    <IdCard className="h-4 w-4" />
                    Org #{profile.organization_id}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 dark:bg-slate-900/70">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {currentUser?.id === profile.id && (
              <Button variant="outline" onClick={() => setIsEditing((prev) => !prev)}>
                <PencilLine className="mr-2 h-4 w-4" />
                {isEditing ? '取消编辑' : '编辑资料'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Recent Activity</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">最近活动</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {(activities || []).map((activity) => (
              <div key={activity.id} className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{getActivityLabel(activity.type)}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {activity.problem_title || activity.contest_name || activity.achievement_name || '-'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(activity.created_at).toLocaleString('zh-CN')}</span>
                </div>
              </div>
            ))}
            {(activities || []).length === 0 && <EmptyState icon={User} title="暂无活动" description="该用户还没有提交过代码" />}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Identity</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Username</p>
                <p className="mt-1 font-semibold text-slate-950 dark:text-white">{profile.username}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</p>
                <p className="mt-1 font-semibold text-slate-950 dark:text-white">{profile.email || '未设置'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Campus</p>
                <p className="mt-1 font-semibold text-slate-950 dark:text-white">{profile.campus_id ? `Campus #${profile.campus_id}` : '未绑定'}</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Mail className="h-4 w-4" />
                <h2 className="text-lg font-semibold">编辑资料</h2>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">显示名称</label>
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, display_name: e.target.value }))}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">邮箱</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
                <div className="flex justify-end gap-2">
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
