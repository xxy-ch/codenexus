import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  error?: string
  fullWidth?: boolean
  variant?: 'default' | 'glass'
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  error,
  fullWidth = true,
  variant = 'default',
  disabled,
  className,
  ...props
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className={cn("relative", fullWidth ? "w-full" : "w-fit")}>
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className={cn(
          "flex w-full items-center justify-between rounded-none border px-4 py-2.5 text-sm outline-none transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          variant === 'default' && [
            "bg-background",
            "focus:border-foreground focus:ring-2 focus:ring-ring/20",
            error ? "border-destructive" : "border-border",
          ],
          variant === 'glass' && [
            "bg-card border-border",
            "focus:bg-background focus:border-foreground focus:ring-2 focus:ring-ring/20",
            error ? "border-destructive" : "border-border",
          ],
          className
        )}
        {...props}
      >
        <span className={cn(!selectedOption && "text-muted-foreground")}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 w-full overflow-hidden rounded-none border border-border bg-background animate-scale-in",
            "max-h-60 overflow-y-auto"
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onClick={() => {
                onValueChange?.(option.value)
                setIsOpen(false)
              }}
              className={cn(
                "flex w-full items-center px-4 py-2.5 text-sm transition-colors duration-150",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                option.value === value && "bg-primary/10 text-primary font-medium",
                option.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

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
