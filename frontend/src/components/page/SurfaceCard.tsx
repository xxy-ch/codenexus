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
        'rounded-[10px] p-6 shadow-[0_18px_42px_rgba(19,27,46,0.05)]',
        tone === 'muted'
          ? 'bg-[rgba(242,243,255,0.86)]'
          : 'bg-[rgba(255,255,255,0.94)]',
        className,
      )}
    >
      {children}
    </section>
  )
}
