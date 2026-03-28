import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { SimilarityScanConfig } from '../SimilarityScanConfig'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getScanConfig: vi.fn(),
  },
}))

vi.mock('@/services/plagiarism', () => ({
  plagiarismService: {
    getScanConfig: mocks.getScanConfig,
    updateScanConfig: vi.fn(),
    runScan: vi.fn(),
  },
}))

describe('SimilarityScanConfig alignment', () => {
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

    mocks.getScanConfig.mockResolvedValue({
      enabled: true,
      language: 'all',
      threshold: 0.82,
      min_token_length: 8,
      window_size: 12,
      ignore_comments: true,
      ignore_whitespace: false,
      max_reports_per_run: 30,
    })
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <SimilarityScanConfig />
      </QueryClientProvider>,
    )
  }

  it('uses shared control proportions and custom state chips for scan toggles', async () => {
    renderComponent()

    expect(await screen.findByLabelText('相似度阈值')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '语言' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '真实相似度接口' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存配置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始扫描' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: '启用' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: '忽略注释' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: '忽略空白' })).toBeNull()
  })
})
