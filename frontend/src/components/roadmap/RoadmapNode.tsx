import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoadmapNodeProps {
  data: {
    title: string
    description: string
    topics: string[]
    status: 'done' | 'current' | 'locked'
    color: string
    bg: string
    dot: string
  }
  isConnectable: boolean
}

export const RoadmapNode = memo(({ data, isConnectable }: RoadmapNodeProps) => {
  const isDone = data.status === 'done'
  const isCurrent = data.status === 'current'
  const isLocked = data.status === 'locked'

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card/80 backdrop-blur-xl p-5 shadow-card min-w-[280px] max-w-[320px] transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1',
        isDone ? 'border-primary/50 ring-1 ring-primary/20' : 
        isCurrent ? 'border-primary shadow-focus scale-105 z-10' : 
        'border-border opacity-75 grayscale-[0.5]'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className={cn(
          "w-3 h-3 !bg-background border-2",
          isDone || isCurrent ? "!border-primary" : "!border-muted-foreground"
        )}
      />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "text-base font-semibold leading-relaxed",
            isDone || isCurrent ? "text-card-foreground" : "text-muted-foreground"
          )}>
            {data.title}
          </h3>
          <p className="mt-0.5 text-sm font-normal text-muted-foreground leading-relaxed line-clamp-2">
            {data.description}
          </p>
        </div>
        <div className={cn(
          "shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors",
          isDone ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : 
          isCurrent ? "bg-primary/15 text-primary" : 
          "bg-muted text-muted-foreground"
        )}>
          {isDone ? <CheckCircle2 className="w-4 h-4" /> : 
           isLocked ? <Lock className="w-4 h-4" /> : 
           <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {data.topics.map((topic, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground leading-relaxed">
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Circle className={cn(
                "h-4 w-4 shrink-0",
                isCurrent ? data.dot : 'text-muted-foreground/40'
              )} />
            )}
            <span className={isDone || isCurrent ? 'text-card-foreground font-medium' : ''}>
              {topic}
            </span>
          </li>
        ))}
      </ul>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className={cn(
          "w-3 h-3 !bg-background border-2",
          isDone ? "!border-primary" : "!border-muted-foreground"
        )}
      />
    </div>
  )
})
