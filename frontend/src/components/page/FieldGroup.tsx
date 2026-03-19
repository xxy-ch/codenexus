import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldGroupProps {
  label: string
  description?: string
  children: ReactNode
  className?: string
}

export function FieldGroup({ label, description, children, className }: FieldGroupProps) {
  const fieldId = useId()
  const descriptionId = useId()

  const child = Children.only(children)
  const content = isValidElement(child)
    ? (() => {
        const element = child as ReactElement<Record<string, unknown>>
        const props = element.props as Record<string, string | undefined>

        return cloneElement(element, {
          id: props.id ?? fieldId,
          'aria-describedby': description ? props['aria-describedby'] ?? descriptionId : props['aria-describedby'],
        })
      })()
    : children

  return (
    <div className={cn('space-y-2 text-sm', className)}>
      <label htmlFor={fieldId} className="block font-medium text-slate-700">
        {label}
      </label>
      {content}
      {description ? (
        <p id={descriptionId} className="text-sm text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  )
}
