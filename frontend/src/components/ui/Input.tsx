import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string
  error?: string
  fullWidth?: boolean
}

export function Input({ className, error, fullWidth = true, disabled, ...props }: InputProps) {
  return (
    <div className={cn(fullWidth ? 'w-full' : 'w-fit')}>
      <input
        className={cn(
          'w-full rounded-lg border bg-card px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground dark:disabled:bg-muted',
          error ? 'border-destructive focus:ring-red-500/20' : 'border-border',
          className
        )}
        disabled={disabled}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
