import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, CardHeader, Tabs, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, DonutChart, TrendChart } from '../../components/charts'
import { FoodImage, KpiCard, LiveNote, MetricRow, Progress, Stars } from '../../components/shared'
import { CLASSIFICATIONS } from '../../lib/data/analytics'
import { PageError, PageLoader } from '../../lib/api'
import { useLocationDetail, useLocationsData, type BranchRow } from '../../lib/live'
import { money, num } from '../../lib/utils'

const HEADER_HUES = ['from-ember-700', 'from-sage-700', 'from-sky-700', 'from-gold-600', 'from-clay-600']

export default function Locations() {
  const { data, loading, error, refetch } = useLocationsData()

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No location data.'} onRetry={refetch} />

  const columns: Column<BranchRow>[] = [
    {
      key: 'name',
      header: 'Location',
      sort: (a, b) => a.name.localeCompare(b.name),
      render: (l) => (
        <div>
          <p className="text-[13px] font-semibold text-ink">{l.name}</p>
          <p className="text-[11.5px] text-ink-muted">{l.city}</p>
        </div>
      ),
    },
    { key: 'revenue', header: 'Revenue', align: 'right', sort: (a, b) => a.revenue - b.revenue, render: (l) => <span className="font-semibold tabular-nums text-ink">{money(l.revenue, { compact: true })}</span> },
    { key: 'orders', header: 'Orders', align: 'right', sort: (a, b) => a.orders - b.orders, render: (l) => <span className="tabular-nums text-ink-soft">{num(l.orders)}</span> },
    { key: 'aov', header: 'Avg order value', align: 'right', hideBelow: 'md', sort: (a, b) => a.aov - b.aov, render: (l) => <span className="tabular-nums text-ink-soft">{money(l.aov)}</span> },
    {
      key: 'margin',
      header: 'Profitability',
      align: 'right',
      sort: (a, b) => a.margin - b.margin,
      render: (l) => (
        <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums', l.margin >= 40 ? 'bg-sage-50 text-sage-700' : l.margin >= 35 ? 'bg-gold-50 text-gold-600' : 'bg-clay-50 text-clay-600')}>
          {l.margin.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'wastage',
      header: 'Wasted units',
      align: 'right',
      hideBelow: 'lg',
      sort: (a, b) => a.wastedQty - b.wastedQty,
      render: (l) => <span className="tabular-nums font-semibold text-ink-soft">{num(Math.round(l.wastedQty))}</span>,
    },
    { key: 'rating', header: 'Rating', align: 'center', hideBelow: 'lg', sort: (a, b) => a.rating - b.rating, render: (l) => <span className="text-[12.5px] font-semibold text-ink">{l.rating.toFixed(2)}</span> },
    {
      key: 'customers',
      header: 'Customers',
      align: 'right',
      hideBelow: 'xl',
      sort: (a, b) => a.customers - b.customers,
      render: (l) => <span className="tabular-nums text-ink-muted">{num(l.customers)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '100px',
      render: (l) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Link to={`/admin/locations/${l.id}`}>
            <Button size="xs" variant="secondary" iconRight="ArrowRight">
              Open
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Multi-Location Intelligence"
        subtitle="Live revenue, profitability, wastage and satisfaction across the branch network."
        demoNote="Live branch intelligence — 20 locations ranked by revenue."
        onRefresh={refetch}
        dataset="location_performance"
      />

      {/* Location cards */}
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.rows.map((l, i) => (
          <Card key={l.id} className="overflow-hidden" hover>
            <div className={cn('relative bg-gradient-to-br to-ink', HEADER_HUES[i % HEADER_HUES.length])}>
              <div className="px-4 pb-3 pt-8">
                <p className="font-display text-[17px] font-semibold text-white">{l.name}</p>
                <p className="truncate text-[11.5px] text-white/70">{l.city} · {num(l.customers)} customers</p>
              </div>
              <span className="absolute right-3 top-3 rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-bold text-white">
                #{i + 1} revenue
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
              {[
                { l: 'Revenue', v: money(l.revenue, { compact: true }) },
                { l: 'Orders', v: num(l.orders) },
                { l: 'AOV', v: money(l.aov) },
              ].map((s) => (
                <div key={s.l} className="px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 text-[13.5px] font-semibold tabular-nums text-ink">{s.v}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-muted">Profitability</span>
                <span className="font-semibold text-ink">{l.margin.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(100, l.margin)} tone={l.margin >= 40 ? 'sage' : l.margin >= 35 ? 'gold' : 'clay'} height={5} />
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-muted">Wasted units</span>
                <span className="font-semibold text-ink">{num(Math.round(l.wastedQty))}</span>
              </div>
              <Progress value={(l.wastedQty / data.maxWaste) * 100} tone="clay" height={5} />
              <div className="flex items-center justify-between pt-1 text-[12px]">
                <span className="text-ink-muted">Rating</span>
                <Stars value={l.rating} />
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-muted">Repeat purchase</span>
                <span className="font-semibold text-ink">{l.repeat.toFixed(1)}%</span>
              </div>
            </div>
            <div className="border-t border-line px-4 py-3">
              <Link to={`/admin/locations/${l.id}`}>
                <Button size="sm" variant="secondary" block iconRight="ArrowRight">
                  View branch detail
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Revenue comparison" subtitle="Total revenue per branch — live" height={290}>
          <BarSeries
            data={data.revenueBars}
            xKey="location"
            layout="vertical"
            bars={[{ key: 'revenue', label: 'Revenue', color: '#B54E17' }]}
            valueFormat={(v) => money(v, { compact: true })}
            showLegend={false}
          />
        </ChartCard>

        <ChartCard title="Wastage by location" subtitle="Recorded wasted units — live" height={290}>
          <BarSeries
            data={data.wasteBars}
            xKey="location"
            layout="vertical"
            bars={[{ key: 'waste', label: 'Wasted units', color: '#96352C' }]}
            valueFormat={(v) => `${num(v)} units`}
            showLegend={false}
          />
        </ChartCard>
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Profit-driver revenue share" subtitle="Share of revenue from Profit Drivers — live" height={280}>
          <BarSeries
            data={data.driverBars}
            xKey="location"
            layout="vertical"
            bars={[{ key: 'share', label: 'Share %', color: '#4A7139' }]}
            valueFormat={(v) => `${v}%`}
            showLegend={false}
          />
        </ChartCard>

        <ChartCard title="Rating and repeat purchase" subtitle="Live satisfaction metrics per branch" height={280}>
          <TrendChart
            data={data.satRows}
            xKey="location"
            series={[
              { key: 'rating', label: 'Rating (1–5)', color: '#C08A16', type: 'bar' },
              { key: 'repeat', label: 'Repeat (×10)', color: '#5E8C4A', type: 'line' },
            ]}
            valueFormat={(v, n) => (n === 'Rating (1–5)' ? `${Number(v).toFixed(2)} ★` : `${(Number(v) * 10).toFixed(1)}%`)}
          />
        </ChartCard>
      </div>

      {/* Comparison table */}
      <Card>
        <CardHeader title="Location comparison" subtitle="Side-by-side live metrics across all branches" className="border-b" />
        <DataTable columns={columns} rows={data.rows} rowKey={(l) => l.id} pageSize={10} />
        <div className="border-t border-line p-4">
          <LiveNote>Branch metrics are live pipeline output. Staffing and seating data is not tracked in this dataset.</LiveNote>
        </div>
      </Card>
    </div>
  )
}

export function LocationDetail() {
  const { id = '' } = useParams()
  const [tab, setTab] = React.useState('overview')
  const { data, loading, error, refetch } = useLocationDetail(id || null)

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'Branch not found.'} onRetry={refetch} />

  const l = data.location
  const topItems = [...data.menu].sort((x, y) => y.revenue - x.revenue).slice(0, 6)
  const CHANNEL_COLORS = ['#B54E17', '#5E8C4A', '#C08A16', '#2F6FA8', '#96352C']

  return (
    <div>
      <PageHeader
        eyebrow="Branch detail"
        title={l.name}
        subtitle={`${l.city} · ${num(l.customers)} customers · ${num(l.orders)} orders`}
        demoNote="Live branch record with classification mix and menu detail."
        onRefresh={refetch}
        actions={
          <Link to="/admin/locations">
            <Button size="sm" variant="secondary" icon="ArrowLeft">
              All locations
            </Button>
          </Link>
        }
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Revenue" value={money(l.revenue, { compact: true })} compare="lifetime" icon="Wallet" tone="ember" />
        <KpiCard label="Orders" value={num(l.orders)} compare="lifetime" icon="ReceiptText" tone="sky" />
        <KpiCard label="Avg order value" value={money(l.aov)} compare="per order" icon="TrendingUp" tone="gold" />
        <KpiCard label="Profitability" value={`${l.margin.toFixed(1)}%`} compare={money(l.profit, { compact: true })} icon="Percent" tone="sage" />
        <KpiCard label="Wasted units" value={num(Math.round(l.wastedQty))} compare={money(data.wasteCost, { compact: true })} icon="Trash2" tone="clay" />
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Branch profile" subtitle="Live branch record" className="border-b" />
          <div className="p-5">
            <div className="rounded-2xl bg-gradient-to-br from-ember-700 to-ink px-4 py-6 text-center">
              <p className="font-display text-[20px] font-semibold text-white">{l.name}</p>
              <p className="text-[12px] text-white/70">{l.city}</p>
            </div>
            <div className="mt-4 divide-y divide-line">
              <MetricRow label="City" value={l.city} />
              <MetricRow label="Customers" value={num(l.customers)} />
              <MetricRow label="Promo order share" value={`${l.promoShare.toFixed(1)}%`} />
              <MetricRow label="Profit-driver share" value={`${l.driverShare.toFixed(1)}%`} />
              <MetricRow label="Rating" value={`${l.rating.toFixed(2)} / 5`} />
              <MetricRow label="Repeat purchase" value={`${l.repeat.toFixed(1)}%`} />
              <MetricRow label="Top item" value={topItems[0]?.item_name ?? '—'} />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Menu classification mix" subtitle="Live local classifications for this branch" className="border-b" />
            <div className="grid gap-3 p-5 sm:grid-cols-4">
              {[
                { k: 'Profit Driver', l: 'Profit Driver', c: CLASSIFICATIONS['profit-driver'] },
                { k: 'Volume Driver', l: 'Volume Driver', c: CLASSIFICATIONS['volume-driver'] },
                { k: 'Hidden Opportunity', l: 'Hidden Opportunity', c: CLASSIFICATIONS['hidden-opportunity'] },
                { k: 'Low Performer', l: 'Low Performer', c: CLASSIFICATIONS['low-performer'] },
              ].map((x) => (
                <div key={x.k} className="rounded-xl border p-3.5" style={{ background: x.c.bg, borderColor: x.c.border }}>
                  <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: x.c.color }}>
                    {x.l}
                  </p>
                  <p className="mt-1 font-display text-[24px] font-semibold text-ink">{data.classes[x.k] ?? 0}</p>
                  <p className="text-[11px] text-ink-muted">items</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Top items at this branch" subtitle="Live revenue ranking" className="border-b" />
            <div className="divide-y divide-line">
              {topItems.map((t) => (
                <div key={t.item_id} className="flex items-center gap-3.5 px-4 py-3 sm:px-5">
                  <FoodImage src={undefined} name={t.item_name} className="h-10 w-10 shrink-0" ratio="fill" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{t.item_name}</p>
                    <p className="text-[11.5px] text-ink-muted">
                      {t.location_class} · {num(Math.round(t.units_sold))} units
                    </p>
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{money(t.revenue, { compact: true })}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="border-b border-line px-4 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { label: 'Performance', value: 'overview' },
              { label: 'Menu mix', value: 'menu' },
              { label: 'Wastage', value: 'wastage' },
            ]}
          />
        </div>
        <div className="p-5">
          {tab === 'overview' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Revenue trend" subtitle="Live monthly series for this branch" height={240}>
                <TrendChart
                  data={data.trendMonthly}
                  xKey="month"
                  series={[{ key: 'revenue', label: l.name, color: '#B54E17', type: 'area' }]}
                  valueFormat={(v) => money(v, { compact: true })}
                  showLegend={false}
                />
              </ChartCard>
              <ChartCard title="Channel mix" subtitle="Live order share by channel" height={240}>
                <DonutChart
                  data={data.channels.map((c, i) => ({ name: c.name, value: c.value, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }))}
                  centerValue={num(data.totalChannelOrders)}
                  centerLabel="Orders"
                  valueFormat={(v) => `${num(v)} orders`}
                />
              </ChartCard>
            </div>
          )}

          {tab === 'menu' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-line">
                    {['Item', 'Units', 'Revenue', 'Margin', 'Local class', 'Global class', 'Differs'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...data.menu].sort((x, y) => y.revenue - x.revenue).slice(0, 15).map((m) => (
                    <tr key={m.item_id} className="border-t border-line/70">
                      <td className="px-3 py-2.5 text-[12.5px] font-medium text-ink">{m.item_name}</td>
                      <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-ink-soft">{num(Math.round(m.units_sold))}</td>
                      <td className="px-3 py-2.5 text-[12.5px] font-semibold tabular-nums text-ink">{money(m.revenue, { compact: true })}</td>
                      <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-ink-soft">{money(m.contribution_margin, { compact: true })}</td>
                      <td className="px-3 py-2.5 text-[12px] text-ink">{m.location_class}</td>
                      <td className="px-3 py-2.5 text-[12px] text-ink-muted">{m.performance_class}</td>
                      <td className="px-3 py-2.5">
                        {m.differs_from_global ? <Badge tone="gold">Differs</Badge> : <span className="text-[11.5px] text-ink-faint">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3">
                <LiveNote>Top 15 items by branch revenue. “Differs” flags items classified differently here than network-wide.</LiveNote>
              </div>
            </div>
          )}

          {tab === 'wastage' && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { l: 'Wasted units', v: num(Math.round(l.wastedQty)), s: 'recorded at this branch' },
                { l: 'Wastage cost', v: money(data.wasteCost, { compact: true }), s: 'recorded cost' },
                { l: 'Share of network waste', v: `${data.wasteShare.toFixed(1)}%`, s: 'of total waste cost' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-white p-4">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 font-display text-[22px] font-semibold text-ink">{s.v}</p>
                  <p className="text-[11.5px] text-ink-muted">{s.s}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
