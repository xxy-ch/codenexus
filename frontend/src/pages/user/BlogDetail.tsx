import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { blogService } from '@/services/blog'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import type { BlogPost } from '@/types/blog'

export function BlogDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(false)

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blogPost', id],
    queryFn: () => blogService.getPostDetail(id!),
    enabled: !!id,
  })

  if (isLoading) return <Loading message="加载中..." />

  if (error || !post) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
        <p className="text-lg font-semibold mb-2">文章不存在</p>
        <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
      </div>
    )
  }

  const categoryConfig: Record<string, { label: string; color: string }> = {
    tutorial: { label: '教程', color: 'bg-blue-100 text-blue-700' },
    experience: { label: '经验', color: 'bg-yellow-100 text-yellow-700' },
    solution: { label: '题解', color: 'bg-green-100 text-green-700' },
    news: { label: '资讯', color: 'bg-purple-100 text-purple-700' },
  }
  const catConfig = categoryConfig[(post as BlogPost).category] || { label: '文章', color: 'bg-slate-100 text-slate-700' }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="small" onClick={() => navigate(-1)}>
        <span className="material-symbols-outlined mr-2">arrow_back</span>
        返回
      </Button>

      {/* Article Header */}
      <article className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Cover */}
        <div className="h-64 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="material-symbols-outlined text-8xl text-primary/30">article</span>
        </div>

        <div className="p-8">
          {/* Category & Date */}
          <div className="flex items-center gap-4 mb-4">
            <span className={cn('px-3 py-1 rounded-lg text-sm font-medium', catConfig?.color)}>
              {catConfig?.label}
            </span>
            <span className="text-sm text-slate-500">
              {new Date(post.created_at).toLocaleDateString('zh-CN')}
            </span>
            <span className="text-sm text-slate-500">
              {post.reading_time} 分钟阅读
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

          {/* Author */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div>
              <p className="font-medium">{post.author_username}</p>
              <p className="text-xs text-slate-500">作者</p>
            </div>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag: string) => (
                <span key={tag} className="text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{post.content}</div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-8 pt-6 border-t">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={cn('flex items-center gap-2 text-sm transition-colors', isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500')}
            >
              <span className="material-symbols-outlined">{isLiked ? 'favorite' : 'favorite_border'}</span>
              {post.likes_count + (isLiked ? 1 : 0)}
            </button>
            <span className="flex items-center gap-2 text-sm text-slate-500">
              <span className="material-symbols-outlined">visibility</span>
              {post.views_count}
            </span>
            <span className="flex items-center gap-2 text-sm text-slate-500">
              <span className="material-symbols-outlined">chat_bubble</span>
              {post.comments_count}
            </span>
          </div>
        </div>
      </article>

      {/* Related Problem */}
      {post.problem_id && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-semibold mb-4">相关题目</h3>
          <Link
            to={`/problems/${post.problem_id}`}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div>
              <p className="font-medium">{post.problem_title}</p>
              <p className="text-sm text-slate-500">查看题目 →</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
