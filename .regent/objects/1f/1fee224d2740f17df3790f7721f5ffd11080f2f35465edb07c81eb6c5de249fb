import { useQuery } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { InlineError } from "@/components/ui/InlineError";
import { useFeatureEnabled } from "@/hooks/useFeatureGate";
import { analysisService } from "@/services/analysisService";

interface ProblemRecommendationsProps {
  problemId: number;
}

const difficultyVariant: Record<string, "default" | "secondary" | "outline"> = {
  easy: "secondary",
  medium: "default",
  hard: "outline",
};

/**
 * ProblemRecommendations — display LLM-powered problem recommendations
 * based on the current user's submission history around this problem's
 * difficulty level.
 *
 * Gated by `llm_problem_recommend` feature flag.
 * Pure display component — no trigger or polling.
 */
export function ProblemRecommendations({
  problemId,
}: ProblemRecommendationsProps) {
  const { enabled, isLoading: featureLoading } = useFeatureEnabled(
    "llm_problem_recommend",
  );
  const queryEnabled =
    enabled && !featureLoading && Number.isFinite(problemId);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["analysis", "problem-recommendations", problemId],
    queryFn: () => analysisService.getProblemRecommendations(problemId),
    enabled: queryEnabled,
    staleTime: 60_000,
    retry: 1,
  });

  if (!enabled) {
    return null;
  }

  if (featureLoading || isLoading) {
    return (
      <section
        data-slot="problem-recommendations-skeleton"
        className="rounded-xl border border-border bg-card p-6 shadow-whisper"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            题目推荐
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <InlineError
        title="题目推荐加载失败"
        onRetry={() => refetch()}
      />
    );
  }

  const recommendations = data?.recommendations ?? [];

  if (!recommendations.length) {
    return null;
  }

  return (
    <section
      data-slot="problem-recommendations"
      className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-whisper"
    >
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">题目推荐</h2>
          <p className="text-xs text-muted-foreground">
            根据你的做题记录智能推荐的练习题目。
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {recommendations.map((rec) => (
          <Link
            key={rec.problem_id}
            to={`/problems/${rec.problem_id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-accent"
          >
            <div className="flex flex-col gap-0.5">
              <div className="text-sm font-medium text-foreground">
                {rec.title || `题目 #${rec.problem_id}`}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {rec.reason}
              </p>
            </div>
            <Badge variant={difficultyVariant[rec.difficulty] ?? "outline"}>
              {rec.difficulty}
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
