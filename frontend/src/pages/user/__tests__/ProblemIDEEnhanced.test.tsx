import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    navigate: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
    submitCode: vi.fn(),
    getProblem: vi.fn(),
    getTestCases: vi.fn(),
    getSupportedLanguages: vi.fn(),
    getUserSubmissions: vi.fn(),
    getSubmissionDetail: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  }
})

vi.mock('@/services/problems', () => ({
  problemsService: {
    getProblem: mocks.getProblem,
    getTestCases: mocks.getTestCases,
    getSupportedLanguages: mocks.getSupportedLanguages,
    submitCode: mocks.submitCode,
    getUserSubmissions: mocks.getUserSubmissions,
    getSubmissionDetail: mocks.getSubmissionDetail,
  },
}))

vi.mock('react-hot-toast', () => ({
  default: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/components/ide/MonacoEditor', () => ({
  MonacoEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="code editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

import { ProblemIDEEnhanced } from '../ProblemIDEEnhanced'

describe('ProblemIDEEnhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getProblem.mockResolvedValue({
      id: '1',
      title: 'Two Sum',
      description: 'Use standard input and output.\n\nDo not rely on templates.',
      difficulty: 'easy',
      tags: ['array'],
      time_limit: 1000,
      memory_limit: 262144,
      points: 100,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    mocks.getTestCases.mockResolvedValue([
      {
        id: '1',
        problem_id: '1',
        input: '2 7 11 15\n9',
        expected_output: '0 1',
        is_hidden: false,
        order: 0,
      },
    ])
    mocks.getSupportedLanguages.mockResolvedValue([
      { id: 'python', name: 'Python 3', extension: 'py', enabled: true, is_default: true },
      { id: 'cpp', name: 'C++', extension: 'cpp', enabled: true, is_default: false },
    ])
    mocks.getUserSubmissions.mockResolvedValue({ submissions: [] })
    mocks.getSubmissionDetail.mockResolvedValue({ id: '42', status: 'pending' })
  })

  it('defaults to python, keeps editor empty, and keeps the workspace focused on problem plus editor', async () => {
    render(
      <MemoryRouter initialEntries={['/problems/1/solve']}>
        <Routes>
          <Route path="/problems/:problemId/solve" element={<ProblemIDEEnhanced />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Two Sum/ })).toBeInTheDocument())

    expect(screen.getByRole('combobox')).toHaveValue('python')
    expect(screen.getByLabelText('code editor')).toHaveValue('')
    expect(screen.queryByText(/Standard Input \/ Output|标准输入\/输出/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/这里不预填任何模板/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Code Workspace/i)).not.toBeInTheDocument()
  })

  it('submits and handles judging console state', async () => {
    mocks.submitCode.mockResolvedValue({ id: '42' })

    render(
      <MemoryRouter initialEntries={['/problems/1/solve']}>
        <Routes>
          <Route path="/problems/:problemId/solve" element={<ProblemIDEEnhanced />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Two Sum/ })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('code editor'), { target: { value: 'print(1)' } })
    fireEvent.click(screen.getByRole('button', { name: /提交代码|judge/i }))

    await waitFor(() => {
      expect(mocks.submitCode).toHaveBeenCalledWith({
        problemId: '1',
        code: 'print(1)',
        language: 'python',
      })
      expect(screen.getByText(/正在运行评测/i)).toBeInTheDocument()
    })
  })
})
