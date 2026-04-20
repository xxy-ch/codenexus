import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-3 p-8",
        className
      )}
    >
      <Icon className="h-12 w-12 text-muted-foreground" />
      <h3 className="text-base font-medium">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <div data-slot="empty-state-action" className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
