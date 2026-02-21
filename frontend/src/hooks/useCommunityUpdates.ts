import { useEffect, useState } from 'react'
import { websocketService } from '@/services/websocket'
import type { DiscussionReply, ArticleComment } from '@/types/community'

/**
 * Hook for receiving real-time updates for discussion replies
 */
export function useDiscussionUpdates(discussionId?: number) {
  const [update, setUpdate] = useState<any>(null)

  useEffect(() => {
    if (!discussionId) return

    const handleDiscussionReply = (message: any) => {
      if (message.type === 'DiscussionReply' && message.data.discussion_id === discussionId) {
        setUpdate(message.data)
      }
    }

    websocketService.addMessageHandler(handleDiscussionReply)

    return () => {
      websocketService.removeMessageHandler(handleDiscussionReply)
    }
  }, [discussionId])

  return { update }
}

/**
 * Hook for receiving real-time updates for article comments
 */
export function useArticleUpdates(articleSlugOrId?: string) {
  const [update, setUpdate] = useState<any>(null)

  useEffect(() => {
    if (!articleSlugOrId) return

    const handleArticleComment = (message: any) => {
      if (
        message.type === 'ArticleComment' &&
        (message.data.article_id.toString() === articleSlugOrId ||
          message.data.slug === articleSlugOrId)
      ) {
        setUpdate(message.data)
      }
    }

    websocketService.addMessageHandler(handleArticleComment)

    return () => {
      websocketService.removeMessageHandler(handleArticleComment)
    }
  }, [articleSlugOrId])

  return { update }
}

/**
 * Hook for trending articles updates
 */
export function useTrendingUpdates() {
  const [updates, setUpdates] = useState<any[]>([])

  useEffect(() => {
    const handleTrendingArticles = (message: any) => {
      if (message.type === 'TrendingArticles') {
        setUpdates(message.data.articles)
      }
    }

    websocketService.addMessageHandler(handleTrendingArticles)

    return () => {
      websocketService.removeMessageHandler(handleTrendingArticles)
    }
  }, [])

  return { updates }
}
