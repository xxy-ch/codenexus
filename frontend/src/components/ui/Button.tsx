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
  sm: 'h-8 px-3 text-xs',
  small: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  medium: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6 text-base',
  large: 'h-10 px-6 text-base',
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-slate-50 border border-transparent',
  secondary:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-500 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700 border border-transparent',
  outline:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800',
  ghost:
    'border border-transparent bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 border border-transparent',
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
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950',
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

