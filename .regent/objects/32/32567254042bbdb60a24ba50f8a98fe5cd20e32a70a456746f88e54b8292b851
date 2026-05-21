import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { TableSkeleton } from '../TableSkeleton'
import { CardGridSkeleton } from '../CardGridSkeleton'
import { DetailSkeleton } from '../DetailSkeleton'
import { FormSkeleton } from '../FormSkeleton'
import { DashboardSkeleton } from '../DashboardSkeleton'
import { ProblemListSkeleton } from '../ProblemListSkeleton'
import { ProblemDetailSkeleton } from '../ProblemDetailSkeleton'
import { IDESkeleton } from '../IDESkeleton'
import { ProfileSkeleton } from '../ProfileSkeleton'
import { ConversationSkeleton } from '../ConversationSkeleton'

function getSkeletonElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('[data-slot="skeleton"]'))
}

describe('Skeleton Components', () => {
  it('TableSkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<TableSkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('CardGridSkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<CardGridSkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('DetailSkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<DetailSkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('FormSkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<FormSkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('DashboardSkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<DashboardSkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('ProblemListSkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<ProblemListSkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('ProblemDetailSkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<ProblemDetailSkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('IDESkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<IDESkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('ProfileSkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<ProfileSkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('ConversationSkeleton renders without crashing', () => {
    const { container } = renderWithProviders(<ConversationSkeleton />)
    const skeletons = getSkeletonElements(container)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('TableSkeleton with rows=3 renders correct number of skeleton rows', () => {
    const { container } = renderWithProviders(<TableSkeleton rows={3} columns={4} />)
    const skeletons = getSkeletonElements(container)
    // 4 header cells + 3 rows * 4 cells = 16 total skeletons
    expect(skeletons.length).toBe(4 + 3 * 4)
  })

  it('CardGridSkeleton with cards=4 renders correct number of card skeletons', () => {
    const { container } = renderWithProviders(<CardGridSkeleton cards={4} />)
    const skeletons = getSkeletonElements(container)
    // Each card has 5 skeletons, 4 cards = 20
    expect(skeletons.length).toBe(4 * 5)
  })
})
