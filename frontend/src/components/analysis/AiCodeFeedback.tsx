import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";

import { InlineError } from "@/components/ui/InlineError";
import { useFeatureEnabled } from "@/hooks/useFeatureGate";
import {
  analysisService,
  type AnalysisSubmissionFeatures,
} from "@/services/analysisService";

interface AiCodeFeedbackProps {
  submissionId: number;
}

function formatMetric(
  label: string,
  value: number | null | undefined
): React.ReactNode {
  if (value == null) return null;
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

export function AiCodeFeedback({ submissionId }: AiCodeFeedbackProps) {
  const { enabled, isLoading: featureLoading } = useFeatureEnabled(
    "ai_analysis_enabled"
  );
  const queryEnabled =
    enabled && !featureLoading && Number.isFinite(submissionId);

  const {
    data: features,
    isLoading,
    error,
    refetch,
  } = useQuery<AnalysisSubmissionFeatures>({
    queryKey: ["analysis", "submission-features", submissionId],
    queryFn: () => analysisService.getSubmissionFeatures(submissionId),
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
        data-slot="ai-feedback-skeleton"
        className="rounded-xl border border-border bg-card p-6 shadow-whisper"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            AI 代码分析
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <InlineError
        title="AI 代码分析加载失败"
        onRetry={() => refetch()}
      />
    );
  }

  if (!features) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-whisper">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            AI 代码分析
          </h2>
          <p className="text-xs text-muted-foreground">
            基于静态分析的结构化反馈
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {formatMetric("圈复杂度", features.cyclomatic_complexity)}
        {formatMetric("代码行数", features.lines_of_code)}
        {formatMetric("Token 数", features.token_count)}
        {formatMetric("函数数", features.function_count)}
        {formatMetric("嵌套深度", features.nesting_depth)}
        {formatMetric("循环数", features.loop_count)}
      </div>
    </section>
  );
}
