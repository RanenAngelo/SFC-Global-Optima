import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, Select, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { ChartCard, TrendChart } from '../../components/charts'
import { FoodImage, KpiCard, LiveNote, MetricRow } from '../../components/shared'
import { PageError, PageLoader } from '../../lib/api'
import { usePricingData, type PricingLiveRow } from '../../lib/live'
import { money, num } from '../../lib/utils'

const SENSITIVITY_TONE: Record<string, 'clay' | 'neutral'> = {
  'Highly Price Sensitive': 'clay',
  'Insufficient evidence': 'neutral',
}

const shortSens = (s: string) => (s === 'Highly Price Sensitive' ? 'Highly sensitive' : 'No signal')

export default function Pricing() {
  const { push } = useToast()
  const [query, setQuery] = useState('')
  const [sensitivity, setSensitivity] = useState('all')
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [active, setActive] = useState<PricingLiveRow | null>(null)
  const { data, loading, error, refetch } = usePricingData()

  useEffect(() => {
    if (data && !compareA) {
      const ranked = data.ranked
      setCompareA(ranked[0]?.id ?? data.rows[0]?.id ?? '')
      setCompareB(ranked[1]?.id ?? data.rows[1]?.id ?? '')
    }
  }, [data, compareA])

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No pricing data.'} onRetry={refetch} />

  const rows = data.rows.filter((r) => {
    if (sensitivity !== 'all' && r.sensitivity !== sensitivity) return false
    const q = query.trim().toLowerCase()
    if (q && !r.name.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) return false
    return true
  })

  const a = data.rows.find((r) => r.id === compareA) ?? data.rows[0]
  const b = data.rows.find((r) => r.id === compareB) ?? data.rows[1] ?? data.rows[0]

  const copyText = (text: string, title: string) => {
    void navigator.clipboard.writeText(text).then(
      () => push({ title, tone: 'success' }),
      () => push({ title: 'Copy failed', tone: 'error' }),
    )
  }

  const columns: Column<PricingLiveRow>[] = [
    {
      key: 'name',
      header: 'Menu item',
      sort: (x, y) => x.name.localeCompare(y.name),
      render: (r) => (
        <div className="flex items-center gap-3">
          <FoodImage src={undefined} name={r.name} className="h-9 w-9 shrink-0" ratio="fill" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{r.name}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{r.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'current',
      header: 'Current price',
      align: 'right',
      sort: (x, y) => x.current - y.current,
      render: (r) => <span className="font-semibold tabular-nums text-ink">{money(r.current)}</span>,
    },
    {
      key: 'previous',
      header: 'Previous price',
      align: 'right',
      hideBelow: 'md',
      sort: (x, y) => x.previous - y.previous,
      render: (r) => <span className="tabular-nums text-ink-muted">{money(r.previous)}</span>,
    },
    {
      key: 'changePct',
      header: 'Change',
      align: 'right',
      sort: (x, y) => (x.changePct ?? -999) - (y.changePct ?? -999),
      render: (r) =>
        r.changePct == null ? (
          <span className="text-[12px] text-ink-faint">—</span>
        ) : (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums',
              r.changePct > 0 ? 'bg-ember-50 text-ember-700' : r.changePct < 0 ? 'bg-sky-50 text-sky-600' : 'bg-canvas-deep text-ink-muted',
            )}
          >
            {r.changePct > 0 ? '+' : ''}
            {r.changePct.toFixed(1)}%
          </span>
        ),
    },
    {
      key: 'units',
      header: 'Units/day Δ',
      align: 'right',
      hideBelow: 'lg',
      headerTip: 'Change in average daily units before vs after the price revision',
      sort: (x, y) => (x.unitsAfter ?? 0) - (x.unitsBefore ?? 0) - ((y.unitsAfter ?? 0) - (y.unitsBefore ?? 0)),
      render: (r) => {
        if (r.unitsBefore == null || r.unitsAfter == null) return <span className="text-[12px] text-ink-faint">—</span>
        const d = r.unitsAfter - r.unitsBefore
        return <span className={cn('tabular-nums font-semibold', d < 0 ? 'text-clay-600' : 'text-sage-600')}>{d > 0 ? '+' : ''}{d.toFixed(2)}</span>
      },
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      hideBelow: 'md',
      sort: (x, y) => x.margin - y.margin,
      render: (r) => <span className="font-bold tabular-nums text-ink">{r.margin.toFixed(1)}%</span>,
    },
    {
      key: 'sensitivity',
      header: 'Price sensitivity',
      hideBelow: 'lg',
      headerTip: 'Live elasticity verdict — most items lack enough price history for a signal',
      render: (r) => <Badge tone={SENSITIVITY_TONE[r.sensitivity] ?? 'neutral'}>{shortSens(r.sensitivity)}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '100px',
      render: (r) => (
        <Button size="xs" variant="secondary" icon="ChartColumn" onClick={() => setActive(r)}>
          Analyse
        </Button>
      ),
    },
  ]

  const changed = data.rows.filter((r) => r.changePct != null)
  const biggestUp = [...changed].sort((x, y) => (y.changePct ?? 0) - (x.changePct ?? 0))[0]
  const biggestDown = [...changed].sort((x, y) => (x.changePct ?? 0) - (y.changePct ?? 0))[0]
  const strongest = data.ranked[0]

  const stories = [
    biggestUp && {
      icon: 'ArrowUpRight',
      tone: 'ember',
      title: `Raised ${biggestUp.changePct?.toFixed(1)}% to ${money(biggestUp.current)}`,
      item: biggestUp.name,
      detail: biggestUp.unitsBefore != null && biggestUp.unitsAfter != null
        ? `Daily units moved ${biggestUp.unitsBefore.toFixed(2)} → ${biggestUp.unitsAfter.toFixed(2)}. Verdict: ${shortSens(biggestUp.sensitivity).toLowerCase()}.`
        : `Verdict: ${shortSens(biggestUp.sensitivity).toLowerCase()}.`,
    },
    biggestDown && {
      icon: 'ArrowDownRight',
      tone: 'sky',
      title: `Cut ${Math.abs(biggestDown.changePct ?? 0).toFixed(1)}% to ${money(biggestDown.current)}`,
      item: biggestDown.name,
      detail: biggestDown.unitsBefore != null && biggestDown.unitsAfter != null
        ? `Daily units moved ${biggestDown.unitsBefore.toFixed(2)} → ${biggestDown.unitsAfter.toFixed(2)}. Verdict: ${shortSens(biggestDown.sensitivity).toLowerCase()}.`
        : `Verdict: ${shortSens(biggestDown.sensitivity).toLowerCase()}.`,
    },
    strongest && {
      icon: 'Activity',
      tone: 'clay',
      title: `Strongest response: elasticity ${strongest.elasticity?.toFixed(2)}`,
      item: strongest.name,
      detail: strongest.reason,
    },
    {
      icon: 'Info',
      tone: 'gold',
      title: `${data.total - data.changed} items without a price signal`,
      item: 'Coverage note',
      detail: 'No revision or too few active days — verdicts appear as evidence accumulates.',
    },
  ].filter(Boolean) as { icon: string; tone: string; title: string; item: string; detail: string }[]

  const histA = (a ? data.histByItem[a.id] ?? [] : []).map((p) => ({ date: p.date, price: p.price }))

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Pricing Intelligence"
        subtitle="Live price revisions, demand response and margin outcomes across the menu."
        demoNote="Live elasticity verdicts — only items with a real revision and enough active days carry a signal."
        onRefresh={refetch}
        dataset="pricing"
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Items repriced" value={num(data.changed)} compare="with a real revision" icon="Tags" tone="ember" />
        <KpiCard label="Average price change" value={`${data.avgChange >= 0 ? '+' : ''}${data.avgChange.toFixed(1)}%`} compare="across repriced items" icon="TrendingUp" tone="sky" />
        <KpiCard label="Average margin" value={`${data.avgMargin.toFixed(1)}%`} compare="across analysed items" icon="Percent" tone="sage" />
        <KpiCard label="Highly sensitive items" value={num(data.highly)} compare="watch before repricing" icon="AlertTriangle" tone="clay" />
      </div>

      {/* Price impact */}
      <div className="mb-5 grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {stories.map((p) => (
          <Card key={p.title} className="p-4">
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl',
                p.tone === 'sage' ? 'bg-sage-50 text-sage-600' : p.tone === 'clay' ? 'bg-clay-50 text-clay-600' : p.tone === 'gold' ? 'bg-gold-50 text-gold-600' : p.tone === 'sky' ? 'bg-sky-50 text-sky-600' : 'bg-ember-50 text-ember-600',
              )}
            >
              <Icon name={p.icon} size={17} />
            </span>
            <p className="mt-2.5 text-[13px] font-semibold leading-snug text-ink">{p.title}</p>
            <p className="mt-0.5 text-[12px] font-medium text-ink-muted">{p.item}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">{p.detail}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="mb-5">
        <CardHeader title="Menu item price table" subtitle="Current versus previous pricing with live demand comparison" className="border-b" />
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search items…" className="w-full sm:w-64" />
          <Select value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} className="w-auto" aria-label="Sensitivity">
            <option value="all">Any sensitivity</option>
            <option value="Highly Price Sensitive">Highly price sensitive</option>
            <option value="Insufficient evidence">No signal yet</option>
          </Select>
          <span className="ml-auto text-[12.5px] text-ink-muted">
            <span className="font-semibold text-ink">{rows.length}</span> items shown
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          pageSize={10}
          onRowClick={(r) => setActive(r)}
          initialSort={{ key: 'margin', dir: 'desc' }}
          emptyTitle="No items match these filters"
          emptyMessage="Try a different sensitivity level or clear the search."
          emptyAction={
            <Button
              size="sm"
              variant="secondary"
              icon="RotateCcw"
              onClick={() => {
                setQuery('')
                setSensitivity('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      </Card>

      {/* Charts + comparison */}
      <div className="mb-5 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <ChartCard title={`Price history — ${a?.name ?? '—'}`} subtitle="Recorded price revisions for the compared item" height={280}>
          {histA.length === 0 ? (
            <p className="flex h-full items-center justify-center text-[13px] text-ink-muted">No price history recorded for this item.</p>
          ) : (
            <TrendChart
              data={histA}
              xKey="date"
              series={[{ key: 'price', label: 'Price', color: '#B54E17', type: 'line' }]}
              valueFormat={(v) => money(v)}
            />
          )}
        </ChartCard>

        <Card>
          <CardHeader title="Item comparison" subtitle="Compare two items side by side" className="border-b" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Select value={compareA} onChange={(e) => setCompareA(e.target.value)} options={data.rows.map((r) => ({ label: r.name, value: r.id }))} />
            <Select value={compareB} onChange={(e) => setCompareB(e.target.value)} options={data.rows.map((r) => ({ label: r.name, value: r.id }))} />
          </div>
          {a && b && (
            <div className="divide-y divide-line border-t border-line">
              {[
                { l: 'Current price', a: money(a.current), b: money(b.current) },
                { l: 'Price change', a: a.changePct != null ? `${a.changePct.toFixed(1)}%` : '—', b: b.changePct != null ? `${b.changePct.toFixed(1)}%` : '—' },
                { l: 'Units/day before → after', a: a.unitsBefore != null && a.unitsAfter != null ? `${a.unitsBefore.toFixed(2)} → ${a.unitsAfter.toFixed(2)}` : '—', b: b.unitsBefore != null && b.unitsAfter != null ? `${b.unitsBefore.toFixed(2)} → ${b.unitsAfter.toFixed(2)}` : '—' },
                { l: 'Elasticity', a: a.elasticity != null ? a.elasticity.toFixed(2) : '—', b: b.elasticity != null ? b.elasticity.toFixed(2) : '—' },
                { l: 'Margin', a: `${a.margin.toFixed(1)}%`, b: `${b.margin.toFixed(1)}%` },
                { l: 'Sensitivity', a: shortSens(a.sensitivity), b: shortSens(b.sensitivity) },
              ].map((r) => (
                <div key={r.l} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 px-4 py-2.5">
                  <span className="text-[12px] font-medium text-ink-muted">{r.l}</span>
                  <span className="text-[12.5px] font-semibold text-ink">{r.a}</span>
                  <span className="text-[12.5px] font-semibold text-ink">{r.b}</span>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-t border-line bg-canvas/60 px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Metric</span>
            <span className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-faint">{a?.name}</span>
            <span className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-faint">{b?.name}</span>
          </div>
        </Card>
      </div>

      {/* Elasticity ranking */}
      <Card className="mb-5">
        <CardHeader
          title="Elasticity ranking"
          subtitle="Items with a measured response, by strength"
          className="border-b"
          actions={<Badge tone="sage">Live</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                {['Menu item', 'Price change', 'Units/day before → after', 'Elasticity', 'Note'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ranked.map((r) => (
                <tr key={r.id} className="cursor-pointer border-t border-line/70 hover:bg-canvas/50" onClick={() => setActive(r)}>
                  <td className="px-4 py-3 text-[13px] font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold tabular-nums text-ink">
                    {r.changePct != null ? `${r.changePct > 0 ? '+' : ''}${r.changePct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">
                    {r.unitsBefore != null && r.unitsAfter != null ? `${r.unitsBefore.toFixed(2)} → ${r.unitsAfter.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-clay-50 px-2 py-0.5 text-[11.5px] font-bold tabular-nums text-clay-600">
                      {r.elasticity?.toFixed(2) ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-muted">{r.reason}</td>
                </tr>
              ))}
              {data.ranked.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[13px] text-ink-muted">No measured elasticity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sensitivity legend */}
      <div className="grid gap-3.5 md:grid-cols-2">
        {[
          { t: 'Highly Price Sensitive', d: 'Demand moved materially when price changed. Reprice carefully and test on one branch first.', tone: 'clay' as const },
          { t: 'Insufficient evidence', d: 'No revision yet, or too few active days around it, to measure a response. Most items sit here until evidence accumulates.', tone: 'neutral' as const },
        ].map((s) => (
          <Card key={s.t} className="p-4">
            <Badge tone={s.tone}>{s.t}</Badge>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-muted">{s.d}</p>
          </Card>
        ))}
      </div>

      {/* Drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.name ?? ''}
        subtitle={active ? `${active.category} · ${money(active.current)}` : ''}
        width="lg"
        badge={active ? <Badge tone={SENSITIVITY_TONE[active.sensitivity] ?? 'neutral'}>{active.sensitivity}</Badge> : undefined}
        footer={
          active && (
            <>
              <Button
                variant="secondary"
                icon="Copy"
                onClick={() => copyText(`${active.name}: ${money(active.previous)} → ${money(active.current)} (${active.changePct != null ? `${active.changePct.toFixed(1)}%` : 'no revision'}), margin ${active.margin.toFixed(1)}%, verdict ${active.sensitivity}.`, 'Pricing summary copied')}
              >
                Copy summary
              </Button>
              <Link to="/admin/menu">
                <Button icon="Pencil">Edit in Menu</Button>
              </Link>
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { l: 'Previous price', v: money(active.previous) },
                { l: 'Current price', v: money(active.current) },
                { l: 'Change', v: active.changePct != null ? `${active.changePct > 0 ? '+' : ''}${active.changePct.toFixed(1)}%` : 'No revision' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 font-display text-[18px] font-semibold text-ink">{s.v}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Demand response — live daily averages</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { l: 'Units/day before', v: active.unitsBefore != null ? active.unitsBefore.toFixed(2) : '—', sub: 'prior price' },
                  { l: 'Units/day after', v: active.unitsAfter != null ? active.unitsAfter.toFixed(2) : '—', sub: 'current price' },
                  { l: 'Elasticity', v: active.elasticity != null ? active.elasticity.toFixed(2) : '—', sub: active.reason },
                  { l: 'Units sold (total)', v: num(active.units), sub: 'lifetime' },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-line p-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                    <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-ink">{s.v}</p>
                    <p className="text-[11px] text-ink-faint">{s.sub}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Profitability</p>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex justify-between text-[12px] text-ink-muted">
                    <span>Margin — {active.margin.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-sage-500" style={{ width: `${Math.min(100, active.margin)}%` }} />
                  </div>
                </div>
                <div className="divide-y divide-line">
                  <MetricRow label="Revenue" value={money(active.revenue, { compact: true })} />
                  <MetricRow label="Contribution margin" value={money(active.contribution, { compact: true })} />
                  <MetricRow label="Price sensitivity" value={active.sensitivity} />
                  <MetricRow label="Category" value={active.category} />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Suggested pricing action</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                {active.sensitivity === 'Highly Price Sensitive'
                  ? 'Hold the current price and review portion size or cost instead — demand reacted strongly last time.'
                  : 'No demand signal yet. If you reprice, keep the change small and compare daily units before and after.'}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="xs"
                  onClick={() => copyText(`${active.name}: ${active.sensitivity === 'Highly Price Sensitive' ? 'Hold price; review cost/portion instead.' : 'No signal — reprice in small steps and compare daily units.'}`, 'Suggestion copied')}
                >
                  Copy suggestion
                </Button>
              </div>
            </Card>

            <LiveNote>Live elasticity verdicts and recorded revisions — prices are set per item, not per branch, in this dataset.</LiveNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
