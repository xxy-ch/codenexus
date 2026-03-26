import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Flame, MessageSquareMore, RefreshCcw } from 'lucide-react'
import { SurfaceCard } from '@/components/page/SurfaceCard'
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
      <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SurfaceCard className="space-y-4 bg-[#f5f7ff] p-5">
            <div>
              <p className="font-['Manrope'] text-[1.2rem] font-extrabold tracking-[-0.03em] text-[#003d9b]">社区</p>
              <p className="mt-1 text-xs font-medium text-[#65748d]">知识交换站</p>
            </div>
            <Link
              to="/discussions/new"
              className="flex items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(0,61,155,0.18)]"
            >
              <MessageSquareMore className="h-4 w-4" />
              发布新帖
            </Link>
            <nav className="space-y-1 text-sm font-medium">
              {[
                ['全部帖子', 'all'],
                ['题解精华', 'solution'],
                ['提问求助', 'question'],
                ['问题反馈', 'bug_report'],
              ].map(([label, value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left transition-colors',
                    category === value ? 'bg-[#dbe4ff] text-[#17305e]' : 'text-[#5f6d87] hover:bg-[#eef2ff]',
                  )}
                >
                  <span>{label}</span>
                  {value === 'all' ? <span className="text-xs font-bold">{stats.total}</span> : null}
                </button>
              ))}
            </nav>
          </SurfaceCard>

          <SurfaceCard tone="muted" className="space-y-3 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">社区概览</p>
            <div className="space-y-3 text-sm text-[#17305e]">
              <div className="flex items-center justify-between rounded-[12px] bg-white/92 px-4 py-3">
                <span>主题总数</span>
                <span className="font-semibold">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between rounded-[12px] bg-white/92 px-4 py-3">
                <span>题解帖子</span>
                <span className="font-semibold">{stats.solved}</span>
              </div>
              <div className="flex items-center justify-between rounded-[12px] bg-white/92 px-4 py-3">
                <span>待回复</span>
                <span className="font-semibold">{stats.unanswered}</span>
              </div>
            </div>
          </SurfaceCard>
        </aside>

        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.04em] text-[#131b2e] md:text-[2.4rem]">
                知识交流
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#5f6d87]">
                在算法、数据结构和工程实现之间建立高密度讨论流，题解、提问和反馈都收进同一条知识索引。
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-[14px] bg-[#eef2ff] p-1">
              {[
                ['recent', '最新'],
                ['popular', '热门'],
                ['most_liked', '未解'],
              ].map(([value, label], index) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSort(value as 'recent' | 'popular' | 'most_liked')}
                  className={cn(
                    'rounded-[12px] px-4 py-2 text-xs font-semibold transition-colors',
                    sort === value || (label === '未解' && index === 2 && sort === 'most_liked')
                      ? 'bg-white text-[#003d9b] shadow-[0_6px_18px_rgba(19,27,46,0.06)]'
                      : 'text-[#65748d] hover:bg-white/80',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <SurfaceCard tone="muted" className="space-y-4 p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                aria-label="搜索讨论"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索标题、内容或作者"
                className="h-11 min-w-[240px] flex-1 rounded-[12px] bg-white/92 px-4 text-sm text-[#17305e] shadow-[0_10px_24px_rgba(19,27,46,0.04)] outline-none ring-0 placeholder:text-[#93a0bb]"
              />
              <select
                aria-label="分类筛选"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 min-w-[148px] rounded-[12px] bg-white/92 px-4 text-sm text-[#17305e] shadow-[0_10px_24px_rgba(19,27,46,0.04)] outline-none"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-white px-4 text-sm font-semibold text-[#244171] shadow-[0_10px_24px_rgba(19,27,46,0.05)]"
              >
                <RefreshCcw className="h-4 w-4" />
                刷新
              </button>
            </div>
          </SurfaceCard>

          <div className="space-y-2">
          {discussions.length === 0 ? (
            <SurfaceCard className="text-sm text-[#65748d]">当前筛选条件下没有讨论主题。</SurfaceCard>
          ) : (
            discussions.map((discussion) => (
              <Link key={discussion.id} to={`/discussions/${discussion.id}`}>
                <SurfaceCard className="rounded-[16px] p-5 transition-colors hover:bg-[#f7f9ff]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#e9eeff] text-sm font-bold text-[#17305e]">
                        {discussion.author_username.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', categoryTone(discussion.category))}>
                          {categoryLabel(discussion.category)}
                        </span>
                          {discussion.is_pinned ? (
                            <span className="rounded-full bg-[#fff2d8] px-2.5 py-1 text-xs font-semibold text-[#8a5a00]">
                              置顶
                            </span>
                          ) : null}
                        {discussion.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full bg-[rgba(226,231,255,0.88)] px-2.5 py-1 text-xs font-medium text-[#43516b]">
                            {tag}
                          </span>
                        ))}
                      </div>
                        <h2 className="mt-3 text-[1.08rem] font-semibold text-[#131b2e] transition-colors hover:text-[#003d9b]">{discussion.title}</h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5f6d87]">{discussion.content}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6b7ca7]">
                          <span>作者 {discussion.author_username}</span>
                        <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                        {discussion.problem_title ? <span>关联 {discussion.problem_title}</span> : null}
                          {discussion.is_locked ? <span>已锁定</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid min-w-[180px] grid-cols-3 gap-6 px-2 text-center lg:grid-cols-1 lg:text-right">
                      <div>
                        <p className="font-['Manrope'] text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{discussion.replies_count}</p>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b7ca7]">回复</p>
                      </div>
                      <div>
                        <p className="font-['Manrope'] text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{discussion.views_count}</p>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b7ca7]">浏览</p>
                      </div>
                      <div>
                        <p className="font-['Manrope'] text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{discussion.likes_count}</p>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b7ca7]">赞同</p>
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              </Link>
            ))
          )}
          </div>

          <SurfaceCard className="flex items-center gap-3 bg-[#f5f7ff] p-4 text-sm text-[#5f6d87]">
            <Flame className="h-4 w-4 text-[#003d9b]" />
            <span>当前排序下共收录 {stats.total} 个主题，优先显示高互动和最近更新的讨论。</span>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
