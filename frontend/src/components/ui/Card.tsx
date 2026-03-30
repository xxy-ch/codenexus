import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'surface' | 'elevated' | 'outlined'
}

const variantStyles: Record<
  NonNullable<CardProps['variant']>,
  string
> = {
  default: 'bg-white/94 rounded-[10px] shadow-panel',
  surface: 'bg-surface-container-low rounded-[10px]',
  elevated: 'bg-white/98 rounded-[10px] shadow-panel-soft',
  outlined: 'bg-white/94 rounded-[10px] border border-outline-variant/20',
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  return (
    <div className={cn(variantStyles[variant], className)}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-outline-variant/15', className)}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('p-6', className)}>{children}</div>
}

interface CardTitleProps {
  children: ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h2 className={cn('text-lg font-bold tracking-tight text-on-surface', className)}>
      {children}
    </h2>
  )
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-on-surface-variant', className)}>
      {children}
    </p>
  )
}
