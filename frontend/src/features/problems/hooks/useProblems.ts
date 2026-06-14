import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { problemsService, type ProblemFilters } from '@/features/problems/services/problems'

export function useProblems(filters: ProblemFilters = {}) {
  return useQuery({
    queryKey: ['problems', filters],
    queryFn: () => problemsService.getProblems(filters),
    staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜
  })
}

export function useProblem(problemId: string) {
  return useQuery({
    queryKey: ['problem', problemId],
    queryFn: () => problemsService.getProblem(problemId),
    enabled: !!problemId,
    staleTime: 10 * 60 * 1000, // 10分钟内数据视为新鲜
  })
}

export function useTestCases(problemId: string) {
  return useQuery({
    queryKey: ['testcases', problemId],
    queryFn: () => problemsService.getTestCases(problemId),
    enabled: !!problemId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useSubmitCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { problemId: string; code: string; language: string }) =>
      problemsService.submitCode(data),
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['problem-submissions'] })
    },
  })
}

export function useProblemSubmissions(problemId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['problem-submissions', problemId, page, limit],
    queryFn: () => problemsService.getProblemSubmissions(problemId, page, limit),
    enabled: !!problemId,
    staleTime: 2 * 60 * 1000, // 2分钟内数据视为新鲜
  })
}

export function useSupportedLanguages() {
  return useQuery({
    queryKey: ['languages'],
    queryFn: problemsService.getSupportedLanguages,
    staleTime: 60 * 60 * 1000, // 1小时内数据视为新鲜
  })
}