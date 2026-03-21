import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageSquareMore, RefreshCcw } from 'lucide-react'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { discussionsService } from '@/services/discussions'
import { cn } from '@/lib/utils'

const categoryOptions = [
  { value: 'all', label: '全部' },
  { value: 'question', label: '提问' },
  { value: 'solution', label: '题解' },
  { value: 'general', label: '交流' },
  { value: 'bug_report', label: '反馈' },
]

function categoryTone(category: string) {
  if (category === 'solution') return 'bg-[#d8f8e3] text-[#006847]'
  if (category === 'bug_report') return 'bg-[#ffe7e1] text-[#93000a]'
  if (category === 'question') return 'bg-[#dae2ff] text-[#244171]'
  return 'bg-[rgba(226,231,255,0.88)] text-[#43516b]'
}

function categoryLabel(category: string) {
  if (category === 'question') return '提问'
  if (category === 'solution') return '题解'
  if (category === 'bug_report') return '反馈'
  return '交流'
}

export function DiscussionList() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'recent' | 'popular' | 'most_liked'>('recent')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['discussions', category, search, sort],
    queryFn: () =>
      discussionsService.getDiscussions({
        category: category === 'all' ? undefined : category,
        search: search || undefined,
        sort,
        page: 1,
        limit: 20,
      }),
  })

  const discussions = data?.discussions ?? []

  const stats = useMemo(() => {
    return {
      total: data?.total ?? discussions.length,
      solved: discussions.filter((item) => item.category === 'solution').length,
      unanswered: discussions.filter((item) => item.replies_count === 0).length,
    }
  }, [data?.total, discussions])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <SurfaceCard className="text-sm text-[#6b7ca7]">讨论区加载中...</SurfaceCard>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <SurfaceCard className="space-y-4 bg-[rgba(255,247,247,0.95)]">
          <div>
            <h1 className="font-['Manrope'] text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#7b1e2b]">讨论区加载失败</h1>
            <p className="mt-2 text-sm text-[#7d5260]">当前无法读取真实讨论列表。</p>
          </div>
          <Button onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
            重试
          </Button>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Community"
          title="讨论区"
          description="让问答、题解和问题反馈像一套紧凑的知识索引，而不是营销式论坛封面。"
          actions={(
            <>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4" />
                刷新
              </Button>
              <Button as={Link} to="/discussions/new">
                <MessageSquareMore className="h-4 w-4" />
                发布讨论
              </Button>
            </>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['主题总数', stats.total, '当前筛选范围内的讨论主题'],
            ['题解帖子', stats.solved, 'solution 类主题数量'],
            ['待回复', stats.unanswered, '还没有收到回复的问题'],
          ].map(([label, value, helper]) => (
            <SurfaceCard key={label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">{label}</p>
              <div className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{value}</div>
              <p className="mt-2 text-sm text-[#65748d]">{helper}</p>
            </SurfaceCard>
          ))}
        </div>

        <SurfaceCard tone="muted" className="space-y-4">
          <FilterBar>
            <input
              aria-label="搜索讨论"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索标题、内容或作者"
              className="h-11 min-w-[240px] flex-1 rounded-[8px] bg-white/92 px-4 text-sm text-[#17305e] shadow-[0_10px_24px_rgba(19,27,46,0.04)] outline-none ring-0 placeholder:text-[#93a0bb]"
            />
            <select
              aria-label="分类筛选"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 min-w-[140px] rounded-[8px] bg-white/92 px-4 text-sm text-[#17305e] shadow-[0_10px_24px_rgba(19,27,46,0.04)] outline-none"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2">
              {[
                ['recent', '最新'],
                ['popular', '热门'],
                ['most_liked', '最多点赞'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSort(value as 'recent' | 'popular' | 'most_liked')}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    sort === value ? 'bg-[#003d9b] text-white' : 'bg-white/92 text-[#586988] hover:bg-white',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </FilterBar>
        </SurfaceCard>

        <div className="space-y-3">
          {discussions.length === 0 ? (
            <SurfaceCard className="text-sm text-[#65748d]">当前筛选条件下没有讨论主题。</SurfaceCard>
          ) : (
            discussions.map((discussion) => (
              <Link key={discussion.id} to={`/discussions/${discussion.id}`}>
                <SurfaceCard className="transition-colors hover:bg-[rgba(255,255,255,0.98)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', categoryTone(discussion.category))}>
                          {categoryLabel(discussion.category)}
                        </span>
                        {discussion.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full bg-[rgba(226,231,255,0.88)] px-2.5 py-1 text-xs font-medium text-[#43516b]">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h2 className="mt-4 text-[1.1rem] font-semibold text-[#131b2e]">{discussion.title}</h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5f6d87]">{discussion.content}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6b7ca7]">
                        <span>{discussion.author_username}</span>
                        <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                        {discussion.problem_title ? <span>关联 {discussion.problem_title}</span> : null}
                      </div>
                    </div>

                    <div className="grid min-w-[180px] grid-cols-3 gap-3 text-center lg:grid-cols-1 lg:text-right">
                      <div>
                        <p className="font-['Manrope'] text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{discussion.replies_count}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b7ca7]">Replies</p>
                      </div>
                      <div>
                        <p className="font-['Manrope'] text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{discussion.views_count}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b7ca7]">Views</p>
                      </div>
                      <div>
                        <p className="font-['Manrope'] text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{discussion.likes_count}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b7ca7]">Likes</p>
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
