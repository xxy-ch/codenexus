import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export function ReportManagement() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            管理台 / 审核中心 / 举报
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            举报管理
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            当前版本仅接通抄袭检测审计流。通用举报工作流尚未在后端开放真实写读接口。
          </p>
        </div>
        <div className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface-variant">
          诚实降级
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">通用举报工作流</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface-variant">未接通</p>
          <p className="mt-2 text-sm text-on-surface-variant">后端暂无 /admin/reports</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">抄袭检测审计</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-tertiary">已接通</p>
          <p className="mt-2 text-sm text-on-surface-variant">使用真实 /admin/plagiarism/*</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">用户可见状态</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">诚实提示</p>
          <p className="mt-2 text-sm text-on-surface-variant">不再渲染伪列表与伪处理结果</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">下一步</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">后端补齐</p>
          <p className="mt-2 text-sm text-on-surface-variant">数据模型、列表查询与状态流转</p>
        </Card>
      </div>

      {/* Info Card */}
      <Card variant="default" className="p-8">
        <EmptyState
          title="当前版本未接通通用举报工作流"
          description="为避免前端继续调用不存在的 /admin/reports 读写接口，这里改为诚实提示。需要继续审核时，请使用已接通的抄袭检测与审计页面。"
          action={{
            label: '进入抄袭检测与审计',
            href: '/admin/plagiarism-reports',
          }}
          icon={<span className="material-symbols-outlined text-6xl text-on-surface-variant">block</span>}
        />
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="surface" className="p-5">
          <h2 className="text-base font-semibold text-on-surface">平台已接入抄袭检测与审计记录</h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            可继续使用抄袭配置、扫描任务、报告列表和报告详情，不再让用户误以为通用举报流已经具备真实写读能力。
          </p>
        </Card>
        <Card variant="surface" className="border-dashed border-2 border-outline-variant p-5">
          <h2 className="text-base font-semibold text-on-surface">后端补齐建议</h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            若要恢复本页真实功能，需补通用举报数据模型、列表查询、状态流转和处理备注接口，再回接前端交互。
          </p>
        </Card>
      </div>
    </div>
  )
}

export default ReportManagement
