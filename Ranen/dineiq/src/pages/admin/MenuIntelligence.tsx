import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Badge, Button, Card, CardHeader, Icon, SearchInput, Select, Tabs, Tooltip, cn,
} from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, DonutChart, LineSeries, ScatterPlot, Sparkline, TrendChart } from '../../components/charts'
import { FoodImage, KpiCard, LiveNote, MetricRow, ProgressRing } from '../../components/shared'
import { PageError, PageLoader, fmtDate } from '../../lib/api'
import { INTEL_CLASS_ORDER, diffDaysISO, useIntelDetail, useMenuIntelData, type IntelRow } from '../../lib/live'
import { money, num } from '../../lib/utils'

const MENU_DETAIL_TABS = [
  'Overview', 'Sales', 'Profitability', 'Customer behaviour', 'Ratings', 'Wastage', 'Pricing', 'Promotions', 'Location performance',
]

export default function MenuIntelligence() {
  const [tab, setTab] = useState('overview')
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [active, setActive] = useState<IntelRow | null>(null)
  const [detailTab, setDetailTab] = useState('Overview')
  const { data, loading, error, refetch } = useMenuIntelData()
  const { detail, loading: detailLoading } = useIntelDetail(active?.id ?? null)

  const rows = useMemo(() => {
    let r = data?.rows ?? []
    if (filter !== 'all') r = r.filter((x) => x.classification === filter)
    if (category !== 'all') r = r.filter((x) => x.category === category)
    const q = query.trim().toLowerCase()
    if (q) r = r.filter((x) => x.name.toLowerCase().includes(q) || x.category.toLowerCase().includes(q))
    return r
  }, [data, filter, category, query])

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No menu intelligence.'} onRetry={refetch} />

  const clsByKey = Object.fromEntries(data.classes.map((c) => [c.key, c]))
  const categories = Array.from(new Set(data.rows.map((r) => r.category))).sort()
  const avg = (k: 'profitPct' | 'rating' | 'wastage' | 'repeat') =>
    data.rows.length ? data.rows.reduce((s, r) => s + r[k], 0) / data.rows.length : 0

  const columns: Column<IntelRow>[] = [
    {
      key: 'name',
      header: 'Menu item',
      width: '230px',
      sort: (a, b) => a.name.localeCompare(b.name),
      render: (r) => (
        <div className="flex items-center gap-3">
          <FoodImage name={r.name} className="h-9 w-9 shrink-0" ratio="fill" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{r.name}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{r.category}</p>
          </div>
        </div>
      ),
    },
    { key: 'units', header: 'Units', align: 'right', sort: (a, b) => a.units - b.units, render: (r) => <span className="tabular-nums text-ink-soft">{num(r.units)}</span> },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      sort: (a, b) => a.revenue - b.revenue,
      render: (r) => <span className="font-semibold tabular-nums text-ink">{money(r.revenue, { compact: true })}</span>,
    },
    {
      key: 'cost',
      header: 'Est. cost',
      align: 'right',
      hideBelow: 'lg',
      sort: (a, b) => a.cost - b.cost,
      render: (r) => <span className="tabular-nums text-ink-muted">{money(r.cost, { compact: true })}</span>,
    },
    {
      key: 'cm',
      header: 'Contribution',
      align: 'right',
      hideBelow: 'md',
      sort: (a, b) => a.cm - b.cm,
      render: (r) => <span className="tabular-nums text-ink-soft">{money(r.cm, { compact: true })}</span>,
    },
    {
      key: 'profitPct',
      header: 'Profit %',
      align: 'right',
      sort: (a, b) => a.profitPct - b.profitPct,
      headerTip: 'Contribution margin as a percentage of revenue — live pipeline value',
      render: (r) => (
        <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-bold', r.profitPct >= 65 ? 'bg-sage-50 text-sage-700' : r.profitPct >= 58 ? 'bg-gold-50 text-gold-600' : 'bg-clay-50 text-clay-600')}>
          {r.profitPct.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      align: 'center',
      hideBelow: 'xl',
      sort: (a, b) => a.rating - b.rating,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink">
          <Icon name="Star" size={11} className="fill-gold-500 text-gold-500" />
          {r.nRatings > 0 ? r.rating.toFixed(1) : '—'}
        </span>
      ),
    },
    {
      key: 'repeat',
      header: 'Repeat',
      align: 'right',
      hideBelow: 'xl',
      sort: (a, b) => a.repeat - b.repeat,
      render: (r) => <span className="tabular-nums text-ink-soft">{r.repeat}%</span>,
    },
    {
      key: 'wastage',
      header: 'Wastage',
      align: 'right',
      hideBelow: 'lg',
      sort: (a, b) => a.wastage - b.wastage,
      render: (r) => (
        <span className={cn('tabular-nums', r.wastage > 8 ? 'font-semibold text-clay-600' : r.wastage > 5 ? 'text-gold-600' : 'text-ink-soft')}>
          {r.wastage.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'classification',
      header: 'Classification',
      width: '160px',
      render: (r) => {
        const c = clsByKey[r.classification]
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold"
            style={{ background: c.bg, color: c.color, borderColor: c.border }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
            {c.label}
          </span>
        )
      },
    },
    {
      key: 'promo',
      header: 'Promo %',
      align: 'right',
      hideBelow: 'md',
      sort: (a, b) => a.promoDependency - b.promoDependency,
      headerTip: 'Share of units sold while an offer was active — live pipeline value',
      render: (r) => <span className="tabular-nums text-ink-soft">{r.promoDependency}%</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '70px',
      render: (r) => (
        <Button size="xs" variant="secondary" icon="ChartNoAxesColumn" onClick={() => { setActive(r); setDetailTab('Overview') }}>
          Analyse
        </Button>
      ),
    },
  ]

  const monthUnits = detail?.monthly_trend.map((t) => t.units) ?? []
  const monthSales = detail?.monthly_trend.map((t) => ({ m: t.m, units: t.units, revenue: t.revenue })) ?? []
  const chUnits = (detail?.channels ?? []).reduce((s, c) => s + c.units, 0)
  const channelMix = (detail?.channels ?? []).map((c) => ({
    c: c.channel,
    v: chUnits ? Math.round((c.units / chUnits) * 1000) / 10 : 0,
  }))
  const rateN = (detail?.rating_dist ?? []).reduce((s, r) => s + r.n, 0)
  const rateDist = (detail?.rating_dist ?? []).map((r) => ({
    s: `${r.rating}★`,
    v: rateN ? Math.round((r.n / rateN) * 1000) / 10 : 0,
  }))
  const itemPromos = active
    ? data.promos.filter(
        (p) => p.scope === 'Storewide' || (p.scope === 'Item' && p.target_id === active.id) || (p.scope === 'Category' && p.target_id === active.categoryId),
      )
    : []
  const waste = active ? data.wasteById[active.id] : undefined
  const daysActive = active && active.firstSold && active.lastSold ? Math.max(1, diffDaysISO(active.firstSold, active.lastSold) + 1) : 1

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Menu Intelligence"
        subtitle={`Every dish classified by the live pipeline${data.scoped ? ' with location-local bands' : ''} — profit, volume, hidden opportunities and low performers.`}
        demoNote="Live pipeline classifications — cut-offs are percentiles recomputed each run, never hard-coded."
        onRefresh={refetch}
        dataset="menu_performance"
        actions={
          <Link to="/admin/recommendations">
            <Button size="sm" variant="secondary" icon="Lightbulb">
              View recommendations
            </Button>
          </Link>
        }
      />

      {/* Metric strip */}
      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { l: 'Items analysed', v: `${data.rows.length}`, i: 'UtensilsCrossed', t: 'ember' },
          { l: 'Average margin', v: `${avg('profitPct').toFixed(1)}%`, i: 'Percent', t: 'sage' },
          { l: 'Average rating', v: `${avg('rating').toFixed(2)}`, i: 'Star', t: 'gold' },
          { l: 'Average wastage', v: `${avg('wastage').toFixed(1)}%`, i: 'Trash2', t: 'clay' },
          { l: 'Repeat purchase', v: `${avg('repeat').toFixed(1)}%`, i: 'RefreshCw', t: 'sky' },
        ].map((k) => (
          <KpiCard key={k.l} label={k.l} value={k.v} icon={k.i} tone={k.t} compare="across live items" />
        ))}
      </div>

      {/* Classification cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {data.classes.map((c) => {
          const examples = data.rows.filter((r) => r.classification === c.key).slice(0, 3)
          const isActive = filter === c.key
          return (
            <Card
              key={c.key}
              as="button"
              onClick={() => setFilter(isActive ? 'all' : c.key)}
              className={cn('p-4 text-left transition-all hover:shadow-lift', isActive && 'ring-2 ring-offset-1')}
              style={isActive ? ({ boxShadow: `0 0 0 2px ${c.color}` } as React.CSSProperties) : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold"
                  style={{ background: c.bg, color: c.color, borderColor: c.border }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </span>
                <Tooltip content={`${c.count} items · ${c.shareLabel}`}>
                  <span className="font-display text-[20px] font-semibold" style={{ color: c.color }}>
                    {c.count}
                  </span>
                </Tooltip>
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-muted">{c.desc}</p>
              <div className="mt-3 border-t border-line pt-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Example items</p>
                <ul className="mt-1.5 space-y-1">
                  {examples.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate text-ink-soft">{e.name}</span>
                      <span className="shrink-0 tabular-nums text-ink-faint">{e.profitPct.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { label: 'Overview', value: 'overview' },
            { label: 'Performance matrix', value: 'matrix' },
            { label: 'Item performance', value: 'items' },
            { label: 'Classifications', value: 'classifications' },
          ]}
        />
      </div>

      {tab === 'overview' && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <ChartCard
              title="Revenue versus profitability"
              subtitle="Position shows units sold against contribution margin"
              height={330}
              footer="Live scatter — one point per dish."
            >
              <ScatterPlot
                data={data.scatter}
                xKey="units"
                yKey="profitPct"
                groupKey="classification"
                xLabel="Units sold"
                yLabel="Profit %"
                groups={INTEL_CLASS_ORDER.map((k) => ({ key: k, label: clsByKey[k].label, color: clsByKey[k].color }))}
                valueFormat={(v, n) => (n === 'Profit %' ? `${v}%` : `${v}`)}
              />
            </ChartCard>

            <ChartCard title="Classification share" subtitle={`Live distribution across ${data.rows.length} items`} height={330}>
              <DonutChart data={data.dist} valueFormat={(v) => `${v}%`} centerValue={String(data.rows.length)} centerLabel="Items" />
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Category comparison" subtitle="Revenue and margin by category — live values" height={290}>
              <TrendChart
                data={data.categoryBars}
                xKey="category"
                series={[
                  { key: 'revenue', label: 'Revenue', color: '#B54E17', type: 'bar' },
                  { key: 'margin', label: 'Margin %', color: '#5E8C4A', type: 'line' },
                ]}
                valueFormat={(v, n) => (n === 'Revenue' ? money(v, { compact: true }) : `${v}%`)}
              />
            </ChartCard>

            <ChartCard title="Profitability distribution" subtitle="How many items sit in each margin band" height={290}>
              <BarSeries data={data.marginDist} xKey="bucket" bars={[{ key: 'items', label: 'Items', color: '#C08A16' }]} valueFormat={(v) => `${v} items`} showLegend={false} />
            </ChartCard>
          </div>

          <ChartCard
            title="Sales trend"
            subtitle="Daily completed orders across the menu — live series"
            height={260}
            footer="Live daily series for the selected range."
          >
            <LineSeries
              data={data.salesTrend}
              xKey="d"
              lines={[{ key: 'units', label: 'Orders', color: '#B54E17' }]}
              valueFormat={(v) => `${num(v)} orders`}
              showLegend={false}
            />
          </ChartCard>
        </div>
      )}

      {tab === 'matrix' && (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <ChartCard title="Menu performance matrix" subtitle="Units sold against contribution margin — live quadrants" height={420}>
            <ScatterPlot
              data={data.scatter}
              xKey="units"
              yKey="profitPct"
              groupKey="classification"
              xLabel="Units sold →"
              yLabel="Profit % →"
              groups={INTEL_CLASS_ORDER.map((k) => ({ key: k, label: clsByKey[k].label, color: clsByKey[k].color }))}
              valueFormat={(v, n) => (n === 'Profit %' ? `${v}%` : `${v}`)}
            />
          </ChartCard>

          <Card className="p-5">
            <h3 className="font-display text-[16px] font-semibold text-ink">How to read the matrix</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              The matrix places each dish on volume (horizontal) and profit percentage (vertical). The quadrant a dish
              lands in suggests the type of action usually considered for it.
            </p>
            <div className="mt-4 space-y-3">
              {data.classes.map((c) => (
                <div key={c.key} className="rounded-xl border p-3.5" style={{ background: c.bg, borderColor: c.border }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold" style={{ color: c.color }}>
                      {c.label}
                    </span>
                    <span className="text-[11.5px] font-semibold text-ink-muted">{c.shareLabel}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {c.criteria.map((crit) => (
                      <li key={crit} className="flex items-start gap-1.5 text-[12px] text-ink-soft">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: c.color }} />
                        {crit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <LiveNote className="mt-4">
              Quadrant boundaries are live percentiles (p70 demand/profit, p75 wastage) recomputed on every pipeline run.
            </LiveNote>
          </Card>
        </div>
      )}

      {tab === 'items' && (
        <div className="mt-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <SearchInput value={query} onChange={setQuery} placeholder="Search menu items…" className="w-full sm:w-60" />
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto" aria-label="Category">
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto" aria-label="Classification">
                <option value="all">All classifications</option>
                {data.classes.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
              {(filter !== 'all' || category !== 'all' || query) && (
                <Button
                  size="xs"
                  variant="ghost"
                  icon="RotateCcw"
                  onClick={() => {
                    setFilter('all')
                    setCategory('all')
                    setQuery('')
                  }}
                >
                  Reset
                </Button>
              )}
              <span className="ml-auto text-[12.5px] text-ink-muted">
                <span className="font-semibold text-ink">{rows.length}</span> items shown
              </span>
            </div>

            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              pageSize={12}
              onRowClick={(r) => { setActive(r); setDetailTab('Overview') }}
              initialSort={{ key: 'revenue', dir: 'desc' }}
              emptyTitle="No items match these filters"
              emptyMessage="Try clearing the classification or category filter."
              emptyAction={
                <Button
                  size="sm"
                  variant="secondary"
                  icon="RotateCcw"
                  onClick={() => {
                    setFilter('all')
                    setCategory('all')
                    setQuery('')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </Card>
        </div>
      )}

      {tab === 'classifications' && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {data.classes.map((c) => {
            const items = data.rows.filter((r) => r.classification === c.key)
            const revenue = items.reduce((s, r) => s + r.revenue, 0)
            const units = items.reduce((s, r) => s + r.units, 0)
            const margin = items.length ? items.reduce((s, r) => s + r.profitPct, 0) / items.length : 0
            return (
              <Card key={c.key} className="overflow-hidden">
                <div className="border-b border-line p-5" style={{ background: c.bg }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border bg-white/70 px-2.5 py-0.5 text-[11.5px] font-bold"
                        style={{ color: c.color, borderColor: c.border }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                        {c.label}
                      </span>
                      <h3 className="mt-2.5 font-display text-[19px] font-semibold text-ink">
                        {c.count} items · {c.shareLabel}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[24px] font-semibold" style={{ color: c.color }}>
                        {margin.toFixed(1)}%
                      </p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Avg margin</p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">{c.desc}</p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
                  {[
                    { l: 'Units sold', v: num(units) },
                    { l: 'Revenue', v: money(revenue, { compact: true }) },
                    { l: 'Avg rating', v: items.length ? (items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(2) : '—' },
                  ].map((s) => (
                    <div key={s.l} className="px-4 py-3">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                      <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{s.v}</p>
                    </div>
                  ))}
                </div>

                <div className="p-5">
                  <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Classification criteria</p>
                  <ul className="mt-2 space-y-1.5">
                    {c.criteria.map((crit) => (
                      <li key={crit} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                        <Icon name="Check" size={13} className="mt-0.5 shrink-0" style={{ color: c.color }} />
                        {crit}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 border-t border-line pt-3">
                    <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Items in this group</p>
                    <div className="mt-2 space-y-1.5">
                      {items.slice(0, 5).map((i) => (
                        <button key={i.id} onClick={() => { setActive(i); setDetailTab('Overview') }} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-canvas">
                          <span className="truncate text-[12.5px] text-ink-soft">{i.name}</span>
                          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink">{i.profitPct.toFixed(1)}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Item drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        width="xl"
        title={active?.name ?? ''}
        subtitle={active ? `${active.category} · ${money(active.revenue, { compact: true })} live revenue · ${num(active.units)} units` : ''}
        badge={
          active ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold"
              style={{ background: clsByKey[active.classification].bg, color: clsByKey[active.classification].color, borderColor: clsByKey[active.classification].border }}
            >
              {clsByKey[active.classification].label}
            </span>
          ) : undefined
        }
      >
        {active && (
          <div>
            <div className="border-b border-line bg-white px-5">
              <Tabs
                value={detailTab}
                onChange={(v) => setDetailTab(v)}
                tabs={MENU_DETAIL_TABS.map((t) => ({ label: t, value: t }))}
              />
            </div>

            <div className="space-y-4 p-5">
              {detailLoading && !detail && (
                <p className="py-6 text-center text-[13px] text-ink-muted">Loading item detail…</p>
              )}
              {detailTab === 'Overview' && (
                <>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      { l: 'Units sold', v: num(active.units) },
                      { l: 'Revenue', v: money(active.revenue, { compact: true }) },
                      { l: 'Contribution', v: money(active.cm, { compact: true }) },
                      { l: 'Profit %', v: `${active.profitPct.toFixed(1)}%` },
                    ].map((s) => (
                      <div key={s.l} className="rounded-xl border border-line bg-white p-3.5">
                        <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                        <p className="mt-0.5 font-display text-[18px] font-semibold text-ink">{s.v}</p>
                      </div>
                    ))}
                  </div>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start gap-5">
                      <ProgressRing value={active.profitPct} color={clsByKey[active.classification].color} size={72} stroke={7}>
                        {active.profitPct.toFixed(0)}%
                      </ProgressRing>
                      <div className="min-w-[200px] flex-1">
                        <p className="text-[13px] font-semibold text-ink">{clsByKey[active.classification].label}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{clsByKey[active.classification].desc}</p>
                      </div>
                      <div className="w-full sm:w-40">
                        <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Monthly units</p>
                        <div className="mt-1.5">
                          {monthUnits.length > 1 ? (
                            <Sparkline values={monthUnits} color={clsByKey[active.classification].color} width={140} height={40} />
                          ) : (
                            <p className="text-[12px] text-ink-faint">Single month of sales</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Key metrics</p>
                    <div className="mt-1 divide-y divide-line">
                      <MetricRow label="Estimated cost" value={money(active.cost, { compact: true })} />
                      <MetricRow label="Average rating" value={active.nRatings > 0 ? `${active.rating.toFixed(2)} / 5 (${num(active.nRatings)})` : 'No ratings yet'} />
                      <MetricRow label="Repeat purchase rate" value={`${active.repeat}%`} />
                      <MetricRow label="Wastage" value={`${active.wastage.toFixed(1)}%`} tone={active.wastage > 8 ? 'text-clay-600' : undefined} />
                      <MetricRow label="Promotion dependency" value={`${active.promoDependency}%`} hint="Share of units sold while an offer was active — live pipeline value" />
                      {detail?.slow && <MetricRow label="Slow mover" value={detail.slow.slow_moving ? `Yes — ${detail.slow.signals}` : 'No'} />}
                    </div>
                  </Card>
                </>
              )}

              {detailTab === 'Sales' && (
                <div className="space-y-4">
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Monthly units and revenue — live</p>
                    <div className="mt-3 h-[220px]">
                      <TrendChart
                        data={monthSales}
                        xKey="m"
                        series={[
                          { key: 'units', label: 'Units', color: '#B54E17', type: 'area' },
                          { key: 'revenue', label: 'Revenue', color: '#5E8C4A', type: 'line' },
                        ]}
                        valueFormat={(v, n) => (n === 'Revenue' ? money(v, { compact: true }) : `${num(v)} units`)}
                      />
                    </div>
                  </Card>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Units sold" value={num(active.units)} compare="all-time live" icon="Package" tone="ember" />
                    <KpiCard label="Revenue" value={money(active.revenue, { compact: true })} compare="all-time live" icon="Wallet" tone="sky" />
                    <KpiCard label="Avg units / day" value={num(Math.round(active.units / daysActive))} compare={`${num(daysActive)} days on sale`} icon="CalendarDays" tone="gold" />
                  </div>
                </div>
              )}

              {detailTab === 'Profitability' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Revenue" value={money(active.revenue, { compact: true })} compare="live" icon="Wallet" tone="ember" />
                    <KpiCard label="Estimated cost" value={money(active.cost, { compact: true })} compare="live" icon="Coins" tone="clay" />
                    <KpiCard label="Contribution" value={money(active.cm, { compact: true })} compare="live" icon="TrendingUp" tone="sage" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Cost versus contribution — live split</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex justify-between text-[12px] text-ink-muted">
                          <span>Estimated cost</span>
                          <span>{active.revenue > 0 ? ((active.cost / active.revenue) * 100).toFixed(1) : '0.0'}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-clay-500" style={{ width: `${active.revenue > 0 ? (active.cost / active.revenue) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[12px] text-ink-muted">
                          <span>Contribution margin</span>
                          <span>{active.profitPct.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-sage-500" style={{ width: `${Math.min(100, active.profitPct)}%` }} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {detailTab === 'Customer behaviour' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Repeat purchase" value={`${active.repeat}%`} compare="live" icon="RefreshCw" tone="ember" />
                    <KpiCard label="Promotion dependency" value={`${active.promoDependency}%`} compare="live" icon="BadgePercent" tone="gold" />
                    <KpiCard label="Average rating" value={active.nRatings > 0 ? active.rating.toFixed(2) : '—'} compare="live" icon="Star" tone="sage" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Ordering channel mix — live split</p>
                    <div className="mt-3 h-[220px]">
                      <BarSeries
                        data={channelMix}
                        xKey="c"
                        bars={[{ key: 'v', label: 'Share %', color: '#2F6FA8' }]}
                        valueFormat={(v) => `${v}%`}
                        showLegend={false}
                      />
                    </div>
                  </Card>
                </div>
              )}

              {detailTab === 'Ratings' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Average rating" value={active.nRatings > 0 ? active.rating.toFixed(2) : '—'} compare="live" icon="Star" tone="gold" />
                    <KpiCard label="Reviews" value={num(active.nRatings)} compare="live" icon="MessageSquare" tone="sky" />
                    <KpiCard label="Rating vs menu avg" value={active.nRatings > 0 ? (active.rating - data.menuAvgRating).toFixed(2) : '—'} compare="live" icon="ArrowUpRight" tone="sage" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Rating distribution — live values</p>
                    <div className="mt-3 h-[220px]">
                      <BarSeries
                        data={rateDist}
                        xKey="s"
                        bars={[{ key: 'v', label: 'Reviews %', color: '#C08A16' }]}
                        valueFormat={(v) => `${v}%`}
                        showLegend={false}
                      />
                    </div>
                  </Card>
                </div>
              )}

              {detailTab === 'Wastage' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Wastage" value={`${active.wastage.toFixed(1)}%`} compare="live" icon="Trash2" tone="clay" />
                    <KpiCard label="Recorded waste cost" value={waste ? money(waste.cost, { compact: true }) : '—'} compare="live" icon="Coins" tone="clay" />
                    <KpiCard label="Units wasted" value={num(Math.round(waste?.qty ?? active.wastedQty))} compare="live" icon="PackageMinus" tone="gold" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Sold versus recorded waste — live values</p>
                    <div className="mt-3 h-[220px]">
                      <BarSeries
                        data={[
                          { l: 'Sold', v: active.units },
                          { l: 'Wasted', v: Math.round(waste?.qty ?? active.wastedQty) },
                        ]}
                        xKey="l"
                        bars={[{ key: 'v', label: 'Units', color: '#B54E17' }]}
                        valueFormat={(v) => `${num(v)} units`}
                        showLegend={false}
                      />
                    </div>
                  </Card>
                </div>
              )}

              {detailTab === 'Pricing' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Avg selling price" value={active.units > 0 ? money(active.revenue / active.units) : '—'} compare="live" icon="Tags" tone="ember" />
                    <KpiCard label="Cost per unit" value={active.units > 0 ? money(active.cost / active.units) : '—'} compare="live" icon="Coins" tone="clay" />
                    <KpiCard label="Margin" value={`${active.profitPct.toFixed(1)}%`} compare="live" icon="Percent" tone="sage" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Price history — live records</p>
                    {(detail?.price_history ?? []).length > 0 ? (
                      <div className="mt-3 h-[220px]">
                        <LineSeries
                          data={(detail?.price_history ?? []).map((p) => ({ m: fmtDate(p.effective_from), p: p.price }))}
                          xKey="m"
                          lines={[{ key: 'p', label: 'Price', color: '#B54E17' }]}
                          valueFormat={(v) => money(v)}
                          showLegend={false}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-[13px] text-ink-muted">No price changes recorded for this item.</p>
                    )}
                  </Card>
                </div>
              )}

              {detailTab === 'Promotions' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Promotion dependency" value={`${active.promoDependency}%`} compare="live" icon="BadgePercent" tone="gold" />
                    <KpiCard label="Units on offer (est.)" value={num(Math.round(active.units * (active.promoDependency / 100)))} compare="live" icon="Package" tone="ember" />
                    <KpiCard label="Avg discount given" value={`${active.avgDiscount}%`} compare="live" icon="TrendingDown" tone="clay" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Promotions covering this item — live records</p>
                    {itemPromos.length === 0 ? (
                      <p className="mt-2 text-[13px] text-ink-muted">No promotion has ever targeted this item.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {itemPromos.map((p) => {
                          const s = p.start_date.slice(0, 10)
                          const e = p.end_date.slice(0, 10)
                          const max = data.dataMax ?? ''
                          const liveNow = max !== '' && s <= max && max <= e
                          return (
                            <li key={p.promotion_id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold text-ink">
                                  {p.promotion_name} · {Math.round(p.discount_pct * 100)}% off
                                </span>
                                <span className="block text-[12px] text-ink-muted">
                                  {fmtDate(s)} → {fmtDate(e)} · {p.scope}
                                </span>
                              </span>
                              <Badge tone={liveNow ? 'sage' : 'neutral'}>{liveNow ? 'Active' : 'Ended'}</Badge>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </Card>
                </div>
              )}

              {detailTab === 'Location performance' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader title="Performance by location" subtitle="Live branch comparison for this item" className="border-b" />
                    {(detail?.locations ?? []).length === 0 ? (
                      <p className="px-4 py-4 text-[13px] text-ink-muted">No per-location sales recorded.</p>
                    ) : (
                      <div className="divide-y divide-line">
                        {(detail?.locations ?? []).map((x) => (
                          <div key={x.restaurant_id} className="flex items-center justify-between gap-3 px-4 py-3">
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-medium text-ink">{x.restaurant_name}</span>
                              <span className="block text-[11.5px] text-ink-faint">
                                {x.city} · {x.location_class}
                                {x.differs_from_global ? ' · differs from global' : ''}
                              </span>
                            </span>
                            <span className="shrink-0 text-[12.5px] text-ink-muted">{num(x.units_sold)} units</span>
                            <span className="w-24 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">{money(x.revenue, { compact: true })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                  {(detail?.locations ?? []).length > 0 && (
                    <Card className="p-4">
                      <p className="text-[13px] font-semibold text-ink">Units by location — live values</p>
                      <div className="mt-3 h-[220px]">
                        <BarSeries
                          data={(detail?.locations ?? []).slice(0, 8).map((x) => ({ l: x.city, v: x.units_sold }))}
                          xKey="l"
                          bars={[{ key: 'v', label: 'Units', color: '#B54E17' }]}
                          valueFormat={(v) => `${num(v)} units`}
                          showLegend={false}
                        />
                      </div>
                    </Card>
                  )}
                </div>
              )}

              <LiveNote>All figures in this panel are live pipeline values for {active.id}.</LiveNote>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
