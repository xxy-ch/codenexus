import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { AlertCircle, Brain, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import { useFeatureEnabled } from "@/hooks/useFeatureGate";
import { cn } from "@/lib/utils";
import {
  analysisService,
  type AiFeedbackResponse,
} from "@/services/analysisService";

interface AiCodeFeedbackProps {
  submissionId: number;
}

/** Resolve HTML string from the card content field. */
function resolveCardContent(
  content: Record<string, unknown> | string | null,
): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  const candidate =
    (content as Record<string, unknown>).html ??
    (content as Record<string, unknown>).summary ??
    (content as Record<string, unknown>).content;
  if (typeof candidate === "string") return candidate;
  return JSON.stringify(content, null, 2);
}

const POLL_INTERVAL = 3_000;
const POLL_MAX_ATTEMPTS = 60; // 3 minutes at 3s intervals

/**
 * AiCodeFeedback — on-demand AI feedback for a code submission.
 *
 * UX flow:
 * 1. User clicks "获取 AI 反馈" button → POST trigger-feedback
 * 2. Component polls GET ai-feedback until status becomes completed/failed
 * 3. Displays structured feedback card with sanitized HTML content
 *
 * If a job already exists (e.g. page reload), the current status is shown.
 * Gated by `llm_code_assistant` feature flag.
 */
export function AiCodeFeedback({ submissionId }: AiCodeFeedbackProps) {
  const { enabled, isLoading: featureLoading } = useFeatureEnabled(
    "llm_code_assistant",
  );
  const queryEnabled =
    enabled && !featureLoading && Number.isFinite(submissionId);

  // --- Trigger state ---
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const abortRef = useRef(false);

  // --- Polling state ---
  const [polling, setPolling] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();

  // --- Fetch existing feedback (may be 404 if never triggered) ---
  const {
    data: feedback,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery<AiFeedbackResponse | null>({
    queryKey: ["analysis", "ai-feedback", submissionId],
    queryFn: async () => {
      try {
        return await analysisService.getAiFeedback(submissionId);
      } catch (err: unknown) {
        // 404 means no job yet — not an error
        if (
          err != null &&
          typeof err === "object" &&
          "response" in err &&
          (err as { response?: { status?: number } }).response?.status === 404
        ) {
          return null;
        }
        throw err;
      }
    },
    enabled: queryEnabled,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const jobStatus = feedback?.status;
  const isTerminal = jobStatus === "completed" || jobStatus === "failed";

  // --- Trigger handler ---
  const handleTrigger = useCallback(async () => {
    if (triggering) return;
    abortRef.current = false;
    setTriggering(true);
    setTriggerError(null);

    try {
      const result = await analysisService.triggerFeedback(submissionId);

      // Seed the cache with the triggered job
      queryClient.setQueryData(
        ["analysis", "ai-feedback", submissionId],
        result as AiFeedbackResponse,
      );

      // Start polling if not already terminal
      if (result.status !== "completed" && result.status !== "failed") {
        setPolling(true);
        setPollAttempts(0);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "触发 AI 反馈失败，请重试";
      setTriggerError(message);
    } finally {
      setTriggering(false);
    }
  }, [submissionId, triggering, queryClient]);

  // --- Polling effect ---
  useEffect(() => {
    if (!polling) return;

    if (pollAttempts >= POLL_MAX_ATTEMPTS || abortRef.current) {
      setPolling(false);
      return;
    }

    pollTimerRef.current = setTimeout(async () => {
      try {
        const result = await analysisService.getAiFeedback(submissionId);
        queryClient.setQueryData(
          ["analysis", "ai-feedback", submissionId],
          result,
        );

        if (result.status === "completed" || result.status === "failed") {
          setPolling(false);
          return;
        }
      } catch {
        // 404 during poll means job disappeared — stop polling
        setPolling(false);
        return;
      }
      setPollAttempts((n) => n + 1);
    }, POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [polling, pollAttempts, submissionId, queryClient]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // --- Render guards ---

  if (!enabled) {
    return null;
  }

  // Feature gate loading
  if (featureLoading) {
    return (
      <section
        data-slot="ai-feedback-skeleton"
        className="rounded-xl border border-border bg-card p-6 shadow-whisper"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            AI 代码反馈
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </section>
    );
  }

  // Initial load of existing feedback
  if (isLoading) {
    return (
      <section
        data-slot="ai-feedback-skeleton"
        className="rounded-xl border border-border bg-card p-6 shadow-whisper"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            AI 代码反馈
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

  // Fetch error (not 404 — those resolve to null data)
  if (fetchError) {
    return (
      <section
        data-slot="ai-feedback"
        className="rounded-xl border border-border bg-card p-6 shadow-whisper"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            AI 代码反馈
          </div>
        </div>
        <InlineError
          title="AI 反馈加载失败"
          onRetry={() => refetch()}
        />
      </section>
    );
  }

  // --- Main content ---

  const showTriggerButton =
    !feedback || isTerminal;
  const isWorking = triggering || polling || jobStatus === "processing";

  return (
    <section
      data-slot="ai-feedback"
      className="rounded-xl border border-border bg-card p-6 shadow-whisper"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            AI 代码反馈
          </h2>
          <p className="text-xs text-muted-foreground">
            按需获取 LLM 驱动的代码分析与改进建议
          </p>
        </div>
      </div>

      {/* Trigger / re-trigger button */}
      {showTriggerButton && (
        <div className="mt-4">
          {triggerError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {triggerError}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTrigger}
            disabled={triggering}
            className="gap-2"
          >
            {triggering ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                正在触发分析…
              </>
            ) : feedback ? (
              "重新获取 AI 反馈"
            ) : (
              "获取 AI 反馈"
            )}
          </Button>
        </div>
      )}

      {/* Processing indicator */}
      {isWorking && !triggering && (
        <div
          data-slot="ai-feedback-polling"
          className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {jobStatus === "processing"
              ? "AI 正在分析你的代码…"
              : "等待分析开始…"}
          </span>
        </div>
      )}

      {/* Failed state */}
      {feedback && feedback.status === "failed" && feedback.error_message && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            分析失败
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {feedback.error_message}
          </p>
        </div>
      )}

      {/* Completed — show feedback card */}
      {feedback && feedback.status === "completed" && feedback.card && (
        <div className="mt-4">
          <FeedbackCard card={feedback.card} />
        </div>
      )}

      {/* Completed but no card (edge case) */}
      {feedback && feedback.status === "completed" && !feedback.card && (
        <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
          分析完成，但未生成反馈内容。
        </div>
      )}
    </section>
  );
}

/** Inner card that renders the structured AI feedback. */
function FeedbackCard({
  card,
}: {
  card: NonNullable<AiFeedbackResponse["card"]>;
}) {
  const html = DOMPurify.sanitize(resolveCardContent(card.content));

  return (
    <article
      data-slot="ai-feedback-card"
      className={cn(
        "rounded-lg border border-border bg-background p-4",
        "prose prose-sm max-w-none text-sm text-secondary",
        "prose-headings:text-foreground prose-p:text-secondary prose-li:text-secondary",
        "dark:prose-invert",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {card.title || "AI 反馈"}
        </h3>
        {card.card_type && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {card.card_type}
          </span>
        )}
      </div>
      {html && (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </article>
  );
}
