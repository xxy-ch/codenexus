import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookCopy,
  FileSearch,
  FileWarning,
  LayoutGrid,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { FEATURE_FLAGS } from '@/services/config'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const MODULE_TONE = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
} as const

export function AdminDashboard() {
  const { user } = useAuthStore()

  if (user?.role !== 'admin') {
    return (
      <EmptyState
        title="访问被拒绝"
        description="当前账号不具备管理员权限，无法进入后台工作区。"
        action={
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
        }
      />
    )
  }

  const modules = [
    {
      title: '用户管理',
      description: '查看账号状态、角色分布和批量建号入口。',
      href: '/admin/users',
      icon: Users,
      tone: 'blue' as const,
    },
    {
      title: '题目管理',
      description: '维护题库列表、创建新题和基础可见性。',
      href: '/admin/problems',
      icon: BookCopy,
      tone: 'slate' as const,
    },
    {
      title: '判题设置',
      description: '维护测试点与语言许可，Python 固定默认。',
      href: '/admin/judge-settings',
      icon: SlidersHorizontal,
      tone: 'amber' as const,
    },
    {
      title: '题面配置',
      description: '集中编辑题面正文、时空限制、标签和可见性。',
      href: '/admin/problem-content',
      icon: LayoutGrid,
      tone: 'emerald' as const,
    },
    {
      title: '举报管理',
      description: '处理真实举报记录和内容审核状态流转。',
      href: '/admin/reports',
      icon: FileWarning,
      tone: 'slate' as const,
    },
    ...(FEATURE_FLAGS.plagiarism
      ? [
          {
            title: '相似度配置',
            description: '调整阈值、扫描语言并启动新的相似度任务。',
            href: '/admin/similarity-scan',
            icon: Settings2,
            tone: 'blue' as const,
          },
          {
            title: '抄袭报告',
            description: '查看真实扫描报告、风险等级和可疑提交对。',
            href: '/admin/plagiarism-reports',
            icon: FileSearch,
            tone: 'rose' as const,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        breadcrumb={['Workspace']}
        title="管理工作台"
        description="管理端统一切到当前整站的 flat cold gray-blue 模式。这里只保留真实后端已接通的运营入口，不再展示假模块。"
        actions={
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              {modules.length} 个在线模块
            </div>
            <Button as={Link} to="/admin/problems" variant="primary">
              进入题目管理
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Modules" value={modules.length} helper="当前已接入真实 API 的管理模块数。" />
        <StatCard label="Plagiarism" value={FEATURE_FLAGS.plagiarism ? 'Enabled' : 'Disabled'} helper="相似度扫描与报告入口按功能开关显示。" />
        <StatCard label="Density" value="High" helper="表格、筛选和审核流统一成更紧凑的管理模式。" />
        <StatCard label="Policy" value="Real API" helper="不改变接口路径、请求语义或响应消费方式。" className="border-blue-200 bg-blue-50" />
      </div>

      <SurfaceCard tone="muted" className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <Sparkles className="h-4 w-4" />
            Controlled Admin Surface
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            这次收口目标是把后台页面统一到新的共享组件体系里，同时保留已有运营能力。不存在真实后端支撑的行为不会被伪造出来。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          用户、题库、评测、举报和相似度现在都在同一管理壳层中。
        </div>
      </SurfaceCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon

          return (
            <Link
              key={module.href}
              to={module.href}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className={cn('inline-flex rounded-2xl border p-3', MODULE_TONE[module.tone])}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-semibold text-slate-950">{module.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition group-hover:text-slate-950">
                打开模块
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
