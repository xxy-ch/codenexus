import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ClassManagement } from '../ClassManagement'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getClasses: vi.fn(),
    getClassStudents: vi.fn(),
    listAssignments: vi.fn(),
    getAssignmentSubmissions: vi.fn(),
    createClass: vi.fn(),
    addStudent: vi.fn(),
    batchImportStudents: vi.fn(),
    createAssignment: vi.fn(),
    publishAssignment: vi.fn(),
    deleteAssignment: vi.fn(),
  },
}))

vi.mock('@/services/classes', () => ({
  classesService: {
    getClasses: mocks.getClasses,
    getClassStudents: mocks.getClassStudents,
    listAssignments: mocks.listAssignments,
    getAssignmentSubmissions: mocks.getAssignmentSubmissions,
    createClass: mocks.createClass,
    addStudent: mocks.addStudent,
    batchImportStudents: mocks.batchImportStudents,
    createAssignment: mocks.createAssignment,
    publishAssignment: mocks.publishAssignment,
    deleteAssignment: mocks.deleteAssignment,
  },
}))

describe('ClassManagement', () => {
  let queryClient: QueryClient

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
          student_count: 12,
          teacher_id: 'teacher-1',
          created_at: '2026-03-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Class B',
          semester: '2026 Spring',
          enrollment_code: 'BBB222',
          student_count: 8,
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
            student_id: 'student-2',
            username: 'Bob',
            email: 'bob@example.com',
            total_assignments: 4,
            completed_assignments: 2,
            average_score: 88,
            last_submission: '2026-03-16T00:00:00Z',
          },
        ]
      }

      return [
        {
          student_id: 'student-1',
          username: 'Alice',
          email: 'alice@example.com',
          total_assignments: 5,
          completed_assignments: 5,
          average_score: 96,
          last_submission: '2026-03-15T00:00:00Z',
        },
      ]
    })
    mocks.listAssignments.mockResolvedValue([])
    mocks.getAssignmentSubmissions.mockResolvedValue([])
    mocks.createAssignment.mockResolvedValue({
      id: 7,
      class_id: 2,
      problem_id: 101,
      deadline: '2026-03-20T10:00:00Z',
      points: 100,
      published_at: null,
      created_at: '2026-03-17T00:00:00Z',
      updated_at: '2026-03-17T00:00:00Z',
    })
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <ClassManagement />
      </QueryClientProvider>,
    )
  }

  it('lets the teacher select a class explicitly and loads the real student roster for that class', async () => {
    renderComponent()

    await waitFor(() => expect(screen.getByRole('button', { name: /已选中 Class A/i })).toBeInTheDocument())
    await waitFor(() => expect(mocks.getClassStudents).toHaveBeenCalledWith(1))
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /选择 Class B/i }))

    await waitFor(() => {
      expect(screen.getByText('当前班级：Class B')).toBeInTheDocument()
      expect(screen.getAllByText('BBB222').length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /已选中 Class B/i })).toBeInTheDocument()
      expect(mocks.getClassStudents).toHaveBeenCalledWith(2)
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })
  })

  it('writes new assignments against the selected class instead of the first filtered row', async () => {
    renderComponent()

    await waitFor(() => expect(screen.getByRole('button', { name: /选择 Class B/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /选择 Class B/i }))
    fireEvent.change(screen.getByPlaceholderText('题目 ID'), { target: { value: '101' } })
    fireEvent.change(screen.getByLabelText('作业截止时间'), { target: { value: '2026-03-20T18:00' } })
    fireEvent.change(screen.getByPlaceholderText('分值'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: '创建作业' }))

    await waitFor(() => {
      expect(mocks.createAssignment).toHaveBeenCalledWith(2, {
        problem_id: 101,
        deadline: '2026-03-20T18:00',
        points: 100,
      })
    })
  })
})
