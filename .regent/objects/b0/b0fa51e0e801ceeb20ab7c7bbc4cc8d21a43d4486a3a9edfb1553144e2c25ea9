import type { Conversation, DirectMessage } from '@/types/messages'

interface MessageThreadProps {
  conversation: Conversation | null
  messages: DirectMessage[]
  draft: string
  sending: boolean
  onDraftChange: (value: string) => void
  onSend: () => void
}

export function MessageThread({
  conversation,
  messages,
  draft,
  sending,
  onDraftChange,
  onSend,
}: MessageThreadProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {conversation ? (
        <>
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground">与 {conversation.peer_username} 的会话</h2>
          </div>
          <div className="p-4 h-[420px] overflow-y-auto space-y-3">
            {messages.map((message) => {
              const isMine = message.sender_username === 'you'
              return (
                <div
                  key={message.id}
                  className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                    isMine
                      ? 'ml-auto bg-primary text-white'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className={`text-[11px] mt-1 ${isMine ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {new Date(message.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              )
            })}
            {messages.length === 0 && <p className="text-sm text-muted-foreground">暂无消息</p>}
          </div>
          <div className="p-4 border-t border-border flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="输入消息..."
              className="flex-1 px-3 py-2 rounded border border-border bg-card text-sm"
            />
            <button
              type="button"
              disabled={!draft.trim() || sending}
              onClick={onSend}
              className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </>
      ) : (
        <div className="h-[520px] flex items-center justify-center text-muted-foreground">请选择左侧会话</div>
      )}
    </div>
  )
}
