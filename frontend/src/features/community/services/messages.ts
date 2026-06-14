import api from '@/shared/services/api'
import type { Conversation, DirectMessage } from '@/features/community/types/messages'

export const messagesService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get<Conversation[]>('/messages/conversations')
    return response.data
  },

  async createConversation(peer: string): Promise<Conversation> {
    const response = await api.post<Conversation>('/messages/conversations', {
      peer,
    })
    return response.data
  },

  async getMessages(conversationId: string): Promise<DirectMessage[]> {
    const response = await api.get<DirectMessage[]>(
      `/messages/conversations/${conversationId}`
    )
    return response.data
  },

  async sendMessage(conversationId: string, content: string): Promise<DirectMessage> {
    const response = await api.post<DirectMessage>(
      `/messages/conversations/${conversationId}`,
      { content }
    )
    return response.data
  },
}
