import { cn } from '@/shared/lib/utils'

export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn('fixed inset-0 pointer-events-none -z-10 bg-background', className)}
      style={{
        backgroundImage:
          'linear-gradient(rgba(20,20,19,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,19,0.035) 1px, transparent 1px)',
        backgroundPosition: '0 0',
        backgroundSize: '28px 28px',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.42), rgba(0,0,0,0.10))',
      }}
    />
  )
}
