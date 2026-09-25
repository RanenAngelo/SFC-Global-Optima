import React, { useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, Select, Tabs, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, LineSeries, ScatterPlot } from '../../components/charts'
import { FoodImage, KpiCard, LiveNote, MetricRow, Progress, Stars } from '../../components/shared'
import { PageError, PageLoader } from '../../lib/api'
import { INTEL_CLASS_ORDER, classToKey, useRatingsData, type RatingReview } from '../../lib/live'
import { num } from '../../lib/utils'

export default function Ratings() {
  const { push } = useToast()
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [active, setActive] = useState<RatingReview | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const { data, loading, error, refetch } = useRatingsData()

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No rating data.'} onRetry={refetch} />

  const copyText = (text: string, title: string) => {
    void navigator.clipboard.writeText(text).then(
      () => push({ title, tone: 'success' }),
      () => push({ title: 'Copy failed', tone: 'error' }),
    )
  }

  const rows = data.reviews.filter((r) => {
    if (filter === 'five' && r.rating !== 5) return false
    if (filter === 'four' && r.rating !== 4) return false
    if (filter === 'low' && r.rating > 3) return false
    const q = query.trim().toLowerCase()
    if (q && !r.customer.toLowerCase().includes(q) && !r.item.toLowerCase().includes(q) && !r.orderId.toLowerCase().includes(q)) return false
    return true
  })

  const columns: Column<RatingReview>[] = [
    {
      key: 'customer',
      header: 'Customer',
      sort: (a, b) => a.customer.localeCompare(b.customer),
      render: (r) => (
        <div>
          <p className="font-mono text-[12.5px] font-semibold text-ink">{r.customer}</p>
          <p className="text-[11.5px] text-ink-muted">Anonymized</p>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      sort: (a, b) => a.rating - b.rating,
      render: (r) => <Stars value={r.rating} size={13} />,
    },
    {
      key: 'item',
      header: 'Dish',
      hideBelow: 'lg',
      render: (r) => <span className="text-[12.5px] text-ink-soft">{r.item}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      hideBelow: 'xl',
      render: (r) => <span className="text-[12.5px] text-ink-muted">{r.location}</span>,
    },
    {
      key: 'order',
      header: 'Order',
      render: (r) => <span className="font-mono text-[12px] text-ink-muted">{r.orderId}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      hideBelow: 'md',
      render: (r) => <span className="text-[12.5px] text-ink-muted">{r.date}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '90px',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="secondary" icon="MessageSquare" onClick={() => setActive(r)}>
            Open
          </Button>
        </div>
      ),
    },
  ]

  const scatterData = data.scatter.map((s) => ({ ...s, group: classToKey(s.class) }))
  const GROUP_LABEL: Record<string, string> = { profit: 'Profit Driver', volume: 'Volume Driver', hidden: 'Hidden Opportunity', low: 'Low Performer' }
  const GROUP_COLOR: Record<string, string> = { profit: '#4A7139', volume: '#2F6FA8', hidden: '#C08A16', low: '#96352C' }
  const scatterGroups = INTEL_CLASS_ORDER.filter((k) => scatterData.some((s) => s.group === k)).map((k) => ({
    key: k,
    label: GROUP_LABEL[k] ?? k,
    color: GROUP_COLOR[k] ?? '#726B62',
  }))

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Ratings & Customer Satisfaction"
        subtitle="Live guest ratings across dishes and branches — and rating patterns worth reviewing."
        demoNote="Live star ratings. Reviews carry scores only — no written text is collected in this dataset."
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Overall rating" value={data.overall.toFixed(2)} compare={`${num(data.totalN)} ratings`} icon="Star" tone="gold" />
        <KpiCard label="Total reviews" value={num(data.totalN)} compare="star ratings" icon="MessageSquare" tone="sky" />
        <KpiCard label="5-star share" value={`${data.fiveShare.toFixed(1)}%`} compare={`${num(data.five)} five-star`} icon="ThumbsUp" tone="sage" />
        <KpiCard label="Low ratings (1–2★)" value={num(data.neg)} compare="need attention" icon="ThumbsDown" tone="clay" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { label: 'Overview', value: 'overview' },
          { label: 'Reviews', value: 'reviews' },
          { label: 'Rating anomalies', value: 'anomalies' },
        ]}
      />

      {tab === 'overview' && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
            <Card className="p-5">
              <div className="text-center">
                <p className="font-display text-[52px] font-semibold leading-none text-ink">{data.overall.toFixed(1)}</p>
                <Stars value={data.overall} size={17} />
                <p className="mt-2 text-[13px] text-ink-muted">Based on {num(data.totalN)} live ratings</p>
              </div>
              <div className="mt-5 space-y-2">
                {[...data.dist].sort((x, y) => y.rating - x.rating).map((d) => (
                  <div key={d.rating} className="flex items-center gap-2.5">
                    <span className="w-8 text-[11.5px] font-semibold text-ink-faint">{d.rating}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-gold-500" style={{ width: `${(d.n / data.maxDist) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-[11.5px] font-semibold tabular-nums text-ink-muted">{num(d.n)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <ChartCard title="Rating trend" subtitle="Monthly average rating — live" height={270}>
              <LineSeries
                data={data.trend}
                xKey="m"
                lines={[{ key: 'avg_rating', label: 'Average rating', color: '#C08A16' }]}
                valueFormat={(v) => `${Number(v).toFixed(2)} ★`}
                showLegend={false}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Average rating by location" subtitle="Branch comparison — live" height={250}>
              <BarSeries
                data={data.locBars}
                xKey="location"
                layout="vertical"
                bars={[{ key: 'rating', label: 'Avg rating', color: '#C08A16' }]}
                valueFormat={(v) => `${v} ★`}
                showLegend={false}
              />
            </ChartCard>

            <ChartCard title="Rating versus contribution" subtitle="Each point is a live menu item, coloured by class" height={250}>
              <ScatterPlot
                data={scatterData}
                xKey="rating"
                yKey="margin"
                groupKey="group"
                groups={scatterGroups}
                xLabel="Average rating"
                yLabel="Contribution $"
                valueFormat={(v, n) => (n === 'Contribution $' ? `$${num(v)}` : `${v}`)}
              />
            </ChartCard>
          </div>

          <Card>
            <CardHeader title="Average rating by menu item" subtitle="Live ratings with sales context" className="border-b" />
            <div className="max-h-[440px] divide-y divide-line overflow-y-auto">
              {data.items.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <FoodImage src={undefined} name={i.name} className="h-10 w-10 shrink-0" ratio="fill" />
                  <div className="min-w-[140px] flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{i.name}</p>
                    <p className="text-[11.5px] text-ink-muted">{num(i.n)} reviews · {i.class}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={i.rating} />
                    <span className="text-[13px] font-bold text-ink">{i.rating.toFixed(2)}</span>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Repeat</p>
                    <Progress value={Math.min(100, i.repeat)} tone="sage" height={5} />
                  </div>
                  <div className="w-20 text-right">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Units</p>
                    <p className="text-[13px] font-semibold tabular-nums text-ink">{num(i.units)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
                <Icon name="ThumbsUp" size={16} className="text-sage-600" /> Highest rated (10+ reviews)
              </h3>
              <ul className="mt-3 space-y-2.5">
                {data.topRated.map((f) => (
                  <li key={f.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold text-ink">{f.name}</span>
                      <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[11.5px] font-bold text-sage-700">{f.rating.toFixed(2)} ★</span>
                    </div>
                    <p className="mt-1 text-[12px] text-ink-muted">{num(f.n)} reviews · {num(f.units)} units · {f.class}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
                <Icon name="ThumbsDown" size={16} className="text-clay-600" /> Lowest rated (10+ reviews)
              </h3>
              <ul className="mt-3 space-y-2.5">
                {data.lowRated.map((f) => (
                  <li key={f.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold text-ink">{f.name}</span>
                      <span className="rounded-full bg-clay-50 px-2 py-0.5 text-[11.5px] font-bold text-clay-600">{f.rating.toFixed(2)} ★</span>
                    </div>
                    <p className="mt-1 text-[12px] text-ink-muted">{num(f.n)} reviews · {num(f.units)} units · {f.class}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="mt-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <SearchInput value={query} onChange={setQuery} placeholder="Search item, customer or order…" className="w-full sm:w-72" />
              <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto" aria-label="Rating">
                <option value="all">All ratings</option>
                <option value="five">5 stars</option>
                <option value="four">4 stars</option>
                <option value="low">3 stars & below</option>
              </Select>
              <span className="ml-auto text-[12.5px] text-ink-muted">
                <span className="font-semibold text-ink">{rows.length}</span> of {num(data.reviews.length)} recent reviews shown
              </span>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              pageSize={8}
              onRowClick={(r) => setActive(r)}
              emptyTitle="No reviews match this search"
              emptyMessage="Try a different keyword or clear the rating filter."
              emptyAction={
                <Button
                  size="sm"
                  variant="secondary"
                  icon="RotateCcw"
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </Card>
        </div>
      )}

      {tab === 'anomalies' && (
        <div className="mt-5">
          <div className="grid gap-3.5 md:grid-cols-2">
            {data.anomalies.filter((a) => !dismissed.includes(a.id)).map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
                    <Icon name="Activity" size={18} />
                  </span>
                  <Badge tone="gold">{a.kind}</Badge>
                </div>
                <h4 className="mt-3 font-display text-[15.5px] font-semibold text-ink">{a.item}</h4>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{a.detail}</p>
                <p className="mt-2 font-mono text-[11.5px] text-ink-faint">{a.itemId} · {a.when}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="xs" variant="secondary" onClick={() => copyText(`${a.kind}: ${a.item} (${a.itemId}) — ${a.detail}`, 'Anomaly copied')}>
                    Copy summary
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setDismissed((d) => [...d, a.id])}>
                    Dismiss
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          {data.anomalies.filter((a) => !dismissed.includes(a.id)).length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-[13.5px] font-semibold text-ink">No anomalies in view</p>
              <p className="mt-1 text-[12.5px] text-ink-muted">All flagged cases were dismissed, or the detector found none.</p>
            </Card>
          )}
          <div className="mt-4">
            <LiveNote>Anomaly flags are live detector output — identical-rating bursts that break the expected pattern.</LiveNote>
          </div>
        </div>
      )}

      {/* Review drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `Rating from ${active.customer}` : ''}
        subtitle={active ? `${active.item} · ${active.location} · ${active.date}` : ''}
        width="md"
        badge={active ? <Badge tone={active.rating >= 4 ? 'sage' : active.rating === 3 ? 'gold' : 'clay'}>{active.rating} ★</Badge> : undefined}
        footer={
          active && (
            <Button
              variant="secondary"
              icon="Copy"
              onClick={() => copyText(`${active.id}: ${active.rating} stars for ${active.item} at ${active.location}, order ${active.orderId}, ${active.date}.`, 'Rating copied')}
            >
              Copy summary
            </Button>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Stars value={active.rating} size={16} />
                <span className="text-[12.5px] text-ink-faint">{active.date}</span>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line pt-3">
                <Badge tone="neutral">{active.item}</Badge>
                <Badge tone="neutral">{active.location}</Badge>
                <Badge tone="neutral">{active.orderId}</Badge>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Rating context</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Dish reviewed" value={active.item} />
                <MetricRow label="Dish average" value={`${active.itemAvg.toFixed(2)} ★`} />
                <MetricRow label="Dish class" value={active.itemClass} />
                <MetricRow label="Branch" value={active.location} />
                <MetricRow label="Order" value={active.orderId} />
                <MetricRow label="Customer" value={`${active.customer} (anonymized)`} />
              </div>
            </Card>

            <LiveNote>Live rating record. Scores only — no written text or replies are stored in this dataset.</LiveNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
