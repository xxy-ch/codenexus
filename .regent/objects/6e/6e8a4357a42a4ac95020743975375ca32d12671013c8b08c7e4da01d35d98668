import { describe, it, expect } from "vitest"
import { screen } from "@/test/test-utils"
import { renderWithProviders } from "@/test/test-utils"
import { Inbox, FolderOpen } from "lucide-react"
import { EmptyState } from "../EmptyState"

describe("EmptyState", () => {
  it("renders with required title", () => {
    renderWithProviders(<EmptyState title="暂无数据" />)
    expect(screen.getByText("暂无数据")).toBeInTheDocument()
  })

  it("renders optional description text", () => {
    renderWithProviders(
      <EmptyState title="暂无数据" description="暂无提交记录" />
    )
    expect(screen.getByText("暂无提交记录")).toBeInTheDocument()
  })

  it("renders default Inbox icon when no icon prop provided", () => {
    const { container } = renderWithProviders(<EmptyState title="暂无数据" />)
    const svgEl = container.querySelector("svg")
    expect(svgEl).toBeInTheDocument()
  })

  it("renders custom icon when icon prop provided", () => {
    renderWithProviders(<EmptyState title="暂无数据" icon={FolderOpen} />)
    const { container } = renderWithProviders(
      <EmptyState title="暂无数据" icon={FolderOpen} />
    )
    const svgEl = container.querySelector("svg")
    expect(svgEl).toBeInTheDocument()
  })

  it("renders optional action button when action prop provided", () => {
    renderWithProviders(
      <EmptyState title="暂无数据" action={<button>创建</button>} />
    )
    expect(
      screen.getByRole("button", { name: "创建" })
    ).toBeInTheDocument()
  })

  it("does not render action slot when action prop omitted", () => {
    const { container } = renderWithProviders(<EmptyState title="暂无数据" />)
    expect(container.querySelector("[data-slot='empty-state-action']")).toBeNull()
  })

  it("applies custom className prop", () => {
    const { container } = renderWithProviders(
      <EmptyState title="暂无数据" className="my-custom-class" />
    )
    const root = container.firstElementChild as HTMLElement
    expect(root?.classList.contains("my-custom-class")).toBe(true)
  })
})
