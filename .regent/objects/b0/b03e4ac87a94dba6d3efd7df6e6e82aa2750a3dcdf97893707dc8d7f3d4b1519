import api from './api'
import type { Contest, ContestDetail, ContestRegistration, ContestEntry } from '@/types/contests'
import { isTeacherOrAbove, type Role } from '@/types/auth'

export interface ContestFilters {
  status?: 'upcoming' | 'ongoing' | 'completed' | 'all'
  difficulty?: 'easy' | 'medium' | 'hard' | 'all'
  search?: string
  page?: number
  limit?: number
}

export interface ContestsResponse {
  contests: Contest[]
  total: number
}

interface BackendContest {
  id: number
  organization_id: number
  campus_id?: number | null
  name: string
  description?: string | null
  rules: string
  start_time: string
  end_time: string
  freeze_minutes?: number | null
  created_at: string
  updated_at: string
}

interface BackendContestDetail extends BackendContest {
  problem_count: number
  participant_count: number
}

interface BackendContestProblem {
  id: number
  problem_id: number
  title: string
  difficulty: 'easy' | 'medium' | 'hard' | string
  points: number
  order_index: number
}

interface BackendContestParticipant {
  id: number
  contest_id: number
  user_id: string
  registered_at: string
}

function normalizeContestStatus(startTime: string, endTime: string): Contest['status'] {
  const now = Date.now()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()

  if (now < start) return 'upcoming'
  if (now <= end) return 'ongoing'
  return 'completed'
}

function normalizeDifficulty(
  problems: Array<{ difficulty?: string | null }>
): Contest['difficulty'] {
  const scores = problems
    .map((problem) => String(problem.difficulty || '').toLowerCase())
    .map((difficulty) => {
      if (difficulty === 'hard' || difficulty === 'expert') return 3
      if (difficulty === 'medium') return 2
      return 1
    })

  if (scores.length === 0) return 'medium'

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  if (average >= 2.5) return 'hard'
  if (average >= 1.5) return 'medium'
  return 'easy'
}

function buildContestSummary(
  contest: BackendContest,
  detail?: Partial<BackendContestDetail>,
  problems: BackendContestProblem[] = []
): Contest {
  return {
    id: String(contest.id),
    name: contest.name,
    description: contest.description || '暂无竞赛说明。',
    start_time: contest.start_time,
    end_time: contest.end_time,
    duration_minutes: Math.max(
      Math.round(
        (new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime()) /
          (1000 * 60)
      ),
      0
    ),
    status: normalizeContestStatus(contest.start_time, contest.end_time),
    participants_count: Number(detail?.participant_count ?? 0),
    problems_count: Number(detail?.problem_count ?? problems.length ?? 0),
    difficulty: normalizeDifficulty(problems),
    rules: contest.rules,
    created_at: contest.created_at,
  }
}

function matchesContestFilters(contest: Contest, filters: ContestFilters): boolean {
  if (filters.status && filters.status !== 'all' && contest.status !== filters.status) {
    return false
  }

  if (filters.difficulty && filters.difficulty !== 'all' && contest.difficulty !== filters.difficulty) {
    return false
  }

  if (filters.search) {
    const keyword = filters.search.trim().toLowerCase()
    if (
      keyword &&
      !contest.name.toLowerCase().includes(keyword) &&
      !contest.description.toLowerCase().includes(keyword)
    ) {
      return false
    }
  }

  return true
}

export const contestsService = {
  async getContests(filters: ContestFilters = {}): Promise<ContestsResponse> {
    const page = Math.max(filters.page ?? 1, 1)
    const limit = Math.max(filters.limit ?? 20, 1)

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    const response = await api.get<{ contests: BackendContest[]; total: number }>(`/contests?${params}`)
    const contests = Array.isArray(response.data?.contests) ? response.data.contests : []

    const detailResults = await Promise.allSettled(
      contests.map((contest) => api.get<BackendContestDetail>(`/contests/${contest.id}`))
    )
    const problemResults = await Promise.allSettled(
      contests.map((contest) => api.get<BackendContestProblem[]>(`/contests/${contest.id}/problems`))
    )

    const mapped = contests.map((contest, index) => {
      const detail =
        detailResults[index]?.status === 'fulfilled' ? detailResults[index].value.data : undefined
      const problems =
        problemResults[index]?.status === 'fulfilled' ? problemResults[index].value.data : []

      return buildContestSummary(contest, detail, problems)
    })

    const filtered = mapped.filter((contest) => matchesContestFilters(contest, filters))

    return {
      contests: filtered,
      total: filtered.length,
    }
  },

  async getContestDetail(contestId: string): Promise<ContestDetail> {
    const [detailResponse, problemsResponse] = await Promise.all([
      api.get<BackendContestDetail>(`/contests/${contestId}`),
      api.get<BackendContestProblem[]>(`/contests/${contestId}/problems`),
    ])

    let currentUserId: string | null = null
    let canViewParticipants = false
    try {
      const meResponse = await api.get<{ id?: string; role?: Role }>('/users/me')
      currentUserId = meResponse.data?.id ?? null
      canViewParticipants = meResponse.data?.role
        ? isTeacherOrAbove(meResponse.data.role)
        : false
    } catch {
      currentUserId = null
      canViewParticipants = false
    }

    const detail = detailResponse.data
    const problems = problemsResponse.data || []
    const participants = canViewParticipants
      ? (await api.get<BackendContestParticipant[]>(`/contests/${contestId}/participants`)).data || []
      : []
    const summary = buildContestSummary(detail, detail, problems)

    return {
      ...summary,
      problems: problems.map((problem) => ({
        id: String(problem.problem_id),
        title: problem.title,
        difficulty: normalizeDifficulty([{ difficulty: problem.difficulty }]),
        points: Number(problem.points ?? 0),
        accepted_count: 0,
        submission_count: 0,
      })),
      is_registered: currentUserId
        ? participants.some((participant) => participant.user_id === currentUserId)
        : false,
      prizes: undefined,
    }
  },

  async registerContest(contestId: string): Promise<ContestRegistration> {
    await api.post(`/contests/${contestId}/register`)
    return { success: true, message: 'Registration successful' }
  },

  async enterContest(contestId: string): Promise<ContestEntry> {
    const response = await api.get<{ status?: string }>(`/contests/${contestId}/status`)
    const rawStatus = String(response.data?.status || '').toLowerCase()
    const isActive = ['active', 'ongoing', 'running'].includes(rawStatus)

    if (!isActive) {
      throw new Error(`Contest is not active (status: ${rawStatus || 'unknown'})`)
    }

    return { success: true, message: 'Entered contest successfully' }
  },
}
