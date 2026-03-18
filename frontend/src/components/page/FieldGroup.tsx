import { Children, cloneElement, isValidElement, useId, type ReactNode } from 'react'
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
    ? cloneElement(child, {
        id: child.props.id ?? fieldId,
        'aria-describedby': description ? child.props['aria-describedby'] ?? descriptionId : child.props['aria-describedby'],
        'aria-label': undefined,
      })
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
