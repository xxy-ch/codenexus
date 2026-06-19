import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string
  error?: string
  fullWidth?: boolean
  variant?: 'default' | 'glass'
}

export function Input({
  className,
  error,
  fullWidth = true,
  disabled,
  variant = 'default',
  ...props
}: InputProps) {
  return (
    <div className={cn(fullWidth ? 'w-full' : 'w-fit')}>
      <input
        className={cn(
          'w-full rounded-none border px-[14px] py-[10px] text-[14px] text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'default' && [
            'bg-background border-border',
            'focus:bg-background focus:border-foreground focus:ring-2 focus:ring-ring/20',
            error ? 'border-destructive focus:ring-destructive/20' : 'hover:border-foreground',
          ],
          variant === 'glass' && [
            'bg-card border-border',
            'focus:bg-background focus:border-foreground focus:ring-2 focus:ring-ring/20',
            error ? 'border-destructive focus:ring-destructive/20' : 'hover:border-foreground',
          ],
          disabled && 'bg-muted text-muted-foreground border-border cursor-not-allowed',
          className
        )}
        disabled={disabled}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
