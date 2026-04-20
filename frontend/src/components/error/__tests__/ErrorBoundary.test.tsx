import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

/** Helper component that throws during render */
function ThrowError(): never {
  throw new Error('test error')
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>child content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('renders fallback UI when child throws during render', () => {
    // Suppress console.error from React error boundary logging
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('页面出现错误')).toBeInTheDocument()
  })

  it('shows heading "页面出现错误" in fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('页面出现错误')
  })

  it('shows description text in fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('抱歉，页面加载时遇到问题。请刷新页面重试。')).toBeInTheDocument()
  })

  it('shows "刷新页面" button in fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: '刷新页面' })).toBeInTheDocument()
  })

  it('renders custom fallback when provided instead of default UI', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('custom fallback')).toBeInTheDocument()
    expect(screen.queryByText('页面出现错误')).not.toBeInTheDocument()
  })
})
