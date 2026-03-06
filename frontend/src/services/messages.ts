import api from './api'
import { USE_MOCK_DATA } from './config'
import type { Conversation, DirectMessage } from '@/types/messages'

export const messagesService = {
  async getConversations(): Promise<Conversation[]> {
    if (USE_MOCK_DATA) {
      return getMockConversations()
    }

    const response = await api.get<Conversation[]>('/messages/conversations')
    return response.data
  },

  async getMessages(conversationId: string): Promise<DirectMessage[]> {
    if (USE_MOCK_DATA) {
      return getMockMessages(conversationId)
    }

    const response = await api.get<DirectMessage[]>(
      `/messages/conversations/${conversationId}`
    )
    return response.data
  },

  async sendMessage(conversationId: string, content: string): Promise<DirectMessage> {
    if (USE_MOCK_DATA) {
      return {
        id: String(Date.now()),
        conversation_id: conversationId,
        sender_id: 'current_user',
        sender_username: 'you',
        content,
        created_at: new Date().toISOString(),
      }
    }

    const response = await api.post<DirectMessage>(
      `/messages/conversations/${conversationId}`,
      { content }
    )
    return response.data
  },
}

function getMockConversations(): Conversation[] {
  return [
    {
      id: 'c1',
      peer_user_id: 'u1002',
      peer_username: 'algorithm_master',
      last_message: '你昨天那题思路很不错',
      last_message_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      unread_count: 2,
    },
    {
      id: 'c2',
      peer_user_id: 'u1003',
      peer_username: 'contest_admin',
      last_message: '周末竞赛记得报名',
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      unread_count: 0,
    },
  ]
}

function getMockMessages(conversationId: string): DirectMessage[] {
  const now = Date.now()
  return [
    {
      id: `${conversationId}-m1`,
      conversation_id: conversationId,
      sender_id: 'u1002',
      sender_username: 'algorithm_master',
      content: '最近在刷什么题型？',
      created_at: new Date(now - 1000 * 60 * 30).toISOString(),
    },
    {
      id: `${conversationId}-m2`,
      conversation_id: conversationId,
      sender_id: 'current_user',
      sender_username: 'you',
      content: '主要在刷 DP 和图论。',
      created_at: new Date(now - 1000 * 60 * 20).toISOString(),
    },
  ]
}

