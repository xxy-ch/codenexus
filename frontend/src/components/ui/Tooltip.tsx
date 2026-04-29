import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
  className?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 200,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 px-3 py-1.5 text-xs font-medium text-foreground whitespace-nowrap",
            "bg-background/90 backdrop-blur-xl border border-border/50 rounded-lg",
            "shadow-elevated animate-fade-in",
            positionClasses[side],
            className
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-2 h-2 bg-background/90 border-border/50 rotate-45",
              side === 'top' && "bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b",
              side === 'right' && "left-[-4px] top-1/2 -translate-y-1/2 border-b border-l",
              side === 'bottom' && "top-[-4px] left-1/2 -translate-x-1/2 border-t border-l",
              side === 'left' && "right-[-4px] top-1/2 -translate-y-1/2 border-t border-r",
            )}
          />
        </div>
      )}
    </div>
  )
}
