import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BookCopy,
  ChevronRight,
  Database,
  FileSearch,
  LayoutGrid,
  School,
  ShieldAlert,
  SlidersHorizontal,
  Users,
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
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-8 text-center shadow-sm">
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
      title: '用户管理',
      description: '管理平台用户账号、角色、状态和批量建号流程。',
      href: '/admin/users',
      icon: Users,
      accent: 'text-status-accepted',
      bg: 'bg-status-accepted/10',
    },
    {
      title: '年级管理',
      description: '维护年级、班级归属和教师/学生的教学组织边界。',
      href: '/admin/grades',
      icon: School,
      accent: 'text-difficulty-easy',
      bg: 'bg-difficulty-easy/10',
    },
    {
      title: '题目管理',
      description: '查看题库状态、通过率和发布视图。',
      href: '/admin/problems',
      icon: BookCopy,
      accent: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: '判题设置',
      description: '维护测试数据、时间空间限制与评测参数。',
      href: '/admin/judge-settings',
      icon: SlidersHorizontal,
      accent: 'text-difficulty-medium',
      bg: 'bg-difficulty-medium/10',
    },
    {
      title: '判题队列',
      description: '查看判题 Worker 心跳、队列状态和待处理任务。',
      href: '/admin/judge-queue',
      icon: Database,
      accent: 'text-difficulty-hard',
      bg: 'bg-difficulty-hard/10',
    },
    {
      title: '题面配置',
      description: '集中编辑题面内容、约束、可见性与说明。',
      href: '/admin/problem-content',
      icon: LayoutGrid,
      accent: 'text-status-accepted',
      bg: 'bg-status-accepted/10',
    },
    ...(plagiarismEnabled
      ? [
          {
            title: '相似度配置',
            description: '调整扫描阈值并发起新的代码相似度任务。',
            href: '/admin/similarity-scan',
            icon: Activity,
            accent: 'text-status-re',
            bg: 'bg-status-re/10',
          },
          {
            title: '抄袭报告',
            description: '查看扫描报告、可疑对照和风险详情。',
            href: '/admin/plagiarism-reports',
            icon: FileSearch,
            accent: 'text-destructive',
            bg: 'bg-destructive/10',
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-6 shadow-sm">
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
            <p className="admin-readable-muted mt-2 max-w-3xl text-sm leading-6">
              集中管理用户、题库、判题队列、年级组织和风控工具。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/40 bg-background/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">活跃模块</div>
              <div className="mt-3 text-3xl font-bold text-foreground">{modules.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">可用管理模块</div>
            </div>
            <div className="rounded-lg border border-border bg-primary p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
                管理入口
              </div>
              <div className="mt-3 text-lg font-bold text-primary-foreground">{modules.length} 个模块</div>
              <div className="mt-1 text-xs text-primary-foreground/70">与主导航保持一致</div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon
          return (
            <Link
              key={module.href}
              to={module.href}
              className="group rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated"
            >
              <div className={`inline-flex rounded-lg ${module.bg} p-3`}>
                <Icon className={`h-5 w-5 ${module.accent}`} />
              </div>
              <div className="mt-5">
                <h2 className="text-base font-semibold text-foreground">{module.title}</h2>
                <p className="admin-readable-muted mt-2 text-sm leading-6">{module.description}</p>
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
