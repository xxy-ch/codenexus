import { useQuery } from '@tanstack/react-query'
import { usersService } from '@/features/users/services/users'
import { CheckCircle2, Circle, Lock, Map, Sparkles } from 'lucide-react'
import { CardGridSkeleton } from '@/shared/components/CardGridSkeleton'
import { InlineError } from '@/shared/components/InlineError'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'

type RoadmapStatus = 'done' | 'current' | 'locked'

interface RoadmapGraphNode {
  id: string
  title: string
  description: string
  topics: string[]
  status: RoadmapStatus
  color: string
  bg: string
  dot: string
  left: string
  top: string
}

interface RoadmapEdge {
  id: string
  from: [number, number]
  to: [number, number]
  active: boolean
}

const getNodesAndEdges = (completion: number): { nodes: RoadmapGraphNode[]; edges: RoadmapEdge[] } => {
  const isBasicDone = completion >= 25
  const isMediumDsDone = completion >= 60
  const isMediumAlgoDone = completion >= 75
  const isAdvancedDone = completion >= 100

  const nodes: RoadmapGraphNode[] = [
    {
      id: 'basic',
      title: '基础语法与算法',
      description: '掌握编程竞赛入门必备的数据结构基础',
      topics: ['数组与矩阵', '字符串处理', '哈希表'],
      status: isBasicDone ? 'done' : 'current',
      color: 'text-status-accepted',
      bg: 'bg-status-accepted/10',
      dot: 'text-status-accepted',
      left: '50%',
      top: '8%',
    },
    {
      id: 'medium-ds',
      title: '中级数据结构',
      description: '学习常用的数据存储与区间查询方法',
      topics: ['栈与队列', '链表高级操作', '并查集基础'],
      status: isMediumDsDone ? 'done' : (isBasicDone ? 'current' : 'locked'),
      color: 'text-primary',
      bg: 'bg-primary/10',
      dot: 'text-primary',
      left: '28%',
      top: '44%',
    },
    {
      id: 'medium-algo',
      title: '核心算法技巧',
      description: '掌握经典算法的优化与常见变种',
      topics: ['二分与三分', '滑动窗口', '贪心与排序'],
      status: isMediumAlgoDone ? 'done' : (isBasicDone ? 'current' : 'locked'),
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      dot: 'text-amber-500',
      left: '72%',
      top: '44%',
    },
    {
      id: 'advanced',
      title: '高级动态规划与图论',
      description: '挑战高难度综合性算法竞赛题目',
      topics: ['状态压缩DP', '最短路算法', '网络流计算'],
      status: isAdvancedDone ? 'done' : (isMediumDsDone || isMediumAlgoDone ? 'current' : 'locked'),
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      dot: 'text-purple-500',
      left: '50%',
      top: '80%',
    },
  ]

  const edges: RoadmapEdge[] = [
    { id: 'e1', from: [50, 28], to: [28, 44], active: isBasicDone },
    { id: 'e2', from: [50, 28], to: [72, 44], active: isBasicDone },
    { id: 'e3', from: [28, 60], to: [50, 80], active: isMediumDsDone },
    { id: 'e4', from: [72, 60], to: [50, 80], active: isMediumAlgoDone },
  ]

  return { nodes, edges }
}

function RoadmapCard({ node, onClick }: { node: RoadmapGraphNode; onClick: () => void }) {
  const isDone = node.status === 'done'
  const isCurrent = node.status === 'current'
  const isLocked = node.status === 'locked'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute w-[min(300px,calc(100vw-7rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card/95 p-4 text-left shadow-sm transition hover:-translate-y-[calc(50%+4px)] hover:shadow-md',
        isDone ? 'border-primary/50 ring-1 ring-primary/20' :
        isCurrent ? 'border-primary shadow-focus' :
        'border-border opacity-75 grayscale-[0.4]'
      )}
      style={{ left: node.left, top: node.top }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn('text-sm font-semibold leading-relaxed', isLocked ? 'text-muted-foreground' : 'text-card-foreground')}>
            {node.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {node.description}
          </p>
        </div>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', isDone ? 'bg-primary text-primary-foreground' : isCurrent ? node.bg : 'bg-muted text-muted-foreground')}>
          {isDone ? <CheckCircle2 className="h-4 w-4" /> : isLocked ? <Lock className="h-4 w-4" /> : <Circle className={cn('h-4 w-4', node.dot)} />}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {node.topics.map((topic) => (
          <span key={topic} className={cn('rounded-md border px-2 py-1 text-xs', isDone || isCurrent ? 'border-border bg-background text-foreground' : 'border-border/60 bg-muted/40 text-muted-foreground')}>
            {topic}
          </span>
        ))}
      </div>
    </button>
  )
}

export function LearningRoadmap() {
  const navigate = useNavigate()
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['roadmap-stats'],
    queryFn: () => usersService.getUserStats(),
  })

  if (isLoading) {
    return <CardGridSkeleton cards={4} />
  }

  if (error || !stats) {
    return (
      <InlineError
        title="学习路线图加载失败"
        message="无法加载学习进度数据，请稍后重试"
        onRetry={() => refetch()}
      />
    )
  }

  const completion = Math.min(
    100,
    Math.round((stats.unique_problems_solved / Math.max(1, stats.unique_problems_solved + 40)) * 100)
  )

  const { nodes, edges } = getNodesAndEdges(completion)

  const handleNodeClick = (node: RoadmapGraphNode) => {
    const tags = node.topics.join(',')
    navigate(`/problems?tags=${encodeURIComponent(tags)}`)
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page header */}
      <div className="rounded-xl border border-border bg-card p-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Map className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-card-foreground leading-relaxed">
                拓扑学习路线图
              </h1>
              <p className="text-sm font-normal text-muted-foreground leading-normal">
                以知识拓扑图的形式探索你的算法技能树，点亮各个模块
              </p>
            </div>
          </div>
          
          <div className="flex-1 md:max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-card-foreground">总体进度</span>
              </div>
              <span className="text-sm font-semibold text-primary tabular-nums">{completion}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-right">
              已解决 {stats.unique_problems_solved} 题
            </p>
          </div>
        </div>
      </div>

      {/* Topology Graph Canvas */}
      <div className="relative min-h-[640px] overflow-hidden rounded-xl border border-border bg-background/50 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:24px_24px]">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full">
          {edges.map((edge) => (
            <line
              key={edge.id}
              x1={`${edge.from[0]}%`}
              y1={`${edge.from[1]}%`}
              x2={`${edge.to[0]}%`}
              y2={`${edge.to[1]}%`}
              className={edge.active ? 'stroke-primary' : 'stroke-border'}
              strokeWidth={edge.active ? 3 : 2}
              strokeLinecap="round"
              strokeDasharray={edge.active ? '0' : '8 8'}
            />
          ))}
        </svg>
        {nodes.map((node) => (
          <RoadmapCard key={node.id} node={node} onClick={() => handleNodeClick(node)} />
        ))}
      </div>
    </div>
  )
}
