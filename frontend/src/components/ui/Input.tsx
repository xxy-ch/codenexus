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
          'w-full rounded-[8px] bg-[rgba(242,243,255,0.88)] px-4 py-3 text-sm text-[#17305e] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition-all duration-200 placeholder:text-[#93a0bb] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[rgba(12,86,208,0.2)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
          error ? 'bg-[#ffdad6] text-[#93000a] focus-visible:ring-[rgba(186,26,26,0.16)]' : '',
          className
        )}
        disabled={disabled}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}
