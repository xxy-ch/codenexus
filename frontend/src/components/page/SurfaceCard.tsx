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
        'rounded-[24px] border border-slate-200/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm',
        tone === 'muted'
          ? 'bg-[linear-gradient(180deg,rgba(244,247,255,0.98)_0%,rgba(235,241,255,0.95)_100%)]'
          : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.94)_100%)]',
        className,
      )}
    >
      {children}
    </section>
  )
}
