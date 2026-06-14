import { useParams, Link, useNavigate } from "react-router-dom";
import { useProblem } from "@/features/problems/hooks/useProblems";
import { Button } from "@/shared/components/Button";
import { cn } from "@/shared/lib/utils";
import { ProblemDetailSkeleton } from "@/features/problems/components/ProblemDetailSkeleton";
import { InlineError } from "@/shared/components/InlineError";
import { Clock, Cpu, Star, Play, Lightbulb, ArrowLeft } from "lucide-react";
import { TeachingCardBlock } from "@/components/analysis/TeachingCardBlock";
import { ClusterOverview } from "@/components/analysis/ClusterOverview";
import { ProblemRecommendations } from "@/components/analysis/ProblemRecommendations";

const difficultyConfig = {
  easy: {
    label: "简单",
    bgColor: "bg-difficulty-easy/10",
    textColor: "text-difficulty-easy",
    borderColor: "border-difficulty-easy/20",
  },
  medium: {
    label: "中等",
    bgColor: "bg-difficulty-medium/10",
    textColor: "text-difficulty-medium",
    borderColor: "border-difficulty-medium/20",
  },
  hard: {
    label: "困难",
    bgColor: "bg-difficulty-hard/10",
    textColor: "text-difficulty-hard",
    borderColor: "border-difficulty-hard/20",
  },
};

export function ProblemDetail() {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { data: problem, isLoading, error } = useProblem(problemId ?? "");

  const handleSolve = () => {
    navigate(`/problems/${problemId}/solve`);
  };

  if (isLoading) {
    return <ProblemDetailSkeleton />;
  }

  if (error || !problem) {
    return (
      <InlineError
        title="题目加载失败"
        message="无法加载题目详情，请稍后重试"
        onRetry={() => window.location.reload()}
      />
    );
  }

  const config = difficultyConfig[problem.difficulty];
  const numericProblemId = Number(problem.id);

  return (
    <div className="space-y-6">
      {/* Header — Vercel clean */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {problem.title}
            </h1>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-[13px] font-semibold border",
                config.bgColor,
                config.textColor,
                config.borderColor,
              )}
            >
              {config.label}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{problem.time_limit}ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              <span>{problem.memory_limit}MB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4" />
              <span>{problem.points} 分</span>
            </div>
          </div>
        </div>

        <Button variant="default" size="lg" onClick={handleSolve}>
          <Play className="w-5 h-5 mr-2" />
          开始解题
        </Button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {problem.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium bg-muted text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Problem Description */}
      <div className="bg-background/60 backdrop-blur-xl rounded-lg shadow-sm border border-border/40 overflow-hidden">
        <div className="border-b border-border/40 px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">题目描述</h2>
        </div>
        <div className="px-6 py-5">
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
            <p>{problem.description}</p>
          </div>
        </div>
      </div>

      {Number.isFinite(numericProblemId) && (
        <div className="space-y-6">
          <TeachingCardBlock problemId={numericProblemId} />
          <ClusterOverview problemId={numericProblemId} />
          <ProblemRecommendations problemId={numericProblemId} />
        </div>
      )}

      {/* Examples */}
      <div className="bg-background/60 backdrop-blur-xl rounded-lg shadow-sm border border-border/40 overflow-hidden">
        <div className="border-b border-border/40 px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">示例</h2>
        </div>
        <div className="px-6 py-5 space-y-6">
          {/* Example 1 */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">示例 1:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  输入:
                </p>
                <code className="text-sm text-foreground">
                  nums = [2,7,11,15], target = 9
                </code>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  输出:
                </p>
                <code className="text-sm text-foreground">[0,1]</code>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              解释: 因为 nums[0] + nums[1] == 9，所以返回 [0, 1]。
            </p>
          </div>

          {/* Example 2 */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">示例 2:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  输入:
                </p>
                <code className="text-sm text-foreground">
                  nums = [3,2,4], target = 6
                </code>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  输出:
                </p>
                <code className="text-sm text-foreground">[1,2]</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Constraints */}
      <div className="bg-background/60 backdrop-blur-xl rounded-lg shadow-sm border border-border/40 overflow-hidden">
        <div className="border-b border-border/40 px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">约束条件</h2>
        </div>
        <div className="px-6 py-5">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>2 ≤ nums.length ≤ 10⁴</li>
            <li>-10⁹ ≤ nums[i] ≤ 10⁹</li>
            <li>-10⁹ ≤ target ≤ 10⁹</li>
            <li>只会存在一个有效答案。</li>
          </ul>
        </div>
      </div>

      {/* Hints */}
      <div className="bg-muted rounded-lg border border-border/40 overflow-hidden">
        <div className="px-6 py-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                提示
              </h3>
              <p className="text-sm text-muted-foreground">
                考虑使用哈希表存储你已见过的值。对于每个数字，检查补数（target -
                number）是否存在于哈希表中。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Link to="/problems">
          <Button variant="outline">
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回题目列表
          </Button>
        </Link>
      </div>
    </div>
  );
}
