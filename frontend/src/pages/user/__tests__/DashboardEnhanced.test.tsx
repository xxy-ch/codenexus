import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { DashboardEnhanced } from '../DashboardEnhanced'
import type { Problem } from '@/types/problems'
import type { RecommendedProblem, UserActivity, UserStats } from '@/types/users'

vi.mock('@/services/users', () => ({
  usersService: {
    getUserStats: vi.fn(),
    getUserActivity: vi.fn(),
    getRecommendedProblems: vi.fn(),
  },
}))

vi.mock('@/services/problems', () => ({
  problemsService: {
    getProblems: vi.fn(),
  },
}))

import { usersService } from '@/services/users'
import { problemsService } from '@/services/problems'

describe('DashboardEnhanced', () => {
  let queryClient: QueryClient

  const mockUserStats: UserStats = {
    total_submissions: 150,
    accepted_submissions: 75,
    unique_problems_solved: 45,
    current_streak: 7,
    longest_streak: 14,
    ranking: 128,
    total_points: 1250,
    easy_solved: 20,
    medium_solved: 18,
    hard_solved: 7,
    accuracy_rate: 50,
    total_achievements: 10,
    unlocked_achievements: 2,
    achievements: [
      { id: 'first_solve', name: '初出茅庐', description: '解决第一道题', icon: 'star' },
      { id: 'streak_7', name: '坚持不懈', description: '连续学习7天', icon: 'local_fire_department' },
    ],
  }

  const mockRecentActivity: UserActivity[] = [
    {
      id: '1',
      type: 'submission',
      problem_id: '1',
      problem_title: 'Two Sum',
      status: 'accepted',
      language: 'cpp',
      created_at: '2024-01-12T10:30:00Z',
    },
    {
      id: '2',
      type: 'contest_registration',
      contest_id: '1',
      contest_name: 'Weekly Contest 345',
      created_at: '2024-01-12T09:00:00Z',
    },
    {
      id: '3',
      type: 'submission',
      problem_id: '2',
      problem_title: 'Add Two Numbers',
      status: 'wrong_answer',
      language: 'python',
      created_at: '2024-01-11T15:20:00Z',
    },
    {
      id: '4',
      type: 'submission',
      problem_id: '3',
      problem_title: 'Median of Two Sorted Arrays',
      status: 'judged',
      language: 'rust',
      created_at: '2024-01-11T13:00:00Z',
    },
    {
      id: '5',
      type: 'submission',
      problem_id: '4',
      problem_title: 'Trapping Rain Water',
      status: 'queued',
      language: 'java',
      created_at: '2024-01-10T13:00:00Z',
    },
  ]

  const mockRecommendedProblems: RecommendedProblem[] = [
    {
      id: '5',
      title: 'Reverse Linked List',
      difficulty: 'easy',
      tags: ['Linked List'],
      points: 15,
      acceptance_rate: 65,
      reason: 'based on your recent activity',
    },
    {
      id: '6',
      title: 'Merge Intervals',
      difficulty: 'medium',
      tags: ['Array', 'Sorting'],
      points: 25,
      acceptance_rate: 45,
      reason: 'popular medium difficulty problem',
    },
  ]

  const mockDailyProblem: Problem = {
    id: '10',
    title: 'Daily Challenge: Valid Parentheses',
    description: 'Given a string containing just parentheses, determine if it is valid.',
    difficulty: 'medium',
    tags: ['Stack', 'String'],
    points: 30,
    time_limit: 1000,
    memory_limit: 256,
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    vi.clearAllMocks()
    vi.setSystemTime(new Date('2024-01-12T12:00:00Z'))

    vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
    vi.mocked(usersService.getUserActivity).mockResolvedValue([])
    vi.mocked(usersService.getRecommendedProblems).mockResolvedValue([])
    vi.mocked(problemsService.getProblems).mockResolvedValue({
      problems: [],
      total: 0,
      page: 1,
      limit: 20,
      pages: 1,
    })
  })

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardEnhanced />
        </MemoryRouter>
      </QueryClientProvider>,
    )

  it('renders the current summary and stats cards', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Learning Overview' })).toBeInTheDocument()
      expect(screen.getByText(/过去 7 天共提交 150 次/)).toBeInTheDocument()
      expect(screen.getByText('Problems Solved')).toBeInTheDocument()
      expect(screen.getByText('45')).toBeInTheDocument()
      expect(screen.getByText('150 submissions · 50% accuracy')).toBeInTheDocument()
      expect(screen.getByText('#128')).toBeInTheDocument()
      expect(screen.getByText('7 Days')).toBeInTheDocument()
      expect(screen.getByText('1250')).toBeInTheDocument()
    })
  })

  it('renders recent activity using the current labels and limits to four items', async () => {
    vi.mocked(usersService.getUserActivity).mockResolvedValue(mockRecentActivity)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Recent Submissions' })).toBeInTheDocument()
      expect(screen.getByText('Two Sum')).toBeInTheDocument()
      expect(screen.getByText('Weekly Contest 345')).toBeInTheDocument()
      expect(screen.getByText('Add Two Numbers')).toBeInTheDocument()
      expect(screen.getByText('Median of Two Sorted Arrays')).toBeInTheDocument()
      expect(screen.queryByText('Trapping Rain Water')).not.toBeInTheDocument()
      expect(screen.getByText('提交 · 已通过')).toBeInTheDocument()
      expect(screen.getByText('竞赛报名')).toBeInTheDocument()
      expect(screen.getByText('提交 · 已评测')).toBeInTheDocument()
      expect(screen.getAllByText('Judged').length).toBeGreaterThan(0)
    })
  })

  it('renders daily challenge and recommendation cards from live query data', async () => {
    vi.mocked(usersService.getRecommendedProblems).mockResolvedValue(mockRecommendedProblems)
    vi.mocked(problemsService.getProblems).mockResolvedValue({
      problems: [mockDailyProblem],
      total: 1,
      page: 1,
      limit: 20,
      pages: 1,
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Daily Problem' })).toBeInTheDocument()
      expect(screen.getByText('Daily Challenge: Valid Parentheses')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Start Now' })).toHaveAttribute('href', '/problems/10')
      expect(screen.getByRole('heading', { name: 'Recommended' })).toBeInTheDocument()
      expect(screen.getByText('Reverse Linked List')).toBeInTheDocument()
      expect(screen.getByText('Merge Intervals')).toBeInTheDocument()
      expect(screen.getByText('65% acceptance')).toBeInTheDocument()
      expect(screen.getByText('25 pts')).toBeInTheDocument()
    })
  })

  it('renders difficulty distribution and achievements with current copy', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Difficulty Distribution')).toBeInTheDocument()
      expect(screen.getByText('Easy')).toBeInTheDocument()
      expect(screen.getByText('20 solved')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('18 solved')).toBeInTheDocument()
      expect(screen.getByText('Hard')).toBeInTheDocument()
      expect(screen.getByText('7 solved')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Achievements' })).toBeInTheDocument()
      expect(screen.getByText('2 / 10 unlocked')).toBeInTheDocument()
      expect(screen.getByText('初出茅庐')).toBeInTheDocument()
      expect(screen.getByText('坚持不懈')).toBeInTheDocument()
    })
  })

  it('shows loading and error states with the current shared components', async () => {
    vi.mocked(usersService.getUserStats).mockImplementationOnce(() => new Promise(() => {}))
    renderComponent()
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()

    queryClient.clear()
    vi.mocked(usersService.getUserStats).mockRejectedValueOnce(new Error('Failed to fetch user stats'))
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  it('refreshes all top-level dashboard queries from the refresh button', async () => {
    const user = userEvent.setup()
    renderComponent()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'refresh Refresh' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'refresh Refresh' }))

    await waitFor(() => {
      expect(usersService.getUserStats).toHaveBeenCalledTimes(2)
      expect(usersService.getUserActivity).toHaveBeenCalledTimes(2)
      expect(usersService.getRecommendedProblems).toHaveBeenCalledTimes(2)
    })
  })
})
