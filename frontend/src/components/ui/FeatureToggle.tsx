import { cn } from '@/lib/utils'
import { InheritedIndicator } from './InheritedIndicator'

interface FeatureToggleProps {
  slug: string
  scope: 'global' | 'campus' | 'grade' | 'class'
  enabled: boolean
  onToggle: (slug: string, scope: string, enabled: boolean) => void
  disabled?: boolean
  source?: string
  className?: string
}

function FeatureToggle({
  slug,
  scope,
  enabled,
  onToggle,
  disabled = false,
  source,
  className,
}: FeatureToggleProps) {
  const showInherited = source !== undefined && source !== scope
  const label = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' ')

  return (
    <div
      data-slot="feature-toggle"
      className={cn(
        'flex flex-col gap-1',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium capitalize">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(slug, scope, !enabled)}
          disabled={disabled}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            enabled ? 'bg-primary' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200',
              enabled ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>
      {showInherited && (
        <InheritedIndicator source={source as 'default' | 'global' | 'campus' | 'grade'} />
      )}
    </div>
  )
}

export { FeatureToggle }
export type { FeatureToggleProps }
