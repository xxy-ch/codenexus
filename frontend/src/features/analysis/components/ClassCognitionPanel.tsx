import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { GraduationCap } from "lucide-react";

import { EmptyState } from "@/shared/components/EmptyState";
import { InlineError } from "@/shared/components/InlineError";
import { useFeatureEnabled } from "@/shared/hooks/useFeatureGate";
import { analysisService } from "@/features/analysis/services/analysisService";

interface ClassCognitionPanelProps {
  classId: number;
}

function isNotFoundError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function ClassCognitionPanel({ classId }: ClassCognitionPanelProps) {
  const { enabled, isLoading: featureLoading } = useFeatureEnabled(
    "class_cognition_snapshot",
  );
  const queryEnabled = enabled && !featureLoading && Number.isFinite(classId);

  const {
    data: snapshot,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["analysis", "class-cognition", classId],
    queryFn: () => analysisService.getClassCognition(classId),
    enabled: queryEnabled,
    staleTime: 60_000,
    retry: 1,
  });

  if (!enabled) {
    return null;
  }

  if (featureLoading || isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 shadow-whisper">
        <div className="text-sm font-semibold text-foreground">
          班级认知面板
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          正在加载班级分析数据…
        </p>
      </section>
    );
  }

  if (error) {
    if (isNotFoundError(error)) {
      return (
        <EmptyState
          icon={GraduationCap}
          title="No AI analysis data available yet"
          description="该班级尚未生成认知快照。"
        />
      );
    }

    return (
      <InlineError title="班级认知面板加载失败" onRetry={() => refetch()} />
    );
  }

  if (!snapshot) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No AI analysis data available yet"
        description="该班级尚未生成认知快照。"
      />
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-whisper">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            班级认知面板
          </h2>
          <p className="text-xs text-muted-foreground">
            最近一次 AI 分析生成的班级认知快照。
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            学生数
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {snapshot.student_count}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            平均复杂度
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {snapshot.avg_complexity != null
              ? snapshot.avg_complexity.toFixed(2)
              : "--"}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            快照日期
          </div>
          <div className="mt-2 text-base font-semibold text-foreground">
            {snapshot.snapshot_date}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-background p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          认知画像
        </h3>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-sm text-secondary">
          {JSON.stringify(snapshot.cognition_profile, null, 2)}
        </pre>
      </div>
    </section>
  );
}
