import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

// Mock the analysis service
vi.mock("@/services/analysisService", () => ({
  analysisService: {
    getAiFeedback: vi.fn(),
    triggerFeedback: vi.fn(),
  },
}));

// Mock the feature gate hook
const mockUseFeatureEnabled = vi.fn();
vi.mock("@/shared/hooks/useFeatureGate", () => ({
  useFeatureEnabled: (...args: unknown[]) => mockUseFeatureEnabled(...args),
}));

import { analysisService } from "@/services/analysisService";
import { AiCodeFeedback } from "../AiCodeFeedback";

/** A completed feedback job with a card. */
const completedFeedback = {
  job_id: 10,
  submission_id: 42,
  status: "completed" as const,
  llm_model: "gpt-4o-mini",
  created_at: "2025-06-01T00:00:00Z",
  updated_at: "2025-06-01T00:01:00Z",
  card: {
    id: 1,
    card_type: "code_review",
    title: "代码改进建议",
    content: "<p>考虑将重复代码提取为函数。</p>",
  },
  error_message: null,
};

/** A pending feedback job (just triggered). */
const pendingFeedback = {
  job_id: 10,
  submission_id: 42,
  status: "pending" as const,
  llm_model: null,
  created_at: "2025-06-01T00:00:00Z",
  updated_at: "2025-06-01T00:00:00Z",
  card: null,
  error_message: null,
};

describe("AiCodeFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Default: feature enabled, not loading, no existing job
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.getAiFeedback).mockRejectedValue({
      response: { status: 404 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when feature is disabled", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: false, isLoading: false });
    const { container } = renderWithProviders(
      <AiCodeFeedback submissionId={42} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("does not call API when feature is disabled", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: false, isLoading: false });
    renderWithProviders(<AiCodeFeedback submissionId={42} />);
    expect(analysisService.getAiFeedback).not.toHaveBeenCalled();
    expect(analysisService.triggerFeedback).not.toHaveBeenCalled();
  });

  it("shows skeleton when feature flag is still loading", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: true });
    renderWithProviders(<AiCodeFeedback submissionId={42} />);
    expect(
      document.querySelector('[data-slot="ai-feedback-skeleton"]'),
    ).toBeInTheDocument();
  });

  it("shows trigger button when no existing job (404)", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    renderWithProviders(<AiCodeFeedback submissionId={42} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /获取 AI 反馈/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows feedback card when existing completed job is loaded", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.getAiFeedback).mockResolvedValue(
      completedFeedback,
    );

    renderWithProviders(<AiCodeFeedback submissionId={42} />);

    await waitFor(() => {
      expect(screen.getByText("代码改进建议")).toBeInTheDocument();
      expect(screen.getByText(/考虑将重复代码提取为函数/)).toBeInTheDocument();
    });

    // Re-trigger button should also be present
    expect(
      screen.getByRole("button", { name: /重新获取 AI 反馈/i }),
    ).toBeInTheDocument();
  });

  it("triggers feedback on button click", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.triggerFeedback).mockResolvedValue(
      pendingFeedback,
    );
    // After trigger, subsequent getAiFeedback returns completed
    vi.mocked(analysisService.getAiFeedback)
      .mockRejectedValueOnce({ response: { status: 404 } }) // initial load
      .mockResolvedValue(completedFeedback); // poll result

    renderWithProviders(<AiCodeFeedback submissionId={42} />);

    const button = await screen.findByRole("button", { name: /获取 AI 反馈/i });
    await user.click(button);

    expect(analysisService.triggerFeedback).toHaveBeenCalledWith(42);
  });

  it("shows processing indicator when job is in progress", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    const processingFeedback = {
      ...pendingFeedback,
      status: "processing" as const,
    };
    vi.mocked(analysisService.getAiFeedback).mockResolvedValue(
      processingFeedback,
    );

    renderWithProviders(<AiCodeFeedback submissionId={42} />);

    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="ai-feedback-polling"]'),
      ).toBeInTheDocument();
    });
  });

  it("shows error message when job failed", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    const failedFeedback = {
      ...pendingFeedback,
      status: "failed" as const,
      error_message: "LLM 服务暂时不可用",
    };
    vi.mocked(analysisService.getAiFeedback).mockResolvedValue(failedFeedback);

    renderWithProviders(<AiCodeFeedback submissionId={42} />);

    await waitFor(() => {
      expect(screen.getByText("分析失败")).toBeInTheDocument();
      expect(
        screen.getByText("LLM 服务暂时不可用"),
      ).toBeInTheDocument();
    });

    // Re-trigger should still be available
    expect(
      screen.getByRole("button", { name: /重新获取 AI 反馈/i }),
    ).toBeInTheDocument();
  });

  it("shows InlineError when initial fetch fails with non-404", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.getAiFeedback).mockRejectedValue(
      new Error("network error"),
    );

    renderWithProviders(<AiCodeFeedback submissionId={42} />);

    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", { name: /AI 反馈加载失败/i }),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows completed but no-card edge case", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    const noCardFeedback = {
      ...completedFeedback,
      card: null,
    };
    vi.mocked(analysisService.getAiFeedback).mockResolvedValue(noCardFeedback);

    renderWithProviders(<AiCodeFeedback submissionId={42} />);

    await waitFor(() => {
      expect(
        screen.getByText("分析完成，但未生成反馈内容。"),
      ).toBeInTheDocument();
    });
  });
});
