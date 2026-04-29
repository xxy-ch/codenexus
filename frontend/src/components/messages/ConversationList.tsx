import type { Conversation } from '@/types/messages'

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelect: (conversationId: string) => void
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-foreground">会话列表</h2>
      </div>
      <div className="divide-y divide-border">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors ${
              activeConversationId === conversation.id ? 'bg-muted' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm text-foreground">{conversation.peer_username}</p>
              {conversation.unread_count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                  {conversation.unread_count}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{conversation.last_message}</p>
          </button>
        ))}
        {conversations.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">暂无会话</div>
        )}
      </div>
    </div>
  )
}
