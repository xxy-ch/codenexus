import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

type TabType = 'account' | 'preferences' | 'notifications' | 'security'

export function Settings() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('account')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Account Settings
  const [accountForm, setAccountForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
  })

  // Preferences
  const [preferences, setPreferences] = useState({
    theme: 'light' as 'light' | 'dark' | 'system',
    language: 'zh-CN',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    autoSave: true,
    showLineNumbers: true,
    wordWrap: false,
  })

  // Notifications
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    contestReminders: true,
    newProblems: false,
    replyComments: true,
    weeklyReport: true,
  })

  const updateAccountMutation = useMutation({
    mutationFn: async (data: typeof accountForm) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
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
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: '偏好设置更新成功' })
      setTimeout(() => setMessage(null), 3000)
    },
  })

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof notifications) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: '通知设置更新成功' })
      setTimeout(() => setMessage(null), 3000)
    },
  })

  const tabs = [
    { id: 'account' as TabType, label: '账户', icon: 'person' },
    { id: 'preferences' as TabType, label: '偏好', icon: 'tune' },
    { id: 'notifications' as TabType, label: '通知', icon: 'notifications' },
    { id: 'security' as TabType, label: '安全', icon: 'lock' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-sm text-slate-600">管理您的账户设置和偏好</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={cn(
          'p-4 rounded-lg',
          message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        )}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        <div className="border-b">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">账户信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">用户名</label>
                    <input
                      type="text"
                      value={accountForm.username}
                      onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">邮箱地址</label>
                    <input
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">危险区域</h2>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <span className="material-symbols-outlined mr-2">delete_forever</span>
                    删除账户
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => updateAccountMutation.mutate(accountForm)}
                  disabled={updateAccountMutation.isPending}
                >
                  {updateAccountMutation.isPending ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">外观</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">主题</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'light', label: '浅色', icon: 'light_mode' },
                        { value: 'dark', label: '深色', icon: 'dark_mode' },
                        { value: 'system', label: '跟随系统', icon: 'brightness_auto' },
                      ].map((theme) => (
                        <button
                          key={theme.value}
                          onClick={() => setPreferences({ ...preferences, theme: theme.value as any })}
                          className={cn(
                            'flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors',
                            preferences.theme === theme.value
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          )}
                        >
                          <span className="material-symbols-outlined">{theme.icon}</span>
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">字体大小</label>
                    <select
                      value={preferences.fontSize}
                      onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value as any })}
                      className="px-4 py-2 border rounded-lg"
                    >
                      <option value="small">小</option>
                      <option value="medium">中</option>
                      <option value="large">大</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">编辑器</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">自动保存</p>
                      <p className="text-sm text-slate-600">自动保存代码草稿</p>
                    </div>
                    <button
                      onClick={() => setPreferences({ ...preferences, autoSave: !preferences.autoSave })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative',
                        preferences.autoSave ? 'bg-primary' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          preferences.autoSave ? 'left-7' : 'left-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">显示行号</p>
                      <p className="text-sm text-slate-600">在编辑器中显示行号</p>
                    </div>
                    <button
                      onClick={() => setPreferences({ ...preferences, showLineNumbers: !preferences.showLineNumbers })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative',
                        preferences.showLineNumbers ? 'bg-primary' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          preferences.showLineNumbers ? 'left-7' : 'left-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">自动换行</p>
                      <p className="text-sm text-slate-600">长行自动换行</p>
                    </div>
                    <button
                      onClick={() => setPreferences({ ...preferences, wordWrap: !preferences.wordWrap })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative',
                        preferences.wordWrap ? 'bg-primary' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          preferences.wordWrap ? 'left-7' : 'left-1'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">语言</h2>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => updatePreferencesMutation.mutate(preferences)}
                  disabled={updatePreferencesMutation.isPending}
                >
                  {updatePreferencesMutation.isPending ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">邮件通知</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">启用邮件通知</p>
                      <p className="text-sm text-slate-600">接收邮件通知</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, emailNotifications: !notifications.emailNotifications })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative',
                        notifications.emailNotifications ? 'bg-primary' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          notifications.emailNotifications ? 'left-7' : 'left-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">竞赛提醒</p>
                      <p className="text-sm text-slate-600">竞赛开始前提醒</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, contestReminders: !notifications.contestReminders })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative',
                        notifications.contestReminders ? 'bg-primary' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          notifications.contestReminders ? 'left-7' : 'left-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">新题目通知</p>
                      <p className="text-sm text-slate-600">新题目发布时通知</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, newProblems: !notifications.newProblems })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative',
                        notifications.newProblems ? 'bg-primary' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          notifications.newProblems ? 'left-7' : 'left-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">评论回复</p>
                      <p className="text-sm text-slate-600">有人回复您的评论时通知</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, replyComments: !notifications.replyComments })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative',
                        notifications.replyComments ? 'bg-primary' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          notifications.replyComments ? 'left-7' : 'left-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">每周报告</p>
                      <p className="text-sm text-slate-600">每周学习活动总结</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, weeklyReport: !notifications.weeklyReport })}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative',
                        notifications.weeklyReport ? 'bg-primary' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                          notifications.weeklyReport ? 'left-7' : 'left-1'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => updateNotificationsMutation.mutate(notifications)}
                  disabled={updateNotificationsMutation.isPending}
                >
                  {updateNotificationsMutation.isPending ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">修改密码</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium mb-1">当前密码</label>
                    <input
                      type="password"
                      placeholder="输入当前密码"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">新密码</label>
                    <input
                      type="password"
                      placeholder="输入新密码"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">确认新密码</label>
                    <input
                      type="password"
                      placeholder="再次输入新密码"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <Button variant="primary">更新密码</Button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">两步验证</h2>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium">启用两步验证</p>
                    <p className="text-sm text-slate-600">使用验证器应用或短信验证</p>
                  </div>
                  <Button variant="outline">启用</Button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">登录活动</h2>
                <div className="space-y-3">
                  {[
                    { device: 'Chrome on macOS', location: '北京, 中国', time: '当前', current: true },
                    { device: 'Safari on iPhone', location: '北京, 中国', time: '2小时前', current: false },
                    { device: 'Firefox on Windows', location: '上海, 中国', time: '1天前', current: false },
                  ].map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div>
                        <p className="font-medium">{session.device}</p>
                        <p className="text-sm text-slate-600">{session.location} • {session.time}</p>
                      </div>
                      {!session.current && (
                        <Button variant="outline" size="sm">撤销</Button>
                      )}
                      {session.current && (
                        <span className="text-xs text-primary">当前会话</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
