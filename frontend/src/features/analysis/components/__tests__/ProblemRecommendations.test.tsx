import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

// Mock the analysis service
vi.mock("@/features/analysis/services/analysisService", () => ({
  analysisService: {
    getProblemRecommendations: vi.fn(),
  },
}));

// Mock the feature gate hook
const mockUseFeatureEnabled = vi.fn();
vi.mock("@/shared/hooks/useFeatureGate", () => ({
  useFeatureEnabled: (...args: unknown[]) => mockUseFeatureEnabled(...args),
}));

// Mock react-router-dom Link
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children: React.ReactNode;
      to: string;
      [key: string]: unknown;
    }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

import { analysisService } from "@/features/analysis/services/analysisService";
import { ProblemRecommendations } from "../ProblemRecommendations";

const mockResponse = {
  problem_id: 7,
  user_id: "u1",
  count: 3,
  elapsed_ms: 120,
  recommendations: [
    {
      problem_id: 10,
      title: "二叉树遍历",
      difficulty: "medium",
      reason: "巩固递归与树的遍历基础",
    },
    {
      problem_id: 15,
      title: "动态规划入门",
      difficulty: "hard",
      reason: "根据你的复杂度表现推荐进阶内容",
    },
    {
      problem_id: 20,
      title: "字符串匹配",
      difficulty: "easy",
      reason: "相似难度题目，适合巩固基础",
    },
  ],
};

describe("ProblemRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: false });
    vi.mocked(analysisService.getProblemRecommendations).mockResolvedValue(
      mockResponse,
    );
  });

  it("renders nothing when feature is disabled", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: false, isLoading: false });
    const { container } = renderWithProviders(
      <ProblemRecommendations problemId={7} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("does not call API when feature is disabled", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: false, isLoading: false });
    renderWithProviders(<ProblemRecommendations problemId={7} />);
    expect(analysisService.getProblemRecommendations).not.toHaveBeenCalled();
  });

  it("calls useFeatureEnabled with llm_problem_recommend gate", () => {
    renderWithProviders(<ProblemRecommendations problemId={7} />);
    expect(mockUseFeatureEnabled).toHaveBeenCalledWith(
      "llm_problem_recommend",
    );
  });

  it("shows skeleton while feature flag is loading", () => {
    mockUseFeatureEnabled.mockReturnValue({ enabled: true, isLoading: true });
    renderWithProviders(<ProblemRecommendations problemId={7} />);
    expect(
      document.querySelector(
        '[data-slot="problem-recommendations-skeleton"]',
      ),
    ).toBeInTheDocument();
  });

  it("renders recommendations with titles, reasons, and difficulty badges", async () => {
    renderWithProviders(<ProblemRecommendations problemId={7} />);

    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="problem-recommendations"]'),
      ).toBeInTheDocument();
    });

    // Titles
    expect(screen.getByText("二叉树遍历")).toBeInTheDocument();
    expect(screen.getByText("动态规划入门")).toBeInTheDocument();
    expect(screen.getByText("字符串匹配")).toBeInTheDocument();

    // Reasons
    expect(
      screen.getByText("巩固递归与树的遍历基础"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("根据你的复杂度表现推荐进阶内容"),
    ).toBeInTheDocument();

    // Difficulty badges
    expect(screen.getAllByText("medium").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("hard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("easy").length).toBeGreaterThanOrEqual(1);
  });

  it("renders links to recommended problems", async () => {
    renderWithProviders(<ProblemRecommendations problemId={7} />);

    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="problem-recommendations"]'),
      ).toBeInTheDocument();
    });

    const links = document.querySelectorAll<HTMLAnchorElement>(
      '[data-slot="problem-recommendations"] a[href^="/problems/"]',
    );
    expect(links.length).toBe(3);
    expect(links[0].getAttribute("href")).toBe("/problems/10");
    expect(links[1].getAttribute("href")).toBe("/problems/15");
    expect(links[2].getAttribute("href")).toBe("/problems/20");
  });

  it("renders nothing when API returns empty recommendations", async () => {
    vi.mocked(analysisService.getProblemRecommendations).mockResolvedValue({
      problem_id: 7,
      user_id: "u1",
      count: 0,
      elapsed_ms: 5,
      recommendations: [],
    });

    renderWithProviders(<ProblemRecommendations problemId={7} />);

    await waitFor(() => {
      expect(analysisService.getProblemRecommendations).toHaveBeenCalledWith(
        7,
      );
    });

    expect(
      document.querySelector('[data-slot="problem-recommendations"]'),
    ).not.toBeInTheDocument();
  });

  it("shows inline error on API error", async () => {
    vi.mocked(analysisService.getProblemRecommendations).mockRejectedValue(
      new Error("server error"),
    );

    renderWithProviders(<ProblemRecommendations problemId={7} />);

    // react-query retries once (retry: 1), so the error UI appears after
    // the initial call + one retry — wait longer for the final failure.
    await waitFor(
      () => {
        expect(screen.getByText("题目推荐加载失败")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("calls API with correct problem id", async () => {
    renderWithProviders(<ProblemRecommendations problemId={99} />);

    await waitFor(() => {
      expect(analysisService.getProblemRecommendations).toHaveBeenCalledWith(
        99,
      );
    });
  });

  it("renders fallback title when recommendation has no title", async () => {
    vi.mocked(analysisService.getProblemRecommendations).mockResolvedValue({
      problem_id: 7,
      user_id: "u1",
      count: 1,
      elapsed_ms: 10,
      recommendations: [
        {
          problem_id: 30,
          title: "",
          difficulty: "easy",
          reason: "test reason",
        },
      ],
    });

    renderWithProviders(<ProblemRecommendations problemId={7} />);

    await waitFor(() => {
      expect(screen.getByText("题目 #30")).toBeInTheDocument();
    });
  });
});
