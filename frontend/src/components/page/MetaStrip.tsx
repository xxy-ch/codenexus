import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MetaStripItem {
  label: string
  value: ReactNode
  helper?: ReactNode
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

interface MetaStripProps {
  items: MetaStripItem[]
  className?: string
}

const toneClasses = {
  default: 'border-slate-200 bg-white text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
} as const

export function MetaStrip({ items, className }: MetaStripProps) {
  return (
    <div
      data-testid="meta-strip"
      className={cn(
        'flex flex-nowrap gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        const tone = item.tone ?? 'default'

        return (
          <section
            key={`${item.label}-${String(item.value)}`}
            className={cn(
              'inline-flex min-w-fit items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm',
              toneClasses[tone],
            )}
          >
            {Icon ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/[0.04] text-slate-500">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {item.label}
              </span>
              <span className="text-sm font-semibold text-slate-950">{item.value}</span>
              {item.helper ? <span className="text-xs text-slate-500">{item.helper}</span> : null}
            </div>
          </section>
        )
      })}
    </div>
  )
}
