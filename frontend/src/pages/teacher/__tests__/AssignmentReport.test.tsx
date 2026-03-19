import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('AssignmentReport', () => {
  let queryClient: QueryClient
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let anchorClickMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    mocks.getClasses.mockResolvedValue({
      classes: [
        {
          id: 1,
          name: 'Class A',
          semester: '2026 Spring',
          enrollment_code: 'AAA111',
          student_count: 2,
          teacher_id: 'teacher-1',
          created_at: '2026-03-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Class B',
          semester: '2026 Spring',
          enrollment_code: 'BBB222',
          student_count: 1,
          teacher_id: 'teacher-1',
          created_at: '2026-03-02T00:00:00Z',
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    })

    mocks.getClassStudents.mockImplementation(async (classId: number) => {
      if (classId === 2) {
        return [
          {
            student_id: 'student-3',
            username: 'Charlie',
            email: 'charlie@example.com',
            total_assignments: 1,
            completed_assignments: 1,
            average_score: 95,
            last_submission: '2026-03-18T00:00:00Z',
          },
        ]
      }

      return [
        {
          student_id: 'student-1',
          username: 'Alice',
          email: 'alice@example.com',
          total_assignments: 2,
          completed_assignments: 2,
          average_score: 80,
          last_submission: '2026-03-17T00:00:00Z',
        },
        {
          student_id: 'student-2',
          username: 'Bob',
          email: 'bob@example.com',
          total_assignments: 2,
          completed_assignments: 0,
          average_score: 0,
          last_submission: null,
        },
      ]
    })

    mocks.listAssignments.mockImplementation(async (classId: number) => {
      if (classId === 2) {
        return [
          {
            id: 202,
            class_id: 2,
            problem_id: 302,
            deadline: '2026-03-22T10:00:00Z',
            points: 120,
            published_at: '2026-03-21T00:00:00Z',
            created_at: '2026-03-20T00:00:00Z',
            updated_at: '2026-03-20T00:00:00Z',
          },
        ]
      }

      return [
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
      ]
    })

    mocks.getAssignmentSubmissions.mockImplementation(async (assignmentId: number) => {
      if (assignmentId === 202) {
        return [
          {
            id: 22,
            assignment_id: 202,
            user_id: 'student-3',
            submission_id: 9002,
            score: 95,
            is_late: false,
            late_days: 0,
            submitted_at: '2026-03-21T08:00:00Z',
          },
        ]
      }

      return [
        {
          id: 11,
          assignment_id: 101,
          user_id: 'student-1',
          submission_id: 9001,
          score: 80,
          is_late: false,
          late_days: 0,
          submitted_at: '2026-03-19T08:00:00Z',
        },
        {
          id: 12,
          assignment_id: 101,
          user_id: 'student-1',
          submission_id: 9003,
          score: 80,
          is_late: true,
          late_days: 1,
          submitted_at: '2026-03-19T10:00:00Z',
        },
      ]
    })

    createObjectURLMock = vi.fn(() => 'blob:assignment-report')
    revokeObjectURLMock = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURLMock,
      configurable: true,
    })
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectURLMock,
      configurable: true,
    })
    anchorClickMock = vi.fn()
    HTMLAnchorElement.prototype.click = anchorClickMock
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <AssignmentReport />
      </QueryClientProvider>,
    )
  }

  it('joins classes, students and submissions, then exports the filtered CSV', async () => {
    renderComponent()

    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())
    expect(screen.getByText('Yes (1d)')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/select class/i), { target: { value: '2' } })

    await waitFor(() => expect(screen.getByText('charlie@example.com')).toBeInTheDocument())
    expect(mocks.getClassStudents).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole('button', { name: /导出 csv/i }))

    await waitFor(() => expect(createObjectURLMock).toHaveBeenCalled())
    const blob = createObjectURLMock.mock.calls[0][0] as Blob

    expect(blob).toBeTruthy()
    expect(blob.type).toBe('text/csv;charset=utf-8')
    expect(anchorClickMock).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:assignment-report')
  })
})
