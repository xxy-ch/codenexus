import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('@/shared/services/api', () => ({
  default: mockApi,
}))

import { messagesService } from '@/services/messages'

describe('messagesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches conversations from backend endpoint', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: [
        {
          id: 'c1',
          peer_user_id: 'u2',
          peer_username: 'alice',
          last_message: 'hello',
          last_message_at: '2026-03-06T00:00:00Z',
          unread_count: 1,
        },
      ],
    })

    const data = await messagesService.getConversations()

    expect(mockApi.get).toHaveBeenCalledWith('/messages/conversations')
    expect(data[0].peer_username).toBe('alice')
  })

  it('sends message to conversation endpoint', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        id: 'm1',
        conversation_id: 'c1',
        sender_id: 'u1',
        sender_username: 'you',
        content: 'ping',
        created_at: '2026-03-06T00:00:00Z',
      },
    })

    const msg = await messagesService.sendMessage('c1', 'ping')

    expect(mockApi.post).toHaveBeenCalledWith('/messages/conversations/c1', {
      content: 'ping',
    })
    expect(msg.id).toBe('m1')
  })

  it('creates or reuses a conversation by peer identifier', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        id: 'c2',
        peer_user_id: 'u2',
        peer_username: '2002',
        last_message: '',
        last_message_at: '2026-03-06T00:00:00Z',
        unread_count: 0,
      },
    })

    const conversation = await messagesService.createConversation('2002')

    expect(mockApi.post).toHaveBeenCalledWith('/messages/conversations', {
      peer: '2002',
    })
    expect(conversation.id).toBe('c2')
  })
})
