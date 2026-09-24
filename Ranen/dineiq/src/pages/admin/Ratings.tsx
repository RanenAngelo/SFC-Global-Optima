import React, { useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, Select, Tabs, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, LineSeries, ScatterPlot } from '../../components/charts'
import { DemoNote, FoodImage, KpiCard, MetricRow, Progress, Stars } from '../../components/shared'
import {
  ITEM_RATINGS, RATING_ANOMALIES, RATING_BY_LOCATION, RATING_DISTRIBUTION, RATING_TREND, REVIEW_ROWS,
} from '../../lib/data/analytics'

type ReviewRow = (typeof REVIEW_ROWS)[number]
import { num } from '../../lib/utils'

export default function Ratings() {
  const { push } = useToast()
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [active, setActive] = useState<ReviewRow | null>(null)

  const rows = REVIEW_ROWS.filter((r) => {
    if (filter === 'positive' && r.sentiment !== 'Positive') return false
    if (filter === 'negative' && r.sentiment !== 'Negative') return false
    if (filter === 'needs' && r.status !== 'Needs response') return false
    const q = query.trim().toLowerCase()
    if (q && !r.customer.toLowerCase().includes(q) && !r.item.toLowerCase().includes(q) && !r.text.toLowerCase().includes(q)) return false
    return true
  })

  const columns: Column<ReviewRow>[] = [
    {
      key: 'customer',
      header: 'Customer',
      sort: (a, b) => a.customer.localeCompare(b.customer),
      render: (r) => (
        <div>
          <p className="text-[13px] font-semibold text-ink">{r.customer}</p>
          <p className="text-[11.5px] text-ink-muted">{r.channel}</p>
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
      key: 'text',
      header: 'Review',
      render: (r) => <p className="line-clamp-2 max-w-md text-[12.5px] leading-snug text-ink-muted">{r.text}</p>,
    },
    {
      key: 'sentiment',
      header: 'Sentiment',
      hideBelow: 'md',
      render: (r) => (
        <Badge tone={r.sentiment === 'Positive' ? 'sage' : r.sentiment === 'Negative' ? 'clay' : 'neutral'}>{r.sentiment}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideBelow: 'lg',
      render: (r) => (
        <Badge tone={r.status === 'Published' ? 'neutral' : 'gold'} dot>
          {r.status}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      hideBelow: 'xl',
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

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Ratings & Customer Satisfaction"
        subtitle="Track guest sentiment across dishes, branches and channels — and spot rating patterns worth reviewing."
        demoNote="Ratings, reviews and anomaly examples are static demonstration content. No sentiment analysis is performed."
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Overall rating" value="4.6" change={0.2} compare="vs previous period" icon="Star" tone="gold" />
        <KpiCard label="Total reviews" value="2,184" change={8.4} compare="vs previous period" icon="MessageSquare" tone="sky" />
        <KpiCard label="Response rate" value="68%" change={6.1} compare="vs previous period" icon="Reply" tone="sage" />
        <KpiCard label="Negative reviews" value="140" change={-4.2} compare="vs previous period" icon="ThumbsDown" tone="clay" />
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
                <p className="font-display text-[52px] font-semibold leading-none text-ink">4.6</p>
                <Stars value={4.6} size={17} />
                <p className="mt-2 text-[13px] text-ink-muted">Based on 2,184 demo reviews</p>
              </div>
              <div className="mt-5 space-y-2">
                {RATING_DISTRIBUTION.map((d) => (
                  <div key={d.stars} className="flex items-center gap-2.5">
                    <span className="w-8 text-[11.5px] font-semibold text-ink-faint">{d.stars}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-gold-500" style={{ width: `${(d.count / 1842) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-[11.5px] font-semibold tabular-nums text-ink-muted">{num(d.count)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <ChartCard title="Rating trend" subtitle="Weekly average rating — demo series" height={270}>
              <LineSeries
                data={RATING_TREND}
                xKey="week"
                lines={[{ key: 'rating', label: 'Average rating', color: '#C08A16' }]}
                valueFormat={(v) => `${v.toFixed(1)} ★`}
                showLegend={false}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Average rating by location" subtitle="Demo branch comparison" height={250}>
              <BarSeries
                data={RATING_BY_LOCATION}
                xKey="location"
                layout="vertical"
                bars={[{ key: 'rating', label: 'Avg rating', color: '#C08A16' }]}
                valueFormat={(v) => `${v} ★`}
                showLegend={false}
              />
            </ChartCard>

            <ChartCard title="Rating versus profitability" subtitle="Each point is a demo menu item" height={250}>
              <ScatterPlot
                data={ITEM_RATINGS.map((i) => ({ ...i, salesPct: (i.sales / 742) * 100 }))}
                xKey="rating"
                yKey="margin"
                groupKey="__all"
                groups={[{ key: '__all', label: 'Menu items', color: '#B54E17' }]}
                xLabel="Average rating"
                yLabel="Profit %"
                valueFormat={(v, n) => (n === 'Profit %' ? `${v}%` : `${v}`)}
              />
            </ChartCard>
          </div>

          <Card>
            <CardHeader title="Average rating by menu item" subtitle="Demo ratings with sales and margin context" className="border-b" />
            <div className="divide-y divide-line">
              {ITEM_RATINGS.map((i) => (
                <div key={i.name} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <FoodImage src={i.img} name={i.name} className="h-10 w-10 shrink-0" ratio="fill" />
                  <div className="min-w-[140px] flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{i.name}</p>
                    <p className="text-[11.5px] text-ink-muted">{num(i.reviews)} reviews</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={i.rating} />
                    <span className="text-[13px] font-bold text-ink">{i.rating}</span>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Margin</p>
                    <Progress value={i.margin} tone="sage" height={5} />
                  </div>
                  <div className="w-20 text-right">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Units</p>
                    <p className="text-[13px] font-semibold tabular-nums text-ink">{num(i.sales)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
                <Icon name="ThumbsUp" size={16} className="text-sage-600" /> Positive feedback themes
              </h3>
              <ul className="mt-3 space-y-2.5">
                {[
                  { t: 'Flavour and seasoning', c: 412, note: 'Frequently mentioned with karahi and biryani.' },
                  { t: 'Packaging and temperature', c: 268, note: 'Delivery orders arriving hot and sealed.' },
                  { t: 'Portion size', c: 231, note: 'Family bundles called out as good value.' },
                  { t: 'Staff and service', c: 196, note: 'Clifton floor team named in several reviews.' },
                ].map((f) => (
                  <li key={f.t} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold text-ink">{f.t}</span>
                      <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[11.5px] font-bold text-sage-700">{f.c} mentions</span>
                    </div>
                    <p className="mt-1 text-[12px] text-ink-muted">{f.note}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
                <Icon name="ThumbsDown" size={16} className="text-clay-600" /> Negative feedback themes
              </h3>
              <ul className="mt-3 space-y-2.5">
                {[
                  { t: 'Delivery delays at peak hours', c: 184, note: 'Concentrated on Friday and Saturday evenings.' },
                  { t: 'Food arrived lukewarm', c: 96, note: 'Mostly on longer Gulshan delivery routes.' },
                  { t: 'Portion felt small for price', c: 74, note: 'Mentioned on seafood and premium dishes.' },
                  { t: 'Order accuracy', c: 52, note: 'Missing add-ons on some website orders.' },
                ].map((f) => (
                  <li key={f.t} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold text-ink">{f.t}</span>
                      <span className="rounded-full bg-clay-50 px-2 py-0.5 text-[11.5px] font-bold text-clay-600">{f.c} mentions</span>
                    </div>
                    <p className="mt-1 text-[12px] text-ink-muted">{f.note}</p>
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
              <SearchInput value={query} onChange={setQuery} placeholder="Search reviews…" className="w-full sm:w-72" />
              <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto" aria-label="Sentiment">
                <option value="all">All reviews</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="needs">Needs response</option>
              </Select>
              <span className="ml-auto text-[12.5px] text-ink-muted">
                <span className="font-semibold text-ink">{rows.length}</span> reviews shown
              </span>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              pageSize={8}
              onRowClick={(r) => setActive(r)}
              emptyTitle="No reviews match this search"
              emptyMessage="Try a different keyword or clear the sentiment filter."
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
            {RATING_ANOMALIES.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      a.tone === 'gold' ? 'bg-gold-50 text-gold-600' : a.tone === 'clay' ? 'bg-clay-50 text-clay-600' : a.tone === 'sky' ? 'bg-sky-50 text-sky-600' : 'bg-sage-50 text-sage-600',
                    )}
                  >
                    <Icon name={a.tone === 'clay' ? 'TrendingDown' : a.tone === 'gold' ? 'TrendingUp' : 'Activity'} size={18} />
                  </span>
                  <Badge tone={a.tone === 'clay' ? 'clay' : a.tone === 'gold' ? 'gold' : 'neutral'}>{a.kind}</Badge>
                </div>
                <h4 className="mt-3 font-display text-[15.5px] font-semibold text-ink">{a.item}</h4>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{a.detail}</p>
                <p className="mt-2 text-[11.5px] text-ink-faint">{a.when}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="xs" variant="secondary" onClick={() => push({ title: 'Review task created (demo)', tone: 'success' })}>
                    Investigate
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => push({ title: 'Anomaly dismissed', tone: 'info' })}>
                    Dismiss
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <DemoNote>
              Rating anomaly examples are hand-written demonstration cases. No anomaly detection runs in this prototype.
            </DemoNote>
          </div>
        </div>
      )}

      {/* Review drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `Review from ${active.customer}` : ''}
        subtitle={active ? `${active.item} · ${active.location} · ${active.date}` : ''}
        width="md"
        badge={active ? <Badge tone={active.sentiment === 'Positive' ? 'sage' : active.sentiment === 'Negative' ? 'clay' : 'neutral'}>{active.sentiment}</Badge> : undefined}
        footer={
          active && (
            <>
              <Button variant="secondary" icon="Reply" onClick={() => push({ title: 'Reply saved (demo)', tone: 'success' })}>
                Reply
              </Button>
              <Button icon="Check" onClick={() => push({ title: 'Marked as reviewed', tone: 'success' })}>
                Mark reviewed
              </Button>
            </>
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
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">“{active.text}”</p>
              <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line pt-3">
                <Badge tone="neutral">{active.channel}</Badge>
                <Badge tone="neutral">{active.location}</Badge>
                <Badge tone={active.status === 'Published' ? 'sage' : 'gold'} dot>
                  {active.status}
                </Badge>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Reply to this review</p>
              <textarea
                className="focus-ring mt-2 min-h-[110px] w-full rounded-xl border border-line-strong px-3 py-2.5 text-[13px]"
                placeholder="Thank the guest, acknowledge the issue and explain what you have changed…"
              />
              <div className="mt-2.5 flex gap-2">
                <Button size="xs" onClick={() => push({ title: 'Reply saved (demo)', tone: 'success' })}>
                  Post reply
                </Button>
                <Button size="xs" variant="ghost">
                  Use template
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Guest context</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Dish reviewed" value={active.item} />
                <MetricRow label="Branch" value={active.location} />
                <MetricRow label="Channel" value={active.channel} />
                <MetricRow label="Sentiment" value={active.sentiment} />
                <MetricRow label="Responded" value={active.replied ? 'Yes' : 'No'} />
              </div>
            </Card>

            <DemoNote>Demo review record. No guest data is collected in this prototype.</DemoNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
