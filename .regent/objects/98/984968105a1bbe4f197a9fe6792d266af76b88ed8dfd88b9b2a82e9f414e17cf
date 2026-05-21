import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { BellRing, LockKeyhole, MonitorCog, Palette, Settings2, UserRoundCog } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/utils'
import { usersService } from '@/services/users'

type TabType = 'account' | 'preferences' | 'notifications' | 'security'

const DEFAULT_PREFERENCES = {
  theme: 'light' as 'light' | 'dark' | 'system',
  language: 'zh-CN',
  fontSize: 'medium' as 'small' | 'medium' | 'large',
  autoSave: true,
  showLineNumbers: true,
  wordWrap: false,
}

const themeLabels: Record<typeof DEFAULT_PREFERENCES.theme, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
}

const languageLabels: Record<string, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
}

function loadFromStorage<T extends object>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback
  } catch {
    return fallback
  }
}

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

  const [preferences, setPreferences] = useState(() =>
    loadFromStorage('oj_preferences', DEFAULT_PREFERENCES)
  )

  const [notifications, setNotifications] = useState(() =>
    loadFromStorage('oj_notifications', {
      emailNotifications: true,
      contestReminders: true,
      newProblems: false,
      replyComments: true,
      weeklyReport: true,
    })
  )

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

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: typeof preferences) => {
      localStorage.setItem('oj_preferences', JSON.stringify(data))
      return { success: true }
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: '偏好已保存到本地' })
      setTimeout(() => setMessage(null), 3000)
    },
  })

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof notifications) => {
      localStorage.setItem('oj_notifications', JSON.stringify(data))
      return { success: true }
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: '通知设置已保存到本地' })
      setTimeout(() => setMessage(null), 3000)
    },
  })

  const tabs = [
    { id: 'account' as TabType, label: '账户', icon: UserRoundCog },
    { id: 'preferences' as TabType, label: '偏好', icon: Palette },
    { id: 'notifications' as TabType, label: '通知', icon: BellRing },
    { id: 'security' as TabType, label: '安全', icon: LockKeyhole },
  ]

  return (
    <div className="space-y-6">
      {/* Header card — warm editorial feel */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Settings2 className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-primary">设置中心</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-card-foreground leading-relaxed">设置中心</h1>
                <p className="mt-1 max-w-xl text-sm font-normal text-muted-foreground leading-relaxed">
                  将账户、偏好、通知和安全设置统一收在账号中心里。当前交付只保留已经落地的数据字段与受控本地偏好。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 shrink-0">
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">主题</p>
                <p className="mt-1 text-sm font-medium text-card-foreground">{themeLabels[preferences.theme]}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">语言</p>
                <p className="mt-1 text-sm font-medium text-card-foreground">
                  {languageLabels[preferences.language] || preferences.language}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">通知</p>
                <p className="mt-1 text-sm font-medium text-card-foreground">
                  {Object.values(notifications).filter(Boolean).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast message */}
      {message && (
        <div
          className={cn(
            'rounded-lg px-4 py-3 text-sm font-medium leading-relaxed',
            message.type === 'success'
              ? 'bg-primary/10 text-primary'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {message.text}
        </div>
      )}

      {/* Settings layout: sidebar nav + content panel */}
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Tab nav */}
        <div className="rounded-xl border border-border bg-card p-3">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-card-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content panel */}
        <div className="rounded-xl border border-border bg-card p-6">
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-card-foreground">账户信息</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">仅保存已落地的个人资料字段。</p>
              </div>

              <div className="border-t border-border" />

              <div className="grid gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">用户名</label>
                  <input
                    type="text"
                    value={accountForm.username}
                    readOnly
                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">显示名称</label>
                  <input
                    type="text"
                    value={accountForm.display_name}
                    onChange={(e) => setAccountForm({ ...accountForm, display_name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">邮箱地址</label>
                  <input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>
              </div>

              <div className="border-t border-border" />

              <div className="flex justify-end">
                <Button onClick={() => updateAccountMutation.mutate(accountForm)} disabled={updateAccountMutation.isPending}>
                  {updateAccountMutation.isPending ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-card-foreground">界面与编辑器偏好</h2>
              </div>

              <div className="border-t border-border" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-4">
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">主题</label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(val) => setPreferences({ ...preferences, theme: val as 'light' | 'dark' | 'system' })}
                    options={[
                      { value: 'light', label: '浅色' },
                      { value: 'dark', label: '深色' },
                      { value: 'system', label: '跟随系统' },
                    ]}
                  />
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">字体大小</label>
                  <Select
                    value={preferences.fontSize}
                    onValueChange={(val) => setPreferences({ ...preferences, fontSize: val as 'small' | 'medium' | 'large' })}
                    options={[
                      { value: 'small', label: '小' },
                      { value: 'medium', label: '中' },
                      { value: 'large', label: '大' },
                    ]}
                  />
                </div>
              </div>

              <div className="border-t border-border" />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">编辑器选项</p>
                {[
                  { key: 'autoSave' as const, label: '自动保存', desc: '自动保存代码草稿' },
                  { key: 'showLineNumbers' as const, label: '显示行号', desc: '在编辑器中显示行号' },
                  { key: 'wordWrap' as const, label: '自动换行', desc: '编辑器内容自动换行' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex w-full items-center justify-between rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={preferences[item.key]}
                      onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-border" />

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">偏好设置目前仅作用于本地，后端持久化将在后续版本落地。</p>
                <Button onClick={() => updatePreferencesMutation.mutate(preferences)} disabled={updatePreferencesMutation.isPending}>
                  {updatePreferencesMutation.isPending ? '保存中...' : '保存偏好'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-card-foreground">通知偏好</h2>
              </div>

              <div className="border-t border-border" />

              <div className="space-y-2">
                {[
                  { key: 'emailNotifications' as const, label: '邮件通知', desc: '接收重要事件的邮件提醒' },
                  { key: 'contestReminders' as const, label: '竞赛提醒', desc: '即将开始的竞赛推送通知' },
                  { key: 'newProblems' as const, label: '新题提醒', desc: '题库新增题目时通知' },
                  { key: 'replyComments' as const, label: '回复提醒', desc: '讨论或评论被回复时通知' },
                  { key: 'weeklyReport' as const, label: '每周报告', desc: '每周学习数据汇总' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex w-full items-center justify-between rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-border" />

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">通知偏好目前仅作用于本地，后端持久化将在后续版本落地。</p>
                <Button onClick={() => updateNotificationsMutation.mutate(notifications)} disabled={updateNotificationsMutation.isPending}>
                  {updateNotificationsMutation.isPending ? '保存中...' : '保存通知设置'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <MonitorCog className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-card-foreground">安全与受控能力</h2>
              </div>

              <div className="border-t border-border" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm font-medium text-card-foreground">密码与会话</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    当前交付未开放独立密码重置与会话管理界面，安全能力仍以登录/刷新 token 为主。
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm font-medium text-card-foreground">危险操作</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
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
