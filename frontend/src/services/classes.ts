import api from './api'

export interface ClassItem {
  id: number
  name: string
  description?: string
  semester?: string
  teacher_id: string
  enrollment_code?: string
  student_count?: number
  created_at: string
}

export interface AssignmentItem {
  id: number
  class_id: number
  problem_id: number
  deadline: string
  points: number
  created_at: string
  updated_at: string
}

export interface ClassesListResponse {
  classes: ClassItem[]
  total: number
  page: number
  limit: number
}

interface BackendClassItem {
  id: number
  name: string
  description?: string
  semester?: string
  teacher_id: string
  code?: string
  created_at: string
}

interface BackendClassesListResponse {
  classes: BackendClassItem[]
  total: number
  page: number
  limit: number
}

interface ClassStatsResponse {
  total_students: number
}

export const classesService = {
  async getClasses(page = 1, limit = 20): Promise<ClassesListResponse> {
    const response = await api.get<BackendClassesListResponse>(`/classes?page=${page}&limit=${limit}`)
    const payload = response.data

    const statsResults = await Promise.allSettled(
      (payload.classes || []).map((cls) =>
        api.get<ClassStatsResponse>(`/classes/${cls.id}/stats`)
      )
    )

    const classes = (payload.classes || []).map((cls, index) => {
      const statsResult = statsResults[index]
      const studentCount = statsResult?.status === 'fulfilled'
        ? Number(statsResult.value.data?.total_students) || 0
        : undefined

      return {
        id: cls.id,
        name: cls.name,
        description: cls.description,
        semester: cls.semester,
        teacher_id: cls.teacher_id,
        enrollment_code: cls.code,
        student_count: studentCount,
        created_at: cls.created_at,
      }
    })

    return {
      classes,
      total: Number(payload.total) || 0,
      page: Number(payload.page) || page,
      limit: Number(payload.limit) || limit,
    }
  },

  async createClass(payload: {
    organization_id: number
    campus_id?: number | null
    name: string
    semester?: string
  }) {
    const response = await api.post<ClassItem>('/classes', payload)
    return response.data
  },

  async addStudent(classId: number, student_email: string) {
    const response = await api.post(`/classes/${classId}/students`, { student_email })
    return response.data
  },

  async batchImportStudents(classId: number, emails: string[]) {
    const response = await api.post(`/classes/${classId}/students/import`, { emails })
    return response.data
  },

  async listAssignments(classId: number): Promise<AssignmentItem[]> {
    const response = await api.get<AssignmentItem[]>(`/classes/${classId}/assignments`)
    return response.data || []
  },

  async createAssignment(classId: number, payload: {
    problem_id: number
    deadline: string
    points?: number
  }) {
    const response = await api.post<AssignmentItem>(`/classes/${classId}/assignments`, payload)
    return response.data
  },

  async deleteAssignment(assignmentId: number) {
    await api.delete(`/classes/assignments/${assignmentId}`)
  },
}
