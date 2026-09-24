import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, Select, Tabs, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, TrendChart } from '../../components/charts'
import { DemoNote, KpiCard, MetricRow } from '../../components/shared'
import { ANOMALIES, type Anomaly } from '../../lib/data/analytics'

const SEVERITY_TONE: Record<string, 'clay' | 'gold' | 'sky'> = { High: 'clay', Medium: 'gold', Low: 'sky' }

const ANOMALY_TREND = [
  { d: 'Mon', spikes: 1, drops: 0, other: 1 },
  { d: 'Tue', spikes: 0, drops: 1, other: 0 },
  { d: 'Wed', spikes: 2, drops: 1, other: 2 },
  { d: 'Thu', spikes: 1, drops: 0, other: 1 },
  { d: 'Fri', spikes: 3, drops: 2, other: 2 },
  { d: 'Sat', spikes: 2, drops: 1, other: 3 },
  { d: 'Sun', spikes: 1, drops: 1, other: 1 },
]

const KIND_DATA = [
  { kind: 'Sales spikes', count: 12 },
  { kind: 'Sales drops', count: 8 },
  { kind: 'High order values', count: 6 },
  { kind: 'Unusual discounts', count: 5 },
  { kind: 'Duplicate transactions', count: 3 },
]

export default function Anomalies() {
  const { push } = useToast()
  const [tab, setTab] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [items, setItems] = useState(ANOMALIES)
  const [active, setActive] = useState<Anomaly | null>(null)

  const rows = useMemo(() => {
    let r = items
    if (tab === 'open') r = r.filter((a) => !a.reviewed)
    if (tab === 'reviewed') r = r.filter((a) => a.reviewed)
    if (severity !== 'all') r = r.filter((a) => a.severity === severity)
    return r
  }, [items, tab, severity])

  const open = items.filter((a) => !a.reviewed).length

  const columns: Column<Anomaly>[] = [
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
          <p className="truncate text-[11.5px] text-ink-muted">{a.item !== '—' ? a.item : a.location}</p>
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
      key: 'location',
      header: 'Location',
      hideBelow: 'lg',
      render: (a) => <span className="text-[12.5px] text-ink-muted">{a.location}</span>,
    },
    {
      key: 'delta',
      header: 'Change',
      align: 'right',
      render: (a) => (
        <span className={cn('text-[13px] font-bold tabular-nums', a.delta.startsWith('+') ? 'text-sage-600' : 'text-clay-600')}>{a.delta}</span>
      ),
    },
    {
      key: 'when',
      header: 'Detected',
      hideBelow: 'md',
      sort: (a, b) => a.when.localeCompare(b.when),
      render: (a) => <span className="text-[12.5px] text-ink-muted">{a.when}</span>,
    },
    {
      key: 'reviewed',
      header: 'Status',
      render: (a) => <Badge tone={a.reviewed ? 'neutral' : 'ember'} dot>{a.reviewed ? 'Reviewed' : 'Open'}</Badge>,
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
        subtitle="A review queue for unusual trading patterns across demo orders, items and branches."
        demoNote="Every alert below is a hand-written demonstration example. No anomaly detection algorithm is executed."
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open alerts" value={`${open}`} compare="awaiting review" icon="Bell" tone="ember" />
        <KpiCard label="High severity" value={`${items.filter((a) => a.severity === 'High').length}`} compare="review first" icon="AlertTriangle" tone="clay" />
        <KpiCard label="Reviewed this week" value="14" compare="demo value" icon="CheckCheck" tone="sage" />
        <KpiCard label="Average review time" value="2.4 hrs" compare="demo value" icon="Clock" tone="sky" />
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Alert volume by day" subtitle="Demo count of alerts per category" height={260}>
          <TrendChart
            data={ANOMALY_TREND}
            xKey="d"
            series={[
              { key: 'spikes', label: 'Sales spikes', color: '#5E8C4A', type: 'bar', stackId: 'a' },
              { key: 'drops', label: 'Sales drops', color: '#96352C', type: 'bar', stackId: 'a' },
              { key: 'other', label: 'Other alerts', color: '#C08A16', type: 'bar', stackId: 'a' },
            ]}
            valueFormat={(v) => `${v} alerts`}
          />
        </ChartCard>

        <ChartCard title="Alerts by type" subtitle="Distribution across the demo period" height={260}>
          <BarSeries
            data={KIND_DATA}
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
              { label: 'All alerts', value: 'all', count: items.length },
              { label: 'Open', value: 'open', count: open },
              { label: 'Reviewed', value: 'reviewed', count: items.length - open },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-auto" aria-label="Severity">
            <option value="all">Any severity</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
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
        <CardHeader title="Alert timeline" subtitle="Most recent demo alerts" className="border-b" />
        <div className="p-5">
          <ol className="space-y-4">
            {items.slice(0, 5).map((a, i) => (
              <li key={a.id} className="flex gap-3.5">
                <span className="relative flex flex-col items-center">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      a.severity === 'High' ? 'bg-clay-50 text-clay-600' : a.severity === 'Medium' ? 'bg-gold-50 text-gold-600' : 'bg-sky-50 text-sky-600',
                    )}
                  >
                    <Icon name="AlertTriangle" size={15} />
                  </span>
                  {i < 4 && <span className="mt-1 w-px flex-1 bg-line" />}
                </span>
                <span className="pb-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">{a.title}</span>
                    <Badge tone={SEVERITY_TONE[a.severity] ?? 'neutral'}>{a.severity}</Badge>
                    {a.reviewed && <Badge tone="neutral">Reviewed</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-muted">{a.detail}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-faint">
                    {a.location} · {a.when}
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
        title={active?.title ?? ''}
        subtitle={active ? `${active.kind} · ${active.when}` : ''}
        width="md"
        badge={active ? <Badge tone={SEVERITY_TONE[active.severity] ?? 'neutral'}>{active.severity} severity</Badge> : undefined}
        footer={
          active && (
            <>
              <Button
                variant="secondary"
                icon="EyeOff"
                onClick={() => {
                  setItems((prev) => prev.filter((a) => a.id !== active.id))
                  setActive(null)
                  push({ title: 'Alert dismissed', tone: 'info' })
                }}
              >
                Dismiss
              </Button>
              <Button
                icon="Check"
                disabled={active.reviewed}
                onClick={() => {
                  setItems((prev) => prev.map((a) => (a.id === active.id ? { ...a, reviewed: true } : a)))
                  setActive(null)
                  push({ title: 'Marked as reviewed', tone: 'success' })
                }}
              >
                {active.reviewed ? 'Already reviewed' : 'Mark as reviewed'}
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
                    active.severity === 'High' ? 'bg-clay-50 text-clay-600' : active.severity === 'Medium' ? 'bg-gold-50 text-gold-600' : 'bg-sky-50 text-sky-600',
                  )}
                >
                  <Icon name="AlertTriangle" size={18} />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{active.kind}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{active.detail}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Alert details</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Related menu item" value={active.item} />
                <MetricRow label="Related location" value={active.location} />
                <MetricRow label="Date and time" value={active.when} />
                <MetricRow label="Observed change" value={active.delta} />
                <MetricRow label="Severity" value={active.severity} />
                <MetricRow label="Status" value={active.reviewed ? 'Reviewed' : 'Open'} />
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Suggested review action</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{active.action}</p>
              <div className="mt-3 flex gap-2">
                <Button size="xs" onClick={() => push({ title: 'Action assigned (demo)', tone: 'success' })}>
                  Assign to branch
                </Button>
                <Button size="xs" variant="ghost" onClick={() => push({ title: 'Alert snoozed for 24 hours', tone: 'info' })}>
                  Snooze 24h
                </Button>
              </div>
            </Card>

            <DemoNote>This alert is a demonstration example. No detection logic is running in this prototype.</DemoNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
