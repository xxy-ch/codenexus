import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { StatCard } from '@/components/page/StatCard'
import { FilterBar } from '@/components/page/FilterBar'
import { SectionBlock } from '@/components/page/SectionBlock'
import { EmptyState } from '@/components/page/EmptyState'
import { ActionBar } from '@/components/page/ActionBar'
import { FieldGroup } from '@/components/page/FieldGroup'

describe('page primitives', () => {
  it('renders page header with title, description, breadcrumb, and action slot', () => {
    render(
      <PageHeader
        eyebrow="Teacher Workspace"
        title="Assignment Report"
        description="Review assignment performance"
        breadcrumb={['Classes', 'Assignment Report']}
        actions={<Button>Export</Button>}
      />,
    )

    expect(screen.getByText('Teacher Workspace')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Assignment Report' })).toBeInTheDocument()
    expect(screen.getByText('Review assignment performance')).toBeInTheDocument()
    expect(screen.getByText('Classes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('renders surface and stat cards with flat presentational structure', () => {
    render(
      <div>
        <SurfaceCard tone="muted">
          <div>Surface Body</div>
        </SurfaceCard>
        <StatCard label="Students" value="42" helper="Current class roster" />
      </div>,
    )

    expect(screen.getByText('Surface Body').closest('section')).toHaveClass('rounded-[10px]')
    expect(screen.getByText('Students')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Current class roster')).toBeInTheDocument()
  })

  it('renders filter bar and action bar as compositional containers without owning handlers', () => {
    const onClick = vi.fn()

    render(
      <div>
        <FilterBar>
          <input aria-label="keyword" />
          <button type="button" onClick={onClick}>
            Search
          </button>
        </FilterBar>
        <ActionBar>
          <button type="button" onClick={onClick}>
            Save
          </button>
        </ActionBar>
      </div>,
    )

    expect(screen.getByRole('textbox', { name: 'keyword' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('renders section block, empty state, and field group with accessible labels', () => {
    render(
      <div>
        <SectionBlock title="Submission Detail" description="Latest accepted run">
          <div>Runtime</div>
        </SectionBlock>
        <EmptyState title="No submissions" description="Try a different filter." />
        <FieldGroup label="Freeze Minutes" description="Contest ranking freeze window">
          <input aria-label="freeze minutes" />
        </FieldGroup>
      </div>,
    )

    expect(screen.getByRole('heading', { name: 'Submission Detail' })).toBeInTheDocument()
    expect(screen.getByText('Latest accepted run')).toBeInTheDocument()
    expect(screen.getByText('No submissions')).toBeInTheDocument()
    expect(screen.getByText('Try a different filter.')).toBeInTheDocument()
    expect(screen.getByLabelText('Freeze Minutes')).toBeInTheDocument()
    expect(screen.getByText('Contest ranking freeze window')).toBeInTheDocument()
  })
})
