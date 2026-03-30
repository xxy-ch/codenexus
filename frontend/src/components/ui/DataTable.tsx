import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (value: unknown, row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  emptyMessage?: string
  className?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  onRowClick,
  onSort,
  sortColumn,
  sortDirection,
  emptyMessage = '暂无数据',
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={cn('text-center py-12 text-on-surface-variant', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-outline-variant/20">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant',
                  column.sortable && onSort && 'cursor-pointer hover:bg-surface-container-low transition-colors',
                  column.className
                )}
                onClick={() =>
                  column.sortable &&
                  onSort &&
                  onSort(
                    column.key,
                    sortColumn === column.key && sortDirection === 'asc'
                      ? 'desc'
                      : 'asc'
                  )
                }
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {column.sortable && sortColumn === column.key && (
                    <span className="material-symbols-outlined text-sm">
                      {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={String(row[keyField])}
              className={cn(
                'border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-sm text-on-surface',
                    column.className
                  )}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : String(row[column.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
