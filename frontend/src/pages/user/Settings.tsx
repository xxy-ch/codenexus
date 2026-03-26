import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { BellRing, LockKeyhole, MonitorCog, Palette, Settings2, UserRoundCog } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { usersService } from '@/services/users'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'

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

  const tabs = [
    { id: 'account' as TabType, label: '账户', icon: UserRoundCog },
    { id: 'preferences' as TabType, label: '偏好', icon: Palette },
    { id: 'notifications' as TabType, label: '通知', icon: BellRing },
    { id: 'security' as TabType, label: '安全', icon: LockKeyhole },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="设置"
        title="设置中心"
        description="账户、偏好、通知和安全提示统一收口到一套简化设置工作区。"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="主题" value={preferences.theme === 'light' ? '浅色' : preferences.theme === 'dark' ? '深色' : '跟随系统'} helper="当前仅保存本地偏好" />
        <StatCard label="语言" value={preferences.language === 'zh-CN' ? '简体中文' : preferences.language} helper="用于界面显示语言" />
        <StatCard
          label="通知"
          value={Object.values(notifications).filter(Boolean).length}
          helper="已开启的通知项目"
        />
      </div>

      {message ? (
        <SurfaceCard
          className={cn(
            'p-4',
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-rose-200 bg-rose-50',
          )}
        >
          <p className="text-sm font-medium text-slate-900">{message.text}</p>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <SurfaceCard className="p-4">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition',
                    activeTab === tab.id
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </SurfaceCard>

        <div className="space-y-6">
          {activeTab === 'account' ? (
            <SectionBlock title="账户信息" description="只编辑当前后端已支持的个人资料字段。">
              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">用户名</label>
                  <Input type="text" value={accountForm.username} readOnly />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">显示名称</label>
                  <Input
                    type="text"
                    value={accountForm.display_name}
                    onChange={(e) => setAccountForm({ ...accountForm, display_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">邮箱地址</label>
                  <Input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => updateAccountMutation.mutate(accountForm)}
                  disabled={updateAccountMutation.isPending}
                >
                  {updateAccountMutation.isPending ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </SectionBlock>
          ) : null}

          {activeTab === 'preferences' ? (
            <SectionBlock title="界面与编辑器偏好" description="当前为受控本地偏好，不影响后端数据。">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">主题</label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as never })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                    <option value="system">跟随系统</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">字体大小</label>
                  <select
                    value={preferences.fontSize}
                    onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value as never })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="small">小</option>
                    <option value="medium">中</option>
                    <option value="large">大</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {[
                  { key: 'autoSave', label: '自动保存', desc: '自动保存代码草稿' },
                  { key: 'showLineNumbers', label: '显示行号', desc: '在编辑器中显示行号' },
                  { key: 'wordWrap', label: '自动换行', desc: '编辑器内容自动换行' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key as keyof typeof prev],
                      }))
                    }
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left"
                  >
                    <div>
                      <p className="font-medium text-slate-950">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                    <div
                      className={cn(
                        'h-6 w-12 rounded-full transition',
                        preferences[item.key as keyof typeof preferences] ? 'bg-emerald-500' : 'bg-slate-300',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-1 h-4 w-4 rounded-full bg-white transition',
                          preferences[item.key as keyof typeof preferences] ? 'ml-7' : 'ml-1',
                        )}
                      />
                    </div>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-slate-600">本地偏好立即生效；后端暂不支持偏好同步。</p>

              <div className="mt-6 flex justify-end">
                <Button variant="primary" disabled>
                  保存偏好
                </Button>
              </div>
            </SectionBlock>
          ) : null}

          {activeTab === 'notifications' ? (
            <SectionBlock title="通知偏好" description="只管理当前界面暴露的通知开关。">
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
                    onClick={() =>
                      setNotifications((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key as keyof typeof prev],
                      }))
                    }
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left"
                  >
                    <p className="font-medium text-slate-950">{item.label}</p>
                    <div
                      className={cn(
                        'h-6 w-12 rounded-full transition',
                        notifications[item.key as keyof typeof notifications] ? 'bg-emerald-500' : 'bg-slate-300',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-1 h-4 w-4 rounded-full bg-white transition',
                          notifications[item.key as keyof typeof notifications] ? 'ml-7' : 'ml-1',
                        )}
                      />
                    </div>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-slate-600">
                通知开关仅保存在当前浏览器；后端暂不支持通知同步。
              </p>

              <div className="mt-6 flex justify-end">
                <Button variant="primary" disabled>
                  保存通知设置
                </Button>
              </div>
            </SectionBlock>
          ) : null}

          {activeTab === 'security' ? (
            <SectionBlock title="安全与受控能力" description="诚实展示当前版本已开放和未开放的安全能力。">
              <div className="grid gap-4 md:grid-cols-2">
                <SurfaceCard tone="muted" className="p-5">
                  <p className="text-sm font-medium text-slate-950">密码与会话</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    当前交付未开放独立密码重置与会话管理界面，安全能力仍以登录和刷新 token 为主。
                  </p>
                </SurfaceCard>
                <SurfaceCard tone="muted" className="p-5">
                  <p className="text-sm font-medium text-slate-950">危险操作</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    删除账户、双因素认证和设备审计尚未交付，不在当前生产范围内暴露。
                  </p>
                </SurfaceCard>
              </div>
            </SectionBlock>
          ) : null}
        </div>
      </div>
    </div>
  )
}
