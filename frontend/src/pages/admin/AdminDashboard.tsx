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
import { FEATURE_FLAGS } from '@/services/config'

export function AdminDashboard() {
  const { user } = useAuthStore()

  if (user?.role !== 'admin') {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">访问被拒绝</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">当前账号不具备管理员权限。</p>
      </div>
    )
  }

  const modules = [
    {
      title: '题目管理',
      description: '查看题库状态、通过率和当前交付范围内的发布视图。',
      href: '/admin/problems',
      icon: BookCopy,
      tone: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      title: '判题设置',
      description: '维护测试数据、时间空间限制与评测参数。',
      href: '/admin/judge-settings',
      icon: SlidersHorizontal,
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: '题面配置',
      description: '集中编辑题面内容、约束、可见性与说明。',
      href: '/admin/problem-content',
      icon: LayoutGrid,
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    ...(FEATURE_FLAGS.plagiarism
      ? [
          {
            title: '相似度配置',
            description: '调整扫描阈值并发起新的代码相似度任务。',
            href: '/admin/similarity-scan',
            icon: Activity,
            tone: 'bg-violet-50 text-violet-700 border-violet-200',
          },
          {
            title: '抄袭报告',
            description: '查看真实扫描报告、可疑对照和风险详情。',
            href: '/admin/plagiarism-reports',
            icon: FileSearch,
            tone: 'bg-rose-50 text-rose-700 border-rose-200',
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.12),_transparent_38%),linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eff6ff_100%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Admin</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-900">Overview</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">System Overview</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  管理端当前只暴露已接入真实后端的能力。页面结构按 reference 收拢，但所有入口仍受真实接口边界约束。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Live Modules</div>
                <div className="mt-3 text-3xl font-semibold text-slate-950">{modules.length}</div>
                <div className="mt-1 text-sm text-slate-600">已接入真实后端的管理模块</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                  <Sparkles className="h-4 w-4" />
                  Delivery Mode
                </div>
                <div className="mt-3 text-2xl font-semibold">Controlled Surface</div>
                <div className="mt-1 text-sm text-slate-300">无后端支撑的入口已从本次交付面移除</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Problem View</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">Read-only</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">题目管理已收敛为安全的只读运营视图。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Plagiarism</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{FEATURE_FLAGS.plagiarism ? 'Enabled' : 'Disabled'}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">相似度扫描和报告页都已经接入真实接口。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Unsupported</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">2</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">用户管理和举报管理已从主入口移除。</p>
        </div>
        <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">Runtime Policy</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">Real API</div>
          <p className="mt-2 text-sm leading-6 text-blue-900">不再为管理端页面提供用户可见的 mock fallback。</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
        当前后台不是全功能运营平台，而是这次交付范围内的受控后台。不存在真实后端的模块不会继续以假入口形式暴露。
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon
          return (
            <Link
              key={module.href}
              to={module.href}
              className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`inline-flex rounded-2xl border px-3 py-3 ${module.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-semibold text-slate-950">{module.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-900 transition group-hover:text-blue-700">
                Open module
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
