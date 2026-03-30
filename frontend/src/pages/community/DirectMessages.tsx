import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
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
        <LoadingState message="正在加载私信..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState
          title="私信加载失败"
          description="当前无法读取会话列表，请重试。"
          action={{ label: '重试', onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            社区 / 私信
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            私信中心
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            把会话目录和当前线程压缩成一个专注工作区，查询 key 和发送参数保持不变。
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <span className="material-symbols-outlined text-base">refresh</span>
          刷新
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">会话数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{conversations?.length || 0}</p>
          <p className="mt-2 text-sm text-on-surface-variant">读取自真实会话列表</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">未读</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{totalUnread}</p>
          <p className="mt-2 text-sm text-on-surface-variant">按现有 unread_count 聚合</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">当前会话</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">{activeConversation?.peer_username || '无'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">未选中时不会请求消息列表</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Conversations List */}
        <div className="space-y-4">
          <h2 className="font-headline text-xl font-extrabold text-on-surface">会话目录</h2>
          {!conversations || conversations.length === 0 ? (
            <EmptyState
              title="暂无私信会话"
              description="还没有与任何用户开始对话。"
            />
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    activeConversationId === conversation.id
                      ? 'border-primary bg-primary-container text-on-primary-container'
                      : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-2xl text-on-surface-variant">person</span>
                      <div>
                        <p className="font-semibold">{conversation.peer_username}</p>
                        <p className="text-sm opacity-80">{conversation.last_message || '暂无消息'}</p>
                      </div>
                    </div>
                    {conversation.unread_count ? (
                      <span className="rounded-full bg-error px-2 py-1 text-xs font-semibold text-on-error">
                        {conversation.unread_count}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages Panel */}
        <div className="space-y-4">
          <h2 className="font-headline text-xl font-extrabold text-on-surface">
            {activeConversation ? `与 ${activeConversation.peer_username} 的对话` : '消息面板'}
          </h2>
          {!activeConversation ? (
            <Card variant="surface" className="p-8 text-center">
              <span className="material-symbols-outlined mx-auto text-5xl text-on-surface-variant">forum</span>
              <p className="mt-4 text-sm text-on-surface-variant">选择左侧会话查看消息</p>
            </Card>
          ) : !messages || messages.length === 0 ? (
            <Card variant="surface" className="p-8 text-center">
              <span className="material-symbols-outlined mx-auto text-5xl text-on-surface-variant">chat_bubble</span>
              <p className="mt-4 text-sm text-on-surface-variant">暂无消息，开始对话吧</p>
            </Card>
          ) : (
            <>
              <Card variant="surface" className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === activeConversation.peer_user_id ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.sender_id === activeConversation.peer_user_id
                          ? 'bg-surface-container-high text-on-surface'
                          : 'bg-primary text-on-primary'
                      }`}
                    >
                      <p className="text-sm leading-6">{message.content}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {new Date(message.created_at).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
              <div className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="输入消息..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && draft.trim() && activeConversationId) {
                      e.preventDefault()
                      sendMutation.mutate({ conversationId: activeConversationId, content: draft.trim() })
                    }
                  }}
                />
                <Button
                  onClick={() => draft.trim() && activeConversationId && sendMutation.mutate({ conversationId: activeConversationId, content: draft.trim() })}
                  disabled={!draft.trim() || !activeConversationId || sendMutation.isPending}
                >
                  <span className="material-symbols-outlined text-base">send</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
