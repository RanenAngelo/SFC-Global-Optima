import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardHeader, Icon, Tabs, cn } from '../../components/ui/primitives'
import { ChartCard, DonutChart, Sparkline, TrendChart, defaultCurrencyFormat } from '../../components/charts'
import { KpiCard, MetricRow, StatusDot } from '../../components/shared'
import { PageHeader } from '../../components/admin/PageHeader'
import {
  CATEGORY_REVENUE, CHANNEL_MIX, DEMO_NOTE, KPIS, LOCATIONS, MENU_PERFORMANCE_DIST, ORDERS_BY_HOUR,
  RECENT_ALERTS, REVENUE_SERIES, TOP_SELLERS, ADMIN_ORDERS, RECOMMENDATIONS,
} from '../../lib/data/analytics'
import { pkr } from '../../lib/utils'
import { FoodImage } from '../../components/shared'
import { useWorkspace } from '../../store/app'

export default function Overview() {
  const [trend, setTrend] = useState('revenue')
  const { rangeLabel, location } = useWorkspace()

  const series =
    trend === 'revenue'
      ? [
          { key: 'revenue', label: 'Revenue', color: '#B54E17', type: 'area' as const },
          { key: 'profit', label: 'Gross profit', color: '#5E8C4A', type: 'line' as const },
        ]
      : [{ key: 'orders', label: 'Orders', color: '#2F6FA8', type: 'area' as const }]

  const topProfit = [...TOP_SELLERS].sort((a, b) => b.margin - a.margin).slice(0, 5)

  return (
    <div>
      <PageHeader
        eyebrow="Maison Ember · 3 branches"
        title="Restaurant Overview"
        subtitle={`Welcome back, Zohaib. Here is how Maison Ember performed ${rangeLabel.toLowerCase()}. Every figure on this page is a static demo value.`}
        demoNote={DEMO_NOTE}
        actions={
          <Tabs
            value={rangeLabel}
            onChange={() => {}}
            variant="pill"
            tabs={[{ label: rangeLabel, value: rangeLabel }]}
            className="pointer-events-none opacity-70"
          />
        }
      />

      {/* KPI grid */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {KPIS.slice(0, 5).map((k) => (
          <KpiCard
            key={k.key}
            label={k.label}
            value={k.value}
            change={k.change}
            compare={k.compare}
            hint={k.hint}
            icon={k.icon}
            tone={k.tone}
          />
        ))}
      </div>
      <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.slice(5).map((k) => (
          <KpiCard key={k.key} label={k.label} value={k.value} change={k.change} compare={k.compare} hint={k.hint} icon={k.icon} tone={k.tone} />
        ))}
      </div>

      {/* Revenue trend */}
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Revenue trend"
          subtitle="Daily revenue and gross profit — demo series"
          height={300}
          actions={
            <Tabs
              value={trend}
              onChange={setTrend}
              variant="pill"
              tabs={[
                { label: 'Revenue', value: 'revenue' },
                { label: 'Orders', value: 'orders' },
              ]}
            />
          }
          footer={`Illustrative 30-day series · ${rangeLabel}`}
        >
          <TrendChart
            data={REVENUE_SERIES}
            xKey="day"
            series={series}
            valueFormat={(v) => (trend === 'revenue' ? pkr(v, { compact: true }) : `${v} orders`)}
          />
        </ChartCard>

        <ChartCard title="Sales by ordering channel" subtitle="Share of revenue — demo split" height={300}>
          <DonutChart
            data={CHANNEL_MIX}
            centerValue="4,286"
            centerLabel="Orders"
            valueFormat={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      {/* Category + peak hours */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <ChartCard
          title="Revenue by category"
          subtitle="Revenue and units sold — demo values"
          height={288}
          footer="Margin shown on the menu intelligence page."
        >
          <TrendChart
            data={CATEGORY_REVENUE}
            xKey="category"
            series={[
              { key: 'revenue', label: 'Revenue', color: '#B54E17', type: 'bar' },
              { key: 'units', label: 'Units sold', color: '#C08A16', type: 'line' },
            ]}
            valueFormat={(v, name) => (name === 'Revenue' ? pkr(v, { compact: true }) : `${v} units`)}
          />
        </ChartCard>

        <ChartCard title="Peak ordering hours" subtitle="Orders by hour of day — demo distribution" height={288}>
          <TrendChart
            data={ORDERS_BY_HOUR}
            xKey="hour"
            series={[{ key: 'orders', label: 'Orders', color: '#2F6FA8', type: 'bar' }]}
            valueFormat={(v) => `${v} orders`}
            showLegend={false}
          />
        </ChartCard>
      </div>

      {/* Top dishes */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Top-selling dishes"
            subtitle="By units sold — demo values"
            actions={
              <Link to="/admin/menu-intelligence">
                <Button size="xs" variant="ghost" iconRight="ArrowRight">
                  Menu intelligence
                </Button>
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {TOP_SELLERS.map((d, i) => (
              <div key={d.name} className="flex items-center gap-3.5 px-4 py-3 sm:px-5">
                <span className="w-5 shrink-0 text-center font-display text-[13px] font-bold text-ink-faint">{i + 1}</span>
                <FoodImage src={d.img} name={d.name} className="h-11 w-11 shrink-0" ratio="fill" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{d.name}</p>
                  <p className="text-[12px] text-ink-muted">
                    {d.units} units · {pkr(d.revenue, { compact: true })}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <Sparkline values={[42, 48, 51, 49, 56, 58, 61, d.units / 10]} color="#B54E17" width={70} />
                </div>
                <span className="w-14 shrink-0 text-right text-[13px] font-bold tabular-nums text-ink">{d.margin}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Highest-profit dishes" subtitle="By contribution margin — demo values" />
          <div className="divide-y divide-line">
            {topProfit.map((d, i) => (
              <div key={d.name} className="flex items-center gap-3.5 px-4 py-3 sm:px-5">
                <span className="w-5 shrink-0 text-center font-display text-[13px] font-bold text-ink-faint">{i + 1}</span>
                <FoodImage src={d.img} name={d.name} className="h-11 w-11 shrink-0" ratio="fill" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{d.name}</p>
                  <div className="mt-1.5 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-sage-500" style={{ width: `${d.margin}%` }} />
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-sage-50 px-2 py-0.5 text-[12px] font-bold text-sage-700">{d.margin}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Menu performance + location */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <ChartCard
          title="Menu performance distribution"
          subtitle="Static demonstration classifications"
          height={270}
          footer="These classifications are demonstration labels, not model output."
        >
          <DonutChart data={MENU_PERFORMANCE_DIST} valueFormat={(v) => `${v}%`} centerValue="39" centerLabel="Items" />
        </ChartCard>

        <Card>
          <CardHeader
            title="Location performance"
            subtitle="Demo comparison across three branches"
            actions={
              <Link to="/admin/locations">
                <Button size="xs" variant="ghost" iconRight="ArrowRight">
                  All locations
                </Button>
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {LOCATIONS.map((l) => (
              <div key={l.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink">{l.name}</p>
                    <p className="text-[12px] text-ink-muted">{l.area}</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Revenue</p>
                      <p className="text-[14px] font-semibold tabular-nums text-ink">{pkr(l.revenue, { compact: true })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Margin</p>
                      <p className="text-[14px] font-semibold tabular-nums text-ink">{l.margin}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Rating</p>
                      <p className="text-[14px] font-semibold tabular-nums text-ink">{l.rating}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-ember-500" style={{ width: `${(l.revenue / 600000) * 100}%` }} />
                  </div>
                  <span className={cn('text-[11.5px] font-semibold', l.trend >= 0 ? 'text-sage-600' : 'text-clay-600')}>
                    {l.trend >= 0 ? '+' : ''}
                    {l.trend}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent orders + alerts */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="Recent orders"
            subtitle="Latest demo orders across all channels"
            actions={
              <Link to="/admin/orders">
                <Button size="xs" variant="ghost" iconRight="ArrowRight">
                  All orders
                </Button>
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="border-b border-line bg-canvas/60">
                  {['Order', 'Customer', 'Channel', 'Status', 'Total'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ADMIN_ORDERS.slice(0, 6).map((o) => (
                  <tr key={o.id} className="border-t border-line/70 transition-colors hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12.5px] font-bold text-ink">{o.number}</span>
                      <span className="ml-2 text-[11.5px] text-ink-faint">{o.time}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-soft">{o.customer}</td>
                    <td className="px-4 py-3 text-[13px] text-ink-muted">{o.channel}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                        <StatusDot status={o.status} />
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-ink">{pkr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent alerts"
            subtitle="Static demo alerts"
            actions={
              <Link to="/admin/anomalies">
                <Button size="xs" variant="ghost" iconRight="ArrowRight">
                  Anomalies
                </Button>
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {RECENT_ALERTS.map((a) => (
              <div key={a.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    a.tone === 'clay' ? 'bg-clay-50 text-clay-600' : a.tone === 'gold' ? 'bg-gold-50 text-gold-600' : a.tone === 'sky' ? 'bg-sky-50 text-sky-600' : 'bg-sage-50 text-sage-600',
                  )}
                >
                  <Icon name={a.tone === 'clay' ? 'AlertTriangle' : a.tone === 'gold' ? 'Trash2' : a.tone === 'sky' ? 'TrendingUp' : 'Star'} size={15} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-ink">{a.title}</p>
                    <Badge tone="neutral">{a.tag}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{a.body}</p>
                  <p className="mt-1 text-[11.5px] text-ink-faint">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recommendations preview */}
      <div className="mt-4">
        <Card>
          <CardHeader
            title="Business recommendations"
            subtitle="Illustrative recommendations — not generated by a live system"
            actions={
              <Link to="/admin/recommendations">
                <Button size="xs" variant="ghost" iconRight="ArrowRight">
                  Recommendations centre
                </Button>
              </Link>
            }
          />
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            {RECOMMENDATIONS.slice(0, 3).map((r) => (
              <div key={r.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={r.priority === 'High' ? 'clay' : r.priority === 'Medium' ? 'gold' : 'neutral'}>{r.priority} priority</Badge>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{r.category}</span>
                </div>
                <h4 className="mt-2.5 font-display text-[15px] font-semibold leading-snug text-ink">{r.title}</h4>
                <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-ink-muted">{r.description}</p>
                <div className="mt-3 space-y-1 border-t border-line pt-2.5">
                  {r.metrics.slice(0, 2).map((m) => (
                    <MetricRow key={m.label} label={m.label} value={m.value} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
