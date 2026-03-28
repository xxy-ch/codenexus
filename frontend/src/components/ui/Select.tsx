import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  className?: string
  error?: string
}

export function Select({ className, error, disabled, ...props }: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          'h-[52px] w-full appearance-none rounded-[18px] border border-[rgba(193,201,224,0.36)] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,255,0.96)_100%)] px-[18px] pr-12 text-sm font-medium text-[#17305e] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_28px_rgba(19,27,46,0.05)] outline-none transition-all duration-200 focus-visible:border-[rgba(12,86,208,0.28)] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[rgba(12,86,208,0.09)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500',
          error ? 'border-[rgba(186,26,26,0.22)] bg-[linear-gradient(180deg,rgba(255,244,243,0.98)_0%,rgba(255,234,232,0.96)_100%)] text-[#93000a] focus-visible:ring-[rgba(186,26,26,0.12)]' : '',
          className,
        )}
        disabled={disabled}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2',
          disabled ? 'text-slate-300' : 'text-slate-400',
        )}
      />
      {error ? <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
    </div>
  )
}
