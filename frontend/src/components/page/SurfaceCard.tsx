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
        'rounded-3xl border p-6 shadow-sm',
        tone === 'muted' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white',
        className,
      )}
    >
      {children}
    </section>
  )
}
