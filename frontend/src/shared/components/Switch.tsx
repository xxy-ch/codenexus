import * as React from "react"
import { cn } from "@/shared/lib/utils"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  error?: string
}

export function Switch({
  checked = false,
  onCheckedChange,
  label,
  error,
  disabled,
  className,
  id,
  ...props
}: SwitchProps) {
  const switchId = id || React.useId()

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <input
          type="checkbox"
          id={switchId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <label
          htmlFor={switchId}
          className={cn(
            "block h-6 w-11 shrink-0 cursor-pointer rounded-full transition-all duration-200",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            // Unchecked state
            !checked && [
              "bg-border",
              "hover:bg-border-strong",
            ],
            // Checked state
            checked && [
              "bg-primary",
              "shadow-sm shadow-primary/25",
            ],
            // Error state
            error && "ring-2 ring-destructive"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200",
              checked && "translate-x-5"
            )}
          />
        </label>
      </div>
      {label && (
        <label
          htmlFor={switchId}
          className={cn(
            "text-sm leading-none cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {label}
        </label>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
