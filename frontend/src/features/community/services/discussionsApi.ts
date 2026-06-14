import api from '@/shared/services/api'
import type {
  Discussion,
  DiscussionDetail,
  DiscussionFilters,
  DiscussionListResponse,
  CreateDiscussionRequest,
  UpdateDiscussionRequest,
  DiscussionReply,
  CreateReplyRequest,
  LikeResponse,
} from '@/features/community/types/community'

function normalizeLikeResponse(data: unknown): LikeResponse {
  if (typeof data === 'boolean') {
    return { liked: data, like_count: -1 }
  }

  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>
    const liked = typeof payload.liked === 'boolean' ? payload.liked : Boolean(payload.like_count)
    const likeCount = payload.like_count === undefined ? -1 : Number(payload.like_count) || 0
    return { liked, like_count: likeCount }
  }

  return { liked: false, like_count: -1 }
}

function normalizeDiscussion(data: unknown): Discussion {
  const payload = (data || {}) as Record<string, unknown>

  return {
    id: Number(payload.id) || 0,
    title: String(payload.title || ''),
    content: String(payload.content || ''),
    author_id: String(payload.author_id || ''),
    author_username: String(payload.author_username || 'unknown'),
    problem_id: payload.problem_id ? Number(payload.problem_id) : undefined,
    problem_title: payload.problem_title ? String(payload.problem_title) : undefined,
    tags: Array.isArray(payload.tags) ? payload.tags.map((t) => String(t)) : [],
    is_pinned: Boolean(payload.is_pinned),
    is_solved: Boolean(payload.is_solved),
    is_locked: Boolean(payload.is_locked),
    view_count: Number(payload.view_count) || 0,
    reply_count: Number(payload.reply_count) || 0,
    like_count: Number(payload.like_count) || 0,
    created_at: String(payload.created_at || new Date().toISOString()),
    updated_at: String(payload.updated_at || new Date().toISOString()),
  }
}

function normalizeDiscussionReply(data: unknown): DiscussionReply {
  const payload = (data || {}) as Record<string, unknown>

  return {
    id: Number(payload.id) || 0,
    discussion_id: Number(payload.discussion_id) || 0,
    parent_reply_id: payload.parent_reply_id
      ? Number(payload.parent_reply_id)
      : payload.parent_id
        ? Number(payload.parent_id)
        : undefined,
    content: String(payload.content || ''),
    author_id: String(payload.author_id || ''),
    author_username: String(payload.author_username || 'unknown'),
    like_count: Number(payload.like_count) || 0,
    is_solution: Boolean(payload.is_solution),
    created_at: String(payload.created_at || new Date().toISOString()),
    updated_at: String(payload.updated_at || new Date().toISOString()),
    replies: Array.isArray(payload.replies)
      ? payload.replies.map((reply) => normalizeDiscussionReply(reply))
      : undefined,
  }
}

function normalizeDiscussionDetail(data: unknown): DiscussionDetail {
  const payload = (data || {}) as Record<string, unknown>
  const discussion = normalizeDiscussion(payload.discussion)

  return {
    discussion,
    replies: Array.isArray(payload.replies)
      ? payload.replies.map((reply) => normalizeDiscussionReply(reply))
      : [],
    author: payload.author && typeof payload.author === 'object'
      ? {
          id: String((payload.author as Record<string, unknown>).id || discussion.author_id),
          username: String((payload.author as Record<string, unknown>).username || discussion.author_username || 'unknown'),
          avatar: (payload.author as Record<string, unknown>).avatar
            ? String((payload.author as Record<string, unknown>).avatar)
            : undefined,
          role: (payload.author as Record<string, unknown>).role
            ? String((payload.author as Record<string, unknown>).role)
            : undefined,
        }
      : {
          id: discussion.author_id,
          username: discussion.author_username || 'unknown',
        },
    problem: payload.problem && typeof payload.problem === 'object'
      ? {
          id: Number((payload.problem as Record<string, unknown>).id) || 0,
          title: String((payload.problem as Record<string, unknown>).title || ''),
          difficulty: String((payload.problem as Record<string, unknown>).difficulty || 'unknown'),
        }
      : discussion.problem_id
        ? {
            id: discussion.problem_id,
            title: discussion.problem_title || '',
            difficulty: 'unknown',
          }
        : undefined,
  }
}

export const discussionsApi = {
  // Get discussions list
  getDiscussions: async (filters: DiscussionFilters = {}): Promise<DiscussionListResponse> => {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.problem_id) params.append('problem_id', filters.problem_id.toString())
    if (filters.tag) params.append('tag', filters.tag)
    if (filters.status) params.append('status', filters.status)
    if (filters.sort) params.append('sort', filters.sort)

    const response = await api.get(`/discussions?${params.toString()}`)
    const payload = (response.data || {}) as Record<string, unknown>
    const discussions = Array.isArray(payload.discussions)
      ? payload.discussions.map((item) => normalizeDiscussion(item))
      : []
    const total = Number(payload.total) || 0
    const limit = Number(payload.limit || filters.limit) || 20
    const page = Number(payload.page || filters.page) || 1
    const pages = Number(payload.pages) || Math.ceil(total / Math.max(1, limit))

    return {
      discussions,
      total,
      page,
      limit,
      has_more: page < pages,
    }
  },

  // Get discussion detail
  getDiscussion: async (id: number): Promise<DiscussionDetail> => {
    const response = await api.get(`/discussions/${id}`)
    return normalizeDiscussionDetail(response.data)
  },

  // Create discussion
  createDiscussion: async (data: CreateDiscussionRequest): Promise<Discussion> => {
    const response = await api.post('/discussions', data)
    return normalizeDiscussion(response.data)
  },

  // Update discussion
  updateDiscussion: async (id: number, data: UpdateDiscussionRequest): Promise<Discussion> => {
    const response = await api.patch(`/discussions/${id}`, data)
    return normalizeDiscussion(response.data)
  },

  // Delete discussion
  deleteDiscussion: async (id: number): Promise<void> => {
    await api.delete(`/discussions/${id}`)
  },

  // Get replies
  getReplies: async (discussionId: number): Promise<DiscussionReply[]> => {
    const response = await api.get(`/discussions/${discussionId}/replies`)
    return Array.isArray(response.data)
      ? response.data.map((item) => normalizeDiscussionReply(item))
      : []
  },

  // Create reply
  createReply: async (discussionId: number, data: CreateReplyRequest): Promise<DiscussionReply> => {
    const response = await api.post(
      `/discussions/${discussionId}/replies`,
      {
        content: data.content,
        parent_id: data.parent_reply_id,
        is_solution: data.is_solution,
      }
    )
    return normalizeDiscussionReply(response.data)
  },

  // Like discussion
  likeDiscussion: async (id: number): Promise<LikeResponse> => {
    const response = await api.post(
      `/discussions/${id}/like`,
      {}
    )
    return normalizeLikeResponse(response.data)
  },

  // Like reply
  likeReply: async (replyId: number): Promise<LikeResponse> => {
    const response = await api.post(
      `/discussions/replies/${replyId}/like`,
      {}
    )
    return normalizeLikeResponse(response.data)
  },
}
