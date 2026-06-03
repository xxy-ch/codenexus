import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { discussionsService } from '@/services/discussionsService'
import Loading from '@/components/ui/Loading'
import Pagination from '@/components/ui/Pagination'
import Avatar from '@/components/ui/Avatar'

export default function DiscussionForum() {
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'latest' | 'hot' | 'featured'>('latest')
  const limit = 15

  const { data, isLoading } = useQuery({
    queryKey: ['discussions', page, tab],
    queryFn: () => discussionsService.list({ page, limit }),
  })

  const discussions = data?.discussions ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-on-surface">讨论区</h1>
        <button type="button" className="btn-secondary cursor-not-allowed opacity-70" disabled>
          发起讨论（即将开放）
        </button>
      </div>

      <div className="flex gap-2">
        {(['latest', 'hot', 'featured'] as const).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary text-white'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
            onClick={() => { setTab(t); setPage(1) }}
          >
            {t === 'latest' ? '最新' : t === 'hot' ? '热门' : '精华'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : discussions.length > 0 ? (
        <>
          <div className="space-y-3">
            {discussions.map((d: any) => (
              <div key={d.id} className="card p-4 flex gap-4">
                <Avatar name={d.author_name || 'U'} src={d.author_avatar} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-on-surface truncate">{d.title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-on-surface-variant">
                    <span>{d.author_name || '匿名用户'}</span>
                    <span>{d.created_at ? new Date(d.created_at).toLocaleString('zh-CN') : ''}</span>
                    {d.tags?.map((tag: string) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-on-surface-variant shrink-0">
                  <span>{d.reply_count ?? 0} 回复</span>
                  <span>{d.view_count ?? 0} 浏览</span>
                  <span className="text-xs">详情即将开放</span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-on-surface-variant">暂无讨论，发起第一个话题吧</p>
        </div>
      )}
    </div>
  )
}
