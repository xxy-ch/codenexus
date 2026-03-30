import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usersService } from '@/services/users'
import { cn } from '@/lib/utils'

type TabType = 'account' | 'preferences' | 'notifications' | 'security'

const PREFERENCES_STORAGE_KEY = 'oj-settings-preferences'
const NOTIFICATIONS_STORAGE_KEY = 'oj-settings-notifications'

const defaultPreferences = {
  theme: 'light' as 'light' | 'dark' | 'system',
  language: 'zh-CN',
  fontSize: 'medium' as 'small' | 'medium' | 'large',
  autoSave: true,
  showLineNumbers: true,
  wordWrap: false,
}

const defaultNotifications = {
  emailNotifications: true,
  contestReminders: true,
  newProblems: false,
  replyComments: true,
  weeklyReport: true,
}

interface ToggleProps {
  checked: boolean
  label: string
  description?: string
  onToggle: () => void
}

function Toggle({ checked, label, description, onToggle }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-4 text-left transition hover:bg-surface-container"
    >
      <div>
        <p className="font-medium text-on-surface">{label}</p>
        {description ? <p className="text-sm text-on-surface-variant">{description}</p> : null}
      </div>
      <div className={cn('h-6 w-12 rounded-full transition', checked ? 'bg-primary' : 'bg-surface-container-high')}>
        <div className={cn('mt-1 h-4 w-4 rounded-full bg-white transition', checked ? 'ml-7' : 'ml-1')} />
      </div>
    </button>
  )
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

  const { data: profile, isLoading } = useQuery({
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
    loadStoredSettings(PREFERENCES_STORAGE_KEY, defaultPreferences),
  )

  const [notifications, setNotifications] = useState(() =>
    loadStoredSettings(NOTIFICATIONS_STORAGE_KEY, defaultNotifications),
  )

  useEffect(() => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

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

  const tabs = [
    { id: 'account' as TabType, label: '账户', icon: 'person' },
    { id: 'preferences' as TabType, label: '偏好', icon: 'palette' },
    { id: 'notifications' as TabType, label: '通知', icon: 'notifications' },
    { id: 'security' as TabType, label: '安全', icon: 'lock' },
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingState message="加载设置中..." />
      </div>
    )
  }

  if (!profile && user?.id) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState title="无法加载个人资料" description="当前账号信息暂时无法读取。" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="max-w-3xl space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          个人 / 设置
        </p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
          设置中心
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
          账户、偏好、通知和安全提示统一收口到一套简化设置工作区。
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">主题</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">
            {preferences.theme === 'light' ? '浅色' : preferences.theme === 'dark' ? '深色' : '跟随系统'}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">当前仅保存本地偏好</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">语言</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">
            {preferences.language === 'zh-CN' ? '简体中文' : preferences.language}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">用于界面显示语言</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">通知</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">
            {Object.values(notifications).filter(Boolean).length}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">已开启的通知项目</p>
        </Card>
      </div>

      {/* Message Banner */}
      {message ? (
        <Card
          variant={message.type === 'success' ? 'surface' : 'outlined'}
          className={cn(
            'p-4',
            message.type === 'success' ? 'bg-primary-container/30 text-on-primary-container' : 'bg-error-container text-on-error-container'
          )}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sidebar Navigation */}
        <Card variant="surface" className="p-4">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition',
                  activeTab === tab.id
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                )}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Main Content */}
        <div className="space-y-6">
          {activeTab === 'account' ? (
            <Card variant="default" className="p-6">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">账户信息</h2>
              <p className="mt-1 text-sm text-on-surface-variant">只编辑当前后端已支持的个人资料字段。</p>
              <div className="mt-5 grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">用户名</label>
                  <Input type="text" value={accountForm.username} readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">显示名称</label>
                  <Input
                    type="text"
                    value={accountForm.display_name}
                    onChange={(e) => setAccountForm({ ...accountForm, display_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">邮箱地址</label>
                  <Input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => updateAccountMutation.mutate(accountForm)}
                  disabled={updateAccountMutation.isPending}
                >
                  <span className="material-symbols-outlined text-base">
                    {updateAccountMutation.isPending ? 'hourglass_empty' : 'save'}
                  </span>
                  {updateAccountMutation.isPending ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </Card>
          ) : null}

          {activeTab === 'preferences' ? (
            <Card variant="default" className="p-6">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">界面与编辑器偏好</h2>
              <p className="mt-1 text-sm text-on-surface-variant">当前为受控本地偏好，不影响后端数据。</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">主题</label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as never })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                    <option value="system">跟随系统</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">字体大小</label>
                  <select
                    value={preferences.fontSize}
                    onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value as never })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="small">小</option>
                    <option value="medium">中</option>
                    <option value="large">大</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Toggle
                  checked={preferences.autoSave}
                  label="自动保存"
                  description="自动保存代码草稿"
                  onToggle={() => setPreferences((prev) => ({ ...prev, autoSave: !prev.autoSave }))}
                />
                <Toggle
                  checked={preferences.showLineNumbers}
                  label="显示行号"
                  description="在编辑器中显示行号"
                  onToggle={() => setPreferences((prev) => ({ ...prev, showLineNumbers: !prev.showLineNumbers }))}
                />
                <Toggle
                  checked={preferences.wordWrap}
                  label="自动换行"
                  description="编辑器内容自动换行"
                  onToggle={() => setPreferences((prev) => ({ ...prev, wordWrap: !prev.wordWrap }))}
                />
              </div>

              <p className="mt-6 text-sm text-on-surface-variant">本地偏好立即生效；后端暂不支持偏好同步。</p>
            </Card>
          ) : null}

          {activeTab === 'notifications' ? (
            <Card variant="default" className="p-6">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">通知偏好</h2>
              <p className="mt-1 text-sm text-on-surface-variant">只管理当前界面暴露的通知开关。</p>
              <div className="mt-5 space-y-3">
                <Toggle
                  checked={notifications.emailNotifications}
                  label="邮件通知"
                  onToggle={() =>
                    setNotifications((prev) => ({ ...prev, emailNotifications: !prev.emailNotifications }))
                  }
                />
                <Toggle
                  checked={notifications.contestReminders}
                  label="竞赛提醒"
                  onToggle={() =>
                    setNotifications((prev) => ({ ...prev, contestReminders: !prev.contestReminders }))
                  }
                />
                <Toggle
                  checked={notifications.newProblems}
                  label="新题提醒"
                  onToggle={() => setNotifications((prev) => ({ ...prev, newProblems: !prev.newProblems }))}
                />
                <Toggle
                  checked={notifications.replyComments}
                  label="回复提醒"
                  onToggle={() =>
                    setNotifications((prev) => ({ ...prev, replyComments: !prev.replyComments }))
                  }
                />
                <Toggle
                  checked={notifications.weeklyReport}
                  label="每周报告"
                  onToggle={() =>
                    setNotifications((prev) => ({ ...prev, weeklyReport: !prev.weeklyReport }))
                  }
                />
              </div>

              <p className="mt-6 text-sm text-on-surface-variant">
                通知开关仅保存在当前浏览器；后端暂不支持通知同步。
              </p>
            </Card>
          ) : null}

          {activeTab === 'security' ? (
            <>
              <Card variant="default" className="p-6">
                <h2 className="font-headline text-xl font-extrabold text-on-surface">安全与受控能力</h2>
                <p className="mt-1 text-sm text-on-surface-variant">诚实展示当前版本已开放和未开放的安全能力。</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Card variant="surface" className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-2xl text-primary">password</span>
                      <div>
                        <p className="text-sm font-medium text-on-surface">密码与会话</p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                          当前交付未开放独立密码重置与会话管理界面，安全能力仍以登录和刷新 token 为主。
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card variant="surface" className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-2xl text-error">warning</span>
                      <div>
                        <p className="text-sm font-medium text-on-surface">危险操作</p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                          删除账户、双因素认证和设备审计尚未交付，不在当前生产范围内暴露。
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function loadStoredSettings<T extends Record<string, unknown>>(storageKey: string, defaults: T): T {
  const rawValue = localStorage.getItem(storageKey)
  if (!rawValue) return defaults

  try {
    return { ...defaults, ...JSON.parse(rawValue) }
  } catch {
    return defaults
  }
}
