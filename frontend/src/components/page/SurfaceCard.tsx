import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SurfaceCardProps {
  children: ReactNode
  className?: string
  tone?: 'default' | 'muted'
}

export function SurfaceCard({ children, className, tone = 'default' }: SurfaceCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900',
        tone === 'muted' && 'bg-slate-50 dark:bg-slate-800/50',
        className,
      )}
    >
      {children}
    </section>
  )
}

