import React from 'react'
import { Icon, Button, Card } from './primitives'
import { cn } from '../../lib/utils'

/* ─────────────────────────────── Empty states ─────────────────────────────── */
const EMPTY_ICON: Record<string, { icon: string; tone: string; bg: string }> = {
  generic: { icon: 'LayoutGrid', tone: 'text-ink-faint', bg: 'bg-canvas-deep' },
  search: { icon: 'SearchX', tone: 'text-ink-faint', bg: 'bg-canvas-deep' },
  data: { icon: 'DatabaseZap', tone: 'text-ember-600', bg: 'bg-ember-50' },
  error: { icon: 'AlertOctagon', tone: 'text-clay-600', bg: 'bg-clay-50' },
  cart: { icon: 'ShoppingBag', tone: 'text-ember-600', bg: 'bg-ember-50' },
  orders: { icon: 'ReceiptText', tone: 'text-sky-600', bg: 'bg-sky-50' },
  filter: { icon: 'FilterX', tone: 'text-ink-faint', bg: 'bg-canvas-deep' },
  chart: { icon: 'ChartNoAxesColumn', tone: 'text-ember-600', bg: 'bg-ember-50' },
}

export function EmptyState({
  variant = 'generic',
  title,
  message,
  action,
  secondaryAction,
  className,
  compact,
}: {
  variant?: keyof typeof EMPTY_ICON | string
  title: string
  message?: React.ReactNode
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  const v = EMPTY_ICON[variant] ?? EMPTY_ICON.generic
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 text-center', compact ? 'py-8' : 'py-14', className)}>
      <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', v.bg, v.tone)}>
        <Icon name={v.icon} size={24} />
      </div>
      <h4 className="mt-4 font-display text-[17px] font-semibold text-ink">{title}</h4>
      {message && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">{message}</p>}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export function NoDataState({ onReset, compact, className }: { onReset?: () => void; compact?: boolean; className?: string }) {
  return (
    <EmptyState
      variant="data"
      compact={compact}
      className={className}
      title="No analytical data available yet."
      message="Connect your restaurant data in a future version to unlock insights."
      action={
        onReset ? (
          <Button variant="secondary" size="sm" icon="RefreshCw" onClick={onReset}>
            Reset filters
          </Button>
        ) : undefined
      }
    />
  )
}

export function NoResultsState({ query, onClear, className }: { query?: string; onClear?: () => void; className?: string }) {
  return (
    <EmptyState
      variant="search"
      className={className}
      title="No matching results"
      message={query ? <>We couldn’t find anything for “{query}”. Try a different spelling or clear your filters.</> : 'Try adjusting your search or filters to see more results.'}
      action={
        onClear ? (
          <Button variant="secondary" size="sm" icon="RotateCcw" onClick={onClear}>
            Clear search and filters
          </Button>
        ) : undefined
      }
    />
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className }: { title?: string; message?: React.ReactNode; onRetry?: () => void; className?: string }) {
  return (
    <EmptyState
      variant="error"
      className={className}
      title={title}
      message={message ?? 'This is a demo error state. In a production build the failed request would be retried automatically.'}
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" icon="RefreshCw" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  )
}

/* ─────────────────────────────── Loading states ─────────────────────────────── */
export function SkeletonTable({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      <div className="flex gap-4 border-b border-line px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1">
            <div className="skeleton h-3 w-2/3" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-line/60 px-4 py-3.5">
          <div className="skeleton h-8 w-8 rounded-lg" />
          {Array.from({ length: cols - 1 }).map((_, c) => (
            <div key={c} className="flex-1">
              <div className="skeleton h-3.5" style={{ width: `${60 + ((r + c) % 3) * 12}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2.5">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-6 w-32" />
              <div className="skeleton h-3 w-20" />
            </div>
            <div className="skeleton h-10 w-10 rounded-xl" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 260 }: { height?: number }) {
  return (
    <div className="flex items-end gap-2 px-1" style={{ height }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} className="skeleton flex-1 rounded-md" style={{ height: `${28 + ((i * 37) % 62)}%` }} />
      ))}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading…', className, height = 260 }: { label?: string; className?: string; height?: number }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)} style={{ minHeight: height }}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas-deep text-ember-600">
        <Icon name="Loader2" size={18} className="animate-spin" />
      </span>
      <p className="text-[13px] font-medium text-ink-muted">{label}</p>
    </div>
  )
}
