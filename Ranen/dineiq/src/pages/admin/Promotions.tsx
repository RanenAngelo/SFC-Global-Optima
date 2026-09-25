import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Tabs, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, TrendChart } from '../../components/charts'
import { KpiCard, LiveNote, MetricRow } from '../../components/shared'
import { PageError, PageLoader } from '../../lib/api'
import { usePromotionsData, type PromoRow } from '../../lib/live'
import { money, num } from '../../lib/utils'

const STATUS_TONE: Record<string, 'sage' | 'sky' | 'neutral'> = { Active: 'sage', Scheduled: 'sky', Expired: 'neutral' }

export default function Promotions() {
  const { push } = useToast()
  const [tab, setTab] = useState('Expired')
  const [active, setActive] = useState<PromoRow | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const { data, loading, error, refetch } = usePromotionsData()

  const rows = useMemo(() => (data?.rows ?? []).filter((p) => p.status === tab), [data, tab])
  const counts = {
    Active: (data?.rows ?? []).filter((p) => p.status === 'Active').length,
    Scheduled: (data?.rows ?? []).filter((p) => p.status === 'Scheduled').length,
    Expired: (data?.rows ?? []).filter((p) => p.status === 'Expired').length,
  }

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No promotion data.'} onRetry={refetch} />

  const copyText = (text: string, title: string) => {
    void navigator.clipboard.writeText(text).then(
      () => push({ title, tone: 'success' }),
      () => push({ title: 'Copy failed', tone: 'error' }),
    )
  }

  const columns: Column<PromoRow>[] = [
    {
      key: 'name',
      header: 'Promotion',
      sort: (a, b) => a.name.localeCompare(b.name),
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
          <p className="truncate font-mono text-[11.5px] text-ink-muted">{p.id} · {p.discountPct}% off</p>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      hideBelow: 'lg',
      render: (p) => (
        <div>
          <p className="text-[12.5px] text-ink-soft">{p.scope}</p>
          <p className="font-mono text-[11.5px] font-semibold text-ink-muted">{p.target}</p>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      hideBelow: 'xl',
      render: (p) => (
        <span className="text-[12.5px] text-ink-muted">
          {p.start} – {p.end}
        </span>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      hideBelow: 'lg',
      render: (p) => <span className="text-[12.5px] text-ink-muted">{p.channel}</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      sort: (a, b) => a.orders - b.orders,
      headerTip: 'Orders during the promotion window',
      render: (p) => <span className="tabular-nums text-ink-soft">{num(p.orders)}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      sort: (a, b) => a.revenue - b.revenue,
      render: (p) => <span className="font-semibold tabular-nums text-ink">{money(p.revenue, { compact: true })}</span>,
    },
    {
      key: 'lift',
      header: 'Revenue lift',
      align: 'right',
      hideBelow: 'md',
      sort: (a, b) => a.revenueLift - b.revenueLift,
      headerTip: 'Revenue change versus the pre-window baseline',
      render: (p) => (
        <span className={cn('font-semibold tabular-nums', p.revenueLift >= 0 ? 'text-sage-600' : 'text-clay-600')}>
          {p.revenueLift >= 0 ? '+' : ''}{(p.revenueLift * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      sort: (a, b) => a.marginPct - b.marginPct,
      render: (p) => (
        <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums', p.marginPct >= 40 ? 'bg-sage-50 text-sage-700' : p.marginPct >= 25 ? 'bg-gold-50 text-gold-600' : 'bg-clay-50 text-clay-600')}>
          {p.marginPct.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <Badge tone={STATUS_TONE[p.status] ?? 'neutral'} dot>{p.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '110px',
      render: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="secondary" icon="ChartColumn" onClick={() => setActive(p)}>
            Detail
          </Button>
        </div>
      ),
    },
  ]

  const visibleTraps = data.traps.filter((t) => !dismissed.includes(t.id))

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Promotion Analytics"
        subtitle="Live window-vs-baseline reads on every offer — and where a promotion cost more than it earned."
        demoNote="Live effectiveness analysis. Promotion windows are historical — nothing here is currently running."
        onRefresh={refetch}
        dataset="promotions"
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Promotions analysed" value={num(data.rows.length)} compare="historical windows" icon="BadgePercent" tone="sage" />
        <KpiCard label="Successful" value={num(data.successful)} compare="met the success bar" icon="CheckCircle" tone="sky" />
        <KpiCard label="Avg revenue lift" value={`${data.avgLift >= 0 ? '+' : ''}${(data.avgLift * 100).toFixed(1)}%`} compare="vs baselines" icon="TrendingUp" tone="ember" />
        <KpiCard label="Promotion traps detected" value={num(data.traps.length)} compare="live detection" icon="AlertTriangle" tone="clay" />
      </div>

      <Card className="mb-5">
        <div className="border-b border-line px-4 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { label: 'Active', value: 'Active', count: counts.Active },
              { label: 'Scheduled', value: 'Scheduled', count: counts.Scheduled },
              { label: 'Expired', value: 'Expired', count: counts.Expired },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          pageSize={8}
          onRowClick={(p) => setActive(p)}
          initialSort={{ key: 'revenue', dir: 'desc' }}
          emptyTitle={`No ${tab.toLowerCase()} promotions`}
          emptyMessage={tab === 'Expired' ? 'No expired windows on record.' : 'All recorded windows have ended — nothing is running or scheduled.'}
        />
      </Card>

      {/* Promotion trap detection */}
      <Card className="mb-5 overflow-hidden">
        <CardHeader
          title="Promotion Trap Detection"
          subtitle="Live scenarios where an offer weakened the result"
          icon="AlertTriangle"
          className="border-b"
          actions={<Badge tone="clay">{data.traps.length} detected</Badge>}
        />
        {visibleTraps.length === 0 ? (
          <p className="p-5 text-[13px] text-ink-muted">No traps in view — all detected scenarios were dismissed, or none were found.</p>
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleTraps.map((t) => {
              const severe = t.marginLift < -0.15
              return (
                <div
                  key={t.id}
                  className={cn(
                    'rounded-2xl border p-4',
                    severe ? 'border-clay-200 bg-clay-50/50' : 'border-gold-200 bg-gold-50/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Badge tone={severe ? 'clay' : 'gold'}>{t.trap}</Badge>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold tabular-nums text-ink-soft">
                      {(t.marginLift * 100).toFixed(1)}% margin
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-[13.5px] font-semibold leading-snug text-ink">{t.name}</h4>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                    Revenue moved {(t.revenueLift * 100).toFixed(1)}% versus baseline while margin moved {(t.marginLift * 100).toFixed(1)}% —{' '}
                    {money(t.revenue, { compact: true })} revenue at {t.marginPct.toFixed(1)}% margin across {num(t.orders)} orders.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="xs" variant="secondary" onClick={() => setActive(t)}>
                      View detail
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setDismissed((d) => [...d, t.id])}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="border-t border-line p-4">
          <LiveNote>Traps are flagged live by the effectiveness pipeline when margin deteriorates in the window.</LiveNote>
        </div>
      </Card>

      {/* Comparison */}
      <div className="mb-5 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <ChartCard title="Promotion performance comparison" subtitle="Window revenue and orders per promotion — live" height={300}>
          <TrendChart
            data={data.comparison}
            xKey="name"
            series={[
              { key: 'revenue', label: 'Revenue', color: '#B54E17', type: 'bar' },
              { key: 'orders', label: 'Orders', color: '#2F6FA8', type: 'line' },
            ]}
            valueFormat={(v, n) => (n === 'Revenue' ? money(v, { compact: true }) : `${num(v)} orders`)}
          />
        </ChartCard>

        <ChartCard title="Contribution margin by promotion" subtitle="Margin retained during each offer — live" height={300}>
          <BarSeries
            data={data.comparison}
            xKey="name"
            layout="vertical"
            bars={[{ key: 'margin', label: 'Margin %', color: '#5E8C4A' }]}
            valueFormat={(v) => `${v}%`}
            showLegend={false}
          />
        </ChartCard>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.name ?? ''}
        subtitle={active ? `${active.scope} · ${active.discountPct}% off · ${active.id}` : ''}
        width="lg"
        badge={active ? <Badge tone={STATUS_TONE[active.status] ?? 'neutral'} dot>{active.status}</Badge> : undefined}
        footer={
          active && (
            <Button
              variant="secondary"
              icon="Copy"
              onClick={() => copyText(`${active.name} (${active.id}): ${num(active.orders)} orders, ${money(active.revenue)} revenue (${(active.revenueLift * 100).toFixed(1)}% lift), margin ${active.marginPct.toFixed(1)}% (${(active.marginLift * 100).toFixed(1)}% lift). Successful: ${active.successful ? 'yes' : 'no'}.`, 'Promotion summary copied')}
            >
              Copy summary
            </Button>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { l: 'Orders', v: num(active.orders) },
                { l: 'Revenue', v: money(active.revenue, { compact: true }) },
                { l: 'Buyers', v: num(active.buyers) },
                { l: 'Avg order value', v: money(active.aov) },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 font-display text-[18px] font-semibold text-ink">{s.v}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Performance detail</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Duration" value={`${active.start} – ${active.end}`} />
                <MetricRow label="Channel" value={active.channel} />
                <MetricRow label="Scope" value={`${active.scope} (${active.target})`} />
                <MetricRow label="Contribution margin" value={`${active.marginPct.toFixed(1)}% (${money(active.margin, { compact: true })})`} />
                <MetricRow label="New buyers acquired" value={num(active.newBuyers)} />
                <MetricRow label="Repeaters (30d)" value={num(active.repeaters)} />
                <MetricRow
                  label="Wastage cost in window"
                  value={`${money(active.winWaste, { compact: true })} (baseline ${money(active.baseWaste, { compact: true })})`}
                  tone={active.winWaste > active.baseWaste ? 'text-clay-600' : undefined}
                />
                <MetricRow label="Pipeline verdict" value={active.successful ? 'Successful' : 'Not successful'} tone={active.successful ? 'text-sage-600' : 'text-clay-600'} />
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Versus baseline — live comparison</p>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex justify-between text-[12px] text-ink-muted">
                    <span>Baseline revenue {money(active.baseRevenue, { compact: true })}</span>
                    <span>Promotion revenue {money(active.revenue, { compact: true })}</span>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-ink-faint" style={{ width: `${Math.min(100, (active.baseRevenue / Math.max(1, active.baseRevenue, active.revenue)) * 100)}%` }} />
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-ember-500" style={{ width: `${Math.min(100, (active.revenue / Math.max(1, active.baseRevenue, active.revenue)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[12px] text-ink-muted">
                    <span>Baseline margin {active.baseMarginPct.toFixed(1)}%</span>
                    <span>Promotion margin {active.marginPct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-ink-faint" style={{ width: `${Math.min(100, active.baseMarginPct)}%` }} />
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className={cn('h-full rounded-full', active.marginPct < active.baseMarginPct ? 'bg-clay-500' : 'bg-sage-500')} style={{ width: `${Math.min(100, active.marginPct)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              {active.trap && (
                <p className="mt-3 rounded-xl border border-clay-100 bg-clay-50 px-3 py-2.5 text-[12px] leading-relaxed text-clay-600">
                  Live trap flag: {active.trap} — revenue moved {(active.revenueLift * 100).toFixed(1)}% while margin moved {(active.marginLift * 100).toFixed(1)}% versus baseline.
                </p>
              )}
            </Card>

            <LiveNote>Live window-vs-baseline analysis. Promotions cannot be created or edited from this dataset.</LiveNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
