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
    <section className={cn('overflow-hidden rounded-[32px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,253,0.92)_100%)] shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-sm', className)}>
      <div className="border-b border-slate-200/80 bg-[rgba(255,255,255,0.72)] px-6 py-5">
        <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}
