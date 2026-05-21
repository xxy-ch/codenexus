import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@/components/ui/Card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FeatureToggle } from '@/components/ui/FeatureToggle'
import {
  Plus, Trash2, Search, Settings, Bell, User, ChevronRight,
  Inbox, Download, Share2, Star, CheckCircle,
  FileText, Code2, Trophy, Zap,
} from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div>{children}</div>
    </div>
  )
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-20 rounded-lg border border-border ${className}`} />
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground font-mono">{className.replace('bg-', '')}</div>
      </div>
    </div>
  )
}

export default function ComponentPreview() {
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({
    dark_mode: true,
    notifications: false,
    beta_features: true,
  })
  const [darkMode, setDarkMode] = useState(false)

  // Synchronize darkMode state with document.documentElement
  useEffect(() => {
    const originalDark = document.documentElement.classList.contains('dark')
    const originalColorScheme = document.documentElement.style.getPropertyValue('color-scheme')
    
    document.documentElement.classList.toggle('dark', darkMode)
    document.documentElement.style.setProperty('color-scheme', darkMode ? 'dark' : 'light')
    
    return () => {
      if (originalDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      if (originalColorScheme) {
        document.documentElement.style.setProperty('color-scheme', originalColorScheme)
      } else {
        document.documentElement.style.removeProperty('color-scheme')
      }
    }
  }, [darkMode])

  const toggleFeature = (slug: string, _scope: string, enabled: boolean) => {
    setToggleStates(prev => ({ ...prev, [slug]: enabled }))
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Component Preview</h1>
              <p className="text-sm text-muted-foreground">CodeNexus Design System — 组件样式预览</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{darkMode ? 'Dark' : 'Light'}</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: darkMode ? 'var(--primary)' : 'var(--muted)' }}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200"
                  style={{ transform: darkMode ? 'translateX(20px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8 space-y-12">

          {/* ─── Design Tokens ─── */}
          <Section title="Design Tokens / 设计令牌">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Swatch name="Background" className="bg-background" />
              <Swatch name="Foreground" className="bg-foreground" />
              <Swatch name="Card" className="bg-card" />
              <Swatch name="Primary" className="bg-primary" />
              <Swatch name="Secondary" className="bg-secondary" />
              <Swatch name="Muted" className="bg-muted" />
              <Swatch name="Muted FG" className="bg-muted-foreground" />
              <Swatch name="Destructive" className="bg-destructive" />
              <Swatch name="Border" className="bg-border" />
              <Swatch name="Ring" className="bg-ring" />
              <Swatch name="Input" className="bg-input" />
              <Swatch name="Accent" className="bg-accent" />
            </div>
            <SubSection title="OJ Status Colors / 判题状态色">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">Accepted</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">Wrong Answer</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm">TLE</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm">MLE</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm">CE</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 text-sm">RE</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm">Running</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-sm">Pending</div>
              </div>
            </SubSection>
            <SubSection title="OJ Difficulty Colors / 难度色">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--difficulty-easy)', color: '#fff' }}>简单 Easy</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--difficulty-medium)', color: '#fff' }}>中等 Medium</div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--difficulty-hard)', color: '#fff' }}>困难 Hard</div>
              </div>
            </SubSection>
            <SubSection title="Typography / 排版">
              <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                <p className="text-2xl font-bold">标题 Heading 2xl-bold / 仪表盘概览</p>
                <p className="text-xl font-semibold">标题 Heading xl-semibold</p>
                <p className="text-lg font-medium">标题 Heading lg-medium</p>
                <p className="text-base">正文 Body base — 在线判题系统</p>
                <p className="text-sm text-muted-foreground">辅助文字 text-sm muted — 最近 7 天的活动趋势</p>
                <p className="text-xs text-muted-foreground">标签 text-xs muted — 题目 ID</p>
                <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">代码 font-mono — console.log('Hello')</p>
              </div>
            </SubSection>
          </Section>

          {/* ─── Buttons ─── */}
          <Section title="Button / 按钮">
            <SubSection title="Variants / 变体">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="default">Default 默认</Button>
                <Button variant="outline">Outline 描边</Button>
                <Button variant="secondary">Secondary 次要</Button>
                <Button variant="ghost">Ghost 幽灵</Button>
                <Button variant="destructive">Destructive 危险</Button>
                <Button variant="link">Link 链接</Button>
              </div>
            </SubSection>
            <SubSection title="Sizes / 尺寸">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="xs">Extra Small</Button>
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
              </div>
            </SubSection>
            <SubSection title="Icon Buttons / 图标按钮">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="icon-xs"><Plus className="size-3" /></Button>
                <Button size="icon-sm"><Search className="size-3.5" /></Button>
                <Button size="icon"><Settings className="size-4" /></Button>
                <Button size="icon-lg"><Bell className="size-4" /></Button>
              </div>
            </SubSection>
            <SubSection title="With Icons / 带图标">
              <div className="flex flex-wrap items-center gap-3">
                <Button><Plus className="size-4" />新建题目</Button>
                <Button variant="outline"><Download className="size-4" />导出数据</Button>
                <Button variant="secondary"><Share2 className="size-4" />分享</Button>
                <Button variant="destructive"><Trash2 className="size-4" />删除</Button>
              </div>
            </SubSection>
            <SubSection title="States / 状态">
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled>Disabled 禁用</Button>
                <Button variant="outline" disabled>Disabled Outline</Button>
                <Button><CheckCircle className="size-4" />已提交</Button>
              </div>
            </SubSection>
          </Section>

          {/* ─── Inputs ─── */}
          <Section title="Input / 输入框">
            <div className="max-w-md space-y-4">
              <Input placeholder="请输入用户名" />
              <Input placeholder="带前缀图标" />
              <Input placeholder="搜索题目..." />
              <Input placeholder="错误状态" error="用户名不能为空" />
              <Input placeholder="禁用状态" disabled value="disabled value" />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="半宽输入" fullWidth={false} />
                <Input placeholder="日期选择" type="date" />
              </div>
            </div>
          </Section>

          {/* ─── Cards ─── */}
          <Section title="Card / 卡片">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>题目统计</CardTitle>
                  <CardDescription>最近 7 天的提交概况</CardDescription>
                  <CardAction>
                    <Button variant="outline" size="sm">查看详情</Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground">128</div>
                      <div className="text-xs text-muted-foreground">总提交</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">96</div>
                      <div className="text-xs text-muted-foreground">通过</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">75%</div>
                      <div className="text-xs text-muted-foreground">通过率</div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <span className="text-xs text-muted-foreground">最后更新: 2 分钟前</span>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>竞赛信息</CardTitle>
                  <CardDescription>CodeNexus 周赛 #42</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">状态</span>
                    <Badge variant="default">进行中</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">参与人数</span>
                    <span className="text-sm font-medium">128 人</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">题目数量</span>
                    <span className="text-sm font-medium">5 题</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">时长</span>
                    <span className="text-sm font-medium">2 小时</span>
                  </div>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>小卡片 (sm)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">这是一个使用 size="sm" 的紧凑卡片。</p>
                </CardContent>
              </Card>

              <Card className="p-0">
                <div className="p-4">
                  <div className="text-base font-medium">自定义卡片</div>
                  <p className="text-sm text-muted-foreground mt-1">不使用 CardHeader/CardContent 的自由布局。</p>
                </div>
                <div className="border-t border-border p-3 flex justify-end gap-2">
                  <Button variant="ghost" size="sm">取消</Button>
                  <Button size="sm">确认</Button>
                </div>
              </Card>
            </div>
          </Section>

          {/* ─── Badges ─── */}
          <Section title="Badge / 徽章">
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="ghost">Ghost</Badge>
            </div>
            <SubSection title="Status Badges / 状态徽章">
              <div className="flex flex-wrap gap-3">
                <StatusBadge status="accepted" />
                <StatusBadge status="wrong_answer" />
                <StatusBadge status="time_limit_exceeded" />
                <StatusBadge status="memory_limit_exceeded" />
                <StatusBadge status="compilation_error" />
                <StatusBadge status="runtime_error" />
                <StatusBadge status="running" />
                <StatusBadge status="pending" />
              </div>
            </SubSection>
          </Section>

          {/* ─── Loading ─── */}
          <Section title="Loading / 加载">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center">
                <Loading message="加载中..." />
              </div>
              <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center">
                <Loading size={24} message="小型加载器" />
              </div>
            </div>
          </Section>

          {/* ─── Skeletons ─── */}
          <Section title="Skeleton / 骨架屏">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <SubSection title="卡片骨架">
                  <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </SubSection>
              </div>
              <div className="space-y-3">
                <SubSection title="列表骨架">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </SubSection>
                <SubSection title="表格骨架">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <Skeleton className="h-8 w-full" />
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </SubSection>
              </div>
            </div>
          </Section>

          {/* ─── Empty State & Error ─── */}
          <Section title="Empty State & Error / 空状态与错误">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card">
                <EmptyState
                  icon={Inbox}
                  title="暂无题目"
                  description="当前还没有任何题目，点击下方按钮创建第一个题目。"
                  action={<Button><Plus className="size-4" />创建题目</Button>}
                />
              </div>
              <div className="rounded-xl border border-border bg-card">
                <InlineError
                  title="加载失败"
                  message="网络请求超时，请检查网络连接后重试。"
                  onRetry={() => {}}
                />
              </div>
            </div>
          </Section>

          {/* ─── Feature Toggles ─── */}
          <Section title="Feature Toggle / 功能开关">
            <div className="rounded-xl border border-border bg-card p-6 max-w-md space-y-5">
              <FeatureToggle
                slug="dark_mode"
                scope="global"
                enabled={toggleStates.dark_mode}
                onToggle={toggleFeature}
              />
              <FeatureToggle
                slug="notifications"
                scope="campus"
                enabled={toggleStates.notifications}
                onToggle={toggleFeature}
                source="global"
              />
              <FeatureToggle
                slug="beta_features"
                scope="grade"
                enabled={toggleStates.beta_features}
                onToggle={toggleFeature}
                source="campus"
              />
              <FeatureToggle
                slug="disabled_feature"
                scope="class"
                enabled={false}
                onToggle={toggleFeature}
                disabled
              />
            </div>
          </Section>

          {/* ─── Table Preview ─── */}
          <Section title="Table / 表格">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">题目 ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">题目名称</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">难度</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">通过率</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: '1001', name: '两数之和', difficulty: '简单', rate: '78%', status: 'accepted' },
                    { id: '1002', name: '反转链表', difficulty: '中等', rate: '56%', status: 'wrong_answer' },
                    { id: '1003', name: '动态规划入门', difficulty: '困难', rate: '23%', status: 'pending' },
                    { id: '1004', name: '二叉树遍历', difficulty: '中等', rate: '65%', status: 'running' },
                    { id: '1005', name: '图的 BFS', difficulty: '困难', rate: '31%', status: 'time_limit_exceeded' },
                  ].map(row => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm">{row.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          {row.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={
                          row.difficulty === '简单' ? 'text-green-600' :
                          row.difficulty === '中等' ? 'text-amber-600' :
                          'text-red-600'
                        }>
                          {row.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3">{row.rate}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status as any} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ─── Navigation Pattern ─── */}
          <Section title="Navigation Patterns / 导航模式">
            <SubSection title="Sidebar Item / 侧栏导航项">
              <div className="w-64 rounded-xl border border-border bg-card p-2 space-y-1">
                {[
                  { icon: Code2, label: '题库', active: true },
                  { icon: Trophy, label: '竞赛', active: false },
                  { icon: Zap, label: '排名', active: false },
                  { icon: Bell, label: '讨论', active: false },
                  { icon: User, label: '个人中心', active: false },
                  { icon: Settings, label: '设置', active: false },
                ].map(item => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                      item.active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <item.icon className="size-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.active && <ChevronRight className="size-4 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </SubSection>
            <SubSection title="Breadcrumb / 面包屑">
              <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="hover:text-foreground cursor-pointer">首页</span>
                <ChevronRight className="size-3.5" />
                <span className="hover:text-foreground cursor-pointer">题库</span>
                <ChevronRight className="size-3.5" />
                <span className="text-foreground font-medium">两数之和</span>
              </nav>
            </SubSection>
          </Section>

          {/* ─── Form Pattern ─── */}
          <Section title="Form Pattern / 表单模式">
            <div className="max-w-lg rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-base font-medium">创建题目</h3>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">题目名称</label>
                <Input placeholder="请输入题目名称" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">题目描述</label>
                <textarea
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/20 resize-none"
                  rows={4}
                  placeholder="请输入题目描述，支持 Markdown 格式"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">难度</label>
                  <select className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20">
                    <option>简单</option>
                    <option>中等</option>
                    <option>困难</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">标签</label>
                  <select className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20">
                    <option>数组</option>
                    <option>链表</option>
                    <option>树</option>
                    <option>动态规划</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline">取消</Button>
                <Button><Plus className="size-4" />创建</Button>
              </div>
            </div>
          </Section>

          {/* ─── Stat Cards ─── */}
          <Section title="Stat Cards / 统计卡片">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '已解决', value: '128', icon: CheckCircle, color: 'text-green-600' },
                { label: '提交次数', value: '256', icon: FileText, color: 'text-blue-600' },
                { label: '通过率', value: '78%', icon: Trophy, color: 'text-amber-600' },
                { label: '连续天数', value: '15', icon: Zap, color: 'text-purple-600' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <stat.icon className={`size-4 ${stat.color}`} />
                  </div>
                  <div className="mt-2 text-2xl font-bold">{stat.value}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* ─── Toast Preview (static) ─── */}
          <Section title="Toast (static preview) / 提示消息">
            <div className="space-y-3 max-w-sm">
              {[
                { type: 'success', title: '操作成功', message: '题目已成功创建。', icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-400' },
                { type: 'error', title: '操作失败', message: '网络连接超时，请重试。', icon: Trash2, bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-400' },
                { type: 'warning', title: '注意', message: '您的提交即将超时。', icon: Star, bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-400' },
                { type: 'info', title: '提示', message: '竞赛将在 5 分钟后开始。', icon: Bell, bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-400' },
              ].map(toast => (
                <div key={toast.type} className={`flex items-start gap-3 p-4 rounded-lg border shadow-sm ${toast.bg} ${toast.border}`}>
                  <toast.icon className={`w-5 h-5 shrink-0 ${toast.text}`} />
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${toast.text}`}>{toast.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{toast.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ─── Border Radius Scale ─── */}
          <Section title="Border Radius Scale / 圆角比例">
            <div className="flex flex-wrap items-end gap-4">
              {[
                { name: 'sm', cls: 'rounded-sm' },
                { name: 'md', cls: 'rounded-md' },
                { name: 'lg', cls: 'rounded-lg' },
                { name: 'xl', cls: 'rounded-xl' },
                { name: '2xl', cls: 'rounded-2xl' },
                { name: '3xl', cls: 'rounded-3xl' },
                { name: 'full', cls: 'rounded-full' },
              ].map(r => (
                <div key={r.name} className="text-center">
                  <div className={`w-16 h-16 bg-primary ${r.cls}`} />
                  <div className="text-xs text-muted-foreground mt-1">{r.name}</div>
                </div>
              ))}
            </div>
          </Section>

        </main>
      </div>
    </div>
  )
}
