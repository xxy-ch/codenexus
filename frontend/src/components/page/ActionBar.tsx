import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ActionBarProps {
  children: ReactNode
  className?: string
}

export function ActionBar({ children, className }: ActionBarProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:flex-wrap md:items-center md:justify-end',
        className,
      )}
    >
      {children}
    </section>
  )
}
