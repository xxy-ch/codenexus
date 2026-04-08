import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { BellRing, LockKeyhole, MonitorCog, Palette, Settings2, UserRoundCog } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { usersService } from '@/services/users'

type TabType = 'account' | 'preferences' | 'notifications' | 'security'

export function Settings() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('account')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [accountForm, setAccountForm] = useState({
    username: '',
    email: user?.email || '',
    display_name: '',
  })

  const { data: profile } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => usersService.getMyProfile(),
    enabled: !!user?.id,
  })

  useEffect(() => {
    if (!profile) return
    setAccountForm({
      username: profile.username || '',
      email: profile.email || '',
      display_name: profile.display_name || '',
    })
  }, [profile])

  const [preferences, setPreferences] = useState({
    theme: 'light' as 'light' | 'dark' | 'system',
    language: 'zh-CN',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    autoSave: true,
    showLineNumbers: true,
    wordWrap: false,
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    contestReminders: true,
    newProblems: false,
    replyComments: true,
    weeklyReport: true,
  })

  const updateAccountMutation = useMutation({
    mutationFn: async (data: typeof accountForm) =>
      usersService.updateMyProfile({
        email: data.email || undefined,
        display_name: data.display_name || undefined,
      }),
    onSuccess: () => {
      setMessage({ type: 'success', text: '账户信息更新成功' })
      setTimeout(() => setMessage(null), 3000)
    },
    onError: () => {
      setMessage({ type: 'error', text: '更新失败，请重试' })
      setTimeout(() => setMessage(null), 3000)
    },
  })

  // TODO(P1): preferences persistence requires backend contract — current toggle is local-only
  const updatePreferencesMutation = useMutation({
    mutationFn: async (_data: typeof preferences) => ({ success: true }),
  })

  // TODO(P1): notification preferences persistence requires backend contract — current toggle is local-only
  const updateNotificationsMutation = useMutation({
    mutationFn: async (_data: typeof notifications) => ({ success: true }),
  })

  const tabs = [
    { id: 'account' as TabType, label: '账户', icon: UserRoundCog },
    { id: 'preferences' as TabType, label: '偏好', icon: Palette },
    { id: 'notifications' as TabType, label: '通知', icon: BellRing },
    { id: 'security' as TabType, label: '安全', icon: LockKeyhole },
  ]

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(135deg,#ecfeff_0%,#f0fdf4_50%,#ffffff_100%)] px-6 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_32%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#020617_100%)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                <Settings2 className="h-3.5 w-3.5" />
                User Settings
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">设置中心</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  将账户、偏好、通知和安全设置统一收在账号中心里。当前交付只保留已经落地的数据字段与受控本地偏好。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Theme</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{preferences.theme}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Language</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{preferences.language}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Notifications</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                  {Object.values(notifications).filter(Boolean).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={cn(
            'rounded-2xl p-4 text-sm',
            message.type === 'success'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition',
                    activeTab === tab.id
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">账户信息</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">仅保存已落地的个人资料字段。</p>
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">用户名</label>
                  <input type="text" value={accountForm.username} readOnly className="w-full rounded-xl border bg-slate-50 px-4 py-3 dark:bg-slate-900" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">显示名称</label>
                  <input
                    type="text"
                    value={accountForm.display_name}
                    onChange={(e) => setAccountForm({ ...accountForm, display_name: e.target.value })}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">邮箱地址</label>
                  <input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={() => updateAccountMutation.mutate(accountForm)} disabled={updateAccountMutation.isPending}>
                  {updateAccountMutation.isPending ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-slate-500" />
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">界面与编辑器偏好</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <label className="mb-2 block text-sm font-medium">主题</label>
                  <select value={preferences.theme} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as never })} className="w-full rounded-xl border px-4 py-3">
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                    <option value="system">跟随系统</option>
                  </select>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <label className="mb-2 block text-sm font-medium">字体大小</label>
                  <select value={preferences.fontSize} onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value as never })} className="w-full rounded-xl border px-4 py-3">
                    <option value="small">小</option>
                    <option value="medium">中</option>
                    <option value="large">大</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  { key: 'autoSave', label: '自动保存', desc: '自动保存代码草稿' },
                  { key: 'showLineNumbers', label: '显示行号', desc: '在编辑器中显示行号' },
                  { key: 'wordWrap', label: '自动换行', desc: '编辑器内容自动换行' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPreferences((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 text-left dark:bg-slate-900"
                  >
                    <div>
                      <p className="font-medium text-slate-950 dark:text-white">{item.label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                    <div className={cn('h-6 w-12 rounded-full transition', preferences[item.key as keyof typeof preferences] ? 'bg-emerald-500' : 'bg-slate-300')}>
                      <div className={cn('mt-1 h-4 w-4 rounded-full bg-white transition', preferences[item.key as keyof typeof preferences] ? 'ml-7' : 'ml-1')} />
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-400 dark:text-slate-500">偏好设置目前仅作用于本地，后端持久化将在后续版本落地。</p>
                <Button variant="primary" onClick={() => updatePreferencesMutation.mutate(preferences)} disabled={updatePreferencesMutation.isPending}>
                  {updatePreferencesMutation.isPending ? '保存中...' : '保存偏好（本地）'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-slate-500" />
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">通知偏好</h2>
              </div>
              <div className="grid gap-3">
                {[
                  { key: 'emailNotifications', label: '邮件通知' },
                  { key: 'contestReminders', label: '竞赛提醒' },
                  { key: 'newProblems', label: '新题提醒' },
                  { key: 'replyComments', label: '回复提醒' },
                  { key: 'weeklyReport', label: '每周报告' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 text-left dark:bg-slate-900"
                  >
                    <p className="font-medium text-slate-950 dark:text-white">{item.label}</p>
                    <div className={cn('h-6 w-12 rounded-full transition', notifications[item.key as keyof typeof notifications] ? 'bg-emerald-500' : 'bg-slate-300')}>
                      <div className={cn('mt-1 h-4 w-4 rounded-full bg-white transition', notifications[item.key as keyof typeof notifications] ? 'ml-7' : 'ml-1')} />
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-400 dark:text-slate-500">通知偏好目前仅作用于本地，后端持久化将在后续版本落地。</p>
                <Button variant="primary" onClick={() => updateNotificationsMutation.mutate(notifications)} disabled={updateNotificationsMutation.isPending}>
                  {updateNotificationsMutation.isPending ? '保存中...' : '保存通知设置（本地）'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <MonitorCog className="h-4 w-4 text-slate-500" />
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">安全与受控能力</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-950 dark:text-white">密码与会话</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    当前交付未开放独立密码重置与会话管理界面，安全能力仍以登录/刷新 token 为主。
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-950 dark:text-white">危险操作</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    删除账户、双因素认证和设备审计尚未交付，不在当前生产范围内暴露。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
