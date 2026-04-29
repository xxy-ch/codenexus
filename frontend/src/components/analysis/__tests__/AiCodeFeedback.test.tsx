import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

// Mock the analysis service
vi.mock("@/services/analysisService", () => ({
  analysisService: {
    getSubmissionFeatures: vi.fn(),
  },
}));

// Mock the feature gate hook so we can control enabled state
const mockUseFeatureEnabled = vi.fn();
vi.mock("@/hooks/useFeatureGate", () => ({
  useFeatureEnabled: (...args: unknown[]) => mockUseFeatureEnabled(...args),
}));

import { analysisService } from "@/services/analysisService";
import { AiCodeFeedback } from "../AiCodeFeedback";

const mockFeatures = {
  id: 1,
  submission_id: 42,
  organization_id: 1,
  cyclomatic_complexity: 5,
  lines_of_code: 30,
  token_count: 200,
  function_count: 3,
  nesting_depth: 2,
  has_recursion: false,
  loop_count: 2,
  avg_loop_nesting: 1,
  distinct_operators: 12,
  distinct_operands: 8,
  halstead_volume: 450,
  embedding_vector: null,
  created_at: "2025-01-01T00:00:00Z",
};

describe("AiCodeFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: feature enabled, not loading
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
  });

  it("renders nothing when feature is disabled", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: false, isLoading: false });
    const { container } = renderWithProviders(
      <AiCodeFeedback submissionId={42} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows skeleton when feature is enabled and loading", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.getSubmissionFeatures).mockImplementation(
      () => new Promise(() => {})
    );
    renderWithProviders(<AiCodeFeedback submissionId={42} />);
    expect(
      screen.getByText("AI 代码分析", { selector: "div" })
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="ai-feedback-skeleton"]')
    ).toBeInTheDocument();
  });

  it("shows skeleton when feature flag is still loading", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: true });
    renderWithProviders(<AiCodeFeedback submissionId={42} />);
    expect(
      document.querySelector('[data-slot="ai-feedback-skeleton"]')
    ).toBeInTheDocument();
  });

  it("shows feedback content when feature is enabled and data is loaded", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.getSubmissionFeatures).mockResolvedValue(
      mockFeatures
    );
    renderWithProviders(<AiCodeFeedback submissionId={42} />);

    await waitFor(() => {
      expect(screen.getByText("AI 代码分析")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument(); // cyclomatic_complexity
      expect(screen.getByText("30")).toBeInTheDocument(); // lines_of_code
      expect(screen.getByText("200")).toBeInTheDocument(); // token_count
    });
  });

  it("shows InlineError when feature is enabled and query fails", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.getSubmissionFeatures).mockRejectedValue(
      new Error("network error")
    );
    renderWithProviders(<AiCodeFeedback submissionId={42} />);

    // React Query with retry:1 will retry once before settling into error state
    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", { name: /AI 代码分析加载失败/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /重试/i })
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("renders nothing when feature is enabled but data is empty (null)", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    // Return a minimal features object with all null fields — formatMetric returns null for null values,
    // so no metric cards render, but the section header still shows.
    // To test the "component returns null" path, we need features to be null/falsy.
    // React Query treats undefined as error, so use null via a wrapped response.
    vi.mocked(analysisService.getSubmissionFeatures).mockResolvedValue(
      null as unknown as never
    );
    const { container } = renderWithProviders(
      <AiCodeFeedback submissionId={42} />
    );

    await waitFor(() => {
      // features is null → component returns null
      expect(container.innerHTML).toBe("");
    });
  });

  it("calls getSubmissionFeatures with the correct submissionId", async () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.getSubmissionFeatures).mockResolvedValue(
      mockFeatures
    );
    renderWithProviders(<AiCodeFeedback submissionId={99} />);

    await waitFor(() => {
      expect(analysisService.getSubmissionFeatures).toHaveBeenCalledWith(99);
    });
  });

  it("does not call getSubmissionFeatures when feature is disabled", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: false, isLoading: false });
    renderWithProviders(<AiCodeFeedback submissionId={42} />);
    expect(analysisService.getSubmissionFeatures).not.toHaveBeenCalled();
  });
});
