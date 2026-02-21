/**
 * WebSocket Message Types
 * Corresponds to backend WebSocketMessage enum
 */

export type WebSocketMessage =
  | SubmissionUpdateMessage
  | LeaderboardUpdateMessage
  | NotificationMessage
  | ContestUpdateMessage
  | ProblemStatsMessage
  | ChatMessage
  | DiscussionReplyMessage
  | ArticleCommentMessage
  | TrendingArticlesMessage
  | PingMessage
  | PongMessage
  | ErrorMessage

export interface SubmissionUpdateMessage {
  type: 'SubmissionUpdate'
  data: {
    submission_id: number
    user_id: string
    problem_id: number
    status: string
    score?: number
    runtime_ms?: number
    memory_kb?: number
  }
}

export interface LeaderboardUpdateMessage {
  type: 'LeaderboardUpdate'
  data: {
    scope: 'global' | 'problem' | 'contest' | 'class'
    scope_id?: number
    data: any
  }
}

export interface NotificationMessage {
  type: 'Notification'
  data: {
    id: string
    user_id: string
    title: string
    message: string
    notification_type: 'info' | 'success' | 'warning' | 'error'
    created_at: string
  }
}

export interface ContestUpdateMessage {
  type: 'ContestUpdate'
  data: {
    contest_id: number
    status: 'starting_soon' | 'started' | 'ended'
    time_remaining?: number
  }
}

export interface ProblemStatsMessage {
  type: 'ProblemStats'
  data: {
    problem_id: number
    total_submissions: number
    accepted_count: number
    accuracy_rate: number
  }
}

export interface ChatMessage {
  type: 'ChatMessage'
  data: {
    id: string
    contest_id: number
    user_id: string
    username: string
    message: string
    timestamp: string
  }
}

export interface DiscussionReplyMessage {
  type: 'DiscussionReply'
  data: {
    discussion_id: number
    reply_id: number
    user_id: string
    username: string
    content: string
    created_at: string
  }
}

export interface ArticleCommentMessage {
  type: 'ArticleComment'
  data: {
    article_id: number
    comment_id: number
    user_id: string
    username: string
    content: string
    created_at: string
  }
}

export interface TrendingArticlesMessage {
  type: 'TrendingArticles'
  data: {
    articles: Array<{
      id: number
      title: string
      slug: string
      author: string
      view_count: number
      like_count: number
    }>
  }
}

export interface PingMessage {
  type: 'Ping'
  data: {
    timestamp: number
  }
}

export interface PongMessage {
  type: 'Pong'
  data: {
    timestamp: number
  }
}

export interface ErrorMessage {
  type: 'Error'
  data: {
    code: string
    message: string
  }
}

/**
 * WebSocket connection status
 */
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * WebSocket event handlers
 */
export interface WebSocketEventHandlers {
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Event) => void
  onMessage?: (message: WebSocketMessage) => void
  onSubmissionUpdate?: (data: SubmissionUpdateMessage['data']) => void
  onLeaderboardUpdate?: (data: LeaderboardUpdateMessage['data']) => void
  onNotification?: (data: NotificationMessage['data']) => void
  onContestUpdate?: (data: ContestUpdateMessage['data']) => void
  onProblemStats?: (data: ProblemStatsMessage['data']) => void
  onChatMessage?: (data: ChatMessage['data']) => void
}

/**
 * Topic subscription request
 */
export interface SubscriptionRequest {
  type: string
  data: any
}
