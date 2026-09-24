import React, { useMemo, useState } from 'react'
import { Icon, Button } from './primitives'
import { SkeletonTable } from './states'
import { EmptyState } from './states'
import { cn } from '../../lib/utils'

export type Column<T> = {
  key: string
  header: React.ReactNode
  render: (row: T) => React.ReactNode
  sort?: (a: T, b: T) => number
  align?: 'left' | 'right' | 'center'
  width?: string
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
  headerTip?: string
}

const HIDE_CLASS: Record<string, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty,
  emptyTitle = 'Nothing to show here yet',
  emptyMessage,
  emptyAction,
  pageSize = 10,
  paginated = true,
  dense,
  className,
  toolbar,
  initialSort,
  stickyHeader,
  selectedKey,
  selectable,
  selected,
  onSelectionChange,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  empty?: boolean
  emptyTitle?: string
  emptyMessage?: React.ReactNode
  emptyAction?: React.ReactNode
  pageSize?: number
  paginated?: boolean
  dense?: boolean
  className?: string
  toolbar?: React.ReactNode
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  stickyHeader?: boolean
  selectedKey?: string
  selectable?: boolean
  selected?: string[]
  onSelectionChange?: (ids: string[]) => void
}) {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | undefined>(initialSort)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => col.sort!(a, b) * dir)
  }, [rows, sort, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = paginated ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize) : sorted

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
    setPage(0)
  }

  const allSelected = selectable && pageRows.length > 0 && pageRows.every((r) => selected?.includes(rowKey(r)))
  const toggleAll = () => {
    if (!onSelectionChange) return
    const ids = pageRows.map(rowKey)
    onSelectionChange(allSelected ? (selected ?? []).filter((i) => !ids.includes(i)) : Array.from(new Set([...(selected ?? []), ...ids])))
  }

  if (loading) {
    return (
      <div className={cn('overflow-hidden', className)}>
        {toolbar}
        <SkeletonTable rows={6} cols={Math.min(columns.length, 7)} />
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {toolbar}
      {empty || sorted.length === 0 ? (
        <EmptyState variant="generic" title={emptyTitle} message={emptyMessage} action={emptyAction} />
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className={cn('bg-canvas/80', stickyHeader && 'sticky top-0 z-10 backdrop-blur')}>
                <tr>
                  {selectable && (
                    <th className="w-10 px-4 py-2.5">
                      <input type="checkbox" checked={!!allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-line-strong accent-ember-600" />
                    </th>
                  )}
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      style={{ width: c.width }}
                      className={cn(
                        'select-none px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint',
                        c.align === 'right' && 'text-right',
                        c.align === 'center' && 'text-center',
                        c.hideBelow && HIDE_CLASS[c.hideBelow],
                      )}
                    >
                      {c.sort ? (
                        <button onClick={() => toggleSort(c.key)} className="focus-ring inline-flex items-center gap-1 rounded transition-colors hover:text-ink">
                          {c.header}
                          <Icon
                            name={sort?.key === c.key ? (sort.dir === 'asc' ? 'ArrowUp' : 'ArrowDown') : 'ArrowUpDown'}
                            size={11}
                            className={sort?.key === c.key ? 'text-ember-600' : 'text-ink-faint/70'}
                          />
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const key = rowKey(row)
                  const isSel = selected?.includes(key)
                  return (
                    <tr
                      key={key}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        'border-t border-line/70 align-middle transition-colors',
                        onRowClick ? 'cursor-pointer hover:bg-canvas/80' : 'hover:bg-canvas/40',
                        selectedKey === key && 'bg-ember-50/60 hover:bg-ember-50',
                        isSel && 'bg-canvas',
                      )}
                    >
                      {selectable && (
                        <td className="px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSel}
                            className="h-4 w-4 rounded border-line-strong accent-ember-600"
                            onChange={() =>
                              onSelectionChange?.(isSel ? (selected ?? []).filter((i) => i !== key) : [...(selected ?? []), key])
                            }
                          />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            'px-4 text-[13px] text-ink-soft',
                            dense ? 'py-2' : 'py-3',
                            c.align === 'right' && 'text-right',
                            c.align === 'center' && 'text-center',
                            c.hideBelow && HIDE_CLASS[c.hideBelow],
                          )}
                        >
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {paginated && sorted.length > pageSize && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="text-xs text-ink-muted">
                Showing <span className="font-semibold text-ink">{safePage * pageSize + 1}</span>–
                <span className="font-semibold text-ink">{Math.min(sorted.length, (safePage + 1) * pageSize)}</span> of{' '}
                <span className="font-semibold text-ink">{sorted.length.toLocaleString()}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="secondary"
                  icon="ChevronLeft"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const start = Math.max(0, Math.min(safePage - 2, totalPages - 5))
                  const p = start + i
                  if (p >= totalPages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'focus-ring h-7 w-7 rounded-lg text-xs font-semibold transition-colors',
                        p === safePage ? 'bg-ember-600 text-white' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                      )}
                    >
                      {p + 1}
                    </button>
                  )
                })}
                <Button
                  size="xs"
                  variant="secondary"
                  iconRight="ChevronRight"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
