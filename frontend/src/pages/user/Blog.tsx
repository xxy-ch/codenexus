import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { blogService } from '@/services/blog'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const CATEGORY_CONFIG = {
  tutorial: { label: '教程', icon: 'school', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  experience: { label: '经验', icon: 'lightbulb', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  solution: { label: '题解', icon: 'description', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  news: { label: '资讯', icon: 'newspaper', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
}

export function Blog() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['blogPosts', activeCategory, page],
    queryFn: () => blogService.getPosts(page, 10),
  })

  const posts = data?.posts || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">博客</h1>
          <p className="text-sm text-slate-600">学习教程、经验分享、题解分析</p>
        </div>
        <Link to="/blog/new">
          <Button variant="primary">
            <span className="material-symbols-outlined mr-2">edit</span>
            写文章
          </Button>
        </Link>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            activeCategory === 'all' ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800'
          )}
        >
          全部
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1',
              activeCategory === key ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800'
            )}
          >
            <span className="material-symbols-outlined text-sm">{config.icon}</span>
            {config.label}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <Loading message="加载中..." />
      ) : error ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <p className="text-lg font-semibold mb-2">加载失败</p>
          <Button variant="outline" onClick={() => window.location.reload()}>重试</Button>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">article</span>
          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">暂无文章</p>
          <p className="text-sm text-slate-600">快来分享第一篇文章吧！</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const catConfig = CATEGORY_CONFIG[post.category]

              return (
                <Link
                  key={post.id}
                  to={`/blog/${post.id}`}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all"
                >
                  {/* Cover Image */}
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-primary/30">article</span>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Category */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn('px-2 py-1 rounded text-xs font-medium', catConfig?.color)}>
                        {catConfig?.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {post.reading_time} 分钟阅读
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-lg mb-2 line-clamp-2 hover:text-primary transition-colors">
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>

                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>{post.author_username}</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          {post.views_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">favorite</span>
                          {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">chat_bubble</span>
                          {post.comments_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Pagination */}
          {data && data.total > data.limit && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="px-4 py-2 text-sm text-slate-600">
                第 {page} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(data.total / data.limit)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
