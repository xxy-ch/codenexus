import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/features/users/services/users'
import { CheckCircle2, Circle, Lock, Map, Pencil, Save, Sparkles, X } from 'lucide-react'
import { CardGridSkeleton } from '@/shared/components/CardGridSkeleton'
import { InlineError } from '@/shared/components/InlineError'
import { Button } from '@/shared/components/Button'
import api from '@/shared/services/api'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'

type RoadmapStatus = 'done' | 'current' | 'locked'

interface RoadmapNodeConfig {
  id: string
  title: string
  description: string
  topics: string[]
  x: number
  y: number
}

interface RoadmapGraphNode extends RoadmapNodeConfig {
  status: RoadmapStatus
  bg: string
  dot: string
}

interface RoadmapEdge {
  id: string
  from: [number, number]
  to: [number, number]
  active: boolean
}

interface RoadmapResponse {
  nodes: RoadmapNodeConfig[]
  editable: boolean
}

const progressThresholds = [25, 60, 75, 100]
const nodeStyles = [
  { bg: 'bg-status-accepted/10', dot: 'text-status-accepted' },
  { bg: 'bg-primary/10', dot: 'text-primary' },
  { bg: 'bg-amber-500/10', dot: 'text-amber-500' },
  { bg: 'bg-purple-500/10', dot: 'text-purple-500' },
]

function nodeStatus(index: number, completion: number): RoadmapStatus {
  const threshold = progressThresholds[index] ?? 100
  if (completion >= threshold) return 'done'
  if (index === 0 || completion >= (progressThresholds[index - 1] ?? 0)) return 'current'
  return 'locked'
}

function buildGraph(nodesConfig: RoadmapNodeConfig[], completion: number): { nodes: RoadmapGraphNode[]; edges: RoadmapEdge[] } {
  const nodes = nodesConfig.map((node, index) => ({
    ...node,
    status: nodeStatus(index, completion),
    ...(nodeStyles[index % nodeStyles.length]),
  }))

  const edgePairs = nodes.length === 4
    ? [[0, 1], [0, 2], [1, 3], [2, 3]]
    : nodes.slice(1).map((_, index) => [index, index + 1])

  const edges = edgePairs.map(([fromIndex, toIndex]) => {
    const from = nodes[fromIndex]
    const to = nodes[toIndex]
    return {
      id: `${from.id}-${to.id}`,
      from: [from.x, from.y] as [number, number],
      to: [to.x, to.y] as [number, number],
      active: from.status === 'done',
    }
  })

  return { nodes, edges }
}

function normalizeNodes(nodes: RoadmapNodeConfig[]): RoadmapNodeConfig[] {
  return nodes.map((node) => ({
    ...node,
    topics: node.topics.filter(Boolean),
    x: Math.min(100, Math.max(0, Number(node.x) || 0)),
    y: Math.min(100, Math.max(0, Number(node.y) || 0)),
  }))
}

async function fetchRoadmap(): Promise<RoadmapResponse> {
  const { data } = await api.get<RoadmapResponse>('/roadmap')
  return data
}

async function saveRoadmap(nodes: RoadmapNodeConfig[]): Promise<RoadmapResponse> {
  const { data } = await api.put<RoadmapResponse>('/roadmap', { nodes: normalizeNodes(nodes) })
  return data
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
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
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

function RoadmapEditor({
  nodes,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  nodes: RoadmapNodeConfig[]
  saving: boolean
  onChange: (nodes: RoadmapNodeConfig[]) => void
  onCancel: () => void
  onSave: () => void
}) {
  const patchNode = (index: number, patch: Partial<RoadmapNodeConfig>) => {
    onChange(nodes.map((node, i) => i === index ? { ...node, ...patch } : node))
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">管理员编辑</h2>
          <p className="text-xs text-muted-foreground">修改标题、说明、标签和节点位置，保存后对本组织生效。</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            取消
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {nodes.map((node, index) => (
          <div key={node.id} className="rounded-lg border border-border bg-background/70 p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={node.title}
                onChange={(e) => patchNode(index, { title: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                aria-label="节点标题"
              />
              <input
                value={node.topics.join(',')}
                onChange={(e) => patchNode(index, { topics: e.target.value.split(',').map((item) => item.trim()) })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                aria-label="节点标签"
              />
            </div>
            <textarea
              value={node.description}
              onChange={(e) => patchNode(index, { description: e.target.value })}
              className="mt-2 min-h-16 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              aria-label="节点说明"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">
                X
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={node.x}
                  onChange={(e) => patchNode(index, { x: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Y
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={node.y}
                  onChange={(e) => patchNode(index, { y: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LearningRoadmap() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draftNodes, setDraftNodes] = useState<RoadmapNodeConfig[]>([])
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['roadmap-stats'],
    queryFn: () => usersService.getUserStats(),
  })
  const { data: roadmap, isLoading: roadmapLoading, error: roadmapError, refetch: refetchRoadmap } = useQuery({
    queryKey: ['roadmap'],
    queryFn: fetchRoadmap,
  })
  const saveMutation = useMutation({
    mutationFn: saveRoadmap,
    onSuccess: (data) => {
      queryClient.setQueryData(['roadmap'], data)
      setEditing(false)
    },
  })

  useEffect(() => {
    if (roadmap?.nodes && !editing) {
      setDraftNodes(roadmap.nodes)
    }
  }, [editing, roadmap?.nodes])

  if (statsLoading || roadmapLoading) {
    return <CardGridSkeleton cards={4} />
  }

  if (statsError || !stats || roadmapError || !roadmap) {
    return (
      <InlineError
        title="学习路线图加载失败"
        message="无法加载学习进度数据，请稍后重试"
        onRetry={() => {
          refetchStats()
          refetchRoadmap()
        }}
      />
    )
  }

  const completion = Math.min(
    100,
    Math.round((stats.unique_problems_solved / Math.max(1, stats.unique_problems_solved + 40)) * 100)
  )

  const visibleNodes = editing ? draftNodes : roadmap.nodes
  const { nodes, edges } = buildGraph(visibleNodes, completion)

  const handleNodeClick = (node: RoadmapGraphNode) => {
    if (editing) return
    navigate(`/problems?tags=${encodeURIComponent(node.topics.join(','))}`)
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
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

          <div className="flex flex-col gap-3 md:min-w-72">
            <div>
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
            {roadmap.editable && !editing && (
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑路线图
              </Button>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <RoadmapEditor
          nodes={draftNodes}
          saving={saveMutation.isPending}
          onChange={setDraftNodes}
          onCancel={() => {
            setDraftNodes(roadmap.nodes)
            setEditing(false)
          }}
          onSave={() => saveMutation.mutate(draftNodes)}
        />
      )}

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
