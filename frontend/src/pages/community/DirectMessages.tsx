import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messagesService } from '@/services/messages'
import { Loading } from '@/components/ui/Loading'
import { ConversationList } from '@/components/messages/ConversationList'
import { MessageThread } from '@/components/messages/MessageThread'

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <ConversationList
          conversations={conversations || []}
          activeConversationId={activeConversationId}
          onSelect={setActiveConversationId}
        />
      </div>

      <div className="lg:col-span-2">
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
  )
}
