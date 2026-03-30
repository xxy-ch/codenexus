import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

interface PaginationProps extends ComponentProps<'nav'> {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  maxVisible?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxVisible = 7,
  className,
  ...props
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: number[] = []
    const halfVisible = Math.floor(maxVisible / 2)

    let startPage = Math.max(1, currentPage - halfVisible)
    let endPage = Math.min(totalPages, currentPage + halfVisible)

    if (currentPage <= halfVisible) {
      endPage = Math.min(totalPages, maxVisible - 1)
    }

    if (currentPage >= totalPages - halfVisible) {
      startPage = Math.max(1, totalPages - maxVisible + 2)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  if (totalPages <= 1) return null

  return (
    <nav className={cn('flex items-center gap-1', className)} {...props}>
      {showFirstLast && (
        <PaginationButton
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
        >
          ««
        </PaginationButton>
      )}

      <PaginationButton
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹
      </PaginationButton>

      {pageNumbers[0] > 1 && (
        <>
          <PaginationButton onClick={() => onPageChange(1)}>1</PaginationButton>
          {pageNumbers[0] > 2 && <span className="px-2">...</span>}
        </>
      )}

      {pageNumbers.map((page) => (
        <PaginationButton
          key={page}
          onClick={() => onPageChange(page)}
          active={page === currentPage}
        >
          {page}
        </PaginationButton>
      ))}

      {pageNumbers[pageNumbers.length - 1] < totalPages && (
        <>
          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
            <span className="px-2">...</span>
          )}
          <PaginationButton onClick={() => onPageChange(totalPages)}>
            {totalPages}
          </PaginationButton>
        </>
      )}

      <PaginationButton
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        ›
      </PaginationButton>

      {showFirstLast && (
        <PaginationButton
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
        >
          »»
        </PaginationButton>
      )}
    </nav>
  )
}

interface PaginationButtonProps extends ComponentProps<'button'> {
  active?: boolean
}

function PaginationButton({
  active = false,
  disabled = false,
  children,
  className,
  ...props
}: PaginationButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'min-w-[2rem] h-8 px-2 rounded-lg text-sm font-semibold transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        active
          ? 'bg-primary text-on-primary'
          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
