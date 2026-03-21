import type { ButtonHTMLAttributes, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'small' | 'md' | 'medium' | 'lg' | 'large'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  fullWidth?: boolean
  as?: ElementType
  children: ReactNode
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  small: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  medium: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  large: 'h-12 px-5 text-base',
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border border-blue-800 bg-blue-800 text-white shadow-[0_14px_30px_rgba(30,64,175,0.18)] hover:border-blue-700 hover:bg-blue-700 focus-visible:ring-blue-200 dark:border-blue-300 dark:bg-blue-300 dark:text-slate-950 dark:hover:bg-blue-200 dark:focus-visible:ring-blue-900/40',
  secondary:
    'border border-slate-300 bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] hover:bg-slate-800 focus-visible:ring-slate-200 dark:border-slate-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-slate-800',
  outline:
    'border border-slate-200/90 bg-[rgba(255,255,255,0.88)] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm hover:border-blue-200 hover:bg-blue-50/80 hover:text-blue-950 focus-visible:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-slate-700',
  ghost:
    'border border-transparent bg-transparent text-slate-600 hover:bg-white/75 hover:text-slate-950 focus-visible:ring-blue-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-slate-700',
  danger:
    'border border-rose-600 bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-200 dark:border-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400 dark:focus-visible:ring-rose-900/50',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  fullWidth = false,
  as,
  type,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--page-bg-rgb))] disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950',
    sizeStyles[size],
    variantStyles[variant],
    fullWidth && 'w-full',
    className
  )

  if (as) {
    const Component = as
    return (
      <Component
        className={classes}
        aria-disabled={disabled ? 'true' : undefined}
        {...props}
      >
        {children}
      </Component>
    )
  }

  return (
    <button type={type ?? 'button'} className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
