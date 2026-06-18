import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

// Mock the analysis service
vi.mock("@/features/analysis/services/analysisService", () => ({
  analysisService: {
    getSimilarSubmissions: vi.fn(),
  },
}));

// Mock the feature gate hook
const mockUseFeatureEnabled = vi.fn();
vi.mock("@/shared/hooks/useFeatureGate", () => ({
  useFeatureEnabled: (...args: unknown[]) => mockUseFeatureEnabled(...args),
}));

import { analysisService } from "@/features/analysis/services/analysisService";
import { SimilarSubmissions } from "../SimilarSubmissions";

const mockResponse = {
  query_submission_id: 42,
  count: 3,
  elapsed_ms: 15,
  similar_submissions: [
    {
      submission_id: 100,
      problem_id: 7,
      similarity_score: 0.92,
      embedding_similarity: 0.95,
      structural_similarity: 0.88,
      cyclomatic_complexity: 3.0,
      lines_of_code: 45,
    },
    {
      submission_id: 101,
      problem_id: 7,
      similarity_score: 0.71,
      embedding_similarity: 0.74,
      structural_similarity: 0.66,
      cyclomatic_complexity: 5.0,
      lines_of_code: 62,
    },
    {
      submission_id: 102,
      problem_id: 8,
      similarity_score: 0.45,
      embedding_similarity: 0.5,
      structural_similarity: 0.38,
      cyclomatic_complexity: 2.0,
      lines_of_code: 30,
    },
  ],
};

describe("SimilarSubmissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.getSimilarSubmissions).mockResolvedValue(
      mockResponse,
    );
  });

  it("renders nothing when feature is disabled", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: false, isLoading: false });
    renderWithProviders(<SimilarSubmissions submissionId={42} />);
    expect(container.innerHTML).toBe("");
  });

  it("does not call API when feature is disabled", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: false, isLoading: false });
    renderWithProviders(<SimilarSubmissions submissionId={42} />);
    expect(analysisService.getSimilarSubmissions).not.toHaveBeenCalled();
  });

  it("shows skeleton while feature flag is loading", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: true });
    renderWithProviders(<SimilarSubmissions submissionId={42} />);
    expect(
      document.querySelector('[data-slot="similar-submissions-skeleton"]'),
    ).toBeInTheDocument();
  });

  it("renders similar submissions with similarity scores", async () => {
    renderWithProviders(<SimilarSubmissions submissionId={42} />);

    // Wait for loaded content (data-slot changes from skeleton to real)
    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="similar-submissions"]'),
      ).toBeInTheDocument();
    });

    // All three submissions should be listed
    expect(screen.getByText("提交 #100")).toBeInTheDocument();
    expect(screen.getByText("提交 #101")).toBeInTheDocument();
    expect(screen.getByText("提交 #102")).toBeInTheDocument();

    // Similarity scores formatted as percentages
    expect(screen.getByText("92.0%")).toBeInTheDocument();
    expect(screen.getByText("71.0%")).toBeInTheDocument();
    expect(screen.getByText("45.0%")).toBeInTheDocument();

    // Metadata displayed
    expect(screen.getAllByText("题目 7").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("45 行")).toBeInTheDocument();
  });

  it("renders nothing when API returns empty results", async () => {
    vi.mocked(analysisService.getSimilarSubmissions).mockResolvedValue({
      query_submission_id: 42,
      count: 0,
      elapsed_ms: 5,
      similar_submissions: [],
    });

    renderWithProviders(<SimilarSubmissions submissionId={42} />);

    await waitFor(() => {
      expect(analysisService.getSimilarSubmissions).toHaveBeenCalledWith(42);
    });
    // Empty results → component returns null (no data-slot="similar-submissions")
    expect(
      document.querySelector('[data-slot="similar-submissions"]'),
    ).not.toBeInTheDocument();
  });

  it("renders nothing on API error", async () => {
    vi.mocked(analysisService.getSimilarSubmissions).mockRejectedValue(
      new Error("network error"),
    );

    renderWithProviders(<SimilarSubmissions submissionId={42} />);

    await waitFor(() => {
      expect(analysisService.getSimilarSubmissions).toHaveBeenCalledWith(42);
    });
    // Error → component returns null (no data-slot="similar-submissions")
    expect(
      document.querySelector('[data-slot="similar-submissions"]'),
    ).not.toBeInTheDocument();
  });

  it("calls API with correct submission id", async () => {
    renderWithProviders(<SimilarSubmissions submissionId={99} />);

    await waitFor(() => {
      expect(analysisService.getSimilarSubmissions).toHaveBeenCalledWith(99);
    });
  });
});
