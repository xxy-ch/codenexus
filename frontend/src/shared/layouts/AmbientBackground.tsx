import React from 'react'
import { cn } from '@/shared/lib/utils'

export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none -z-10", className)}>
      {/* Primary blob */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      {/* Secondary blob */}
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '2s' }} 
      />
      {/* Tertiary center subtle blob */}
      <div 
        className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse" 
        style={{ animationDuration: '15s', animationDelay: '5s' }} 
      />
    </div>
  )
}
