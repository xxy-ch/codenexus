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
          'w-full rounded-[8px] border px-[14px] py-[10px] text-[14px] text-foreground outline-none transition-all duration-250 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          // Default variant - frosted glass input with Cursor focus ring
          variant === 'default' && [
            'bg-background/60 backdrop-blur-xl border-border/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]',
            'focus:bg-background/80 focus:border-primary focus:ring-[3px] focus:ring-primary/20 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_0_0_1px_rgba(245,78,0,0.1)] dark:focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_0_0_1px_rgba(245,78,0,0.15)]',
            error ? 'border-destructive focus:ring-destructive/20' : 'border-border/40 hover:border-border/80',
          ],
          // Glass variant - identical to default but kept for backwards compatibility
          variant === 'glass' && [
            'bg-background/60 backdrop-blur-xl border-border/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]',
            'focus:bg-background/80 focus:border-primary focus:ring-[3px] focus:ring-primary/20 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_0_0_1px_rgba(245,78,0,0.1)] dark:focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_0_0_1px_rgba(245,78,0,0.15)]',
            error ? 'border-destructive focus:ring-destructive/20' : 'border-border/40 hover:border-border/80',
          ],
          // Disabled state
          disabled && 'bg-muted/30 text-muted-foreground border-border/20 cursor-not-allowed shadow-none',
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
