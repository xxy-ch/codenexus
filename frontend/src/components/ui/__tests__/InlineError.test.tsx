import { describe, it, expect, vi } from "vitest"
import { screen } from "@/test/test-utils"
import { renderWithProviders } from "@/test/test-utils"
import userEvent from "@testing-library/user-event"
import { InlineError } from "../InlineError"

describe("InlineError", () => {
  it("renders with default title and message", () => {
    renderWithProviders(<InlineError />)
    expect(screen.getByText("加载失败")).toBeInTheDocument()
    expect(screen.getByText("请稍后重试")).toBeInTheDocument()
  })

  it("renders custom title and message", () => {
    renderWithProviders(
      <InlineError title="排行榜加载失败" message="无法加载排行榜，请稍后重试" />
    )
    expect(screen.getByText("排行榜加载失败")).toBeInTheDocument()
    expect(screen.getByText("无法加载排行榜，请稍后重试")).toBeInTheDocument()
  })

  it("renders AlertCircle icon at 48px size", () => {
    const { container } = renderWithProviders(<InlineError />)
    const svgEl = container.querySelector("svg")
    expect(svgEl).toBeInTheDocument()
  })

  it("renders retry button when onRetry prop provided", () => {
    renderWithProviders(<InlineError onRetry={() => {}} />)
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument()
  })

  it("calls onRetry when retry button clicked", async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<InlineError onRetry={onRetry} />)
    await user.click(screen.getByRole("button", { name: "重试" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("does not render retry button when onRetry prop omitted", () => {
    renderWithProviders(<InlineError />)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("applies custom className prop", () => {
    const { container } = renderWithProviders(
      <InlineError className="my-error-class" />
    )
    const root = container.firstElementChild as HTMLElement
    expect(root?.classList.contains("my-error-class")).toBe(true)
  })
})
