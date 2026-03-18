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
  primary: 'bg-primary text-white shadow-primary hover:bg-primary-hover focus:ring-primary/30',
  secondary: 'bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary/30',
  outline: 'border border-border-light bg-surface-light text-slate-700 hover:bg-primary/5 hover:text-primary dark:border-border-dark dark:bg-surface-dark dark:text-slate-200 dark:hover:bg-primary/15',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  danger: 'bg-danger text-white hover:bg-red-600 focus:ring-red-500/30',
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
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
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
