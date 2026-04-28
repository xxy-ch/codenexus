import api from './api'
import type { Grade, CreateGradeRequest, UpdateGradeRequest } from '@/types/grade'

export interface ListGradesResponse {
  grades: Grade[]
  total: number
}

export const gradesService = {
  async listGrades(campusId: number): Promise<ListGradesResponse> {
    const response = await api.get<ListGradesResponse>(`/grades?campus_id=${campusId}`)
    return {
      grades: (response.data.grades || []).map((g: Grade) => ({
        id: Number(g.id),
        campus_id: Number(g.campus_id),
        name: String(g.name),
        year_level: Number(g.year_level),
        academic_year: String(g.academic_year),
        is_active: Boolean(g.is_active),
        created_at: String(g.created_at),
        updated_at: String(g.updated_at),
      })),
      total: Number(response.data.total) || 0,
    }
  },

  async createGrade(data: CreateGradeRequest): Promise<Grade> {
    const response = await api.post<Grade>('/grades', data)
    return response.data
  },

  async updateGrade(id: number, data: UpdateGradeRequest): Promise<Grade> {
    const response = await api.put<Grade>(`/grades/${id}`, data)
    return response.data
  },

  async deactivateGrade(id: number): Promise<Grade> {
    const response = await api.post<Grade>(`/grades/${id}/deactivate`)
    return response.data
  },

  async graduateGrades(gradeIds: number[], suspendStudents = false) {
    const response = await api.post('/grades/batch/graduate', {
      grade_ids: gradeIds,
      suspend_students: suspendStudents,
    })
    return response.data
  },

  async promoteGrades(gradeIds: number[]) {
    const response = await api.post('/grades/batch/promote', {
      grade_ids: gradeIds,
    })
    return response.data
  },

  async createAcademicYearGrades(data: {
    campus_id: number
    academic_year: string
    template_from?: string
  }) {
    const response = await api.post('/grades/batch/create-year', data)
    return response.data
  },
}
