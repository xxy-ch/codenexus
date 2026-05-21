import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioOption {
  value: string
  label: string
  disabled?: boolean
}

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: RadioOption[]
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  error?: string
  orientation?: 'horizontal' | 'vertical'
}

export function RadioGroup({
  options,
  value,
  onValueChange,
  name,
  error,
  orientation = 'vertical',
  className,
  ...props
}: RadioGroupProps) {
  const groupName = name || React.useId()

  return (
    <div
      role="radiogroup"
      className={cn(
        "flex gap-2",
        orientation === 'vertical' ? "flex-col" : "flex-row flex-wrap",
        className
      )}
      {...props}
    >
      {options.map((option) => (
        <RadioItem
          key={option.value}
          option={option}
          checked={value === option.value}
          onCheckedChange={() => onValueChange?.(option.value)}
          name={groupName}
          error={!!error}
        />
      ))}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

function RadioItem({
  option,
  checked,
  onCheckedChange,
  name,
  error,
}: {
  option: RadioOption
  checked: boolean
  onCheckedChange: () => void
  name: string
  error: boolean
}) {
  const radioId = `${name}-${option.value}`

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        <input
          type="radio"
          id={radioId}
          name={name}
          value={option.value}
          checked={checked}
          disabled={option.disabled}
          onChange={onCheckedChange}
          className="peer sr-only"
        />
        <label
          htmlFor={radioId}
          className={cn(
            "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-200",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            // Unchecked state
            !checked && [
              "border-border bg-background",
              "hover:border-primary/50 hover:bg-primary/5",
            ],
            // Checked state
            checked && [
              "border-primary bg-primary",
              "shadow-sm shadow-primary/25",
            ],
            // Error state
            error && "border-destructive"
          )}
        >
          {checked && (
            <div className="h-2 w-2 rounded-full bg-primary-foreground" />
          )}
        </label>
      </div>
      <label
        htmlFor={radioId}
        className={cn(
          "text-sm leading-none cursor-pointer",
          option.disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {option.label}
      </label>
    </div>
  )
}
