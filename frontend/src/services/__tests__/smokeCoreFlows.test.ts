import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

import { authService } from '@/services/auth'
import { problemsService } from '@/services/problems'
import { discussionsService } from '@/services/discussions'
import { blogService } from '@/services/blog'
import { messagesService } from '@/services/messages'
import { plagiarismService } from '@/services/plagiarism'

describe('core smoke flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auth flow: login endpoint reachable', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        token: 't1',
        refresh_token: 'r1',
        user: { id: 'u1', username: 'alice', email: 'a@example.com', role: 'user' },
      },
    })

    const data = await authService.login({ username: 'alice', password: 'pwd' })

    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
      username: 'alice',
      password: 'pwd',
    })
    expect(data.token).toBe('t1')
  })

  it('problem flow: list fetches with query filters', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { problems: [], total: 0, page: 1, limit: 20, pages: 0 },
    })

    const data = await problemsService.getProblems({ difficulty: 'easy', page: 1, limit: 20 })

    expect(mockApi.get).toHaveBeenCalledWith('/problems?difficulty=easy&page=1&limit=20')
    expect(data.total).toBe(0)
  })

  it('community flow: discussion detail reachable', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        id: 'd1',
        title: 't',
        content: 'c',
        author_id: 'u1',
        author_username: 'alice',
        category: 'question',
        tags: [],
        likes_count: 0,
        replies_count: 0,
        views_count: 0,
        is_pinned: false,
        is_locked: false,
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T00:00:00Z',
        replies: [],
        is_liked: false,
        can_edit: false,
        can_delete: false,
      },
    })

    const data = await discussionsService.getDiscussionDetail('d1')

    expect(mockApi.get).toHaveBeenCalledWith('/discussions/d1')
    expect(data.id).toBe('d1')
  })

  it('blog flow: post list reachable', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        articles: [
          {
            id: 'b1',
            title: 'hello',
            content: 'content',
            author_id: 'u1',
            author_username: 'alice',
            category: 'tutorial',
            tags: [],
            is_published: true,
            created_at: '2026-03-06T00:00:00Z',
            updated_at: '2026-03-06T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    })

    const data = await blogService.getPosts(1, 10)

    expect(mockApi.get).toHaveBeenCalledWith('/blog?page=1&limit=10')
    expect(data.posts[0].id).toBe('b1')
  })

  it('message flow: conversation messages reachable', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          conversation_id: 'c1',
          sender_id: 'u1',
          sender_username: 'alice',
          content: 'hi',
          created_at: '2026-03-06T00:00:00Z',
        },
      ],
    })

    const data = await messagesService.getMessages('c1')

    expect(mockApi.get).toHaveBeenCalledWith('/messages/conversations/c1')
    expect(data[0].id).toBe('m1')
  })

  it('plagiarism flow: scan trigger reachable', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { report_id: 'r1' } })

    const data = await plagiarismService.runScan({ contest_id: 'contest-1' })

    expect(mockApi.post).toHaveBeenCalledWith('/admin/plagiarism/scan', {
      contest_id: 'contest-1',
    })
    expect(data.report_id).toBe('r1')
  })
})
