import api from './api'

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

export const plagiarismService = {
  async getScanConfig(): Promise<SimilarityScanConfig> {
    const response = await api.get<SimilarityScanConfig>('/admin/plagiarism/config')
    return response.data
  },

  async updateScanConfig(payload: SimilarityScanConfig): Promise<SimilarityScanConfig> {
    const response = await api.put<SimilarityScanConfig>('/admin/plagiarism/config', payload)
    return response.data
  },

  async runScan(payload: { contest_id?: string; assignment_id?: string }): Promise<{ report_id: string }> {
    const response = await api.post<{ report_id: string }>('/admin/plagiarism/scan', payload)
    return response.data
  },

  async getReports(page = 1, limit = 20): Promise<PlagiarismReportListResponse> {
    const response = await api.get<PlagiarismReportListResponse>(`/admin/plagiarism/reports?page=${page}&limit=${limit}`)
    return response.data
  },

  async getReportDetail(reportId: string): Promise<PlagiarismReport> {
    const response = await api.get<PlagiarismReport>(`/admin/plagiarism/reports/${reportId}`)
    return response.data
  },
}
