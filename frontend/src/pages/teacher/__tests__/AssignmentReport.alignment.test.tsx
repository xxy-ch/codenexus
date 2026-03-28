import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { AssignmentReport } from '../AssignmentReport'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getClasses: vi.fn(),
    getClassStudents: vi.fn(),
    listAssignments: vi.fn(),
    getAssignmentSubmissions: vi.fn(),
  },
}))

vi.mock('@/services/classes', () => ({
  classesService: {
    getClasses: mocks.getClasses,
    getClassStudents: mocks.getClassStudents,
    listAssignments: mocks.listAssignments,
    getAssignmentSubmissions: mocks.getAssignmentSubmissions,
  },
}))

describe('AssignmentReport alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClasses.mockResolvedValue({
      classes: [
        {
          id: 1,
          name: '建筑算法 A 班',
          semester: '2026 春',
          enrollment_code: 'CLS0001',
          student_count: 2,
          teacher_id: 'teacher-1',
          created_at: '2026-03-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
    mocks.getClassStudents.mockResolvedValue([
      {
        student_id: 'student-1',
        username: 'Alice',
        email: 'alice@example.com',
        total_assignments: 2,
        completed_assignments: 1,
        average_score: 90,
        last_submission: '2026-03-17T00:00:00Z',
      },
    ])
    mocks.listAssignments.mockResolvedValue([
      {
        id: 101,
        class_id: 1,
        problem_id: 201,
        deadline: '2026-03-20T10:00:00Z',
        points: 100,
        published_at: '2026-03-19T00:00:00Z',
        created_at: '2026-03-18T00:00:00Z',
        updated_at: '2026-03-18T00:00:00Z',
      },
    ])
    mocks.getAssignmentSubmissions.mockResolvedValue([
      {
        id: 11,
        assignment_id: 101,
        user_id: 'student-1',
        submission_id: 9001,
        score: 90,
        is_late: false,
        late_days: 0,
        submitted_at: '2026-03-19T08:00:00Z',
      },
    ])
  })

  it('renders teacher report in unified Chinese dashboard language', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <AssignmentReport />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '作业报告' })).toBeInTheDocument()
      expect(screen.getByText('班级总数')).toBeInTheDocument()
      expect(screen.getByText('学生报表')).toBeInTheDocument()
      expect(screen.getByText('当前选择')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '导出表格' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('班级名称 / 学期 / 邀请码')).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: '班级选择' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: '作业选择' })).toBeInTheDocument()
    })
  })
})
