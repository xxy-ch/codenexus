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
        'rounded-[28px] border p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm',
        tone === 'muted'
          ? 'border-slate-200/90 bg-[rgba(246,249,253,0.92)]'
          : 'border-slate-200/90 bg-[rgba(255,255,255,0.92)]',
        className,
      )}
    >
      {children}
    </section>
  )
}
