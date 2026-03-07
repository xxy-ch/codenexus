import { Button as MuiButton } from '@mui/material'
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button'
import { cn } from '@/lib/utils'

interface ButtonProps extends Omit<MuiButtonProps, 'className'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  className?: string
  fullWidth?: boolean
  as?: React.ElementType
}

export function Button({
  variant = 'primary',
  className,
  fullWidth = false,
  as,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded-lg font-medium transition-all duration-200'

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-primary',
    secondary: 'bg-secondary text-white hover:bg-secondary/90',
    outline: 'border-2 border-primary text-primary hover:bg-primary/10',
    ghost: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
    danger: 'bg-danger text-white hover:bg-danger/90',
  }

  const buttonProps = {
    className: cn(baseStyles, variantStyles[variant], className),
    fullWidth,
    ...props,
  }

  if (as) {
    const Component = as
    return <Component {...buttonProps}>{children}</Component>
  }

  return <MuiButton {...buttonProps}>{children}</MuiButton>
}
