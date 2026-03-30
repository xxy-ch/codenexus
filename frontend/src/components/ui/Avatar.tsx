import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface AvatarProps {
  src?: string
  alt?: string
  fallback?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeStyles: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className,
}: AvatarProps) {
  const hasError = !src

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden bg-surface-container-low border-2 border-primary-fixed font-semibold text-on-surface',
        sizeStyles[size],
        className
      )}
    >
      {hasError ? (
        fallback || (
          <span className="uppercase">
            {alt?.charAt(0) || '?'}
          </span>
        )
      ) : (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      )}
    </div>
  )
}

interface AvatarGroupProps {
  children: ReactNode
  max?: number
  className?: string
}

export function AvatarGroup({ children, max = 3, className }: AvatarGroupProps) {
  return (
    <div className={cn('flex -space-x-2', className)}>
      {children}
    </div>
  )
}
