import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { discussionsService } from '@/services/discussions'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

type CategoryType = 'all' | 'question' | 'solution' | 'general' | 'bug_report'

const CATEGORY_CONFIG = {
  question: { label: '提问', icon: 'help', color: 'bg-blue-100 text-blue-700' },
  solution: { label: '题解', icon: 'lightbulb', color: 'bg-yellow-100 text-yellow-700' },
  general: { label: '讨论', icon: 'forum', color: 'bg-green-100 text-green-700' },
  bug_report: { label: 'Bug', icon: 'bug_report', color: 'bg-red-100 text-red-700' },
}

export function Discussions() {
  const [category, setCategory] = useState<CategoryType>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'most_liked'>('recent')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['discussions', category, search, sortBy],
    queryFn: () => discussionsService.getDiscussions({
      category: category === 'all' ? undefined : category,
      search: search || undefined,
      sort: sortBy,
    }),
  })

  if (isLoading) return <Loading message="加载中..." />
  if (error) return <div className="text-center py-12">加载失败</div>

  const discussions = data?.discussions || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">讨论区</h1>
          <p className="text-sm text-slate-600">交流学习，分享经验</p>
        </div>
        <Button variant="primary">
          <span className="material-symbols-outlined mr-2">add</span>
          发起讨论
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setCategory(key as CategoryType)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                category === key ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200'
              )}
            >
              <span className="material-symbols-outlined text-sm mr-1">{config.icon}</span>
              {config.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="搜索讨论..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-lg flex-1 max-w-md"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="recent">最新</option>
          <option value="popular">最热</option>
          <option value="most_liked">最多赞</option>
        </select>
      </div>

      <div className="space-y-4">
        {discussions.map((discussion) => {
          const catConfig = CATEGORY_CONFIG[discussion.category]

          return (
            <Link
              key={discussion.id}
              to={`/discussions/${discussion.id}`}
              className="block bg-white dark:bg-slate-900 rounded-xl border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{discussion.likes_count}</div>
                  <div className="text-xs text-slate-500">赞</div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {discussion.is_pinned && (
                      <span className="material-symbols-outlined text-red-500 text-sm">push_pin</span>
                    )}
                    <h3 className="font-semibold text-lg hover:text-primary">{discussion.title}</h3>
                  </div>

                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{discussion.content}</p>

                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{discussion.author_username}</span>
                    <span>•</span>
                    <span className={cn('px-2 py-1 rounded', catConfig?.color)}>
                      {catConfig?.label}
                    </span>
                    <span>•</span>
                    <span>{discussion.replies_count} 回复</span>
                    <span>•</span>
                    <span>{discussion.views_count} 浏览</span>
                  </div>

                  {discussion.tags.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {discussion.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}