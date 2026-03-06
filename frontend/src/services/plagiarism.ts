import api from './api'
import { USE_MOCK_DATA } from './config'

export interface SimilarityScanConfig {
  enabled: boolean
  language: 'cpp' | 'c' | 'java' | 'python' | 'all'
  threshold: number
  min_token_length: number
  window_size: number
  ignore_comments: boolean
  ignore_whitespace: boolean
  max_reports_per_run: number
}

export interface PlagiarismPair {
  left_submission_id: string
  right_submission_id: string
  left_user: string
  right_user: string
  similarity: number
  matched_lines: number
}

export interface PlagiarismReport {
  id: string
  contest_id?: string
  assignment_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  overall_risk: 'low' | 'medium' | 'high'
  created_at: string
  finished_at?: string
  total_submissions: number
  suspicious_pairs: number
  top_pairs: PlagiarismPair[]
}

export interface PlagiarismReportListResponse {
  reports: PlagiarismReport[]
  total: number
  page: number
  limit: number
}

const mockConfig: SimilarityScanConfig = {
  enabled: true,
  language: 'all',
  threshold: 0.85,
  min_token_length: 5,
  window_size: 30,
  ignore_comments: true,
  ignore_whitespace: true,
  max_reports_per_run: 100,
}

const mockReports: PlagiarismReport[] = [
  {
    id: 'rpt_20260306_001',
    contest_id: 'contest_101',
    status: 'completed',
    overall_risk: 'high',
    created_at: '2026-03-06T08:00:00Z',
    finished_at: '2026-03-06T08:06:00Z',
    total_submissions: 324,
    suspicious_pairs: 8,
    top_pairs: [
      {
        left_submission_id: 'sub_10001',
        right_submission_id: 'sub_10088',
        left_user: 'alice',
        right_user: 'bob',
        similarity: 0.96,
        matched_lines: 118,
      },
      {
        left_submission_id: 'sub_10035',
        right_submission_id: 'sub_10201',
        left_user: 'charlie',
        right_user: 'david',
        similarity: 0.91,
        matched_lines: 87,
      },
    ],
  },
  {
    id: 'rpt_20260305_004',
    assignment_id: 'assign_11',
    status: 'completed',
    overall_risk: 'medium',
    created_at: '2026-03-05T12:10:00Z',
    finished_at: '2026-03-05T12:18:00Z',
    total_submissions: 146,
    suspicious_pairs: 3,
    top_pairs: [
      {
        left_submission_id: 'sub_9011',
        right_submission_id: 'sub_9022',
        left_user: 'eve',
        right_user: 'frank',
        similarity: 0.88,
        matched_lines: 65,
      },
    ],
  },
]

export const plagiarismService = {
  async getScanConfig(): Promise<SimilarityScanConfig> {
    if (USE_MOCK_DATA) return mockConfig

    const response = await api.get<SimilarityScanConfig>('/admin/plagiarism/config')
    return response.data
  },

  async updateScanConfig(payload: SimilarityScanConfig): Promise<SimilarityScanConfig> {
    if (USE_MOCK_DATA) return { ...payload }

    const response = await api.put<SimilarityScanConfig>('/admin/plagiarism/config', payload)
    return response.data
  },

  async runScan(payload: { contest_id?: string; assignment_id?: string }): Promise<{ report_id: string }> {
    if (USE_MOCK_DATA) {
      return { report_id: `rpt_${Date.now()}` }
    }

    const response = await api.post<{ report_id: string }>('/admin/plagiarism/scan', payload)
    return response.data
  },

  async getReports(page = 1, limit = 20): Promise<PlagiarismReportListResponse> {
    if (USE_MOCK_DATA) {
      return {
        reports: mockReports.slice((page - 1) * limit, page * limit),
        total: mockReports.length,
        page,
        limit,
      }
    }

    const response = await api.get<PlagiarismReportListResponse>(`/admin/plagiarism/reports?page=${page}&limit=${limit}`)
    return response.data
  },

  async getReportDetail(reportId: string): Promise<PlagiarismReport> {
    if (USE_MOCK_DATA) {
      const report = mockReports.find((item) => item.id === reportId)
      if (!report) throw new Error('Report not found')
      return report
    }

    const response = await api.get<PlagiarismReport>(`/admin/plagiarism/reports/${reportId}`)
    return response.data
  },
}
