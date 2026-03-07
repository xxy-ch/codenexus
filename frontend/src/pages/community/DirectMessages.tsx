import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messagesService } from '@/services/messages'
import { Loading } from '@/components/ui/Loading'
import { ConversationList } from '@/components/messages/ConversationList'
import { MessageThread } from '@/components/messages/MessageThread'
import { MessageCircle, RefreshCw, Send, Users } from 'lucide-react'

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
        <Loading message="加载私信中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-300 mb-4">私信加载失败</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded bg-primary text-white"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_45%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] px-6 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_45%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#020617_100%)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <MessageCircle className="h-4 w-4" />
                Direct Messages
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">私信中心</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  统一查看会话列表、未读消息和最近交流状态。当前交付范围仅暴露真实会话与发送能力，不保留假线程。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Conversations</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{conversations?.length || 0}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Unread</p>
                <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-300">{totalUnread}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Active Thread</p>
                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                  {activeConversation?.peer_username || '未选择'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Thread Directory</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">会话列表</h2>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
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

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-900 p-2 text-white dark:bg-slate-100 dark:text-slate-900">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">交付边界</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  当前支持真实会话列表、历史消息和发送能力。高级搜索、置顶和群组能力未暴露。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Active Conversation</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                  {activeConversation?.peer_username || '选择一个会话'}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Send className="h-3.5 w-3.5" />
                {messages?.length || 0} messages
              </div>
            </div>
          </div>

          <div className="p-6">
            <MessageThread
              conversation={activeConversation}
              messages={messages || []}
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
