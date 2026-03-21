import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,249,253,0.88))] px-6 py-12 text-center shadow-[0_14px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm',
        className,
      )}
    >
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      {description ? <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  )
}
