import React, { useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, Select, Tabs, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, TrendChart } from '../../components/charts'
import { KpiCard, LiveNote, MetricRow, Progress } from '../../components/shared'
import { PageError, PageLoader, fmtDate } from '../../lib/api'
import { useInventoryData, type StockRow } from '../../lib/live'
import { money, num } from '../../lib/utils'

const BAND_TONE: Record<string, 'clay' | 'gold' | 'sky' | 'sage'> = {
  critical: 'clay',
  high: 'gold',
  medium: 'sky',
  low: 'sage',
}

const BAND_ACTION: Record<string, string> = {
  critical: 'Cut next prep immediately and review the item with the kitchen lead.',
  high: 'Reduce prep quantities and watch daily waste for a week.',
  medium: 'Hold prep steady; re-check after the next forecast refresh.',
  low: 'No action needed — waste is within tolerance.',
}

export default function Inventory() {
  const { push } = useToast()
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [band, setBand] = useState('all')
  const [active, setActive] = useState<StockRow | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const { data, loading, error, refetch } = useInventoryData()

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No inventory data.'} onRetry={refetch} />

  const rows = data.stock.filter((i) => {
    const q = query.trim().toLowerCase()
    if (q && !i.itemName.toLowerCase().includes(q) && !i.restaurantName.toLowerCase().includes(q) && !i.itemId.toLowerCase().includes(q)) return false
    return true
  })

  const alerts = data.risks.filter((r) => (r.band === 'critical' || r.band === 'high') && !dismissed.includes(r.itemId))
  const riskCards = data.risks.filter((r) => (band === 'all' || r.band === band) && !dismissed.includes(r.itemId))

  const copyText = (text: string, title: string) => {
    void navigator.clipboard.writeText(text).then(
      () => push({ title, tone: 'success' }),
      () => push({ title: 'Copy failed', tone: 'error' }),
    )
  }

  const columns: Column<StockRow>[] = [
    {
      key: 'item',
      header: 'Item',
      sort: (a, b) => a.itemName.localeCompare(b.itemName),
      render: (i) => (
        <div>
          <p className="text-[13px] font-semibold text-ink">{i.itemName}</p>
          <p className="font-mono text-[11.5px] text-ink-muted">{i.itemId}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sort: (a, b) => a.restaurantName.localeCompare(b.restaurantName),
      render: (i) => <span className="text-[12.5px] text-ink-soft">{i.restaurantName}</span>,
    },
    {
      key: 'date',
      header: 'Snapshot',
      sort: (a, b) => (a.date < b.date ? -1 : 1),
      render: (i) => <span className="text-[12.5px] text-ink-muted">{fmtDate(i.date)}</span>,
    },
    {
      key: 'stock',
      header: 'Stock level',
      align: 'right',
      sort: (a, b) => a.stock - b.stock,
      render: (i) => <span className="font-semibold tabular-nums text-ink">{num(i.stock)} units</span>,
    },
    {
      key: 'consumed',
      header: 'Consumed',
      align: 'right',
      hideBelow: 'md',
      sort: (a, b) => a.consumed - b.consumed,
      render: (i) => <span className="tabular-nums text-ink-soft">{num(i.consumed)}</span>,
    },
    {
      key: 'replenished',
      header: 'Replenished',
      align: 'right',
      hideBelow: 'lg',
      sort: (a, b) => a.replenished - b.replenished,
      render: (i) => <span className="tabular-nums text-ink-soft">{num(i.replenished)}</span>,
    },
    {
      key: 'net',
      header: 'Net change',
      align: 'right',
      hideBelow: 'xl',
      sort: (a, b) => a.replenished - a.consumed - (b.replenished - b.consumed),
      render: (i) => {
        const net = i.replenished - i.consumed
        return (
          <span className={cn('font-semibold tabular-nums', net >= 0 ? 'text-sage-700' : 'text-clay-600')}>
            {net >= 0 ? '+' : ''}{num(net)}
          </span>
        )
      },
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
        subtitle="Live stock snapshots and pipeline wastage scoring across the branch network."
        demoNote="Live stock snapshots and wastage records — supplier and reorder data is not tracked in this dataset."
        onRefresh={refetch}
        dataset="wastage"
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Stock snapshots" value={num(data.stock.length)} compare="latest per branch × item" icon="Package" tone="ember" />
        <KpiCard label="Wastage cost (total)" value={money(data.totalCost, { compact: true })} compare={`${num(Math.round(data.totalQty))} units wasted`} icon="Trash2" tone="clay" />
        <KpiCard label="Critical-risk items" value={num(data.bandCount('critical'))} compare={`${num(data.bandCount('high'))} high-risk`} icon="AlertTriangle" tone="gold" />
        <KpiCard label="Locations affected" value={num(data.locationsAffected)} compare="branches with waste" icon="Store" tone="sky" />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="mb-5 border-gold-200">
          <CardHeader
            title="Wastage risk alerts"
            subtitle={`${alerts.length} items scored critical or high by the wastage model`}
            icon="AlertTriangle"
            className="border-b"
          />
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {alerts.slice(0, 6).map((r) => (
              <div key={r.itemId} className={cn('rounded-2xl border p-4', r.band === 'critical' ? 'border-clay-200 bg-clay-50/50' : 'border-gold-200 bg-gold-50/40')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink">{r.itemName}</p>
                    <p className="text-[12px] text-ink-muted">
                      {num(r.recentWaste)} units wasted recently · {num(r.unitsSold)} sold
                    </p>
                  </div>
                  <Badge tone={r.band === 'critical' ? 'clay' : 'gold'} className="capitalize">{r.band}</Badge>
                </div>
                <Progress value={r.score * 100} className="mt-2.5" height={5} tone={r.band === 'critical' ? 'clay' : 'gold'} />
                <p className="mt-2 text-[11.5px] text-ink-muted">
                  Risk score {r.score.toFixed(3)} · 28-day demand forecast {num(r.forecast28)} units
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
              <SearchInput value={query} onChange={setQuery} placeholder="Search items or locations…" className="w-full sm:w-72" />
              <span className="ml-auto text-[12.5px] text-ink-muted">
                <span className="font-semibold text-ink">{rows.length}</span> of {num(data.stock.length)} snapshots
              </span>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(i) => i.id}
              pageSize={10}
              onRowClick={(i) => setActive(i)}
              emptyTitle="No snapshots match this search"
              emptyMessage="Try a different item or location."
              emptyAction={
                <Button size="sm" variant="secondary" icon="RotateCcw" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              }
            />
          </Card>
        </div>
      )}

      {tab === 'wastage' && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Wastage cost by category" subtitle="Total recorded wastage cost — live" height={300}>
              <BarSeries
                data={data.catBars}
                xKey="category"
                layout="vertical"
                bars={[{ key: 'cost', label: 'Wastage cost', color: '#96352C' }]}
                valueFormat={(v) => money(v, { compact: true })}
                showLegend={false}
              />
            </ChartCard>

            <ChartCard title="Wastage trend" subtitle="Monthly wasted units and cost — live" height={300}>
              <TrendChart
                data={data.trendMonthly}
                xKey="month"
                series={[
                  { key: 'waste', label: 'Wasted units', color: '#96352C', type: 'bar' },
                  { key: 'cost', label: 'Wastage cost', color: '#C08A16', type: 'line' },
                ]}
                valueFormat={(v, n) => (n === 'Wasted units' ? `${num(v)} units` : money(v))}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
            <ChartCard title="Wastage by location" subtitle="Total wastage cost per branch — live" height={270}>
              <BarSeries
                data={data.locBars}
                xKey="location"
                layout="vertical"
                bars={[{ key: 'cost', label: 'Wastage cost', color: '#B54E17' }]}
                valueFormat={(v) => money(v, { compact: true })}
                showLegend={false}
              />
            </ChartCard>

            <ChartCard title="Consumption versus replenishment" subtitle="Latest snapshots, top items — live" height={270}>
              <TrendChart
                data={data.consRows}
                xKey="item"
                series={[
                  { key: 'consumed', label: 'Consumed', color: '#C08A16', type: 'bar' },
                  { key: 'replenished', label: 'Replenished', color: '#5E8C4A', type: 'bar' },
                ]}
                valueFormat={(v) => `${num(v)} units`}
              />
            </ChartCard>
          </div>

          <Card>
            <CardHeader title="Highest-wastage menu items" subtitle="Ranked by recorded wastage cost — live" className="border-b" />
            <div className="divide-y divide-line">
              {data.topWaste.map((w) => (
                <div key={w.item_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{w.item_name}</p>
                    <p className="text-[11.5px] text-ink-muted">{num(w.incidents)} incidents · {num(Math.round(w.wasted_qty))} units wasted · {num(w.units_sold)} sold</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <Progress value={(w.wastage_cost / data.maxWaste) * 100} tone="clay" height={5} />
                    </div>
                    <span className="w-20 text-right text-[13px] font-bold tabular-nums text-clay-600">
                      {money(w.wastage_cost, { compact: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'risk' && (
        <div className="mt-5">
          <Card className="mb-4">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Select value={band} onChange={(e) => setBand(e.target.value)} className="w-auto" aria-label="Risk band">
                <option value="all">All bands ({num(data.risks.length)} scored)</option>
                <option value="critical">Critical ({num(data.bandCount('critical'))})</option>
                <option value="high">High ({num(data.bandCount('high'))})</option>
                <option value="medium">Medium ({num(data.bandCount('medium'))})</option>
                <option value="low">Low ({num(data.bandCount('low'))})</option>
              </Select>
              <span className="ml-auto text-[12.5px] text-ink-muted">
                Scores blend recent waste, 28-day demand forecast and popularity.
              </span>
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {riskCards.map((r) => (
              <Card key={r.itemId} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      r.band === 'critical' ? 'bg-clay-50 text-clay-600' : r.band === 'high' ? 'bg-gold-50 text-gold-600' : 'bg-sky-50 text-sky-600',
                    )}
                  >
                    <Icon name="AlertTriangle" size={18} />
                  </span>
                  <Badge tone={BAND_TONE[r.band] ?? 'neutral'} className="capitalize">{r.band} risk</Badge>
                </div>
                <h3 className="mt-3 font-display text-[15.5px] font-semibold leading-snug text-ink">{r.itemName}</h3>
                <p className="mt-0.5 font-mono text-[12px] text-ink-soft">{r.itemId}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { l: 'Risk score', v: r.score.toFixed(3) },
                    { l: 'Recent waste', v: num(r.recentWaste) },
                    { l: 'Forecast 28d', v: num(r.forecast28) },
                  ].map((m) => (
                    <div key={m.l} className="rounded-xl border border-line bg-canvas px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{m.l}</p>
                      <p className="mt-0.5 text-[13.5px] font-bold tabular-nums text-ink">{m.v}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
                  <span className="font-semibold text-ink">Suggested action: </span>
                  {BAND_ACTION[r.band] ?? 'Review manually.'}
                </p>
                <div className="mt-3.5 flex gap-2">
                  <Button size="xs" variant="secondary" onClick={() => copyText(`${r.itemName} (${r.itemId}) — ${r.band} risk, score ${r.score.toFixed(3)}, recent waste ${r.recentWaste}, forecast 28d ${r.forecast28}. ${BAND_ACTION[r.band] ?? ''}`, 'Risk summary copied')}>
                    Copy summary
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setDismissed((d) => [...d, r.itemId])}>
                    Dismiss
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          {riskCards.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-[13.5px] font-semibold text-ink">No risk cards in this view</p>
              <p className="mt-1 text-[12.5px] text-ink-muted">All items in this band were dismissed, or the band is empty.</p>
            </Card>
          )}
          <div className="mt-4">
            <LiveNote>Risk scores are live pipeline output blending waste, demand forecast and popularity signals.</LiveNote>
          </div>
        </div>
      )}

      {/* Stock snapshot drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.itemName ?? ''}
        subtitle={active ? `${active.restaurantName} ·snapshot ${fmtDate(active.date)}` : ''}
        width="md"
        badge={active ? <Badge tone="neutral" dot>{active.itemId}</Badge> : undefined}
        footer={
          active && (
            <Button
              variant="secondary"
              icon="Copy"
              onClick={() => copyText(`${active.itemName} (${active.itemId}) at ${active.restaurantName} on ${active.date}: stock ${active.stock}, consumed ${active.consumed}, replenished ${active.replenished}.`, 'Snapshot copied')}
            >
              Copy snapshot
            </Button>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Stock level</p>
                  <p className="font-display text-[28px] font-semibold text-ink">
                    {num(active.stock)} <span className="text-[15px] font-medium text-ink-muted">units</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Net change</p>
                  <p className={cn('font-display text-[20px] font-semibold', active.replenished - active.consumed >= 0 ? 'text-sage-700' : 'text-clay-600')}>
                    {active.replenished - active.consumed >= 0 ? '+' : ''}{num(active.replenished - active.consumed)}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Consumed</p>
                  <p className="mt-0.5 text-[15px] font-bold tabular-nums text-ink">{num(active.consumed)}</p>
                </div>
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Replenished</p>
                  <p className="mt-0.5 text-[15px] font-bold tabular-nums text-ink">{num(active.replenished)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Details</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Item" value={`${active.itemName} (${active.itemId})`} />
                <MetricRow label="Location" value={active.restaurantName} />
                <MetricRow label="Snapshot date" value={fmtDate(active.date)} />
                <MetricRow label="Stock level" value={`${num(active.stock)} units`} />
                <MetricRow label="Consumed" value={`${num(active.consumed)} units`} />
                <MetricRow label="Replenished" value={`${num(active.replenished)} units`} />
              </div>
            </Card>

            <LiveNote>Live stock snapshot. Supplier, reorder-point and delivery data is not tracked in this dataset.</LiveNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
