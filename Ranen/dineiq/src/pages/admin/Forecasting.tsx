import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, Select, Tabs, cn } from '../../components/ui/primitives'
import { PageHeader } from '../../components/admin/PageHeader'
import { ChartCard } from '../../components/charts'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { DemoNote, InfoCard, KpiCard, MetricRow } from '../../components/shared'
import { NoDataState } from '../../components/ui/states'
import {
  FORECAST_ACCURACY, FORECAST_DAILY, FORECAST_MONTHLY, FORECAST_NOTES, FORECAST_SUMMARY, FORECAST_WEEKLY, MENU_INTEL,
} from '../../lib/data/analytics'
import { num } from '../../lib/utils'

const ITEMS = [
  { label: 'All menu items (aggregate)', value: 'all' },
  ...MENU_INTEL.slice(0, 12).map((m) => ({ label: m.name, value: m.id })),
  { label: 'New item (no history)', value: 'none' },
]

export default function Forecasting() {
  const [period, setPeriod] = useState('daily')
  const [item, setItem] = useState('all')
  const [category, setCategory] = useState('all')
  const [location, setLocation] = useState('all')

  const data = useMemo(() => {
    if (period === 'daily') return FORECAST_DAILY.map((d) => ({ ...d, band: d.lower != null && d.upper != null ? [d.lower, d.upper] : null }))
    if (period === 'weekly') return FORECAST_WEEKLY
    return FORECAST_MONTHLY
  }, [period])

  const unitLabel = period === 'monthly' ? 'units (monthly)' : period === 'weekly' ? 'units (weekly)' : 'units (daily)'
  const hasData = item !== 'none'

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Demand Forecasting"
        subtitle="Plan prep quantities and purchasing with illustrative demand projections."
        demoNote="Demo Forecast — every projection, band and accuracy figure on this page is an illustrative placeholder."
        exportLabel="Download forecast"
      />

      {/* Controls */}
      <Card className="mb-5 p-4">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={item} onChange={(e) => setItem(e.target.value)} options={ITEMS} aria-label="Menu item" />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { label: 'All categories', value: 'all' },
              ...Array.from(new Set(MENU_INTEL.map((m) => m.category))).map((c) => ({ label: c, value: c })),
            ]}
            aria-label="Category"
          />
          <Select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            options={[
              { label: 'All locations', value: 'all' },
              { label: 'Clifton Branch', value: 'clifton' },
              { label: 'Downtown Branch', value: 'downtown' },
              { label: 'Gulshan Branch', value: 'gulshan' },
            ]}
            aria-label="Location"
          />
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { label: 'Daily forecast (14 days)', value: 'daily' },
              { label: 'Weekly forecast (8 weeks)', value: 'weekly' },
              { label: 'Monthly forecast (9 months)', value: 'monthly' },
            ]}
            aria-label="Forecast period"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="gold" icon="FlaskConical">
            Illustrative Forecast
          </Badge>
          <span className="text-[12.5px] text-ink-faint">
            Changing these controls filters the demo view only — no forecast is recalculated.
          </span>
        </div>
      </Card>

      {!hasData ? (
        <Card>
          <NoDataState
            onReset={() => setItem('all')}
          />
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {FORECAST_SUMMARY.map((s) => (
              <KpiCard key={s.label} label={s.label} value={s.value} compare={s.sub} icon={s.icon} tone={s.tone} />
            ))}
          </div>

          {/* Chart */}
          <ChartCard
            title={period === 'daily' ? 'Daily demand — history versus forecast' : period === 'weekly' ? 'Weekly demand — history versus forecast' : 'Monthly demand — history versus forecast'}
            subtitle="Solid line shows the demo history; dashed line shows the illustrative forecast."
            height={340}
            actions={
              <Tabs
                value={period}
                onChange={setPeriod}
                variant="pill"
                tabs={[
                  { label: 'Daily', value: 'daily' },
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Monthly', value: 'monthly' },
                ]}
              />
            }
            footer="Shaded band represents the illustrative confidence interval for the forecast period."
          >
            <ForecastChart data={data} period={period} />
          </ChartCard>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader title="Forecast by period" subtitle="Illustrative values for the selected horizon" className="border-b" />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="border-b border-line bg-canvas/60">
                      {['Period', 'Actual', 'Forecast', 'Lower', 'Upper', 'Confidence'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d: any, i) => (
                      <tr key={i} className="border-t border-line/70">
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-ink">{d.label}</td>
                        <td className="px-4 py-2.5 text-[13px] tabular-nums text-ink-soft">{d.actual ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[13px] font-semibold tabular-nums text-ember-700">{d.forecast ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[13px] tabular-nums text-ink-muted">{d.lower ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[13px] tabular-nums text-ink-muted">{d.upper ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {d.forecast ? (
                            <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[11.5px] font-bold text-sage-700">
                              {90 - (i % 3)}%
                            </span>
                          ) : (
                            <span className="text-[11.5px] text-ink-faint">Recorded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <Icon name="Gauge" size={16} className="text-ember-600" />
                  <h3 className="font-display text-[16px] font-semibold text-ink">Forecast accuracy</h3>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-muted">Illustrative accuracy indicators for interface presentation.</p>
                <div className="mt-4 space-y-3">
                  {FORECAST_ACCURACY.map((a) => (
                    <div key={a.metric} className="rounded-xl border border-line bg-canvas p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-display text-[15px] font-bold text-ink">{a.metric}</span>
                        <span className="text-[15px] font-semibold tabular-nums text-ink">{a.value}</span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-ink-muted">{a.note}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-display text-[16px] font-semibold text-ink">Confidence</h3>
                <div className="mt-3 space-y-2.5">
                  <MetricRow label="Model horizon" value="14 days" hint="Demo value" />
                  <MetricRow label="History used" value="90 days" hint="Demo value" />
                  <MetricRow label="Confidence level" value="90%" hint="Demo value" />
                  <MetricRow label="Last refreshed" value="Today, 5:30 AM" />
                </div>
                <DemoNote className="mt-3">No forecasting model is executed in this prototype.</DemoNote>
              </Card>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <InfoCard
              title="Forecast notes"
              icon="StickyNote"
              tone="ember"
              items={FORECAST_NOTES}
            />
            <Card className="p-5">
              <h3 className="font-display text-[16px] font-semibold text-ink">Suggested preparation guidance</h3>
              <p className="mt-1 text-[12.5px] text-ink-muted">Illustrative guidance derived from the demo forecast.</p>
              <ul className="mt-3.5 space-y-2.5">
                {[
                  { t: 'Increase biryani prep by 8% for Friday service', d: 'Based on the illustrative upper confidence band.' },
                  { t: 'Hold pizza dough at Thursday levels', d: 'Forecast remains flat across the coming week.' },
                  { t: 'Reduce ribeye prep on Monday and Tuesday', d: 'Historic demand is lowest early in the week.' },
                  { t: 'Keep chai concentrate stocked for late service', d: 'Unexpected demand was observed in the demo series.' },
                ].map((s) => (
                  <li key={s.t} className="flex gap-3 rounded-xl border border-line p-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ember-50 text-ember-600">
                      <Icon name="CheckCheck" size={14} />
                    </span>
                    <span>
                      <span className="block text-[13px] font-semibold text-ink">{s.t}</span>
                      <span className="block text-[12px] text-ink-muted">{s.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" icon="Download" className="mt-4" >
                Download report
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function ForecastChart({ data, period }: { data: any[]; period: string }) {
  const showBand = period === 'daily'
  return (
    <ComposedChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
      <defs>
        <linearGradient id="fc-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B54E17" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#B54E17" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke="#EFEAE3" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9C948A', fontSize: 11, fontWeight: 500 }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9C948A', fontSize: 11, fontWeight: 500 }} width={54} />
      <Tooltip
        contentStyle={{ borderRadius: 12, border: '1px solid #E9E2D9', fontSize: 12 }}
        formatter={(v: any, n: any) => (n === 'Confidence band' ? `${v}` : `${Number(v).toLocaleString()} units`)}
      />
      <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
      {showBand && <Area type="monotone" dataKey="band" name="Confidence band" stroke="none" fill="url(#fc-band)" connectNulls={false} />}
      <Line type="monotone" dataKey="actual" name="Actual demand" stroke="#1D1B19" strokeWidth={2.2} dot={{ r: 2.5, strokeWidth: 0 }} connectNulls />
      <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#B54E17" strokeWidth={2.4} strokeDasharray="6 4" dot={{ r: 2.5, strokeWidth: 0 }} connectNulls />
      <ReferenceLine
        x={period === 'daily' ? 'Sun' : period === 'weekly' ? 'W4' : 'Sep'}
        stroke="#DAD1C5"
        strokeDasharray="4 4"
        label={{ value: 'Forecast start', position: 'insideTopRight', fontSize: 10, fill: '#9C948A' }}
      />
    </ComposedChart>
  )
}
