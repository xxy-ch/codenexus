import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      'rounded-[28px] border border-slate-200/90 bg-[rgba(255,255,255,0.92)] shadow-[0_16px_36px_rgba(15,23,42,0.08)] shadow-slate-200/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20',
      className
    )}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('border-b border-slate-200/80 p-6 dark:border-slate-800', className)}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h2 className={cn('text-xl font-semibold tracking-tight text-slate-950 dark:text-white', className)}>
      {children}
    </h2>
  )
}
