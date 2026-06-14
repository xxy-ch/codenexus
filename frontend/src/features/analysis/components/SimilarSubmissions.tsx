import { useQuery } from "@tanstack/react-query";
import { GitCompare } from "lucide-react";

import { Badge } from "@/shared/components/badge";
import { useFeatureEnabled } from "@/shared/hooks/useFeatureGate";
import { analysisService } from "@/features/analysis/services/analysisService";

interface SimilarSubmissionsProps {
  submissionId: number;
}

function formatScore(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * SimilarSubmissions — display submissions similar to the current one.
 *
 * Fetches GET /analysis/submissions/:id/similar and renders a list of
 * ranked submissions with their similarity scores.
 * Gated by `ai_analysis_enabled` feature flag.
 */
export function SimilarSubmissions({ submissionId }: SimilarSubmissionsProps) {
  const { enabled, isLoading: featureLoading } = useFeatureEnabled(
    "ai_analysis_enabled",
  );
  const queryEnabled =
    enabled && !featureLoading && Number.isFinite(submissionId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["analysis", "similar-submissions", submissionId],
    queryFn: () => analysisService.getSimilarSubmissions(submissionId),
    enabled: queryEnabled,
    staleTime: 60_000,
    retry: 1,
  });

  const results = data?.similar_submissions ?? [];

  if (!enabled) {
    return null;
  }

  if (featureLoading || isLoading) {
    return (
      <section
        data-slot="similar-submissions-skeleton"
        className="rounded-xl border border-border bg-card p-6 shadow-whisper"
      >
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            相似提交
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </section>
    );
  }

  if (error || !results.length) {
    return null;
  }

  return (
    <section
      data-slot="similar-submissions"
      className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-whisper"
    >
      <div className="flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">相似提交</h2>
          <p className="text-xs text-muted-foreground">
            基于代码结构和语义相似度排名的相近提交。
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {results.map((item) => (
          <div
            key={item.submission_id}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
          >
            <div className="flex flex-col gap-0.5">
              <div className="text-sm font-medium text-foreground">
                提交 #{item.submission_id}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>题目 {item.problem_id}</span>
                {item.lines_of_code != null && (
                  <span>{item.lines_of_code} 行</span>
                )}
                {item.cyclomatic_complexity != null && (
                  <span>复杂度 {item.cyclomatic_complexity.toFixed(1)}</span>
                )}
              </div>
            </div>
            <Badge
              variant={
                item.similarity_score >= 0.8
                  ? "default"
                  : item.similarity_score >= 0.5
                    ? "secondary"
                    : "outline"
              }
            >
              {formatScore(item.similarity_score)}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}
