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
        'flex flex-col gap-3 rounded-[30px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,253,0.95)_100%)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:flex-wrap md:items-center',
        className,
      )}
    >
      {children}
    </section>
  )
}
