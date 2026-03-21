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
          'w-full rounded-2xl border bg-[rgba(255,255,255,0.88)] px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_24px_rgba(15,23,42,0.05)] outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-slate-400 focus-visible:border-blue-300 focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-slate-500 dark:focus-visible:ring-slate-800 dark:disabled:bg-slate-950',
          error ? 'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-100 dark:focus-visible:ring-rose-900/40' : 'border-slate-200/90',
          className
        )}
        disabled={disabled}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}
