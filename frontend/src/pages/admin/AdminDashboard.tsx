import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BookCopy,
  ChevronRight,
  FileSearch,
  LayoutGrid,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useFeatureEnabled } from '@/hooks/useFeatureGate'
import { isAdmin } from '@/types/auth'

export function AdminDashboard() {
  const { user } = useAuthStore()
  const { enabled: plagiarismEnabled } = useFeatureEnabled('plagiarism')

  if (user?.role && !isAdmin(user.role)) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">访问被拒绝</h2>
          <p className="mt-2 text-sm text-muted-foreground">当前账号不具备管理员权限。</p>
        </div>
      </div>
    )
  }

  const modules = [
    {
      title: '题目管理',
      description: '查看题库状态、通过率和当前交付范围内的发布视图。',
      href: '/admin/problems',
      icon: BookCopy,
      accent: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      title: '判题设置',
      description: '维护测试数据、时间空间限制与评测参数。',
      href: '/admin/judge-settings',
      icon: SlidersHorizontal,
      accent: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      title: '题面配置',
      description: '集中编辑题面内容、约束、可见性与说明。',
      href: '/admin/problem-content',
      icon: LayoutGrid,
      accent: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    ...(plagiarismEnabled
      ? [
          {
            title: '相似度配置',
            description: '调整扫描阈值并发起新的代码相似度任务。',
            href: '/admin/similarity-scan',
            icon: Activity,
            accent: 'text-violet-400',
            bg: 'bg-violet-500/10',
          },
          {
            title: '抄袭报告',
            description: '查看真实扫描报告、可疑对照和风险详情。',
            href: '/admin/plagiarism-reports',
            icon: FileSearch,
            accent: 'text-rose-400',
            bg: 'bg-rose-500/10',
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span>Admin</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">系统概览</span>
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">CodeNexus 系统概览</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              管理端当前只暴露已接入真实后端的能力。页面结构按 reference 收拢，但所有入口仍受真实接口边界约束。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">活跃模块</div>
              <div className="mt-3 text-3xl font-bold text-foreground">{modules.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">已接入真实后端的管理模块</div>
            </div>
            <div className="rounded-lg border border-border bg-primary p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
                <Sparkles className="h-3.5 w-3.5" />
                交付模式
              </div>
              <div className="mt-3 text-lg font-bold text-primary-foreground">受控交付面</div>
              <div className="mt-1 text-xs text-primary-foreground/70">无后端支撑的入口已从本次交付面移除</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">题目管理</div>
          <div className="mt-4 text-3xl font-bold text-foreground">CRUD</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">题目管理当前已接通创建、编辑、删除与测试数据维护。</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">抄袭检测</div>
          <div className="mt-4 flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${plagiarismEnabled ? 'bg-lime-400' : 'bg-muted-foreground/40'}`} />
            <span className="text-3xl font-bold text-foreground">{plagiarismEnabled ? '已启用' : '已禁用'}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">相似度扫描和报告页都已经接入真实接口。</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">未开放</div>
          <div className="mt-4 text-3xl font-bold text-foreground">2</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">用户管理和举报管理已从主入口移除。</p>
        </div>
        <div className="rounded-xl border border-border bg-accent/50 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-foreground">运行策略</div>
          <div className="mt-4 text-3xl font-bold text-foreground">Real API</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">不再为管理端页面提供用户可见的 mock fallback。</p>
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 text-sm leading-6 text-amber-200">
        当前后台不是全功能运营平台，而是这次交付范围内的受控后台。不存在真实后端的模块不会继续以假入口形式暴露。
      </div>

      {/* Module Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon
          return (
            <Link
              key={module.href}
              to={module.href}
              className="group rounded-xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className={`inline-flex rounded-lg ${module.bg} p-3`}>
                <Icon className={`h-5 w-5 ${module.accent}`} />
              </div>
              <div className="mt-5">
                <h2 className="text-base font-semibold text-foreground">{module.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.description}</p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition group-hover:text-primary">
                进入模块
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
