import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Badge, Button, Card, CardHeader, Icon, SearchInput, Select, Tabs, Tooltip, cn,
} from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, DonutChart, LineSeries, ScatterPlot, Sparkline, TrendChart, defaultCurrencyFormat } from '../../components/charts'
import { DemoNote, FoodImage, KpiCard, MetricRow, ProgressRing } from '../../components/shared'
import {
  CLASSIFICATIONS, CATEGORY_REVENUE, DEMO_NOTE, MARGIN_DISTRIBUTION, MENU_DETAIL_TABS, MENU_INTEL,
  MENU_PERFORMANCE_DIST, SCATTER_DATA, type ClassificationKey, type MenuIntelRow,
} from '../../lib/data/analytics'
import { money, num } from '../../lib/utils'

const ORDER: ClassificationKey[] = ['profit-driver', 'volume-driver', 'hidden-opportunity', 'low-performer']

export default function MenuIntelligence() {
  const [tab, setTab] = useState('overview')
  const [filter, setFilter] = useState<ClassificationKey | 'all'>('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [active, setActive] = useState<MenuIntelRow | null>(null)
  const [detailTab, setDetailTab] = useState('Overview')

  const rows = useMemo(() => {
    let r = MENU_INTEL
    if (filter !== 'all') r = r.filter((x) => x.classification === filter)
    if (category !== 'all') r = r.filter((x) => x.category === category)
    const q = query.trim().toLowerCase()
    if (q) r = r.filter((x) => x.name.toLowerCase().includes(q) || x.category.toLowerCase().includes(q))
    return r
  }, [filter, category, query])

  const avg = (k: keyof MenuIntelRow) => MENU_INTEL.reduce((s, r) => s + (r[k] as number), 0) / MENU_INTEL.length

  const categories = Array.from(new Set(MENU_INTEL.map((r) => r.category)))

  const columns: Column<MenuIntelRow>[] = [
    {
      key: 'name',
      header: 'Menu item',
      width: '230px',
      sort: (a, b) => a.name.localeCompare(b.name),
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
      headerTip: 'Contribution margin as a percentage of revenue — demo value',
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
          {r.rating}
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
        const c = CLASSIFICATIONS[r.classification]
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
      key: 'trend',
      header: 'Trend',
      align: 'center',
      hideBelow: 'md',
      render: (r) => <Sparkline values={r.trend} color={CLASSIFICATIONS[r.classification].color} width={72} height={24} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '70px',
      render: (r) => (
        <Button size="xs" variant="secondary" icon="ChartNoAxesColumn" onClick={() => setActive(r)}>
          Analyse
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Menu Intelligence"
        subtitle="Understand which dishes drive profit, which drive volume, and which are quietly holding the menu back."
        demoNote="Classifications below are static demonstration labels. They are not produced by a model or a live calculation."
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
          { l: 'Items analysed', v: `${MENU_INTEL.length}`, i: 'UtensilsCrossed', t: 'ember' },
          { l: 'Average margin', v: `${avg('profitPct').toFixed(1)}%`, i: 'Percent', t: 'sage' },
          { l: 'Average rating', v: `${avg('rating').toFixed(2)}`, i: 'Star', t: 'gold' },
          { l: 'Average wastage', v: `${avg('wastage').toFixed(1)}%`, i: 'Trash2', t: 'clay' },
          { l: 'Repeat purchase', v: `${avg('repeat').toFixed(1)}%`, i: 'RefreshCw', t: 'sky' },
        ].map((k) => (
          <KpiCard key={k.l} label={k.l} value={k.v} icon={k.i} tone={k.t} compare="across demo items" />
        ))}
      </div>

      {/* Classification cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {ORDER.map((key) => {
          const c = CLASSIFICATIONS[key]
          const examples = MENU_INTEL.filter((r) => r.classification === key).slice(0, 3)
          const isActive = filter === key
          return (
            <Card
              key={key}
              as="button"
              onClick={() => setFilter(isActive ? 'all' : key)}
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
              subtitle="Bubble position shows units sold against contribution margin"
              height={330}
              footer="Demo scatter — positions are hand-written placeholder values."
            >
              <ScatterPlot
                data={SCATTER_DATA}
                xKey="units"
                yKey="profitPct"
                groupKey="classification"
                xLabel="Units sold"
                yLabel="Profit %"
                groups={ORDER.map((k) => ({ key: k, label: CLASSIFICATIONS[k].label, color: CLASSIFICATIONS[k].color }))}
                valueFormat={(v, n) => (n === 'Profit %' ? `${v}%` : `${v}`)}
              />
            </ChartCard>

            <ChartCard title="Classification share" subtitle="Demo distribution across 39 items" height={330}>
              <DonutChart data={MENU_PERFORMANCE_DIST} valueFormat={(v) => `${v}%`} centerValue="39" centerLabel="Items" />
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Category comparison" subtitle="Revenue, units and margin by category — demo values" height={290}>
              <TrendChart
                data={CATEGORY_REVENUE}
                xKey="category"
                series={[
                  { key: 'revenue', label: 'Revenue', color: '#B54E17', type: 'bar' },
                  { key: 'margin', label: 'Margin %', color: '#5E8C4A', type: 'line' },
                ]}
                valueFormat={(v, n) => (n === 'Revenue' ? money(v, { compact: true }) : `${v}%`)}
              />
            </ChartCard>

            <ChartCard title="Profitability distribution" subtitle="How many items sit in each margin band" height={290}>
              <BarSeries data={MARGIN_DISTRIBUTION} xKey="bucket" bars={[{ key: 'items', label: 'Items', color: '#C08A16' }]} valueFormat={(v) => `${v} items`} showLegend={false} />
            </ChartCard>
          </div>

          <ChartCard
            title="Sales trend"
            subtitle="Aggregate units sold across the analysed items — demo series"
            height={260}
            footer="Illustrative eight-period series."
          >
            <LineSeries
              data={[
                { p: 'W1', units: 3180 }, { p: 'W2', units: 3342 }, { p: 'W3', units: 3290 },
                { p: 'W4', units: 3510 }, { p: 'W5', units: 3658 }, { p: 'W6', units: 3712 },
                { p: 'W7', units: 3846 }, { p: 'W8', units: 3982 },
              ]}
              xKey="p"
              lines={[{ key: 'units', label: 'Units sold', color: '#B54E17' }]}
              valueFormat={(v) => `${num(v)} units`}
              showLegend={false}
            />
          </ChartCard>
        </div>
      )}

      {tab === 'matrix' && (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <ChartCard title="Menu performance matrix" subtitle="Units sold against contribution margin — demo quadrants" height={420}>
            <ScatterPlot
              data={SCATTER_DATA}
              xKey="units"
              yKey="profitPct"
              groupKey="classification"
              xLabel="Units sold →"
              yLabel="Profit % →"
              groups={ORDER.map((k) => ({ key: k, label: CLASSIFICATIONS[k].label, color: CLASSIFICATIONS[k].color }))}
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
              {ORDER.map((k) => {
                const c = CLASSIFICATIONS[k]
                return (
                  <div key={k} className="rounded-xl border p-3.5" style={{ background: c.bg, borderColor: c.border }}>
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
                )
              })}
            </div>
            <DemoNote className="mt-4">
              Quadrant boundaries in this prototype are fixed display thresholds, not computed cut-offs.
            </DemoNote>
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
              <Select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="w-auto" aria-label="Classification">
                <option value="all">All classifications</option>
                {ORDER.map((k) => (
                  <option key={k} value={k}>
                    {CLASSIFICATIONS[k].label}
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
              onRowClick={(r) => setActive(r)}
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
          {ORDER.map((k) => {
            const c = CLASSIFICATIONS[k]
            const items = MENU_INTEL.filter((r) => r.classification === k)
            const revenue = items.reduce((s, r) => s + r.revenue, 0)
            const units = items.reduce((s, r) => s + r.units, 0)
            const margin = items.reduce((s, r) => s + r.profitPct, 0) / items.length
            return (
              <Card key={k} className="overflow-hidden">
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
                    { l: 'Avg rating', v: (items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(2) },
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
                        <button key={i.id} onClick={() => { setActive(i); setTab('items') }} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-canvas">
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
        subtitle={active ? `${active.category} · ${money(active.revenue, { compact: true })} demo revenue · ${num(active.units)} units` : ''}
        badge={
          active ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold"
              style={{ background: CLASSIFICATIONS[active.classification].bg, color: CLASSIFICATIONS[active.classification].color, borderColor: CLASSIFICATIONS[active.classification].border }}
            >
              {CLASSIFICATIONS[active.classification].label}
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
                      <ProgressRing value={active.profitPct} color={CLASSIFICATIONS[active.classification].color} size={72} stroke={7}>
                        {active.profitPct.toFixed(0)}%
                      </ProgressRing>
                      <div className="min-w-[200px] flex-1">
                        <p className="text-[13px] font-semibold text-ink">{CLASSIFICATIONS[active.classification].label}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{CLASSIFICATIONS[active.classification].desc}</p>
                      </div>
                      <div className="w-full sm:w-40">
                        <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Sales trend</p>
                        <div className="mt-1.5">
                          <Sparkline values={active.trend} color={CLASSIFICATIONS[active.classification].color} width={140} height={40} />
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Key metrics</p>
                    <div className="mt-1 divide-y divide-line">
                      <MetricRow label="Estimated cost" value={money(active.cost, { compact: true })} />
                      <MetricRow label="Average rating" value={`${active.rating} / 5`} />
                      <MetricRow label="Repeat purchase rate" value={`${active.repeat}%`} />
                      <MetricRow label="Wastage" value={`${active.wastage.toFixed(1)}%`} tone={active.wastage > 8 ? 'text-clay-600' : undefined} />
                      <MetricRow label="Promotion dependency" value={`${active.promoDependency}%`} hint="Share of units sold while an offer was active — demo value" />
                    </div>
                  </Card>
                </>
              )}

              {detailTab === 'Sales' && (
                <div className="space-y-4">
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Units sold — demo series</p>
                    <div className="mt-3 h-[220px]">
                      <TrendChart
                        data={active.trend.map((v, i) => ({ p: `P${i + 1}`, units: v }))}
                        xKey="p"
                        series={[{ key: 'units', label: 'Units (tens)', color: '#B54E17', type: 'area' }]}
                        showLegend={false}
                      />
                    </div>
                  </Card>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Units sold" value={num(active.units)} compare="demo period" icon="Package" tone="ember" />
                    <KpiCard label="Revenue" value={money(active.revenue, { compact: true })} compare="demo period" icon="Wallet" tone="sky" />
                    <KpiCard label="Avg units / day" value={num(Math.round(active.units / 30))} compare="demo period" icon="CalendarDays" tone="gold" />
                  </div>
                </div>
              )}

              {detailTab === 'Profitability' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Revenue" value={money(active.revenue, { compact: true })} compare="demo" icon="Wallet" tone="ember" />
                    <KpiCard label="Estimated cost" value={money(active.cost, { compact: true })} compare="demo" icon="Coins" tone="clay" />
                    <KpiCard label="Contribution" value={money(active.cm, { compact: true })} compare="demo" icon="TrendingUp" tone="sage" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Cost versus contribution — demo split</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex justify-between text-[12px] text-ink-muted">
                          <span>Estimated cost</span>
                          <span>{((active.cost / active.revenue) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-clay-500" style={{ width: `${(active.cost / active.revenue) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[12px] text-ink-muted">
                          <span>Contribution margin</span>
                          <span>{active.profitPct.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-sage-500" style={{ width: `${active.profitPct}%` }} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {detailTab === 'Customer behaviour' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Repeat purchase" value={`${active.repeat}%`} compare="demo" icon="RefreshCw" tone="ember" />
                    <KpiCard label="Promotion dependency" value={`${active.promoDependency}%`} compare="demo" icon="BadgePercent" tone="gold" />
                    <KpiCard label="Average rating" value={`${active.rating}`} compare="demo" icon="Star" tone="sage" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Ordering channel mix — demo split</p>
                    <div className="mt-3 h-[220px]">
                      <BarSeries
                        data={[
                          { c: 'Dine-in', v: 38 }, { c: 'Website', v: 24 }, { c: 'Delivery', v: 26 }, { c: 'Takeaway', v: 12 },
                        ]}
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
                    <KpiCard label="Average rating" value={`${active.rating}`} compare="demo" icon="Star" tone="gold" />
                    <KpiCard label="Reviews" value={num(Math.round(active.units * 0.42))} compare="demo" icon="MessageSquare" tone="sky" />
                    <KpiCard label="Rating vs menu avg" value={`${(active.rating - 4.62).toFixed(2)}`} compare="demo" icon="ArrowUpRight" tone="sage" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Rating distribution — demo values</p>
                    <div className="mt-3 h-[220px]">
                      <BarSeries
                        data={[
                          { s: '5★', v: 62 }, { s: '4★', v: 24 }, { s: '3★', v: 8 }, { s: '2★', v: 4 }, { s: '1★', v: 2 },
                        ]}
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
                    <KpiCard label="Wastage" value={`${active.wastage.toFixed(1)}%`} compare="demo" icon="Trash2" tone="clay" />
                    <KpiCard label="Estimated waste cost" value={money(Math.round(active.cost * (active.wastage / 100)), { compact: true })} compare="demo" icon="Coins" tone="clay" />
                    <KpiCard label="Units not sold" value={num(Math.round(active.units * (active.wastage / 100)))} compare="demo" icon="PackageMinus" tone="gold" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Prepared versus consumed — demo values</p>
                    <div className="mt-3 h-[220px]">
                      <BarSeries
                        data={[
                          { l: 'Prepared', v: active.units },
                          { l: 'Consumed', v: Math.round(active.units * (1 - active.wastage / 100)) },
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
                    <KpiCard label="Current price" value={money(Math.round(active.revenue / active.units))} compare="demo" icon="Tags" tone="ember" />
                    <KpiCard label="Cost per unit" value={money(Math.round(active.cost / active.units))} compare="demo" icon="Coins" tone="clay" />
                    <KpiCard label="Margin" value={`${active.profitPct.toFixed(1)}%`} compare="demo" icon="Percent" tone="sage" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Price history — demo series</p>
                    <div className="mt-3 h-[220px]">
                      <LineSeries
                        data={[
                          { m: 'Apr', p: Math.round((active.revenue / active.units) * 0.9) },
                          { m: 'May', p: Math.round((active.revenue / active.units) * 0.9) },
                          { m: 'Jun', p: Math.round((active.revenue / active.units) * 0.95) },
                          { m: 'Jul', p: Math.round((active.revenue / active.units) * 0.95) },
                          { m: 'Aug', p: Math.round((active.revenue / active.units) * 0.95) },
                          { m: 'Sep', p: Math.round(active.revenue / active.units) },
                        ]}
                        xKey="m"
                        lines={[{ key: 'p', label: 'Price', color: '#B54E17' }]}
                        valueFormat={(v) => money(v)}
                        showLegend={false}
                      />
                    </div>
                  </Card>
                </div>
              )}

              {detailTab === 'Promotions' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <KpiCard label="Promotion dependency" value={`${active.promoDependency}%`} compare="demo" icon="BadgePercent" tone="gold" />
                    <KpiCard label="Units on offer" value={num(Math.round(active.units * (active.promoDependency / 100)))} compare="demo" icon="Package" tone="ember" />
                    <KpiCard label="Margin impact" value={`−${(active.promoDependency / 6).toFixed(1)} pts`} compare="illustrative" icon="TrendingDown" tone="clay" />
                  </div>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Promotions including this item — demo records</p>
                    <ul className="mt-3 space-y-2">
                      {active.promoDependency > 25
                        ? ['Wednesday Pizza Night · 20% off', 'Delivery platform bundle · 15% off'].map((p) => (
                            <li key={p} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                              <span className="text-[13px] text-ink-soft">{p}</span>
                              <Badge tone="gold">Active</Badge>
                            </li>
                          ))
                        : ['Late Night Dessert · free item', 'Website welcome offer · 10% off'].map((p) => (
                            <li key={p} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                              <span className="text-[13px] text-ink-soft">{p}</span>
                              <Badge tone="neutral">Occasional</Badge>
                            </li>
                          ))}
                    </ul>
                  </Card>
                </div>
              )}

              {detailTab === 'Location performance' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader title="Performance by location" subtitle="Demo branch comparison for this item" className="border-b" />
                    <div className="divide-y divide-line">
                      {[
                        { l: 'Clifton Branch', u: Math.round(active.units * 0.46), r: Math.round(active.revenue * 0.48) },
                        { l: 'Downtown Branch', u: Math.round(active.units * 0.34), r: Math.round(active.revenue * 0.33) },
                        { l: 'Gulshan Branch', u: Math.round(active.units * 0.2), r: Math.round(active.revenue * 0.19) },
                      ].map((x) => (
                        <div key={x.l} className="flex items-center justify-between gap-3 px-4 py-3">
                          <span className="text-[13px] font-medium text-ink">{x.l}</span>
                          <span className="text-[12.5px] text-ink-muted">{num(x.u)} units</span>
                          <span className="w-24 text-right text-[13px] font-semibold tabular-nums text-ink">{money(x.r, { compact: true })}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <p className="text-[13px] font-semibold text-ink">Units by location — demo values</p>
                    <div className="mt-3 h-[220px]">
                      <BarSeries
                        data={[
                          { l: 'Clifton', v: Math.round(active.units * 0.46) },
                          { l: 'Downtown', v: Math.round(active.units * 0.34) },
                          { l: 'Gulshan', v: Math.round(active.units * 0.2) },
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

              <DemoNote>All figures in this panel are illustrative demo values for interface presentation.</DemoNote>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
