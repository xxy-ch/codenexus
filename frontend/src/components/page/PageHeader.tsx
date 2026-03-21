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
    <section
      className={cn(
        'rounded-[32px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,248,252,0.92))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.07)] backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {(eyebrow || breadcrumb.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {eyebrow ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">{eyebrow}</span> : null}
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
            <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950 md:text-[2.25rem]">{title}</h1>
            {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-[15px]">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3 self-start lg:justify-end">{actions}</div> : null}
      </div>
    </section>
  )
}
