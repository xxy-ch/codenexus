interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="card p-12 text-center">
      <h1 className="font-display text-2xl font-bold text-on-surface">{title}</h1>
      <p className="mt-3 text-sm text-on-surface-variant">该功能入口已保留，页面内容正在恢复中。</p>
    </div>
  )
}
