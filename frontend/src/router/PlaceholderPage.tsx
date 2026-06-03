interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <p className="text-sm font-medium text-on-surface-variant">CodeNexus / 模块入口</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
              当前入口已接入模块化路由和权限外壳，保留主分支面板布局密度，后续可按功能包热插拔完整业务实现。
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">
            模块化可导入
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-on-surface-variant">入口状态</p>
          <p className="mt-2 text-2xl font-bold text-on-surface">Ready</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-on-surface-variant">权限外壳</p>
          <p className="mt-2 text-2xl font-bold text-on-surface">Active</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-on-surface-variant">视觉基准</p>
          <p className="mt-2 text-2xl font-bold text-primary">Main</p>
        </div>
      </section>
    </div>
  )
}
