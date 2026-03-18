import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  breadcrumb?: string[]
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumb = [],
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section className={cn('rounded-3xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {(eyebrow || breadcrumb.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {eyebrow ? <span>{eyebrow}</span> : null}
              {eyebrow && breadcrumb.length > 0 ? <ChevronRight className="h-4 w-4" /> : null}
              {breadcrumb.map((item, index) => (
                <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                  {index > 0 ? <ChevronRight className="h-4 w-4" /> : null}
                  <span>{item}</span>
                </span>
              ))}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  )
}
