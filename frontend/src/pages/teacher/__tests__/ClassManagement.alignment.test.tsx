import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('ClassManagement alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClasses.mockResolvedValue({
      classes: [
        {
          id: 1,
          name: '建筑算法 A 班',
          semester: '2026 春',
          enrollment_code: 'CLS0001',
          student_count: 12,
          teacher_id: 'teacher-1',
          created_at: '2026-03-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
    mocks.getClassStudents.mockResolvedValue([])
    mocks.listAssignments.mockResolvedValue([])
    mocks.getAssignmentSubmissions.mockResolvedValue([])
    mocks.createClass.mockResolvedValue({})
    mocks.addStudent.mockResolvedValue({})
    mocks.batchImportStudents.mockResolvedValue({})
    mocks.createAssignment.mockResolvedValue({})
    mocks.publishAssignment.mockResolvedValue({})
    mocks.deleteAssignment.mockResolvedValue({})
  })

  it('renders class workspace in unified Chinese layout language', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ClassManagement />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '班级管理' })).toBeInTheDocument()
      expect(screen.getByText('班级总数')).toBeInTheDocument()
      expect(screen.getByText('班级列表')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '创建作业' })).toBeInTheDocument()
      expect(screen.getByText('作业与提交记录')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('搜索班级 / 学期 / 邀请码')).toBeInTheDocument()
      expect(screen.getByLabelText('批量导入学生')).toBeInTheDocument()
      expect(screen.getByLabelText('作业截止时间')).toBeInTheDocument()
    })
  })
})
