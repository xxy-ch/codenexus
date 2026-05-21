import { useQuery } from "@tanstack/react-query";
import { Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useFeatureEnabled } from "@/hooks/useFeatureGate";
import { analysisService } from "@/services/analysisService";

interface ClusterOverviewProps {
  problemId: number;
}

export function ClusterOverview({ problemId }: ClusterOverviewProps) {
  const { enabled, isLoading: featureLoading } = useFeatureEnabled(
    "multi_solution_detection",
  );
  const queryEnabled = enabled && !featureLoading && Number.isFinite(problemId);

  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ["analysis", "clusters", problemId],
    queryFn: () => analysisService.getSolutionClusters(problemId),
    enabled: queryEnabled,
    staleTime: 60_000,
  });

  if (!enabled || featureLoading || isLoading || !clusters.length) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-whisper">
      <div className="flex items-center gap-2">
        <Layers3 className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">多解聚类</h2>
          <p className="text-xs text-muted-foreground">
            按相似性分组后的解法摘要。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
          >
            <div>
              <div className="text-sm font-medium text-foreground">
                {cluster.cluster_name || `Cluster #${cluster.id}`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                题目 {cluster.problem_id}
              </div>
            </div>
            <Badge variant="secondary">{cluster.member_count} 份提交</Badge>
          </div>
        ))}
      </div>
    </section>
  );
}
