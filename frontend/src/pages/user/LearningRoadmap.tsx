import { useQuery } from '@tanstack/react-query'
import { usersService } from '@/services/users'
import { Map, Sparkles } from 'lucide-react'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { InlineError } from '@/components/ui/InlineError'
import { ReactFlow, Background, Controls } from '@xyflow/react'
import type { NodeTypes, Edge, Node } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import '@xyflow/react/dist/style.css'
import { RoadmapNode } from '@/components/roadmap/RoadmapNode'

const nodeTypes: NodeTypes = {
  roadmap: RoadmapNode,
}

const getNodesAndEdges = (completion: number): { nodes: Node[]; edges: Edge[] } => {
  const isBasicDone = completion >= 25
  const isMediumDsDone = completion >= 60
  const isMediumAlgoDone = completion >= 75
  const isAdvancedDone = completion >= 100

  const nodes: Node[] = [
    {
      id: 'basic',
      type: 'roadmap',
      position: { x: 250, y: 50 },
      data: {
        title: '基础语法与算法',
        description: '掌握编程竞赛入门必备的数据结构基础',
        topics: ['数组与矩阵', '字符串处理', '哈希表'],
        status: isBasicDone ? 'done' : 'current',
        color: 'text-status-accepted',
        bg: 'bg-status-accepted/10',
        dot: 'text-status-accepted',
      },
    },
    {
      id: 'medium-ds',
      type: 'roadmap',
      position: { x: 50, y: 300 },
      data: {
        title: '中级数据结构',
        description: '学习常用的数据存储与区间查询方法',
        topics: ['栈与队列', '链表高级操作', '并查集基础'],
        status: isMediumDsDone ? 'done' : (isBasicDone ? 'current' : 'locked'),
        color: 'text-primary',
        bg: 'bg-primary/10',
        dot: 'text-primary',
      },
    },
    {
      id: 'medium-algo',
      type: 'roadmap',
      position: { x: 450, y: 300 },
      data: {
        title: '核心算法技巧',
        description: '掌握经典算法的优化与常见变种',
        topics: ['二分与三分', '滑动窗口', '贪心与排序'],
        status: isMediumAlgoDone ? 'done' : (isBasicDone ? 'current' : 'locked'),
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        dot: 'text-amber-500',
      },
    },
    {
      id: 'advanced',
      type: 'roadmap',
      position: { x: 250, y: 550 },
      data: {
        title: '高级动态规划与图论',
        description: '挑战高难度综合性算法竞赛题目',
        topics: ['状态压缩DP', '最短路算法', '网络流计算'],
        status: isAdvancedDone ? 'done' : (isMediumDsDone || isMediumAlgoDone ? 'current' : 'locked'),
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        dot: 'text-purple-500',
      },
    },
  ]

  const edges: Edge[] = [
    { id: 'e1', source: 'basic', target: 'medium-ds', animated: isBasicDone && !isMediumDsDone, style: { stroke: isBasicDone ? '#f54e00' : '#e5e5e5', strokeWidth: 2 } },
    { id: 'e2', source: 'basic', target: 'medium-algo', animated: isBasicDone && !isMediumAlgoDone, style: { stroke: isBasicDone ? '#f54e00' : '#e5e5e5', strokeWidth: 2 } },
    { id: 'e3', source: 'medium-ds', target: 'advanced', animated: isMediumDsDone && !isAdvancedDone, style: { stroke: isMediumDsDone ? '#f54e00' : '#e5e5e5', strokeWidth: 2 } },
    { id: 'e4', source: 'medium-algo', target: 'advanced', animated: isMediumAlgoDone && !isAdvancedDone, style: { stroke: isMediumAlgoDone ? '#f54e00' : '#e5e5e5', strokeWidth: 2 } },
  ]

  return { nodes, edges }
}

export function LearningRoadmap() {
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

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.data?.topics) {
      const tags = (node.data.topics as string[]).join(',')
      navigate(`/problems?tags=${encodeURIComponent(tags)}`)
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Hero header — warm editorial feel */}
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
      <div className="flex-1 min-h-[600px] rounded-xl border border-border bg-background/50 overflow-hidden relative">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={1.5}
          className="bg-dot-pattern"
        >
          <Background gap={24} size={2} color="var(--border)" />
          <Controls className="!bg-card !border-border !shadow-sm" />
        </ReactFlow>
      </div>
    </div>
  )
}
