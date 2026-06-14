import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Sparkles } from "lucide-react";

import { Badge } from "@/shared/components/badge";
import { InlineError } from "@/shared/components/InlineError";
import { useFeatureEnabled } from "@/shared/hooks/useFeatureGate";
import { cn } from "@/shared/lib/utils";
import {
  analysisService,
  type AnalysisTeachingCard,
} from "@/features/analysis/services/analysisService";

interface TeachingCardBlockProps {
  problemId: number;
}

function resolveCardHtml(card: AnalysisTeachingCard) {
  const content = card.content;

  if (typeof content === "string") {
    return content;
  }

  if (content && typeof content === "object") {
    const typedContent = content as Record<string, unknown>;
    const candidate =
      typedContent.html ?? typedContent.summary ?? typedContent.content;

    if (typeof candidate === "string") {
      return candidate;
    }

    return JSON.stringify(content, null, 2);
  }

  return "";
}

export function TeachingCardBlock({ problemId }: TeachingCardBlockProps) {
  const { enabled, isLoading: featureLoading } = useFeatureEnabled(
    "ai_analysis_enabled",
  );
  const queryEnabled = enabled && !featureLoading && Number.isFinite(problemId);

  const {
    data: cards = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["analysis", "teaching-cards", problemId],
    queryFn: () => analysisService.getTeachingCards(problemId),
    enabled: queryEnabled,
    staleTime: 60_000,
    retry: 1,
  });

  if (!enabled) {
    return null;
  }

  if (featureLoading || isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-whisper">
        <div className="text-sm font-semibold text-foreground">AI 教学卡片</div>
        <p className="mt-2 text-sm text-muted-foreground">正在加载分析结果…</p>
      </div>
    );
  }

  if (error) {
    return (
      <InlineError title="AI 教学卡片加载失败" onRetry={() => refetch()} />
    );
  }

  if (!cards.length) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-whisper">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">AI 教学卡片</h2>
          <p className="text-xs text-muted-foreground">
            按题目聚合的教学提示与解题洞察。
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          cards.length > 1 ? "lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        {cards.map((card) => {
          const html = DOMPurify.sanitize(resolveCardHtml(card));

          return (
            <article
              key={card.id}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.card_type}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {card.card_type}
                </Badge>
              </div>

              <div
                className="prose prose-sm mt-4 max-w-none text-sm text-secondary prose-headings:text-foreground prose-p:text-secondary prose-li:text-secondary dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
