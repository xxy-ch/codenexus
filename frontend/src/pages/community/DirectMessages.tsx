import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, RefreshCw, Send, UserRound } from 'lucide-react'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { messagesService } from '@/services/messages'

export function DirectMessages() {
  const queryClient = useQueryClient()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const { data: conversations, isLoading, error, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesService.getConversations(),
  })

  const activeConversation = useMemo(
    () => conversations?.find((conversation) => conversation.id === activeConversationId) || null,
    [conversations, activeConversationId],
  )

  const totalUnread = useMemo(
    () => (conversations || []).reduce((sum, conversation) => sum + (conversation.unread_count || 0), 0),
    [conversations],
  )

  const { data: messages } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => messagesService.getMessages(activeConversationId!),
    enabled: !!activeConversationId,
  })

  const sendMutation = useMutation({
    mutationFn: (payload: { conversationId: string; content: string }) =>
      messagesService.sendMessage(payload.conversationId, payload.content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] })
      setDraft('')
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading message="加载私信中..." />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="私信加载失败"
        description="当前无法读取会话列表，请重试。"
        action={
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            重试
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        breadcrumb={['Messages']}
        title="Direct Messages"
        description="把会话目录和当前线程压缩成一个专注工作区。查询 key、发送参数和真实消息接口保持不变。"
        actions={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Conversations</p>
          <p className="text-2xl font-semibold text-slate-950">{conversations?.length || 0}</p>
          <p className="text-sm text-slate-600">读取自真实会话列表</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Unread</p>
          <p className="text-2xl font-semibold text-slate-950">{totalUnread}</p>
          <p className="text-sm text-slate-600">按现有 unread_count 聚合</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Active Thread</p>
          <p className="text-2xl font-semibold text-slate-950">{activeConversation?.peer_username || 'None'}</p>
          <p className="text-sm text-slate-600">未选中时不会请求消息列表</p>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SurfaceCard className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-950">Conversation List</h2>
          </div>

          <div className="space-y-2">
            {(conversations || []).map((conversation) => {
              const isActive = conversation.id === activeConversationId

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{conversation.peer_username}</span>
                    {conversation.unread_count > 0 ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isActive ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {conversation.unread_count}
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-2 text-sm ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                    {conversation.last_message}
                  </p>
                </button>
              )
            })}

            {(conversations || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                暂无会话
              </div>
            ) : null}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-4 p-5">
          {activeConversation ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Conversation</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{activeConversation.peer_username}</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                  <UserRound className="h-4 w-4" />
                  {(messages || []).length} messages
                </div>
              </div>

              <div className="h-[420px] space-y-3 overflow-y-auto pr-1">
                {(messages || []).length > 0 ? (
                  (messages || []).map((message) => {
                    const isMine = message.sender_username === 'you'

                    return (
                      <div
                        key={message.id}
                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                          isMine
                            ? 'ml-auto bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className={`mt-2 text-xs ${isMine ? 'text-slate-300' : 'text-slate-500'}`}>
                          {new Date(message.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">暂无消息</div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex gap-3">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a message"
                    aria-label="Message draft"
                  />
                  <Button
                    onClick={() => {
                      if (!activeConversation || !draft.trim()) return
                      sendMutation.mutate({
                        conversationId: activeConversation.id,
                        content: draft.trim(),
                      })
                    }}
                    disabled={!draft.trim() || sendMutation.isPending}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                    {sendMutation.isPending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center">
              <EmptyState
                title="Select A Conversation"
                description="先从左侧选择一个会话，再继续查看历史消息或发送新内容。"
                className="w-full shadow-none"
              />
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  )
}
