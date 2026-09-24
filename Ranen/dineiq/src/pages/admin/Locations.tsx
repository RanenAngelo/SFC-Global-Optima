import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, CardHeader, Icon, Tabs, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, DonutChart, TrendChart } from '../../components/charts'
import { DemoNote, FoodImage, KpiCard, MetricRow, Progress, Stars } from '../../components/shared'
import { CLASSIFICATIONS, LOCATIONS, LOCATION_MENU_CLASS, LOCATION_TREND, MENU_INTEL } from '../../lib/data/analytics'
import { money, num } from '../../lib/utils'

export default function Locations() {
  const columns: Column<(typeof LOCATIONS)[number]>[] = [
    {
      key: 'name',
      header: 'Location',
      sort: (a, b) => a.name.localeCompare(b.name),
      render: (l) => (
        <div>
          <p className="text-[13px] font-semibold text-ink">{l.name}</p>
          <p className="text-[11.5px] text-ink-muted">{l.area}</p>
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
        <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-bold', l.margin >= 40 ? 'bg-sage-50 text-sage-700' : l.margin >= 35 ? 'bg-gold-50 text-gold-600' : 'bg-clay-50 text-clay-600')}>
          {l.margin}%
        </span>
      ),
    },
    {
      key: 'wastage',
      header: 'Wastage',
      align: 'right',
      hideBelow: 'lg',
      sort: (a, b) => a.wastage - b.wastage,
      render: (l) => <span className={cn('tabular-nums font-semibold', l.wastage > 8 ? 'text-clay-600' : 'text-ink-soft')}>{l.wastage}%</span>,
    },
    { key: 'rating', header: 'Rating', align: 'center', hideBelow: 'lg', sort: (a, b) => a.rating - b.rating, render: (l) => <span className="text-[12.5px] font-semibold text-ink">{l.rating}</span> },
    {
      key: 'topItem',
      header: 'Top-performing item',
      hideBelow: 'xl',
      render: (l) => <span className="text-[12.5px] text-ink-muted">{l.topItem}</span>,
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
        subtitle="Compare revenue, profitability, wastage and guest satisfaction across the demo branch network."
        demoNote="All branch figures are static demo values for interface presentation."
      />

      {/* Location cards */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        {LOCATIONS.map((l) => (
          <Card key={l.id} className="overflow-hidden" hover>
            <div className="relative h-[132px]">
              <img src={l.img} alt={l.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="font-display text-[17px] font-semibold text-white">{l.name}</p>
                <p className="truncate text-[11.5px] text-white/70">{l.area}</p>
              </div>
              <span
                className={cn(
                  'absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10.5px] font-bold',
                  l.trend >= 0 ? 'bg-sage-500 text-white' : 'bg-clay-500 text-white',
                )}
              >
                {l.trend >= 0 ? '+' : ''}
                {l.trend}%
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
                <span className="font-semibold text-ink">{l.margin}%</span>
              </div>
              <Progress value={l.margin} tone={l.margin >= 40 ? 'sage' : l.margin >= 35 ? 'gold' : 'clay'} height={5} />
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-muted">Wastage</span>
                <span className={cn('font-semibold', l.wastage > 8 ? 'text-clay-600' : 'text-ink')}>{l.wastage}%</span>
              </div>
              <Progress value={l.wastage * 10} tone={l.wastage > 8 ? 'clay' : 'gold'} height={5} />
              <div className="flex items-center justify-between pt-1 text-[12px]">
                <span className="text-ink-muted">Rating</span>
                <Stars value={l.rating} />
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-muted">Repeat purchase</span>
                <span className="font-semibold text-ink">{l.repeat}%</span>
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
        <ChartCard title="Revenue comparison" subtitle="Monthly revenue per branch — demo series" height={290}>
          <TrendChart
            data={LOCATION_TREND}
            xKey="month"
            series={[
              { key: 'clifton', label: 'Clifton Branch', color: '#B54E17', type: 'area' },
              { key: 'downtown', label: 'Downtown Branch', color: '#2F6FA8', type: 'line' },
              { key: 'gulshan', label: 'Gulshan Branch', color: '#C08A16', type: 'line' },
            ]}
            valueFormat={(v) => money(v * 1000, { compact: true })}
          />
        </ChartCard>

        <ChartCard title="Wastage by location" subtitle="Percentage of prepared quantity not sold" height={290}>
          <BarSeries
            data={LOCATIONS.map((l) => ({ location: l.name.replace(' Branch', ''), waste: l.wastage }))}
            xKey="location"
            bars={[{ key: 'waste', label: 'Wastage %', color: '#96352C' }]}
            valueFormat={(v) => `${v}%`}
            showLegend={false}
          />
        </ChartCard>
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Menu performance by location" subtitle="Classification counts per branch — demo values" height={280}>
          <TrendChart
            data={LOCATION_MENU_CLASS}
            xKey="location"
            series={[
              { key: 'profit', label: 'Profit Driver', color: '#4A7139', type: 'bar', stackId: 'a' },
              { key: 'volume', label: 'Volume Driver', color: '#2F6FA8', type: 'bar', stackId: 'a' },
              { key: 'opportunity', label: 'Hidden Opportunity', color: '#C08A16', type: 'bar', stackId: 'a' },
              { key: 'low', label: 'Low Performer', color: '#96352C', type: 'bar', stackId: 'a' },
            ]}
            valueFormat={(v) => `${v} items`}
          />
        </ChartCard>

        <ChartCard title="Rating and repeat purchase" subtitle="Demo satisfaction metrics per branch" height={280}>
          <TrendChart
            data={LOCATIONS.map((l) => ({ location: l.name.replace(' Branch', ''), rating: l.rating, repeat: l.repeat / 10 }))}
            xKey="location"
            series={[
              { key: 'rating', label: 'Rating (1–5)', color: '#C08A16', type: 'bar' },
              { key: 'repeat', label: 'Repeat (×10)', color: '#5E8C4A', type: 'line' },
            ]}
            valueFormat={(v, n) => (n === 'Rating (1–5)' ? `${v.toFixed(1)} ★` : `${(v * 10).toFixed(0)}%`)}
          />
        </ChartCard>
      </div>

      {/* Comparison table */}
      <Card>
        <CardHeader title="Location comparison" subtitle="Side-by-side demo metrics across all branches" className="border-b" />
        <DataTable columns={columns} rows={LOCATIONS} rowKey={(l) => l.id} pageSize={10} />
      </Card>
    </div>
  )
}

export function LocationDetail() {
  const { id = 'loc-1' } = useParams()
  const location = LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0]
  const [tab, setTab] = React.useState('overview')
  const classRow = LOCATION_MENU_CLASS.find((r) => r.location === location.name) ?? LOCATION_MENU_CLASS[0]

  const topItems = MENU_INTEL.slice()
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  return (
    <div>
      <PageHeader
        eyebrow="Branch detail"
        title={location.name}
        subtitle={`${location.area} · Managed by ${location.manager} · Opened ${location.opened}`}
        demoNote="Branch figures are static demo values for interface presentation."
        actions={
          <Link to="/admin/locations">
            <Button size="sm" variant="secondary" icon="ArrowLeft">
              All locations
            </Button>
          </Link>
        }
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Revenue" value={money(location.revenue, { compact: true })} change={location.trend} compare="vs previous period" icon="Wallet" tone="ember" />
        <KpiCard label="Orders" value={num(location.orders)} compare="demo period" icon="ReceiptText" tone="sky" />
        <KpiCard label="Avg order value" value={money(location.aov)} compare="demo period" icon="TrendingUp" tone="gold" />
        <KpiCard label="Profitability" value={`${location.margin}%`} compare="demo period" icon="Percent" tone="sage" />
        <KpiCard label="Wastage" value={`${location.wastage}%`} compare="demo period" icon="Trash2" tone="clay" />
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Branch profile" subtitle="Demo operational detail" className="border-b" />
          <div className="p-5">
            <div className="overflow-hidden rounded-2xl border border-line">
              <img src={location.img} alt={location.name} className="aspect-[16/10] w-full object-cover" />
            </div>
            <div className="mt-4 divide-y divide-line">
              <MetricRow label="Manager" value={location.manager} />
              <MetricRow label="Team size" value={`${location.staff} staff`} />
              <MetricRow label="Covers" value={`${location.seats} seats`} />
              <MetricRow label="Opened" value={location.opened} />
              <MetricRow label="Rating" value={`${location.rating} / 5`} />
              <MetricRow label="Repeat purchase" value={`${location.repeat}%`} />
              <MetricRow label="Top-performing item" value={location.topItem} />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Menu classification mix" subtitle="Demo classification counts for this branch" className="border-b" />
            <div className="grid gap-3 p-5 sm:grid-cols-4">
              {[
                { k: 'profit', l: 'Profit Driver', c: CLASSIFICATIONS['profit-driver'] },
                { k: 'volume', l: 'Volume Driver', c: CLASSIFICATIONS['volume-driver'] },
                { k: 'opportunity', l: 'Hidden Opportunity', c: CLASSIFICATIONS['hidden-opportunity'] },
                { k: 'low', l: 'Low Performer', c: CLASSIFICATIONS['low-performer'] },
              ].map((x) => (
                <div key={x.k} className="rounded-xl border p-3.5" style={{ background: x.c.bg, borderColor: x.c.border }}>
                  <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: x.c.color }}>
                    {x.l}
                  </p>
                  <p className="mt-1 font-display text-[24px] font-semibold text-ink">{(classRow as any)[x.k]}</p>
                  <p className="text-[11px] text-ink-muted">items</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Top items at this branch" subtitle="Demo revenue ranking" className="border-b" />
            <div className="divide-y divide-line">
              {topItems.map((t) => (
                <div key={t.id} className="flex items-center gap-3.5 px-4 py-3 sm:px-5">
                  <FoodImage src={t.img} name={t.name} className="h-10 w-10 shrink-0" ratio="fill" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{t.name}</p>
                    <p className="text-[11.5px] text-ink-muted">
                      {t.category} · {num(Math.round(t.units * 0.34))} units
                    </p>
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{money(Math.round(t.revenue * 0.34), { compact: true })}</span>
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
              { label: 'Promotion effectiveness', value: 'promotions' },
              { label: 'Team', value: 'team' },
            ]}
          />
        </div>
        <div className="p-5">
          {tab === 'overview' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Revenue trend" subtitle="Demo monthly series for this branch" height={240}>
                <TrendChart
                  data={LOCATION_TREND}
                  xKey="month"
                  series={[{ key: id === 'loc-1' ? 'clifton' : id === 'loc-2' ? 'downtown' : 'gulshan', label: location.name, color: '#B54E17', type: 'area' }]}
                  valueFormat={(v) => money(v * 1000, { compact: true })}
                  showLegend={false}
                />
              </ChartCard>
              <ChartCard title="Channel mix" subtitle="Demo order share by channel" height={240}>
                <DonutChart
                  data={[
                    { name: 'Dine-in', value: 42, color: '#B54E17' },
                    { name: 'Delivery', value: 28, color: '#5E8C4A' },
                    { name: 'Website', value: 18, color: '#C08A16' },
                    { name: 'Takeaway', value: 12, color: '#2F6FA8' },
                  ]}
                  centerValue={`${num(location.orders)}`}
                  centerLabel="Orders"
                  valueFormat={(v) => `${v}%`}
                />
              </ChartCard>
            </div>
          )}

          {tab === 'promotions' && (
            <div className="space-y-3">
              {[
                { n: 'Wednesday Pizza Night', lift: '+18% orders', margin: '28.4%', verdict: 'Volume up, margin down' },
                { n: 'Burger & Fries Bundle', lift: '+9% orders', margin: '41.2%', verdict: 'Balanced' },
                { n: 'Late Night Dessert', lift: '+4% orders', margin: '52.6%', verdict: 'Margin accretive' },
              ].map((p) => (
                <div key={p.n} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3.5">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{p.n}</p>
                    <p className="text-[11.5px] text-ink-muted">{p.verdict}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[12.5px] font-semibold text-sage-600">{p.lift}</span>
                    <span className="text-[12.5px] font-semibold text-ink">Margin {p.margin}</span>
                    <Badge tone="neutral">Demo</Badge>
                  </div>
                </div>
              ))}
              <DemoNote>Promotion effectiveness figures are illustrative examples.</DemoNote>
            </div>
          )}

          {tab === 'team' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { n: location.manager, r: 'Branch Manager', s: 'Active', l: '12 min ago' },
                { n: 'Head Chef', r: 'Kitchen lead', s: 'Active', l: '1 hr ago' },
                { n: 'Shift Supervisor', r: 'Floor', s: 'Active', l: '3 hrs ago' },
                { n: 'Inventory Clerk', r: 'Operations', s: 'Invited', l: '—' },
              ].map((t) => (
                <div key={t.n} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3.5">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{t.n}</p>
                    <p className="text-[11.5px] text-ink-muted">{t.r}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone={t.s === 'Active' ? 'sage' : 'gold'} dot>
                      {t.s}
                    </Badge>
                    <p className="mt-1 text-[11px] text-ink-faint">{t.l}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
