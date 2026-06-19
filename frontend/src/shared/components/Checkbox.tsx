import * as React from "react"
import { Check, Minus } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'checked'> {
  checked?: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean) => void
  label?: string
  error?: string
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  label,
  error,
  disabled,
  className,
  id,
  ...props
}: CheckboxProps) {
  const generatedId = React.useId()
  const checkboxId = id || generatedId
  const isIndeterminate = checked === 'indeterminate'
  const isChecked = checked === true

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          id={checkboxId}
          checked={isChecked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <label
          htmlFor={checkboxId}
          className={cn(
            "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-none border transition-colors duration-150",
            "hover:border-primary/50",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            // Unchecked state
            !isChecked && !isIndeterminate && [
              "border-border bg-background",
              "hover:border-primary/50 hover:bg-primary/5",
            ],
            // Checked state
            isChecked && [
              "border-primary bg-primary text-primary-foreground",
            ],
            // Indeterminate state
            isIndeterminate && [
              "border-primary bg-primary text-primary-foreground",
            ],
            // Error state
            error && "border-destructive"
          )}
        >
          {isChecked && <Check className="h-3.5 w-3.5" />}
          {isIndeterminate && <Minus className="h-3.5 w-3.5" />}
        </label>
      </div>
      {label && (
        <label
          htmlFor={checkboxId}
          className={cn(
            "text-sm leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
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
