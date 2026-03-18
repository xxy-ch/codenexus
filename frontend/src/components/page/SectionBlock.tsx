import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionBlockProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function SectionBlock({ title, description, children, className }: SectionBlockProps) {
  return (
    <section className={cn('rounded-3xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}
