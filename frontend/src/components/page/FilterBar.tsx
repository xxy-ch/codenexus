import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  children: ReactNode
  className?: string
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-[28px] border border-slate-200/90 bg-[rgba(255,255,255,0.88)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:flex-wrap md:items-center',
        className,
      )}
    >
      {children}
    </section>
  )
}
