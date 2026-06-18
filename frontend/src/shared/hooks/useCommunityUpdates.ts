import { useEffect, useState } from 'react'
import { websocketService } from '@/shared/services/websocket'

/**
 * Hook for receiving real-time updates for discussion replies
 */
export function useDiscussionUpdates(discussionId?: number) {
  const [update, setUpdate] = useState<any>(null)

  useEffect(() => {
    if (!discussionId) return

    const handle = (message: any) => {
      if (message.type === 'DiscussionReply' && message.data.discussion_id === discussionId) {
        setUpdate(message.data)
      }
    }

    // Set up the message handler
    const currentHandlers = (websocketService as any).handlers || {}
    const originalOnMessage = currentHandlers.onMessage

    const newOnMessage = (message: any) => {
      originalOnMessage?.(message)
      handle(message)
    }

    websocketService.setHandlers({
      ...currentHandlers,
      onMessage: newOnMessage,
    })

    return () => {
      // Restore original handler
      websocketService.setHandlers({
        ...currentHandlers,
        onMessage: originalOnMessage,
      })
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

    // Set up the message handler
    const currentHandlers = (websocketService as any).handlers || {}
    const originalOnMessage = currentHandlers.onMessage

    const newOnMessage = (message: any) => {
      originalOnMessage?.(message)
      handleArticleComment(message)
    }

    websocketService.setHandlers({
      ...currentHandlers,
      onMessage: newOnMessage,
    })

    return () => {
      // Restore original handler
      websocketService.setHandlers({
        ...currentHandlers,
        onMessage: originalOnMessage,
      })
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

    // Set up the message handler
    const currentHandlers = (websocketService as any).handlers || {}
    const originalOnMessage = currentHandlers.onMessage

    const newOnMessage = (message: any) => {
      originalOnMessage?.(message)
      handleTrendingArticles(message)
    }

    websocketService.setHandlers({
      ...currentHandlers,
      onMessage: newOnMessage,
    })

    return () => {
      // Restore original handler
      websocketService.setHandlers({
        ...currentHandlers,
        onMessage: originalOnMessage,
      })
    }
  }, [])

  return { updates }
}
