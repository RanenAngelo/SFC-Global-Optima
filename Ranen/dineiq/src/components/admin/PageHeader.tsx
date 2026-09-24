import React from 'react'
import { Button, Icon, cn } from '../ui/primitives'
import { ExportMenu } from '../shared'
import { useToast } from '../ui/overlay'

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
  demoNote,
  onRefresh,
  exportLabel = 'Export',
}: {
  title: string
  subtitle?: React.ReactNode
  eyebrow?: string
  actions?: React.ReactNode
  className?: string
  demoNote?: string
  onRefresh?: () => void
  exportLabel?: string
}) {
  const { push } = useToast()
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="label mb-1.5">{eyebrow}</p>}
          <h1 className="font-display text-[24px] font-semibold leading-tight text-ink sm:text-[30px]">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-ink-muted">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button
            variant="secondary"
            size="sm"
            icon="RefreshCw"
            onClick={() => {
              onRefresh?.()
              push({ title: 'Demo refresh', body: 'Static values re-rendered — nothing recalculated', tone: 'info' })
            }}
          >
            Refresh
          </Button>
          <ExportMenu label={exportLabel} />
        </div>
      </div>
      {demoNote && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-faint">
          <Icon name="Info" size={13} />
          {demoNote}
        </p>
      )}
    </div>
  )
}

export function ChartGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid gap-4', className)}>{children}</div>
}
