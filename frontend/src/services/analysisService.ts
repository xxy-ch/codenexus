import api from "./api";

export interface AnalysisSubmissionFeatures {
  id: number;
  submission_id: number;
  organization_id: number;
  cyclomatic_complexity: number | null;
  lines_of_code: number | null;
  token_count: number | null;
  function_count: number | null;
  nesting_depth: number | null;
  has_recursion: boolean | null;
  loop_count: number | null;
  avg_loop_nesting: number | null;
  distinct_operators: number | null;
  distinct_operands: number | null;
  halstead_volume: number | null;
  embedding_vector?: number[] | null;
  created_at: string;
}

export interface AnalysisTeachingCard {
  id: number;
  problem_id: number;
  organization_id: number;
  card_type: string;
  title: string;
  content: Record<string, unknown> | string | null;
  source_cluster_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface AnalysisSolutionCluster {
  id: number;
  problem_id: number;
  organization_id: number;
  cluster_name: string | null;
  centroid_embedding?: number[] | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface AnalysisClassSnapshot {
  id: number;
  class_id: number;
  organization_id: number;
  snapshot_date: string;
  cognition_profile: Record<string, unknown>;
  student_count: number;
  avg_complexity: number | null;
  created_at: string;
}

/** Response shape for POST /analysis/submissions/:id/trigger-feedback */
export interface TriggerFeedbackResponse {
  job_id: number;
  status: "pending" | "processing" | "completed" | "failed";
  message: string;
}

/** A single recommended problem from GET /analysis/problems/:id/recommend */
export interface RecommendedProblem {
  problem_id: number;
  title: string;
  difficulty: string;
  reason: string;
}

/** Response shape for GET /analysis/problems/:id/recommend */
export interface ProblemRecommendationsResponse {
  problem_id: number;
  user_id: string;
  count: number;
  elapsed_ms: number;
  recommendations: RecommendedProblem[];
}

export const analysisService = {
  async getSubmissionFeatures(submissionId: number) {
    const { data } = await api.get<AnalysisSubmissionFeatures>(
      `/analysis/submissions/${submissionId}/features`,
    );
    return data;
  },

  async getTeachingCards(problemId: number) {
    const { data } = await api.get<{ cards?: AnalysisTeachingCard[] }>(
      `/analysis/problems/${problemId}/teaching-cards`,
    );
    return data?.cards ?? [];
  },

  async getSolutionClusters(problemId: number) {
    const { data } = await api.get<{ clusters?: AnalysisSolutionCluster[] }>(
      `/analysis/problems/${problemId}/clusters`,
    );
    return data?.clusters ?? [];
  },

  async getClassCognition(classId: number) {
    const { data } = await api.get<AnalysisClassSnapshot>(
      `/analysis/classes/${classId}/cognition`,
    );
    return data;
  },

  /**
   * Trigger on-demand LLM feedback analysis for a submission.
   * Idempotent — if a job is already pending/processing, returns its status.
   * Gated by `llm_code_assistant` feature flag on the backend.
   */
  async triggerFeedback(submissionId: number) {
    const { data } = await api.post<TriggerFeedbackResponse>(
      `/analysis/submissions/${submissionId}/trigger-feedback`,
    );
    return data;
  },

  /**
   * Get LLM-powered problem recommendations for the current user based on
   * submission history around the given problem's difficulty level.
   * Gated by `llm_problem_recommend` feature flag on the backend.
   */
  async getProblemRecommendations(problemId: number) {
    const { data } = await api.get<ProblemRecommendationsResponse>(
      `/analysis/problems/${problemId}/recommend`,
    );
    return data;
  },
};
