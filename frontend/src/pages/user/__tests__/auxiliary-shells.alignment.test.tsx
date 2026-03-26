import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Profile } from '../Profile'
import { LearningRoadmap } from '../LearningRoadmap'

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
    },
  }),
}))

vi.mock('@/services/users', () => ({
  usersService: {
    getMyProfile: vi.fn(),
    getUserStats: vi.fn(),
    getUserActivity: vi.fn(),
    updateMyProfile: vi.fn(),
  },
}))

import { usersService } from '@/services/users'

describe('user auxiliary shells alignment', () => {
  let queryClient: QueryClient

  const mockProfile = {
    id: 'user-1',
    username: 'solver',
    email: 'solver@example.com',
    display_name: '卷王阿柯',
    organization_id: 7,
    campus_id: 12,
    role: 'student',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  }

  const mockStats = {
    total_submissions: 128,
    accepted_submissions: 64,
    unique_problems_solved: 32,
    current_streak: 9,
    longest_streak: 14,
    ranking: 88,
    total_points: 320,
    easy_solved: 12,
    medium_solved: 14,
    hard_solved: 6,
    accuracy_rate: 0.5,
  }

  const mockActivities = [
    {
      id: 'activity-1',
      type: 'submission',
      problem_id: '1',
      problem_title: 'Two Sum',
      status: 'accepted',
      language: 'typescript',
      created_at: '2024-01-02T10:00:00Z',
    },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    vi.clearAllMocks()
    vi.mocked(usersService.getMyProfile).mockResolvedValue(mockProfile)
    vi.mocked(usersService.getUserStats).mockResolvedValue(mockStats)
    vi.mocked(usersService.getUserActivity).mockResolvedValue(mockActivities)
  })

  it('renders the profile workspace language and account sections', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Profile />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '个人工作台' })).toBeInTheDocument()
      expect(screen.getByText('个人档案')).toBeInTheDocument()
      expect(screen.getByText(/当前登录账号的身份信息、统计概览与最近活动/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '编辑档案' })).toBeInTheDocument()
      expect(screen.getByText('已解题目')).toBeInTheDocument()
      expect(screen.getByText('提交总数')).toBeInTheDocument()
      expect(screen.getByText('通过率')).toBeInTheDocument()
      expect(screen.getByText('当前名次')).toBeInTheDocument()
      expect(screen.getByText('身份台账')).toBeInTheDocument()
      expect(screen.getByText('最近活动')).toBeInTheDocument()
      expect(screen.getByText('账号信息')).toBeInTheDocument()
    })
  })

  it('renders the learning roadmap as a staged workbench', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LearningRoadmap />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '学习路线图' })).toBeInTheDocument()
      expect(screen.getByText(/按当前做题进度给出下一阶段学习重点/i)).toBeInTheDocument()
      expect(screen.getByText('当前路线完成度')).toBeInTheDocument()
      expect(screen.getByText('基础打底')).toBeInTheDocument()
      expect(screen.getByText('提速训练')).toBeInTheDocument()
      expect(screen.getByText('高阶攻坚')).toBeInTheDocument()
      expect(screen.getByText('下一步建议')).toBeInTheDocument()
    })
  })
})
