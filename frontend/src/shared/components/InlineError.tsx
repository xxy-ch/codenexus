import { AlertCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/Button"

interface InlineErrorProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

function InlineError({
  title = "加载失败",
  message = "请稍后重试",
  onRetry,
  className,
}: InlineErrorProps) {
  return (
    <div
      data-slot="inline-error"
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-3 p-8",
        className
      )}
    >
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  )
}

export { InlineError }
export type { InlineErrorProps }
