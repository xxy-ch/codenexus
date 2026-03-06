import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { usersService } from '@/services/users'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'

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
      { label: '已解决题目', value: stats?.unique_problems_solved ?? 0, color: 'text-primary' },
      { label: '提交次数', value: stats?.total_submissions ?? 0, color: 'text-green-500' },
      { label: '通过率', value: `${Math.round((stats?.accuracy_rate ?? 0) * 100)}%`, color: 'text-purple-500' },
      { label: '全站排名', value: stats?.ranking ?? '-', color: 'text-orange-500' },
    ],
    [stats]
  )

  if (isLoading) return <Loading message="加载中..." />
  if (!profile) return <div className="text-center py-12">用户不存在</div>

  const getActivityLabel = (type: string) => {
    if (type === 'submission') return '提交'
    if (type === 'contest_registration') return '竞赛'
    if (type === 'achievement') return '成就'
    if (type === 'comment') return '评论'
    return '活动'
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start -mt-12">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-slate-900 shadow-lg">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-1">{profile.username}</h1>
                  {profile.display_name && (
                    <p className="text-lg text-slate-600 dark:text-slate-400">{profile.display_name}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg">badge</span>
                      {profile.role}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg">school</span>
                      Org #{profile.organization_id}
                    </div>
                    {profile.campus_id && (
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">location_on</span>
                        Campus #{profile.campus_id}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg">calendar_today</span>
                      {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>

                {currentUser?.id === profile.id && (
                  <Button variant="outline" onClick={() => setIsEditing((prev) => !prev)}>
                    <span className="material-symbols-outlined mr-2">{isEditing ? 'close' : 'edit'}</span>
                    {isEditing ? '取消编辑' : '编辑资料'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
          <h2 className="text-xl font-bold mb-4">编辑个人资料</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">显示名称</label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, display_name: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">邮箱</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((item) => (
          <div key={item.label} className="bg-white dark:bg-slate-900 rounded-xl border p-6 text-center">
            <div className={`text-3xl font-bold mb-1 ${item.color}`}>{item.value}</div>
            <div className="text-sm text-slate-600">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
        <h2 className="text-xl font-bold mb-4">最近活动</h2>
        <div className="space-y-3">
          {(activities || []).map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="text-sm font-medium">{getActivityLabel(activity.type)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {activity.problem_title || activity.contest_name || activity.achievement_name || '-'}
                </p>
              </div>
              <p className="text-xs text-slate-500">{new Date(activity.created_at).toLocaleString('zh-CN')}</p>
            </div>
          ))}
          {(activities || []).length === 0 && <p className="text-sm text-slate-500">暂无活动</p>}
        </div>
      </div>
    </div>
  )
}
