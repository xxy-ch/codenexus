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
  sm: 'h-10 px-4 text-sm',
  small: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-sm',
  medium: 'h-12 px-5 text-sm',
  lg: 'h-13 px-6 text-base',
  large: 'h-13 px-6 text-base',
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(135deg,#003d9b,#0052cc)] text-white shadow-[0_16px_32px_rgba(0,61,155,0.18)] hover:brightness-[1.03] focus-visible:ring-[#dae2ff]',
  secondary:
    'bg-[rgba(226,231,255,0.88)] text-[#244171] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] hover:bg-[rgba(218,226,253,0.96)] focus-visible:ring-[#dae2ff]',
  outline:
    'bg-white/92 text-[#445472] shadow-[0_10px_24px_rgba(19,27,46,0.05)] hover:bg-[#eef2ff] hover:text-[#17305e] focus-visible:ring-[#dae2ff]',
  ghost:
    'bg-transparent text-[#586988] hover:bg-white/70 hover:text-[#17305e] focus-visible:ring-[#dae2ff]',
  danger:
    'bg-[#ba1a1a] text-white shadow-[0_14px_30px_rgba(186,26,26,0.18)] hover:brightness-[1.04] focus-visible:ring-[#ffdad6]',
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
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[16px] font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--page-bg-rgb))] disabled:cursor-not-allowed disabled:opacity-50',
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
