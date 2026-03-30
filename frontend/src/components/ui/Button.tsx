import type { ButtonHTMLAttributes, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient'
type ButtonSize = 'sm' | 'small' | 'md' | 'medium' | 'lg' | 'large'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  fullWidth?: boolean
  as?: ElementType
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-xs',
  small: 'h-9 px-4 text-xs',
  md: 'h-11 px-5 text-sm',
  medium: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-sm font-bold',
  large: 'h-12 px-6 text-sm font-bold',
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary shadow-[0_16px_30px_rgba(0,61,155,0.18)] hover:brightness-110 active:scale-95 focus-visible:ring-primary-fixed',
  secondary:
    'bg-surface-container-low text-on-surface shadow-sm hover:bg-surface-container focus-visible:ring-primary-fixed',
  outline:
    'bg-white/94 text-on-surface shadow-[0_8px_18px_rgba(19,27,46,0.04)] hover:bg-surface-container-low hover:text-primary focus-visible:ring-primary-fixed',
  ghost:
    'bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus-visible:ring-primary-fixed',
  danger:
    'bg-error text-on-error shadow-[0_14px_30px_rgba(186,26,26,0.18)] hover:brightness-110 focus-visible:ring-error-container',
  gradient:
    'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-button hover:brightness-110 active:scale-95 focus-visible:ring-primary-fixed',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  fullWidth = false,
  as,
  type,
  disabled,
  leftIcon,
  rightIcon,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </Component>
    )
  }

  return (
    <button type={type ?? 'button'} className={classes} disabled={disabled} {...props}>
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  )
}
