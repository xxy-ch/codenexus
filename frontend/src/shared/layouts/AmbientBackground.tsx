import { cn } from '@/shared/lib/utils'

export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn('fixed inset-0 pointer-events-none -z-10 bg-background', className)}
      style={{
        backgroundImage:
          'linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)',
        backgroundPosition: '0 0',
        backgroundSize: '32px 32px',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.92), rgba(0,0,0,0.55))',
      }}
    />
  )
}
