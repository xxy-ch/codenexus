import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messagesService } from '@/services/messages'
import { ConversationSkeleton } from '@/components/skeletons/ConversationSkeleton'
import { InlineError } from '@/shared/components/InlineError'
import { ConversationList } from '@/components/messages/ConversationList'
import { MessageThread } from '@/components/messages/MessageThread'
import { useAuth } from '@/hooks/useAuth'
import { MessageCircle, RefreshCw, Send } from 'lucide-react'

export function DirectMessages() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [peer, setPeer] = useState('')

  const { data: conversations, isLoading, error, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesService.getConversations(),
  })

  const activeConversation = useMemo(
    () => conversations?.find((conversation) => conversation.id === activeConversationId) || null,
    [conversations, activeConversationId]
  )

  const totalUnread = useMemo(
    () => (conversations || []).reduce((sum, conversation) => sum + (conversation.unread_count || 0), 0),
    [conversations]
  )

  const { data: messages } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => messagesService.getMessages(activeConversationId!),
    enabled: !!activeConversationId,
  })

  const createConversationMutation = useMutation({
    mutationFn: (value: string) => messagesService.createConversation(value),
    onSuccess: (conversation) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof messagesService.getConversations>>>(
        ['conversations'],
        (current) => {
          const existing = current || []
          if (existing.some((item) => item.id === conversation.id)) return existing
          return [conversation, ...existing]
        },
      )
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setActiveConversationId(conversation.id)
      setPeer('')
    },
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
      <div className="flex items-center justify-center min-h-[400px]">
        <ConversationSkeleton />
      </div>
    )
  }

  if (error) {
    return <InlineError title="私信加载失败" onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-16">
      {/* Hero */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                <MessageCircle className="h-3.5 w-3.5" />
                CodeNexus 私信
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">私信中心</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
                  统一查看会话列表、未读消息和最近交流状态。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">会话</p>
                <p className="mt-1.5 text-2xl font-bold text-foreground">{conversations?.length || 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">未读</p>
                <p className="mt-1.5 text-2xl font-bold text-primary">{totalUnread}</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">当前会话</p>
                <p className="mt-1.5 text-sm font-bold text-foreground">
                  {activeConversation?.peer_username || '未选择'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">会话目录</p>
                <h2 className="mt-2 text-sm font-bold text-foreground">会话列表</h2>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                刷新
              </button>
            </div>
            <div className="mt-4">
              <ConversationList
                conversations={conversations || []}
                activeConversationId={activeConversationId}
                onSelect={setActiveConversationId}
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                const value = peer.trim()
                if (!value) return
                createConversationMutation.mutate(value)
              }}
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">新建私信</p>
                <h2 className="mt-2 text-sm font-bold text-foreground">按用户编号发起会话</h2>
              </div>
              <div className="flex gap-2">
                <input
                  value={peer}
                  onChange={(event) => setPeer(event.target.value)}
                  placeholder="输入用户名 / user_code / 邮箱"
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:shadow-focus"
                />
                <button
                  type="submit"
                  disabled={!peer.trim() || createConversationMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  创建
                </button>
              </div>
              {createConversationMutation.isError && (
                <p className="text-xs text-destructive">未找到同组织用户，或不能给自己创建私信。</p>
              )}
            </form>
          </div>

        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">当前会话</p>
                <h2 className="mt-1 text-sm font-bold text-foreground">
                  {activeConversation?.peer_username || '选择一个会话'}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <Send className="h-3.5 w-3.5" />
                {messages?.length || 0} 条消息
              </div>
            </div>
          </div>

          <div className="p-6">
            <MessageThread
              conversation={activeConversation}
              messages={messages || []}
              currentUserId={user?.id}
              draft={draft}
              sending={sendMutation.isPending}
              onDraftChange={setDraft}
              onSend={() => {
                if (!activeConversation || !draft.trim()) return
                sendMutation.mutate({
                  conversationId: activeConversation.id,
                  content: draft.trim(),
                })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
