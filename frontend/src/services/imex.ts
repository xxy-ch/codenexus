import api from './api'
import type { ImportPreview, ImportResult } from '@/types/imex'

export const imexService = {
  async validateProblemImport(file: File): Promise<ImportPreview> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/imex/import/problems/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async executeProblemImport(token: string): Promise<ImportResult> {
    const response = await api.post('/imex/import/problems/execute', { token })
    return response.data
  },

  async exportProblem(problemId: string): Promise<Blob> {
    const response = await api.get(`/imex/export/problems/${problemId}`, {
      responseType: 'blob',
    })
    return response.data
  },

  async validateUserImport(file: File, defaultPassword: string): Promise<ImportPreview> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('default_password', defaultPassword)
    const response = await api.post('/imex/import/users/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async executeUserImport(token: string): Promise<ImportResult> {
    const response = await api.post('/imex/import/users/execute', { token })
    return response.data
  },

  async exportUsers(): Promise<Blob> {
    const response = await api.get('/imex/export/users', {
      responseType: 'blob',
    })
    return response.data
  },
}
