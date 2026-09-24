import React, { useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, Select, Tabs, Tooltip, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, TrendChart } from '../../components/charts'
import { DemoNote, KpiCard, MetricRow, Progress, StatusDot } from '../../components/shared'
import {
  INVENTORY, PREP_VS_CONSUMPTION, WASTAGE_BY_CATEGORY, WASTAGE_BY_LOCATION, WASTAGE_RISK, WASTAGE_TREND, type InventoryItem,
} from '../../lib/data/analytics'
import { money, num } from '../../lib/utils'

const STATUS_TONE: Record<string, 'sage' | 'gold' | 'clay' | 'sky'> = {
  Healthy: 'sage', Low: 'gold', Critical: 'clay', Overstocked: 'sky',
}

export default function Inventory() {
  const { push } = useToast()
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [active, setActive] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(false)

  const rows = INVENTORY.filter((i) => {
    if (status !== 'all' && i.status !== status) return false
    const q = query.trim().toLowerCase()
    if (q && !i.name.toLowerCase().includes(q) && !i.supplier.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false
    return true
  })

  const critical = INVENTORY.filter((i) => i.status === 'Critical' || i.status === 'Low')

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Ingredient',
      sort: (a, b) => a.name.localeCompare(b.name),
      render: (i) => (
        <div>
          <p className="text-[13px] font-semibold text-ink">{i.name}</p>
          <p className="text-[11.5px] text-ink-muted">
            {i.category} · {i.supplier}
          </p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock level',
      width: '180px',
      sort: (a, b) => a.stock / a.capacity - b.stock / b.capacity,
      render: (i) => (
        <div>
          <div className="flex items-center justify-between text-[11.5px] text-ink-muted">
            <span>
              {i.stock} {i.unit}
            </span>
            <span>{Math.round((i.stock / i.capacity) * 100)}%</span>
          </div>
          <Progress
            value={(i.stock / i.capacity) * 100}
            className="mt-1"
            height={5}
            tone={i.status === 'Critical' ? 'clay' : i.status === 'Low' ? 'gold' : i.status === 'Overstocked' ? 'sky' : 'sage'}
          />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) => (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
          <StatusDot status={i.status} />
          {i.status}
        </span>
      ),
    },
    {
      key: 'reorder',
      header: 'Reorder at',
      align: 'right',
      hideBelow: 'lg',
      render: (i) => (
        <span className="tabular-nums text-ink-soft">
          {i.reorder} {i.unit}
        </span>
      ),
    },
    {
      key: 'usedPerDay',
      header: 'Daily use',
      align: 'right',
      hideBelow: 'md',
      sort: (a, b) => a.usedPerDay - b.usedPerDay,
      render: (i) => (
        <span className="tabular-nums text-ink-soft">
          {i.usedPerDay} {i.unit}
        </span>
      ),
    },
    {
      key: 'days',
      header: 'Days cover',
      align: 'right',
      hideBelow: 'xl',
      render: (i) => <span className="tabular-nums text-ink-soft">{(i.stock / i.usedPerDay).toFixed(1)}</span>,
    },
    {
      key: 'costPerUnit',
      header: 'Unit cost',
      align: 'right',
      hideBelow: 'xl',
      sort: (a, b) => a.costPerUnit - b.costPerUnit,
      render: (i) => <span className="tabular-nums text-ink-soft">{money(i.costPerUnit)}</span>,
    },
    {
      key: 'lastDelivery',
      header: 'Last delivery',
      hideBelow: 'lg',
      render: (i) => <span className="text-[12.5px] text-ink-muted">{i.lastDelivery}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '110px',
      render: (i) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="secondary" icon="Eye" onClick={() => setActive(i)}>
            Detail
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Inventory & Wastage"
        subtitle="Track stock cover, supplier deliveries and food wastage across the demo branch network."
        demoNote="Stock levels and wastage figures are static demo values. No inventory tracking or wastage prediction runs here."
        onRefresh={() => {
          setLoading(true)
          setTimeout(() => setLoading(false), 800)
        }}
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Tracked ingredients" value={`${INVENTORY.length}`} compare="demo SKUs" icon="Package" tone="ember" />
        <KpiCard label="Low stock alerts" value={`${critical.length}`} compare="need reordering" icon="AlertTriangle" tone="gold" />
        <KpiCard label="Average wastage" value="6.8%" change={-0.7} compare="vs previous period" icon="Trash2" tone="clay" />
        <KpiCard label="Est. monthly waste cost" value={money(72260, { compact: true })} compare="illustrative" icon="Coins" tone="clay" />
      </div>

      {/* Alerts */}
      {critical.length > 0 && (
        <Card className="mb-5 border-gold-200">
          <CardHeader
            title="Stock alerts"
            subtitle={`${critical.length} ingredients need attention in this demo dataset`}
            icon="AlertTriangle"
            className="border-b"
            actions={
              <Button
                size="xs"
                variant="secondary"
                icon="ShoppingCart"
                onClick={() => push({ title: 'Purchase draft created (demo)', body: 'No supplier is contacted in this prototype', tone: 'success' })}
              >
                Create purchase draft
              </Button>
            }
          />
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {critical.map((i) => (
              <div key={i.id} className={cn('rounded-2xl border p-4', i.status === 'Critical' ? 'border-clay-200 bg-clay-50/50' : 'border-gold-200 bg-gold-50/40')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink">{i.name}</p>
                    <p className="text-[12px] text-ink-muted">
                      {i.stock} {i.unit} remaining · reorder at {i.reorder} {i.unit}
                    </p>
                  </div>
                  <Badge tone={i.status === 'Critical' ? 'clay' : 'gold'}>{i.status}</Badge>
                </div>
                <Progress value={(i.stock / i.reorder) * 100} className="mt-2.5" height={5} tone={i.status === 'Critical' ? 'clay' : 'gold'} />
                <p className="mt-2 text-[11.5px] text-ink-muted">
                  About {(i.stock / i.usedPerDay).toFixed(1)} days of cover at {i.usedPerDay} {i.unit}/day
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { label: 'Inventory', value: 'overview' },
          { label: 'Wastage analysis', value: 'wastage' },
          { label: 'Wastage risk', value: 'risk' },
        ]}
      />

      {tab === 'overview' && (
        <div className="mt-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <SearchInput value={query} onChange={setQuery} placeholder="Search ingredients or suppliers…" className="w-full sm:w-72" />
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto" aria-label="Stock status">
                <option value="all">Any status</option>
                <option value="Healthy">Healthy</option>
                <option value="Low">Low</option>
                <option value="Critical">Critical</option>
                <option value="Overstocked">Overstocked</option>
              </Select>
              <span className="ml-auto text-[12.5px] text-ink-muted">
                <span className="font-semibold text-ink">{rows.length}</span> of {INVENTORY.length} ingredients
              </span>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(i) => i.id}
              loading={loading}
              pageSize={10}
              selectable
              selected={[]}
              onSelectionChange={() => {}}
              onRowClick={(i) => setActive(i)}
              emptyTitle="No ingredients match this search"
              emptyMessage="Try a different ingredient, supplier or stock status."
              emptyAction={
                <Button
                  size="sm"
                  variant="secondary"
                  icon="RotateCcw"
                  onClick={() => {
                    setQuery('')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </Card>
        </div>
      )}

      {tab === 'wastage' && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Wastage by category" subtitle="Percentage of prepared quantity not sold" height={300}>
              <BarSeries
                data={WASTAGE_BY_CATEGORY}
                xKey="category"
                layout="vertical"
                bars={[{ key: 'waste', label: 'Wastage %', color: '#96352C' }]}
                valueFormat={(v) => `${v}%`}
                showLegend={false}
              />
            </ChartCard>

            <ChartCard title="Wastage trend" subtitle="Wastage percentage and estimated cost — demo series" height={300}>
              <TrendChart
                data={WASTAGE_TREND}
                xKey="day"
                series={[
                  { key: 'waste', label: 'Wastage %', color: '#96352C', type: 'bar' },
                  { key: 'cost', label: 'Estimated cost', color: '#C08A16', type: 'line' },
                ]}
                valueFormat={(v, n) => (n === 'Wastage %' ? `${v}%` : money(v))}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
            <ChartCard title="Wastage by location" subtitle="Estimated monthly cost per branch" height={270}>
              <BarSeries
                data={WASTAGE_BY_LOCATION}
                xKey="location"
                layout="vertical"
                bars={[{ key: 'waste', label: 'Wastage %', color: '#B54E17' }]}
                valueFormat={(v) => `${v}%`}
                showLegend={false}
              />
            </ChartCard>

            <ChartCard title="Preparation versus consumption" subtitle="Units prepared against units consumed" height={270}>
              <TrendChart
                data={PREP_VS_CONSUMPTION}
                xKey="item"
                series={[
                  { key: 'prepared', label: 'Prepared', color: '#C08A16', type: 'bar' },
                  { key: 'consumed', label: 'Consumed', color: '#5E8C4A', type: 'bar' },
                ]}
                valueFormat={(v) => `${v} units`}
              />
            </ChartCard>
          </div>

          <Card>
            <CardHeader title="Highest-wastage menu items" subtitle="Demo items ranked by wastage percentage" className="border-b" />
            <div className="divide-y divide-line">
              {WASTAGE_BY_CATEGORY.slice(0, 5).map((c, i) => (
                <div key={c.category} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{c.category}</p>
                    <p className="text-[11.5px] text-ink-muted">{num(c.prepared)} units prepared</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <Progress value={c.waste * 10} tone={c.waste > 8 ? 'clay' : 'gold'} height={5} />
                    </div>
                    <span className={cn('w-14 text-right text-[13px] font-bold tabular-nums', c.waste > 8 ? 'text-clay-600' : 'text-gold-600')}>
                      {c.waste}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'risk' && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {WASTAGE_RISK.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    r.level === 'High' ? 'bg-clay-50 text-clay-600' : 'bg-gold-50 text-gold-600',
                  )}
                >
                  <Icon name="AlertTriangle" size={18} />
                </span>
                <Badge tone={r.level === 'High' ? 'clay' : 'gold'}>{r.level} risk</Badge>
              </div>
              <h3 className="mt-3 font-display text-[15.5px] font-semibold leading-snug text-ink">{r.title}</h3>
              <p className="mt-0.5 text-[13px] font-medium text-ink-soft">{r.item}</p>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-canvas px-3.5 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Wastage</span>
                <span className="font-display text-[17px] font-semibold text-ink">{r.value}</span>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
                <span className="font-semibold text-ink">Suggested action: </span>
                {r.action}
              </p>
              <div className="mt-3.5 flex gap-2">
                <Button size="xs" variant="secondary" onClick={() => push({ title: 'Action saved (demo)', tone: 'success' })}>
                  Accept action
                </Button>
                <Button size="xs" variant="ghost" onClick={() => push({ title: 'Alert dismissed', tone: 'info' })}>
                  Dismiss
                </Button>
              </div>
            </Card>
          ))}
          <div className="md:col-span-2">
            <DemoNote>
              Wastage risk levels in this prototype are hand-written demonstration examples, not the output of a prediction
              model.
            </DemoNote>
          </div>
        </div>
      )}

      {/* Inventory detail drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.name ?? ''}
        subtitle={active ? `${active.category} · ${active.supplier}` : ''}
        width="md"
        badge={active ? <Badge tone={STATUS_TONE[active.status] ?? 'neutral'} dot>{active.status}</Badge> : undefined}
        footer={
          active && (
            <>
              <Button variant="secondary" icon="Truck" onClick={() => push({ title: 'Delivery request created (demo)', tone: 'success' })}>
                Request delivery
              </Button>
              <Button icon="ShoppingCart" onClick={() => push({ title: 'Reorder saved (demo)', tone: 'success' })}>
                Reorder now
              </Button>
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Current stock</p>
                  <p className="font-display text-[28px] font-semibold text-ink">
                    {active.stock} <span className="text-[15px] font-medium text-ink-muted">{active.unit}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Capacity</p>
                  <p className="font-display text-[20px] font-semibold text-ink-muted">
                    {active.capacity} {active.unit}
                  </p>
                </div>
              </div>
              <Progress value={(active.stock / active.capacity) * 100} className="mt-3" height={7} tone={active.status === 'Critical' ? 'clay' : active.status === 'Low' ? 'gold' : 'sage'} />
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Details</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Reorder point" value={`${active.reorder} ${active.unit}`} />
                <MetricRow label="Average daily use" value={`${active.usedPerDay} ${active.unit}`} />
                <MetricRow label="Days of cover" value={`${(active.stock / active.usedPerDay).toFixed(1)} days`} />
                <MetricRow label="Cost per unit" value={money(active.costPerUnit)} />
                <MetricRow label="Stock value" value={money(active.stock * active.costPerUnit)} />
                <MetricRow label="Supplier" value={active.supplier} />
                <MetricRow label="Last delivery" value={active.lastDelivery} />
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Consumption — demo series</p>
              <div className="mt-3 h-[180px]">
                <BarSeries
                  data={[
                    { d: 'Mon', v: active.usedPerDay }, { d: 'Tue', v: Math.round(active.usedPerDay * 0.9) },
                    { d: 'Wed', v: Math.round(active.usedPerDay * 1.15) }, { d: 'Thu', v: Math.round(active.usedPerDay * 1.05) },
                    { d: 'Fri', v: Math.round(active.usedPerDay * 1.4) }, { d: 'Sat', v: Math.round(active.usedPerDay * 1.5) },
                    { d: 'Sun', v: Math.round(active.usedPerDay * 1.2) },
                  ]}
                  xKey="d"
                  bars={[{ key: 'v', label: `Used (${active.unit})`, color: '#B54E17' }]}
                  showLegend={false}
                />
              </div>
            </Card>

            <DemoNote>Demo inventory record. No supplier integration exists in this prototype.</DemoNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
