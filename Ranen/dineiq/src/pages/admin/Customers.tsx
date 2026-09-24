import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, Select, Tabs, Tooltip, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { AreaSeries, BarSeries, ChartCard, DonutChart, LineSeries, RadarSeries, TrendChart } from '../../components/charts'
import { DemoNote, KpiCard, MetricRow, Progress, ProgressRing } from '../../components/shared'
import {
  CUSTOMERS, CUSTOMER_KPIS, CUSTOMER_TIMELINE, FAVOURITE_CATEGORIES, SEGMENTS, SEGMENT_TREND, TIME_PREFERENCE, type Customer,
} from '../../lib/data/analytics'
import { pkr, num } from '../../lib/utils'

const SEG_COLOR: Record<string, string> = Object.fromEntries(SEGMENTS.map((s) => [s.name, s.color]))

export default function Customers() {
  const [tab, setTab] = useState('segments')
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState('all')
  const [active, setActive] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)

  const rows = useMemo(() => {
    let r = CUSTOMERS
    if (segment !== 'all') r = r.filter((c) => c.segment === segment)
    const q = query.trim().toLowerCase()
    if (q) r = r.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q))
    return r
  }, [segment, query])

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      sort: (a, b) => a.name.localeCompare(b.name),
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas-deep text-[12px] font-bold text-ink-soft">
            {c.name.split(' ').map((n) => n[0]).join('')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{c.name}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{c.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      sort: (a, b) => a.segment.localeCompare(b.segment),
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: SEG_COLOR[c.segment] }}>
          <span className="h-2 w-2 rounded-full" style={{ background: SEG_COLOR[c.segment] }} />
          {c.segment.replace(' Customers', '')}
        </span>
      ),
    },
    { key: 'orders', header: 'Orders', align: 'right', sort: (a, b) => a.orders - b.orders, render: (c) => <span className="tabular-nums text-ink-soft">{c.orders}</span> },
    { key: 'spend', header: 'Lifetime spend', align: 'right', sort: (a, b) => a.spend - b.spend, render: (c) => <span className="font-semibold tabular-nums text-ink">{pkr(c.spend)}</span> },
    { key: 'aov', header: 'Avg order', align: 'right', hideBelow: 'lg', sort: (a, b) => a.aov - b.aov, render: (c) => <span className="tabular-nums text-ink-soft">{pkr(c.aov)}</span> },
    { key: 'recency', header: 'Recency', align: 'right', hideBelow: 'xl', sort: (a, b) => a.recency - b.recency, render: (c) => <span className="tabular-nums text-ink-muted">{c.recency}d</span> },
    {
      key: 'rfm',
      header: 'RFM',
      align: 'center',
      hideBelow: 'md',
      headerTip: 'Illustrative recency–frequency–monetary score',
      render: (c) => <span className="font-mono text-[12px] font-bold text-ink">{c.rfm}</span>,
    },
    {
      key: 'lastOrder',
      header: 'Last order',
      hideBelow: 'lg',
      render: (c) => <span className="text-[12.5px] text-ink-muted">{c.lastOrder}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '80px',
      render: (c) => (
        <Button size="xs" variant="secondary" icon="User" onClick={() => setActive(c)}>
          Profile
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Customer Intelligence"
        subtitle="Segments, RFM distribution and behaviour patterns across the demo customer base."
        demoNote="All segments, RFM scores and metrics are static UI examples. No clustering or scoring algorithm is used."
        onRefresh={() => {
          setLoading(true)
          setTimeout(() => setLoading(false), 800)
        }}
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {CUSTOMER_KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} change={k.change} icon={k.icon} tone={k.tone} compare="vs previous period" />
        ))}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { label: 'Segments', value: 'segments' },
          { label: 'RFM analysis', value: 'rfm' },
          { label: 'Behaviour', value: 'behaviour' },
          { label: 'Customers', value: 'customers' },
        ]}
      />

      {tab === 'segments' && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
            <ChartCard title="Segment distribution" subtitle="Share of demo customer base" height={300}>
              <DonutChart
                data={SEGMENTS.map((s) => ({ name: s.name.replace(' Customers', ''), value: s.share, color: s.color }))}
                centerValue="2,914"
                centerLabel="Customers"
                valueFormat={(v) => `${v}%`}
              />
            </ChartCard>

            <ChartCard title="Segment growth" subtitle="Demo customer counts over six months" height={300}>
              <TrendChart
                data={SEGMENT_TREND}
                xKey="month"
                series={[
                  { key: 'loyal', label: 'High-value loyal', color: '#4A7139', type: 'area' },
                  { key: 'frequent', label: 'Frequent', color: '#2F6FA8', type: 'line' },
                  { key: 'promo', label: 'Promotion-driven', color: '#C08A16', type: 'line' },
                  { key: 'atRisk', label: 'At-risk', color: '#96352C', type: 'line' },
                ]}
                valueFormat={(v) => `${num(v)} customers`}
              />
            </ChartCard>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {SEGMENTS.map((s) => (
              <Card key={s.key} className="overflow-hidden">
                <div className="flex items-start justify-between gap-3 p-4 pb-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: s.color }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{s.desc}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-[22px] font-semibold text-ink">{num(s.count)}</p>
                    <p className="text-[11px] font-semibold text-ink-faint">{s.share}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
                  {[
                    { l: 'Avg order', v: pkr(s.aov) },
                    { l: 'Orders / mo', v: s.freq.toFixed(1) },
                    { l: 'Est. CLV', v: pkr(s.clv, { compact: true }) },
                  ].map((m) => (
                    <div key={m.l} className="px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{m.l}</p>
                      <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink">{m.v}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'rfm' && (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.3fr]">
          <ChartCard title="RFM profile by segment" subtitle="Illustrative scores, 1–9 scale" height={330}>
            <RadarSeries
              data={[
                { subject: 'Recency', 'High-Value Loyal': 9, 'Promotion-Driven': 5, 'At-Risk': 2, New: 6 },
                { subject: 'Frequency', 'High-Value Loyal': 9, 'Promotion-Driven': 5, 'At-Risk': 3, New: 1 },
                { subject: 'Monetary', 'High-Value Loyal': 9, 'Promotion-Driven': 4, 'At-Risk': 6, New: 3 },
                { subject: 'Basket size', 'High-Value Loyal': 8, 'Promotion-Driven': 3, 'At-Risk': 6, New: 3 },
                { subject: 'Retention', 'High-Value Loyal': 9, 'Promotion-Driven': 4, 'At-Risk': 2, New: 2 },
              ]}
              keys={[
                { key: 'High-Value Loyal', label: 'High-Value Loyal', color: '#4A7139' },
                { key: 'Promotion-Driven', label: 'Promotion-Driven', color: '#C08A16' },
                { key: 'At-Risk', label: 'At-Risk', color: '#96352C' },
                { key: 'New', label: 'New', color: '#B54E17' },
              ]}
            />
          </ChartCard>

          <Card>
            <CardHeader
              title="RFM scoring grid"
              subtitle="Illustrative placement — not computed by a scoring model"
              actions={<Badge tone="neutral">Demo</Badge>}
            />
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-line">
                    {['Segment', 'Recency', 'Frequency', 'Monetary', 'Score', 'Typical action'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SEGMENTS.map((s) => {
                    const r = s.key === 'high-value' ? [9, 9, 9] : s.key === 'frequent' ? [8, 7, 6] : s.key === 'promo' ? [5, 5, 4] : s.key === 'at-risk' ? [2, 3, 6] : s.key === 'new' ? [6, 1, 3] : [4, 2, 2]
                    const action =
                      s.key === 'high-value' ? 'Protect and reward' : s.key === 'frequent' ? 'Grow basket with bundles' : s.key === 'promo' ? 'Reduce discount reliance' : s.key === 'at-risk' ? 'Win-back campaign' : s.key === 'new' ? 'Onboarding sequence' : 'Re-activate with offers'
                    return (
                      <tr key={s.key} className="border-t border-line/70">
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: s.color }}>
                            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                            {s.name.replace(' Customers', '')}
                          </span>
                        </td>
                        {r.map((v, i) => (
                          <td key={i} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Progress value={v * 11.1} className="w-16" tone={v >= 7 ? 'sage' : v >= 4 ? 'gold' : 'clay'} height={5} />
                              <span className="text-[12px] font-semibold tabular-nums text-ink">{v}</span>
                            </div>
                          </td>
                        ))}
                        <td className="px-3 py-2.5 font-mono text-[12px] font-bold text-ink">
                          {r.join('-')}
                        </td>
                        <td className="px-3 py-2.5 text-[12.5px] text-ink-muted">{action}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-4 py-3">
              <DemoNote>Recency, frequency and monetary scores shown here are hand-written demonstration values.</DemoNote>
            </div>
          </Card>
        </div>
      )}

      {tab === 'behaviour' && (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <ChartCard title="Favourite categories" subtitle="Share of demo order volume" height={280}>
            <BarSeries
              data={FAVOURITE_CATEGORIES}
              xKey="category"
              layout="vertical"
              bars={[{ key: 'value', label: 'Share %', color: '#B54E17' }]}
              valueFormat={(v) => `${v}%`}
              showLegend={false}
            />
          </ChartCard>

          <ChartCard title="Time-of-day preferences" subtitle="Orders by channel and time slot — demo values" height={280}>
            <BarSeries
              data={TIME_PREFERENCE}
              xKey="slot"
              bars={[
                { key: 'dineIn', label: 'Dine-in', color: '#B54E17', stackId: 'a' },
                { key: 'delivery', label: 'Delivery', color: '#5E8C4A', stackId: 'a' },
                { key: 'takeaway', label: 'Takeaway', color: '#C08A16', stackId: 'a' },
              ]}
              valueFormat={(v) => `${v} orders`}
            />
          </ChartCard>

          <ChartCard title="Repeat purchase trend" subtitle="Share of customers ordering more than once" height={250}>
            <AreaSeries
              data={[
                { m: 'Apr', v: 34.2 }, { m: 'May', v: 36.1 }, { m: 'Jun', v: 37.4 },
                { m: 'Jul', v: 39.0 }, { m: 'Aug', v: 40.1 }, { m: 'Sep', v: 41.2 },
              ]}
              xKey="m"
              yKey="v"
              name="Repeat rate"
              valueFormat={(v) => `${v}%`}
            />
          </ChartCard>

          <Card>
            <CardHeader title="Customer activity timeline" subtitle="Demo activity for one selected customer" className="border-b" />
            <div className="p-5">
              <ol className="space-y-4">
                {CUSTOMER_TIMELINE.map((t, i) => (
                  <li key={t.title} className="flex gap-3.5">
                    <span className="relative flex flex-col items-center">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `${t.tone}1A`, color: t.tone }}>
                        <Icon name={i === 0 ? 'ShoppingBag' : i === 1 ? 'Store' : i === 2 ? 'BadgePercent' : i === 3 ? 'XCircle' : 'Star'} size={14} />
                      </span>
                      {i < CUSTOMER_TIMELINE.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
                    </span>
                    <span className="pb-1">
                      <span className="block text-[13px] font-semibold text-ink">{t.title}</span>
                      <span className="block text-[12px] text-ink-muted">{t.detail}</span>
                      <span className="mt-0.5 block text-[11.5px] text-ink-faint">{t.time}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </div>
      )}

      {tab === 'customers' && (
        <div className="mt-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <SearchInput value={query} onChange={setQuery} placeholder="Search name, email or phone…" className="w-full sm:w-72" />
              <Select value={segment} onChange={(e) => setSegment(e.target.value)} className="w-auto" aria-label="Segment">
                <option value="all">All segments</option>
                {SEGMENTS.map((s) => (
                  <option key={s.key} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <span className="ml-auto text-[12.5px] text-ink-muted">
                <span className="font-semibold text-ink">{rows.length}</span> of {CUSTOMERS.length} demo customers
              </span>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(c) => c.id}
              pageSize={8}
              onRowClick={(c) => setActive(c)}
              initialSort={{ key: 'spend', dir: 'desc' }}
              emptyTitle="No customers match this search"
              emptyMessage="Try a different name, email, phone number or segment."
              emptyAction={
                <Button
                  size="sm"
                  variant="secondary"
                  icon="RotateCcw"
                  onClick={() => {
                    setQuery('')
                    setSegment('all')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </Card>
        </div>
      )}

      {/* Customer drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.name ?? ''}
        subtitle={active ? `${active.email} · ${active.phone}` : ''}
        width="lg"
        badge={
          active ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
              style={{ background: `${SEG_COLOR[active.segment]}1A`, color: SEG_COLOR[active.segment] }}
            >
              {active.segment}
            </span>
          ) : undefined
        }
        footer={
          active && (
            <>
              <Button variant="secondary" icon="Mail">
                Send offer
              </Button>
              <Link to="/admin/recommendations">
                <Button icon="Lightbulb">Related recommendations</Button>
              </Link>
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { l: 'Orders', v: `${active.orders}` },
                { l: 'Lifetime spend', v: pkr(active.spend) },
                { l: 'Avg order', v: pkr(active.aov) },
                { l: 'Est. CLV', v: pkr(SEGMENTS.find((s) => s.name === active.segment)?.clv ?? 0, { compact: true }) },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 font-display text-[18px] font-semibold text-ink">{s.v}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-5">
                <ProgressRing value={(active.recency / 90) * 100} color="#96352C" size={64} stroke={6}>
                  {active.recency}d
                </ProgressRing>
                <ProgressRing value={active.frequency * 11.1} color="#2F6FA8" size={64} stroke={6}>
                  {active.frequency}
                </ProgressRing>
                <ProgressRing value={active.monetary * 11.1} color="#4A7139" size={64} stroke={6}>
                  {active.monetary}
                </ProgressRing>
                <div className="min-w-[160px] flex-1">
                  <p className="text-[12.5px] font-semibold text-ink">RFM score {active.rfm}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                    Illustrative recency, frequency and monetary scores for interface demonstration.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Profile</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Segment" value={active.segment} />
                <MetricRow label="Preferred channel" value={active.channel} />
                <MetricRow label="Favourite dishes" value={active.favourites.join(', ')} />
                <MetricRow label="Customer since" value={active.joined} />
                <MetricRow label="City" value={active.city} />
                <MetricRow label="Last order" value={active.lastOrder} />
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Activity timeline</p>
              <ol className="mt-3 space-y-3">
                {CUSTOMER_TIMELINE.slice(0, 4).map((t, i) => (
                  <li key={t.title} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: t.tone }} />
                    <span>
                      <span className="block text-[12.5px] font-medium text-ink">{t.title}</span>
                      <span className="block text-[11.5px] text-ink-muted">
                        {t.detail} · {t.time}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>

            <DemoNote>Demo customer profile. No personal data is collected or stored in this prototype.</DemoNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
