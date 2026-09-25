import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, Select, Tabs, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { AreaSeries, BarSeries, ChartCard, DonutChart, RadarSeries } from '../../components/charts'
import { KpiCard, LiveNote, MetricRow, Progress, ProgressRing } from '../../components/shared'
import { PageError, PageLoader, fmtDate, timeAgoISO } from '../../lib/api'
import { useCustomerDetail, useCustomersData, type LiveCustomer } from '../../lib/live'
import { money, num } from '../../lib/utils'

export default function Customers() {
  const [tab, setTab] = useState('segments')
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState('all')
  const [active, setActive] = useState<LiveCustomer | null>(null)
  const { data, loading, error, refetch } = useCustomersData()
  const { detail } = useCustomerDetail(active?.id ?? null)
  const { detail: timelineDetail } = useCustomerDetail(data?.timelineId ?? null)
  const { push } = useToast()

  const rows = useMemo(() => {
    let r = data?.customers ?? []
    if (segment !== 'all') r = r.filter((c) => c.segment === segment)
    const q = query.trim().toLowerCase()
    if (q) r = r.filter((c) => c.id.toLowerCase().includes(q))
    return r
  }, [data, segment, query])

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No customer data.'} onRetry={refetch} />

  const columns: Column<LiveCustomer>[] = [
    {
      key: 'id',
      header: 'Customer',
      sort: (a, b) => a.id.localeCompare(b.id),
      render: (c) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: c.color }}
          >
            {c.id.replace('CUST', '').slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-[12.5px] font-semibold text-ink">{c.id}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{c.segment.replace(' Customers', '')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      sort: (a, b) => a.segment.localeCompare(b.segment),
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: c.color }}>
          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
          {c.segment.replace(' Customers', '')}
        </span>
      ),
    },
    { key: 'orders', header: 'Orders', align: 'right', sort: (a, b) => a.orders - b.orders, render: (c) => <span className="tabular-nums text-ink-soft">{c.orders}</span> },
    { key: 'spend', header: 'Lifetime spend', align: 'right', sort: (a, b) => a.spend - b.spend, render: (c) => <span className="font-semibold tabular-nums text-ink">{money(c.spend)}</span> },
    { key: 'aov', header: 'Avg order', align: 'right', hideBelow: 'lg', sort: (a, b) => a.aov - b.aov, render: (c) => <span className="tabular-nums text-ink-soft">{money(c.aov)}</span> },
    { key: 'recency', header: 'Recency', align: 'right', hideBelow: 'xl', sort: (a, b) => a.recency - b.recency, render: (c) => <span className="tabular-nums text-ink-muted">{c.recency}d</span> },
    {
      key: 'rfm',
      header: 'RFM',
      align: 'center',
      hideBelow: 'md',
      headerTip: 'Live recency–frequency–monetary score from the segmentation pipeline',
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

  const k = data.kpis
  const churnCritical = k.churnBands.find((b) => b.band === 'critical')?.n ?? 0

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Customer Intelligence"
        subtitle="Live RFM segments, behaviour patterns and profiles across the customer base."
        demoNote="Live pipeline segments and RFM scores — customer records are anonymized IDs by design."
        onRefresh={refetch}
        dataset="customer_segmentation"
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total customers', value: num(k.total), icon: 'Users', tone: 'sky', compare: 'profiled base' },
          { label: 'Avg lifetime value', value: money(k.avgValue), icon: 'Wallet', tone: 'ember', compare: 'per customer' },
          { label: 'Avg orders', value: k.avgOrders.toFixed(1), icon: 'ReceiptText', tone: 'gold', compare: 'per customer' },
          { label: 'High-value loyal', value: num(k.hvCount), icon: 'Crown', tone: 'sage', compare: `${k.total ? ((k.hvCount / k.total) * 100).toFixed(1) : 0}% of base` },
          { label: 'At-risk', value: num(k.arCount), icon: 'AlertTriangle', tone: 'clay', compare: 'need win-back' },
          { label: 'Critical churn risk', value: num(churnCritical), icon: 'TrendingDown', tone: 'clay', compare: 'highest band' },
        ].map((c) => (
          <KpiCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} compare={c.compare} />
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
            <ChartCard title="Segment distribution" subtitle="Share of live customer base" height={300}>
              <DonutChart
                data={data.segCards.map((s) => ({ name: s.name.replace(' Customers', ''), value: s.share, color: s.color }))}
                centerValue={num(k.total)}
                centerLabel="Customers"
                valueFormat={(v) => `${v}%`}
              />
            </ChartCard>

            <ChartCard title="Segment value" subtitle="Lifetime revenue by segment — live" height={300}>
              <BarSeries
                data={data.segValue}
                xKey="segment"
                layout="vertical"
                bars={[{ key: 'value', label: 'Revenue', color: '#B54E17' }]}
                valueFormat={(v) => money(v, { compact: true })}
                showLegend={false}
              />
            </ChartCard>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {data.segCards.map((s) => (
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
                    { l: 'Avg order', v: money(s.aov) },
                    { l: 'Avg orders', v: s.avgOrders.toFixed(1) },
                    { l: 'Total value', v: money(s.totalValue, { compact: true }) },
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
          <ChartCard title="RFM profile by segment" subtitle="Live mean scores, 1–5 scale" height={330}>
            <RadarSeries
              data={data.radar}
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
              subtitle="Live mean scores per segment — 1–5 scale"
              actions={<Badge tone="sage">Live</Badge>}
            />
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-line">
                    {['Segment', 'Recency', 'Frequency', 'Monetary', 'Score', 'Suggested play'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.segCards.map((s) => {
                    const means = [s.meanR, s.meanF, s.meanM]
                    return (
                      <tr key={s.key} className="border-t border-line/70">
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: s.color }}>
                            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                            {s.name.replace(' Customers', '')}
                          </span>
                        </td>
                        {means.map((v, i) => (
                          <td key={i} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Progress value={v * 20} className="w-16" tone={v >= 3.5 ? 'sage' : v >= 2.5 ? 'gold' : 'clay'} height={5} />
                              <span className="text-[12px] font-semibold tabular-nums text-ink">{v.toFixed(1)}</span>
                            </div>
                          </td>
                        ))}
                        <td className="px-3 py-2.5 font-mono text-[12px] font-bold text-ink">
                          {means.map((v) => v.toFixed(1)).join('-')}
                        </td>
                        <td className="px-3 py-2.5 text-[12.5px] text-ink-muted">{s.play}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-4 py-3">
              <LiveNote>Scores are live segment means from the RFM pipeline. Plays are suggested next actions, not automation.</LiveNote>
            </div>
          </Card>
        </div>
      )}

      {tab === 'behaviour' && (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <ChartCard title="Favourite categories" subtitle="Share of revenue in range — live" height={280}>
            <BarSeries
              data={data.favCats}
              xKey="category"
              layout="vertical"
              bars={[{ key: 'value', label: 'Share %', color: '#B54E17' }]}
              valueFormat={(v) => `${v}%`}
              showLegend={false}
            />
          </ChartCard>

          <ChartCard title="Orders by channel" subtitle="Orders in range — live" height={280}>
            <BarSeries
              data={data.channelBars}
              xKey="channel"
              bars={[{ key: 'orders', label: 'Orders', color: '#2F6FA8' }]}
              valueFormat={(v) => `${num(v)} orders`}
              showLegend={false}
            />
          </ChartCard>

          <ChartCard title="Active customers trend" subtitle="Monthly active customers — live" height={250}>
            <AreaSeries
              data={data.trends}
              xKey="m"
              yKey="active"
              name="Active customers"
              valueFormat={(v) => `${num(v)} customers`}
            />
          </ChartCard>

          <Card>
            <CardHeader title="Customer activity timeline" subtitle={`Live orders · ${data.timelineId ?? '—'}`} className="border-b" />
            <div className="p-5">
              {(timelineDetail?.recent_orders ?? []).length === 0 ? (
                <p className="text-[13px] text-ink-muted">No recent orders found.</p>
              ) : (
                <ol className="space-y-4">
                  {(timelineDetail?.recent_orders ?? []).slice(0, 5).map((o, i, arr) => (
                    <li key={o.order_id} className="flex gap-3.5">
                      <span className="relative flex flex-col items-center">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ember-50 text-ember-600">
                          <Icon name="ShoppingBag" size={14} />
                        </span>
                        {i < arr.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
                      </span>
                      <span className="pb-1">
                        <span className="block font-mono text-[13px] font-semibold text-ink">{o.order_id}</span>
                        <span className="block text-[12px] text-ink-muted">{o.channel} · {money(o.total_amount)} · {o.status}</span>
                        <span className="mt-0.5 block text-[11.5px] text-ink-faint">{timeAgoISO(o.order_datetime)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'customers' && (
        <div className="mt-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <SearchInput value={query} onChange={setQuery} placeholder="Search customer ID…" className="w-full sm:w-72" />
              <Select value={segment} onChange={(e) => setSegment(e.target.value)} className="w-auto" aria-label="Segment">
                <option value="all">All segments</option>
                {data.segCards.map((s) => (
                  <option key={s.key} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <span className="ml-auto text-[12.5px] text-ink-muted">
                <span className="font-semibold text-ink">{rows.length}</span> of {num(data.total)} live customers
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
              emptyMessage="Try a different customer ID or segment."
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
        title={active?.id ?? ''}
        subtitle={active ? `Customer since ${active.joined} · ${active.tenure} days tenure` : ''}
        width="lg"
        badge={
          active ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
              style={{ background: `${active.color}1A`, color: active.color }}
            >
              {active.segment}
            </span>
          ) : undefined
        }
        footer={
          active && (
            <>
              <Button
                variant="secondary"
                icon="Copy"
                onClick={() => {
                  void navigator.clipboard.writeText(active.id).then(
                    () => push({ title: 'Customer ID copied', tone: 'success' }),
                    () => push({ title: 'Copy failed', tone: 'error' }),
                  )
                }}
              >
                Copy ID
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
                { l: 'Lifetime spend', v: money(active.spend) },
                { l: 'Avg order', v: money(active.aov) },
                { l: 'Basket size', v: `${active.basket} items` },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 font-display text-[18px] font-semibold text-ink">{s.v}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-5">
                <ProgressRing value={Math.min(100, (active.recency / 90) * 100)} color="#96352C" size={64} stroke={6}>
                  {active.recency}d
                </ProgressRing>
                <ProgressRing value={active.F * 20} color="#2F6FA8" size={64} stroke={6}>
                  {active.F}
                </ProgressRing>
                <ProgressRing value={active.M * 20} color="#4A7139" size={64} stroke={6}>
                  {active.M}
                </ProgressRing>
                <div className="min-w-[160px] flex-1">
                  <p className="text-[12.5px] font-semibold text-ink">RFM score {active.rfm}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                    Live recency (days), frequency and monetary scores on the 1–5 pipeline scale.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Profile</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Segment" value={active.segment} />
                <MetricRow label="Preferred channel" value={active.channel} />
                <MetricRow label="Favourite category" value={active.favCat} />
                <MetricRow label="Promo sensitivity" value={`${active.promoSens}%`} />
                <MetricRow label="Customer since" value={active.joined} />
                <MetricRow label="Last order" value={active.lastOrder} />
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Recent orders</p>
              {(detail?.recent_orders ?? []).length === 0 ? (
                <p className="mt-2 text-[12.5px] text-ink-muted">No recent orders on record.</p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {(detail?.recent_orders ?? []).slice(0, 4).map((o) => (
                    <li key={o.order_id} className="flex gap-3">
                      <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', o.status === 'Completed' ? 'bg-sage-500' : 'bg-clay-500')} />
                      <span>
                        <span className="block font-mono text-[12.5px] font-medium text-ink">{o.order_id}</span>
                        <span className="block text-[11.5px] text-ink-muted">
                          {o.channel} · {money(o.total_amount)} · {fmtDate(o.order_datetime)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <LiveNote>Live customer profile. Records are anonymized IDs — no names, emails or phone numbers are stored.</LiveNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
