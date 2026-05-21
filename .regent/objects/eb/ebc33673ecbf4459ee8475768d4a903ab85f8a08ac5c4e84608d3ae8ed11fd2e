import { ArrowDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InheritedIndicatorProps {
  source: 'default' | 'global' | 'campus' | 'grade'
  className?: string
}

const SCOPE_LABEL_MAP: Record<InheritedIndicatorProps['source'], string> = {
  default: 'Default',
  global: 'Global',
  campus: 'Campus',
  grade: 'Grade',
}

function InheritedIndicator({ source, className }: InheritedIndicatorProps) {
  return (
    <span
      data-slot="inherited-indicator"
      className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}
    >
      <ArrowDownLeft className="h-3 w-3" />
      <span>Inherited from: {SCOPE_LABEL_MAP[source]}</span>
    </span>
  )
}

export { InheritedIndicator }
export type { InheritedIndicatorProps }
