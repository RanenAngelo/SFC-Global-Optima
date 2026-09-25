import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, Select, Tabs, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, TrendChart } from '../../components/charts'
import { KpiCard, LiveNote, MetricRow } from '../../components/shared'
import { PageError, PageLoader } from '../../lib/api'
import { useAnomaliesData, type AnomalyAlert } from '../../lib/live'
import { num } from '../../lib/utils'

const SEVERITY_TONE: Record<string, 'clay' | 'gold' | 'sky'> = { Critical: 'clay', High: 'clay', Medium: 'gold', Low: 'sky' }

const REVIEWED_KEY = 'dineiq_anomaly_reviewed'
const readReviewed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(REVIEWED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export default function Anomalies() {
  const { push } = useToast()
  const [tab, setTab] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [active, setActive] = useState<AnomalyAlert | null>(null)
  const [reviewed, setReviewed] = useState<string[]>(readReviewed)
  const [dismissed, setDismissed] = useState<string[]>([])
  const { data, loading, error, refetch } = useAnomaliesData()

  const rows = useMemo(() => {
    let r = (data?.rows ?? []).filter((a) => !dismissed.includes(a.id))
    if (tab === 'open') r = r.filter((a) => !reviewed.includes(a.id))
    if (tab === 'reviewed') r = r.filter((a) => reviewed.includes(a.id))
    if (severity !== 'all') r = r.filter((a) => a.severity === severity)
    return r
  }, [data, tab, severity, reviewed, dismissed])

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No anomaly data.'} onRetry={refetch} />

  const all = data.rows.filter((a) => !dismissed.includes(a.id))
  const open = all.filter((a) => !reviewed.includes(a.id)).length
  const critical = all.filter((a) => a.severity === 'Critical').length
  const high = all.filter((a) => a.severity === 'High').length

  const markReviewed = (a: AnomalyAlert) => {
    setReviewed((prev) => {
      const next = prev.includes(a.id) ? prev : [...prev, a.id]
      try {
        localStorage.setItem(REVIEWED_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable */
      }
      return next
    })
    setActive(null)
    push({ title: 'Marked as reviewed', tone: 'success' })
  }

  const copyText = (text: string, title: string) => {
    void navigator.clipboard.writeText(text).then(
      () => push({ title, tone: 'success' }),
      () => push({ title: 'Copy failed', tone: 'error' }),
    )
  }

  const columns: Column<AnomalyAlert>[] = [
    {
      key: 'kind',
      header: 'Type',
      sort: (a, b) => a.kind.localeCompare(b.kind),
      render: (a) => <span className="text-[12.5px] font-medium text-ink-soft">{a.kind}</span>,
    },
    {
      key: 'title',
      header: 'Alert',
      sort: (a, b) => a.title.localeCompare(b.title),
      render: (a) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{a.title}</p>
          <p className="truncate text-[11.5px] text-ink-muted">{a.entityKind}: {a.entityName}</p>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      align: 'center',
      sort: (a, b) => a.severity.localeCompare(b.severity),
      render: (a) => <Badge tone={SEVERITY_TONE[a.severity] ?? 'neutral'}>{a.severity}</Badge>,
    },
    {
      key: 'entity',
      header: 'Entity',
      hideBelow: 'lg',
      render: (a) => <span className="font-mono text-[12px] text-ink-muted">{a.entity}</span>,
    },
    {
      key: 'delta',
      header: 'Change',
      align: 'right',
      sort: (a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0),
      render: (a) =>
        a.deltaPct == null ? (
          <span className="text-[12px] text-ink-faint">—</span>
        ) : (
          <span className={cn('text-[13px] font-bold tabular-nums', a.deltaPct >= 0 ? 'text-sage-600' : 'text-clay-600')}>
            {a.deltaPct >= 0 ? '+' : ''}{a.deltaPct.toFixed(1)}%
          </span>
        ),
    },
    {
      key: 'when',
      header: 'Detected',
      hideBelow: 'md',
      sort: (a, b) => a.day.localeCompare(b.day),
      render: (a) => <span className="text-[12.5px] text-ink-muted">{a.when}</span>,
    },
    {
      key: 'reviewed',
      header: 'Status',
      render: (a) => (
        <Badge tone={reviewed.includes(a.id) ? 'neutral' : 'ember'} dot>
          {reviewed.includes(a.id) ? 'Reviewed' : 'Open'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '110px',
      render: (a) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="secondary" icon="Eye" onClick={() => setActive(a)}>
            Detail
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Sales Anomaly Monitoring"
        subtitle="A live review queue for unusual trading patterns across orders, items and branches."
        demoNote="Live detector output — reviewed flags are stored in this browser."
        onRefresh={refetch}
        dataset="anomalies"
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open alerts" value={num(open)} compare="awaiting review" icon="Bell" tone="ember" />
        <KpiCard label="Critical severity" value={num(critical)} compare="review first" icon="AlertTriangle" tone="clay" />
        <KpiCard label="High severity" value={num(high)} compare="review next" icon="AlertCircle" tone="gold" />
        <KpiCard label="Total flagged" value={num(all.length)} compare="all severities" icon="Activity" tone="sky" />
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Alert volume by day" subtitle="Dated alerts over the trailing window — live" height={260}>
          <TrendChart
            data={data.trend}
            xKey="d"
            series={data.trendCats.map((c) => ({ key: c.key, label: c.label, color: c.color, type: 'bar' as const, stackId: 'a' }))}
            valueFormat={(v) => `${v} alerts`}
          />
        </ChartCard>

        <ChartCard title="Alerts by type" subtitle="Distribution across the dataset — live" height={260}>
          <BarSeries
            data={data.kinds}
            xKey="kind"
            layout="vertical"
            bars={[{ key: 'count', label: 'Alerts', color: '#B54E17' }]}
            valueFormat={(v) => `${v} alerts`}
            showLegend={false}
          />
        </ChartCard>
      </div>

      <Card>
        <div className="border-b border-line px-4 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { label: 'All alerts', value: 'all', count: all.length },
              { label: 'Open', value: 'open', count: open },
              { label: 'Reviewed', value: 'reviewed', count: all.length - open },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-auto" aria-label="Severity">
            <option value="all">Any severity</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </Select>
          <span className="ml-auto text-[12.5px] text-ink-muted">
            <span className="font-semibold text-ink">{rows.length}</span> alerts shown
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          pageSize={8}
          onRowClick={(a) => setActive(a)}
          emptyTitle="No alerts match this filter"
          emptyMessage="Try a different severity or switch back to all alerts."
          emptyAction={
            <Button
              size="sm"
              variant="secondary"
              icon="RotateCcw"
              onClick={() => {
                setSeverity('all')
                setTab('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      </Card>

      {/* Alert timeline */}
      <Card className="mt-5">
        <CardHeader title="Alert timeline" subtitle="Most recent live alerts" className="border-b" />
        <div className="p-5">
          <ol className="space-y-4">
            {all.slice(0, 5).map((a, i, arr) => (
              <li key={a.id} className="flex gap-3.5">
                <span className="relative flex flex-col items-center">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      a.severity === 'Critical' || a.severity === 'High' ? 'bg-clay-50 text-clay-600' : a.severity === 'Medium' ? 'bg-gold-50 text-gold-600' : 'bg-sky-50 text-sky-600',
                    )}
                  >
                    <Icon name="AlertTriangle" size={15} />
                  </span>
                  {i < arr.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
                </span>
                <span className="pb-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">{a.title}</span>
                    <Badge tone={SEVERITY_TONE[a.severity] ?? 'neutral'}>{a.severity}</Badge>
                    {reviewed.includes(a.id) && <Badge tone="neutral">Reviewed</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-muted">{a.kind} · {a.metric}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-faint">
                    {a.entityKind} {a.entity} · {a.when}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      {/* Drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.kind ?? ''}
        subtitle={active ? `${active.entityKind} ${active.entity} · ${active.when}` : ''}
        width="md"
        badge={active ? <Badge tone={SEVERITY_TONE[active.severity] ?? 'neutral'}>{active.severity} severity</Badge> : undefined}
        footer={
          active && (
            <>
              <Button
                variant="secondary"
                icon="EyeOff"
                onClick={() => {
                  setDismissed((d) => [...d, (active as AnomalyAlert).id])
                  setActive(null)
                  push({ title: 'Alert dismissed', tone: 'info' })
                }}
              >
                Dismiss
              </Button>
              <Button icon="Check" disabled={reviewed.includes(active.id)} onClick={() => markReviewed(active)}>
                {reviewed.includes(active.id) ? 'Already reviewed' : 'Mark as reviewed'}
              </Button>
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    active.severity === 'Critical' || active.severity === 'High' ? 'bg-clay-50 text-clay-600' : active.severity === 'Medium' ? 'bg-gold-50 text-gold-600' : 'bg-sky-50 text-sky-600',
                  )}
                >
                  <Icon name="AlertTriangle" size={18} />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{active.kind}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{active.title}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Alert details</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label={active.entityKind} value={`${active.entityName} (${active.entity})`} />
                <MetricRow label="Metric" value={active.metric} />
                <MetricRow label="Observed" value={num(Math.round(active.actual * 100) / 100)} />
                <MetricRow label="Baseline" value={num(Math.round(active.baseline * 100) / 100)} />
                <MetricRow label="Deviation" value={active.z != null ? `z = ${active.z.toFixed(2)}` : active.deltaPct != null ? `${active.deltaPct >= 0 ? '+' : ''}${active.deltaPct.toFixed(1)}%` : '—'} />
                <MetricRow label="Detected" value={active.when} />
                <MetricRow label="Severity" value={active.severity} />
                <MetricRow label="Status" value={reviewed.includes(active.id) ? 'Reviewed' : 'Open'} />
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Suggested review action</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{active.action}</p>
              <div className="mt-3 flex gap-2">
                <Button size="xs" onClick={() => copyText(`${active.kind} (${active.severity}): ${active.title} — ${active.entityKind} ${active.entity}. ${active.action}`, 'Alert copied')}>
                  Copy summary
                </Button>
              </div>
            </Card>

            <LiveNote>This alert is live detector output. Review flags persist in this browser only.</LiveNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
