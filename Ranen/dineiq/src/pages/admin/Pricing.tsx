import React, { useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, Select, Tooltip, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { ChartCard, LineSeries, TrendChart } from '../../components/charts'
import { DemoNote, FoodImage, KpiCard, MetricRow, Progress } from '../../components/shared'
import { LOCATION_PRICING, PRICE_HISTORY, PRICE_IMPACT, PRICING_ROWS, type PricingRow } from '../../lib/data/analytics'
import { pkr, num } from '../../lib/utils'

const SENSITIVITY_TONE: Record<string, 'clay' | 'gold' | 'sage'> = {
  'Highly Price Sensitive': 'clay',
  'Moderately Price Sensitive': 'gold',
  'Low Price Sensitivity': 'sage',
}

export default function Pricing() {
  const { push } = useToast()
  const [query, setQuery] = useState('')
  const [sensitivity, setSensitivity] = useState('all')
  const [compareA, setCompareA] = useState(PRICING_ROWS[0].id)
  const [compareB, setCompareB] = useState(PRICING_ROWS[4].id)
  const [active, setActive] = useState<PricingRow | null>(null)

  const rows = PRICING_ROWS.filter((r) => {
    if (sensitivity !== 'all' && r.sensitivity !== sensitivity) return false
    const q = query.trim().toLowerCase()
    if (q && !r.name.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) return false
    return true
  })

  const a = PRICING_ROWS.find((r) => r.id === compareA)!
  const b = PRICING_ROWS.find((r) => r.id === compareB)!

  const columns: Column<PricingRow>[] = [
    {
      key: 'name',
      header: 'Menu item',
      sort: (x, y) => x.name.localeCompare(y.name),
      render: (r) => (
        <div className="flex items-center gap-3">
          <FoodImage src={r.img} name={r.name} className="h-9 w-9 shrink-0" ratio="fill" />
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
      render: (r) => <span className="font-semibold tabular-nums text-ink">{pkr(r.current)}</span>,
    },
    {
      key: 'previous',
      header: 'Previous price',
      align: 'right',
      hideBelow: 'md',
      sort: (x, y) => x.previous - y.previous,
      render: (r) => <span className="tabular-nums text-ink-muted">{pkr(r.previous)}</span>,
    },
    {
      key: 'changePct',
      header: 'Change',
      align: 'right',
      sort: (x, y) => x.changePct - y.changePct,
      render: (r) => (
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
      header: 'Units Δ',
      align: 'right',
      hideBelow: 'lg',
      sort: (x, y) => x.unitsAfter - x.unitsBefore - (y.unitsAfter - y.unitsBefore),
      render: (r) => {
        const d = r.unitsAfter - r.unitsBefore
        return <span className={cn('tabular-nums font-semibold', d < 0 ? 'text-clay-600' : 'text-sage-600')}>{d > 0 ? '+' : ''}{d}</span>
      },
    },
    {
      key: 'revenue',
      header: 'Revenue Δ',
      align: 'right',
      hideBelow: 'xl',
      sort: (x, y) => x.revenueAfter - x.revenueBefore - (y.revenueAfter - y.revenueBefore),
      render: (r) => {
        const d = r.revenueAfter - r.revenueBefore
        return <span className={cn('tabular-nums font-semibold', d >= 0 ? 'text-sage-600' : 'text-clay-600')}>{d >= 0 ? '+' : '−'} {pkr(Math.abs(d), { compact: true })}</span>
      },
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      hideBelow: 'md',
      sort: (x, y) => x.marginAfter - y.marginAfter,
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <span className="text-[12px] text-ink-faint">{r.marginBefore.toFixed(1)}%</span>
          <Icon name="ArrowRight" size={11} className="text-ink-faint" />
          <span className={cn('text-[12.5px] font-bold', r.marginAfter >= r.marginBefore ? 'text-sage-600' : 'text-clay-600')}>
            {r.marginAfter.toFixed(1)}%
          </span>
        </div>
      ),
    },
    {
      key: 'sensitivity',
      header: 'Price sensitivity',
      hideBelow: 'lg',
      render: (r) => <Badge tone={SENSITIVITY_TONE[r.sensitivity] ?? 'neutral'}>{r.sensitivity.replace(' Price Sensitivity', '').replace(' Sensitive', ' sensitive')}</Badge>,
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

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Pricing Intelligence"
        subtitle="Compare price revisions, demand response and margin outcomes across the demo menu."
        demoNote="Price sensitivity labels and impact figures are static demonstration values. No elasticity model is applied."
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Items repriced" value="7" compare="in the demo period" icon="Tags" tone="ember" />
        <KpiCard label="Average price change" value="+4.7%" compare="across repriced items" icon="TrendingUp" tone="sky" />
        <KpiCard label="Margin change" value="+1.2 pts" compare="illustrative" icon="Percent" tone="sage" />
        <KpiCard label="Highly sensitive items" value="3" compare="watch before repricing" icon="AlertTriangle" tone="clay" />
      </div>

      {/* Price impact */}
      <div className="mb-5 grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {PRICE_IMPACT.map((p) => (
          <Card key={p.id} className="p-4">
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl',
                p.tone === 'sage' ? 'bg-sage-50 text-sage-600' : p.tone === 'clay' ? 'bg-clay-50 text-clay-600' : p.tone === 'gold' ? 'bg-gold-50 text-gold-600' : 'bg-sky-50 text-sky-600',
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
        <CardHeader title="Menu item price table" subtitle="Current versus previous pricing with demo demand comparison" className="border-b" />
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search items…" className="w-full sm:w-64" />
          <Select value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} className="w-auto" aria-label="Sensitivity">
            <option value="all">Any sensitivity</option>
            <option value="Highly Price Sensitive">Highly price sensitive</option>
            <option value="Moderately Price Sensitive">Moderately price sensitive</option>
            <option value="Low Price Sensitivity">Low price sensitivity</option>
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
          initialSort={{ key: 'revenue', dir: 'desc' }}
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
        <ChartCard title="Price history" subtitle="Demo price and unit series for the Signature Smash" height={280}>
          <TrendChart
            data={PRICE_HISTORY}
            xKey="month"
            series={[
              { key: 'price', label: 'Price', color: '#B54E17', type: 'line' },
              { key: 'units', label: 'Units sold', color: '#2F6FA8', type: 'bar' },
            ]}
            valueFormat={(v, n) => (n === 'Price' ? pkr(v) : `${num(v)} units`)}
          />
        </ChartCard>

        <Card>
          <CardHeader title="Item comparison" subtitle="Compare two items side by side" className="border-b" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Select value={compareA} onChange={(e) => setCompareA(e.target.value)} options={PRICING_ROWS.map((r) => ({ label: r.name, value: r.id }))} />
            <Select value={compareB} onChange={(e) => setCompareB(e.target.value)} options={PRICING_ROWS.map((r) => ({ label: r.name, value: r.id }))} />
          </div>
          <div className="divide-y divide-line border-t border-line">
            {[
              { l: 'Current price', a: pkr(a.current), b: pkr(b.current) },
              { l: 'Price change', a: `${a.changePct.toFixed(1)}%`, b: `${b.changePct.toFixed(1)}%` },
              { l: 'Units before → after', a: `${a.unitsBefore} → ${a.unitsAfter}`, b: `${b.unitsBefore} → ${b.unitsAfter}` },
              { l: 'Revenue change', a: `${a.revenueAfter - a.revenueBefore >= 0 ? '+' : '−'}${pkr(Math.abs(a.revenueAfter - a.revenueBefore), { compact: true })}`, b: `${b.revenueAfter - b.revenueBefore >= 0 ? '+' : '−'}${pkr(Math.abs(b.revenueAfter - b.revenueBefore), { compact: true })}` },
              { l: 'Margin', a: `${a.marginAfter.toFixed(1)}%`, b: `${b.marginAfter.toFixed(1)}%` },
              { l: 'Sensitivity', a: a.sensitivity, b: b.sensitivity },
            ].map((r) => (
              <div key={r.l} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 px-4 py-2.5">
                <span className="text-[12px] font-medium text-ink-muted">{r.l}</span>
                <span className="text-[12.5px] font-semibold text-ink">{r.a}</span>
                <span className="text-[12.5px] font-semibold text-ink">{r.b}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-t border-line bg-canvas/60 px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Metric</span>
            <span className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-faint">{a.name}</span>
            <span className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-faint">{b.name}</span>
          </div>
        </Card>
      </div>

      {/* Location pricing */}
      <Card className="mb-5">
        <CardHeader
          title="Location-based pricing comparison"
          subtitle="Demo prices per branch"
          className="border-b"
          actions={<Badge tone="neutral">PKR</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                {['Menu item', 'Clifton Branch', 'Downtown Branch', 'Gulshan Branch', 'Spread'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LOCATION_PRICING.map((r) => {
                const prices = [r.clifton, r.downtown, r.gulshan]
                const spread = Math.max(...prices) - Math.min(...prices)
                return (
                  <tr key={r.item} className="border-t border-line/70">
                    <td className="px-4 py-3 text-[13px] font-medium text-ink">{r.item}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold tabular-nums text-ink">{pkr(r.clifton)}</td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">{pkr(r.downtown)}</td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-ink-soft">{pkr(r.gulshan)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-canvas-deep px-2 py-0.5 text-[11.5px] font-bold text-ink-muted">
                        {pkr(spread)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sensitivity legend */}
      <div className="grid gap-3.5 md:grid-cols-3">
        {[
          { t: 'Highly Price Sensitive', d: 'Units moved materially when price changed in the demo data. Reprice carefully and test on one branch.', tone: 'clay' as const },
          { t: 'Moderately Price Sensitive', d: 'A measured response to price change. Small, staged revisions are usually safer.', tone: 'gold' as const },
          { t: 'Low Price Sensitivity', d: 'Demand held through price revisions in the demo data. Margin can often be improved here.', tone: 'sage' as const },
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
        subtitle={active ? `${active.category} · ${pkr(active.current)}` : ''}
        width="lg"
        badge={active ? <Badge tone={SENSITIVITY_TONE[active.sensitivity] ?? 'neutral'}>{active.sensitivity}</Badge> : undefined}
        footer={
          active && (
            <>
              <Button variant="secondary" icon="Pencil" onClick={() => push({ title: 'Price edit saved (demo)', tone: 'success' })}>
                Adjust price
              </Button>
              <Button icon="Check" onClick={() => push({ title: 'Pricing action saved (demo)', tone: 'success' })}>
                Save action
              </Button>
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { l: 'Previous price', v: pkr(active.previous) },
                { l: 'Current price', v: pkr(active.current) },
                { l: 'Change', v: `${active.changePct > 0 ? '+' : ''}${active.changePct.toFixed(1)}%` },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 font-display text-[18px] font-semibold text-ink">{s.v}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Demand comparison — demo values</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { l: 'Units before', v: num(active.unitsBefore), sub: 'prior price' },
                  { l: 'Units after', v: num(active.unitsAfter), sub: 'current price' },
                  { l: 'Revenue before', v: pkr(active.revenueBefore, { compact: true }), sub: 'prior price' },
                  { l: 'Revenue after', v: pkr(active.revenueAfter, { compact: true }), sub: 'current price' },
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
              <p className="text-[13px] font-semibold text-ink">Profitability comparison</p>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex justify-between text-[12px] text-ink-muted">
                    <span>Before — {active.marginBefore.toFixed(1)}%</span>
                    <span>After — {active.marginAfter.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-ink-faint" style={{ width: `${active.marginBefore}%` }} />
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div
                        className={cn('h-full rounded-full', active.marginAfter >= active.marginBefore ? 'bg-sage-500' : 'bg-clay-500')}
                        style={{ width: `${active.marginAfter}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-line">
                  <MetricRow label="Margin change" value={`${(active.marginAfter - active.marginBefore >= 0 ? '+' : '')}${(active.marginAfter - active.marginBefore).toFixed(1)} pts`} />
                  <MetricRow label="Price sensitivity" value={active.sensitivity} />
                  <MetricRow label="Category" value={active.category} />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Suggested pricing action</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                {active.sensitivity === 'Highly Price Sensitive'
                  ? 'Hold the current price and review portion size or cost instead. A further increase risks volume loss in this demo scenario.'
                  : active.sensitivity === 'Moderately Price Sensitive'
                    ? 'Consider a small staged increase of 2–3% and monitor units for two weeks before deciding.'
                    : 'There may be room to raise price slightly. Test on one branch and compare margin before rolling out.'}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="xs" onClick={() => push({ title: 'Action accepted (demo)', tone: 'success' })}>
                  Accept suggestion
                </Button>
                <Button size="xs" variant="ghost" onClick={() => push({ title: 'Suggestion dismissed', tone: 'info' })}>
                  Dismiss
                </Button>
              </div>
            </Card>

            <DemoNote>Price sensitivity is a demonstration label. No elasticity calculation is performed.</DemoNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
