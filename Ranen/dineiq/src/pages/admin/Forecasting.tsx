import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, Select, Tabs } from '../../components/ui/primitives'
import { useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { ChartCard } from '../../components/charts'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { InfoCard, KpiCard, LiveNote, MetricRow } from '../../components/shared'
import { NoDataState } from '../../components/ui/states'
import { PageError, PageLoader, downloadExport, useMeta } from '../../lib/api'
import { useForecastData } from '../../lib/live'
import { money, num } from '../../lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[(m ?? 1) - 1]}` + (y ? '' : '')
}
const dayName = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })

export default function Forecasting() {
  const { push } = useToast()
  const { options: meta } = useMeta()
  const [item, setItem] = useState('')
  const [category, setCategory] = useState('all')
  const [location, setLocation] = useState('all')
  const [horizon, setHorizon] = useState('14')

  const grain = location === 'all' ? 'item' : 'restaurant'
  const entity = location === 'all' ? (item || null) : location
  const { data, loading, error, refetch } = useForecastData(grain, entity)

  const items = useMemo(() => {
    const all = data?.items ?? []
    return category === 'all' ? all : all.filter((m) => m.category_name === category)
  }, [data, category])

  useEffect(() => {
    if (!item && items.length) setItem(items[0].item_id)
  }, [items, item])

  const h = Number(horizon)
  const chart = useMemo(() => {
    if (!data) return []
    const hist = data.history.slice(-30)
    const fc = data.forecasts.slice(0, h)
    const rows = [
      ...hist.map((p) => ({ label: dayLabel(p.date), actual: p.units, forecast: null as number | null })),
      ...fc.map((p) => ({ label: dayLabel(p.date), actual: null as number | null, forecast: p.units })),
    ]
    return rows
  }, [data, h])

  const firstFcLabel = chart.find((r) => r.forecast != null)?.label

  const summary = useMemo(() => {
    if (!data) return null
    const fc = data.forecasts.slice(0, h)
    const total = fc.reduce((s, p) => s + p.units, 0)
    const peak = fc.reduce((a, b) => (b.units > a.units ? b : a), fc[0] ?? { date: '', units: 0 })
    return {
      total: Math.round(total),
      avg: fc.length ? total / fc.length : 0,
      peak,
      historyDays: data.history.length,
    }
  }, [data, h])

  const table = useMemo(() => {
    if (!data) return []
    return [
      ...data.history.slice(-7).map((p) => ({ label: dayLabel(p.date), day: dayName(p.date), actual: p.units, forecast: null as number | null })),
      ...data.forecasts.slice(0, h).map((p) => ({ label: dayLabel(p.date), day: dayName(p.date), actual: null as number | null, forecast: p.units })),
    ]
  }, [data, h])

  const guidance = useMemo(() => {
    if (!data) return []
    const fc = data.forecasts.slice(0, h)
    if (!fc.length) return []
    const avg = fc.reduce((s, p) => s + p.units, 0) / fc.length
    const peak = fc.reduce((a, b) => (b.units > a.units ? b : a), fc[0])
    const trough = fc.reduce((a, b) => (b.units < a.units ? b : a), fc[0])
    const out: { t: string; d: string }[] = []
    out.push({
      t: `Stage extra prep for ${dayName(peak.date)} ${dayLabel(peak.date)} — peak of ${peak.units.toFixed(1)} units`,
      d: avg ? `${(((peak.units - avg) / avg) * 100).toFixed(0)}% above the ${h}-day daily average of ${avg.toFixed(1)} units.` : 'Peak day in the selected horizon.',
    })
    out.push({
      t: `Ease prep on ${dayName(trough.date)} ${dayLabel(trough.date)} — trough of ${trough.units.toFixed(1)} units`,
      d: 'Lowest forecast day in the horizon; run lean to protect margin.',
    })
    const wknd = fc.filter((p) => [0, 6].includes(new Date(`${p.date}T12:00:00`).getDay()))
    const wkday = fc.filter((p) => ![0, 6].includes(new Date(`${p.date}T12:00:00`).getDay()))
    if (wknd.length && wkday.length) {
      const wa = wknd.reduce((s, p) => s + p.units, 0) / wknd.length
      const da = wkday.reduce((s, p) => s + p.units, 0) / wkday.length
      const lift = da ? ((wa - da) / da) * 100 : 0
      out.push({
        t: lift >= 0 ? `Weekend demand runs ${lift.toFixed(0)}% above weekdays` : `Weekday demand runs ${Math.abs(lift).toFixed(0)}% above weekends`,
        d: 'Roster and purchasing should follow the stronger half of the week.',
      })
    }
    const histAvg = data.history.length ? data.history.reduce((s, p) => s + p.units, 0) / data.history.length : 0
    out.push({
      t: `Baseline: ${histAvg.toFixed(1)} units/day across ${data.history.length} recorded days`,
      d: 'History behind the model — compare the horizon average before committing purchases.',
    })
    return out
  }, [data, h])

  if ((loading && !data) || (location === 'all' && !item)) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No forecast data.'} onRetry={refetch} />

  const entityName =
    grain === 'restaurant'
      ? (meta?.restaurants.find((r) => r.restaurant_id === location)?.restaurant_name ?? location)
      : (items.find((m) => m.item_id === item)?.item_name ?? data.items.find((m) => m.item_id === item)?.item_name ?? item)

  const downloadReport = async () => {
    try {
      await downloadExport('demand_forecast', 'csv')
      push({ title: 'Forecast exported', body: 'demand_forecast.csv downloaded from the live API.', tone: 'success' })
    } catch (e) {
      push({ title: 'Export failed', body: e instanceof Error ? e.message : 'Unknown error', tone: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Demand Forecasting"
        subtitle={`Live ${data.method} demand projections for ${entityName}.`}
        demoNote="Live model output — recursive 28-day horizon, refreshed with each pipeline run."
        exportLabel="Download forecast"
        dataset="demand_forecast"
      />

      {/* Controls */}
      <Card className="mb-5 p-4">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            value={item}
            onChange={(e) => setItem(e.target.value)}
            options={items.map((m) => ({ label: m.item_name, value: m.item_id }))}
            aria-label="Menu item"
            disabled={grain === 'restaurant'}
          />
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setItem('')
            }}
            options={[
              { label: 'All categories', value: 'all' },
              ...(meta?.categories ?? []).map((c) => ({ label: c.category_name, value: c.category_name })),
            ]}
            aria-label="Category"
            disabled={grain === 'restaurant'}
          />
          <Select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            options={[
              { label: 'All locations (item view)', value: 'all' },
              ...(meta?.restaurants ?? []).map((r) => ({ label: r.restaurant_name, value: r.restaurant_id })),
            ]}
            aria-label="Location"
          />
          <Select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            options={[
              { label: '7-day horizon', value: '7' },
              { label: '14-day horizon', value: '14' },
              { label: '28-day horizon', value: '28' },
            ]}
            aria-label="Forecast horizon"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="sage" icon="FlaskConical">
            Live model
          </Badge>
          <span className="text-[12.5px] text-ink-faint">
            {grain === 'restaurant'
              ? 'Location view forecasts total units for the branch — item and category controls are paused.'
              : 'Item view forecasts units across all locations — pick a location for the branch total instead.'}
          </span>
        </div>
      </Card>

      {data.forecasts.length === 0 ? (
        <Card>
          <NoDataState onReset={() => { setItem(''); setLocation('all'); setCategory('all') }} />
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: `Forecast units (${h} days)`, value: num(summary?.total ?? 0), sub: `for ${entityName}`, icon: 'TrendingUp', tone: 'ember' },
              { label: 'Daily average', value: (summary?.avg ?? 0).toFixed(1), sub: 'units per day', icon: 'Gauge', tone: 'sky' },
              { label: 'Peak day', value: summary?.peak.date ? dayLabel(summary.peak.date) : '—', sub: summary?.peak.date ? `${summary.peak.units.toFixed(1)} units · ${dayName(summary.peak.date)}` : '—', icon: 'Flame', tone: 'gold' },
              { label: 'History used', value: num(summary?.historyDays ?? 0), sub: 'recorded days', icon: 'History', tone: 'sage' },
            ].map((s) => (
              <KpiCard key={s.label} label={s.label} value={s.value} compare={s.sub} icon={s.icon} tone={s.tone} />
            ))}
          </div>

          {/* Chart */}
          <ChartCard
            title={`Daily demand — history versus forecast (${entityName})`}
            subtitle="Solid line shows recorded units; dashed line shows the live model forecast."
            height={340}
            actions={
              <Tabs
                value={horizon}
                onChange={setHorizon}
                variant="pill"
                tabs={[
                  { label: '7 days', value: '7' },
                  { label: '14 days', value: '14' },
                  { label: '28 days', value: '28' },
                ]}
              />
            }
            footer="History shows the trailing 30 recorded days; forecast covers the selected horizon."
          >
            <ForecastChart data={chart} forecastStart={firstFcLabel} />
          </ChartCard>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader title="Forecast by period" subtitle="Trailing week plus the selected horizon" className="border-b" />
              <div className="max-h-[420px] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[420px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-line bg-canvas/60">
                      {['Period', 'Day', 'Actual', 'Forecast', 'Status'].map((hcol) => (
                        <th key={hcol} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                          {hcol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((d, i) => (
                      <tr key={i} className="border-t border-line/70">
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-ink">{d.label}</td>
                        <td className="px-4 py-2.5 text-[13px] text-ink-muted">{d.day}</td>
                        <td className="px-4 py-2.5 text-[13px] tabular-nums text-ink-soft">{d.actual ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[13px] font-semibold tabular-nums text-ember-700">{d.forecast?.toFixed(1) ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {d.forecast != null ? (
                            <span className="rounded-full bg-ember-50 px-2 py-0.5 text-[11.5px] font-bold text-ember-700">Planned</span>
                          ) : (
                            <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[11.5px] font-bold text-sage-700">Recorded</span>
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
                <p className="mt-1 text-[12.5px] text-ink-muted">Hold-out evaluation from the model registry.</p>
                <div className="mt-4 space-y-3">
                  {data.runs.map((r) => (
                    <div key={r.run} className="rounded-xl border border-line bg-canvas p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-display text-[15px] font-bold text-ink">Evaluation run {r.run}</span>
                        <span className="text-[12px] font-semibold tabular-nums text-ink-muted">
                          RMSE {r.rmse?.toFixed(3) ?? '—'} · MAE {r.mae?.toFixed(3) ?? '—'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-ink-muted">
                        {r.mape != null ? `MAPE ${r.mape.toFixed(1)}%` : 'MAPE n/a'}
                        {r.r2 != null ? ` · R² ${r.r2.toFixed(3)}${r.r2 < 0 ? ' (below mean baseline — use as a planning guide)' : ''}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-display text-[16px] font-semibold text-ink">Model</h3>
                <div className="mt-3 space-y-2.5">
                  <MetricRow label="Method" value={data.method} />
                  <MetricRow label="Grain" value={grain === 'item' ? 'Menu item' : 'Restaurant'} />
                  <MetricRow label="Entity" value={entityName} />
                  <MetricRow label="History rows" value={num(data.historyRows)} />
                  <MetricRow label="Max horizon" value="28 days" />
                </div>
                <LiveNote className="mt-3">Model output only — no manual forecast is applied anywhere on this page.</LiveNote>
              </Card>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <InfoCard
              title="Forecast notes"
              icon="StickyNote"
              tone="ember"
              items={[
                'Recursive multi-step model: each forecast day feeds the next.',
                'Item grain covers all locations; location grain covers all items.',
                'MAPE is computed on non-zero demand days only.',
                'Forecasts refresh with every pipeline run.',
              ]}
            />
            <Card className="p-5">
              <h3 className="font-display text-[16px] font-semibold text-ink">Suggested preparation guidance</h3>
              <p className="mt-1 text-[12.5px] text-ink-muted">Derived from the live horizon above.</p>
              <ul className="mt-3.5 space-y-2.5">
                {guidance.map((s) => (
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
              <Button variant="secondary" size="sm" icon="Download" className="mt-4" onClick={downloadReport}>
                Download report
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function ForecastChart({ data, forecastStart }: { data: { label: string; actual: number | null; forecast: number | null }[]; forecastStart?: string }) {
  return (
    <ComposedChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
      <CartesianGrid stroke="#EFEAE3" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9C948A', fontSize: 11, fontWeight: 500 }} interval="preserveStartEnd" minTickGap={24} />
      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9C948A', fontSize: 11, fontWeight: 500 }} width={54} />
      <Tooltip
        contentStyle={{ borderRadius: 12, border: '1px solid #E9E2D9', fontSize: 12 }}
        formatter={(v: any) => (v == null ? '—' : `${Number(v).toLocaleString()} units`)}
      />
      <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
      <Line type="monotone" dataKey="actual" name="Actual demand" stroke="#1D1B19" strokeWidth={2.2} dot={false} connectNulls />
      <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#B54E17" strokeWidth={2.4} strokeDasharray="6 4" dot={false} connectNulls />
      {forecastStart && (
        <ReferenceLine
          x={forecastStart}
          stroke="#DAD1C5"
          strokeDasharray="4 4"
          label={{ value: 'Forecast start', position: 'insideTopRight', fontSize: 10, fill: '#9C948A' }}
        />
      )}
    </ComposedChart>
  )
}
