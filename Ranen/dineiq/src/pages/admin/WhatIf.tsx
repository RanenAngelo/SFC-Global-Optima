import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Field, Icon, Input, Select } from '../../components/ui/primitives'
import { InfoCard, KpiCard, LiveNote, MetricRow } from '../../components/shared'
import { PageHeader } from '../../components/admin/PageHeader'
import { PageError, PageLoader, apiFetch, useApi, useAuth } from '../../lib/api'
import { useToast } from '../../components/ui/overlay'
import { pkr } from '../../lib/utils'

type MenuItem = { item_id: string; item_name: string; base_price: number; category_name: string }
type WhatIfOut = {
  scenario: string
  item_id: string
  estimate: boolean
  inputs: Record<string, number | string | null>
  impact: Record<string, number | null>
  assumptions: string[]
  note?: string
}

const SCENARIOS = [
  { value: 'price', label: 'Price change', desc: 'What if this item sold at a new price?' },
  { value: 'discount', label: 'Discount campaign', desc: 'What if a % discount ran for N days?' },
  { value: 'remove', label: 'Remove item', desc: 'What if this item left the menu?' },
  { value: 'prep_cut', label: 'Prep cut', desc: 'What if batch prep shrank by N%?' },
  { value: 'demand', label: 'Demand shock', desc: 'What if demand moved ±N%?' },
]

const IMPACT_LABELS: Record<string, { label: string; money?: boolean; suffix?: string }> = {
  demand_pct: { label: 'Demand change', suffix: '%' },
  revenue_delta: { label: 'Revenue impact', money: true },
  margin_delta: { label: 'Margin impact', money: true },
  volume_lift_x: { label: 'Volume lift', suffix: '×' },
  wastage_delta: { label: 'Wastage impact', money: true },
  profit_delta: { label: 'Profit impact', money: true },
}

function ImpactValue({ k, v }: { k: string; v: number | null }) {
  const meta = IMPACT_LABELS[k] ?? { label: k }
  if (v === null || v === undefined) return <span className="text-ink-faint">n/a</span>
  const txt = meta.money ? pkr(v, { decimals: true }) : `${v}${meta.suffix ?? ''}`
  const good = v >= 0
  return (
    <span className={good ? 'text-sage-600' : 'text-clay-600'}>
      {meta.money && v > 0 ? '+' : ''}
      {txt}
    </span>
  )
}

export default function WhatIf() {
  const { data: items, loading, error, refetch } = useApi<MenuItem[]>('/menu/items')
  const [itemId, setItemId] = useState('')
  const [scenario, setScenario] = useState('price')
  const [newPrice, setNewPrice] = useState('')
  const [discountPct, setDiscountPct] = useState('15')
  const [cutPct, setCutPct] = useState('20')
  const [demandPct, setDemandPct] = useState('10')
  const [days, setDays] = useState('14')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<WhatIfOut | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const { push } = useToast()
  const { can } = useAuth()

  const item = useMemo(() => (items ?? []).find((i) => i.item_id === itemId), [items, itemId])
  const active = useMemo(() => (items ?? []).filter((i) => i.item_id && i.item_name), [items])

  React.useEffect(() => {
    if (!itemId && active.length > 0) setItemId(active[0].item_id)
  }, [active, itemId])

  React.useEffect(() => {
    if (item && scenario === 'price' && !newPrice) setNewPrice((Math.round(item.base_price * 1.1 * 100) / 100).toFixed(2))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  async function run() {
    if (!itemId) return
    setRunning(true)
    setRunError(null)
    const body: Record<string, unknown> = { scenario, item_id: itemId, days: Number(days) || 14 }
    if (scenario === 'price') body.new_price = Number(newPrice)
    if (scenario === 'discount') body.discount_pct = (Number(discountPct) || 0) / 100
    if (scenario === 'prep_cut') body.cut_pct = (Number(cutPct) || 0) / 100
    if (scenario === 'demand') body.demand_pct = (Number(demandPct) || 0) / 100
    try {
      const out = await apiFetch<WhatIfOut>('/whatif', { method: 'POST', body })
      setResult(out)
      push({ title: 'Scenario simulated', body: `${out.scenario} on ${itemId} — estimate, see assumptions.`, tone: 'success' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Simulation failed'
      setRunError(msg)
      push({ title: 'Simulation failed', body: msg, tone: 'error' })
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <PageLoader label="Loading menu items…" />
  if (error || !items) return <PageError message={error ?? 'No items.'} onRetry={refetch} />

  const impactEntries = result ? Object.entries(result.impact) : []

  return (
    <div>
      <PageHeader
        eyebrow="Decisions · Scenario lab"
        title="What-If Lab"
        subtitle="Simulate price, discount, prep and demand scenarios against measured elasticities and observed promo lift. Every result is an estimate — assumptions are listed, never hidden."
        onRefresh={() => {
          refetch()
          setResult(null)
        }}
      />
      <LiveNote className="mb-5">
        Simulations run live on the DineIQ API from pipeline measurements (elasticities, promo lift, wastage rates).
        Guardrails apply: implausible measured elasticities fall back to disclosed unit-elasticity.
      </LiveNote>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader title="Scenario" subtitle="Pick an item and a change to simulate" />
          <div className="space-y-4 p-4 pt-0 sm:px-5">
            <Field label="Menu item">
              <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
                {active.map((i) => (
                  <option key={i.item_id} value={i.item_id}>
                    {i.item_name} · {pkr(i.base_price)} · {i.category_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Scenario">
              <div className="grid gap-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setScenario(s.value)}
                    className={
                      scenario === s.value
                        ? 'rounded-xl border border-ember-300 bg-ember-50 px-3 py-2.5 text-left'
                        : 'rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-line-strong'
                    }
                  >
                    <p className={scenario === s.value ? 'text-[13px] font-bold text-ember-700' : 'text-[13px] font-semibold text-ink'}>
                      {s.label}
                    </p>
                    <p className="text-[12px] text-ink-muted">{s.desc}</p>
                  </button>
                ))}
              </div>
            </Field>

            {scenario === 'price' && (
              <Field label={`New price (current ${item ? pkr(item.base_price) : '—'})`}>
                <Input icon="Tag" type="number" step="0.01" min="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </Field>
            )}
            {scenario === 'discount' && (
              <Field label="Discount percent">
                <Input icon="BadgePercent" type="number" step="1" min="1" max="90" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
              </Field>
            )}
            {scenario === 'prep_cut' && (
              <Field label="Prep cut percent">
                <Input icon="PackageMinus" type="number" step="1" min="1" max="90" value={cutPct} onChange={(e) => setCutPct(e.target.value)} />
              </Field>
            )}
            {scenario === 'demand' && (
              <Field label="Demand change percent (use − for a drop)">
                <Input icon="TrendingUp" type="number" step="1" value={demandPct} onChange={(e) => setDemandPct(e.target.value)} />
              </Field>
            )}
            {scenario !== 'price' && scenario !== 'remove' && (
              <Field label="Window (days)">
                <Input icon="CalendarDays" type="number" step="1" min="1" max="90" value={days} onChange={(e) => setDays(e.target.value)} />
              </Field>
            )}

            <Button onClick={() => void run()} disabled={running || !itemId || !can('analyst')} icon={running ? 'LoaderCircle' : 'Play'} className="w-full">
              {running ? 'Simulating…' : 'Run simulation'}
            </Button>
            {!can('analyst') && (
              <p className="text-[12px] text-ink-faint">Viewers have read-only access — ask an analyst to run scenarios.</p>
            )}
            {runError && (
              <div className="flex items-start gap-2 rounded-xl border border-clay-100 bg-clay-50/70 px-3 py-2.5 text-[12.5px] font-medium text-clay-600">
                <Icon name="AlertTriangle" size={14} className="mt-px shrink-0" />
                {runError}
              </div>
            )}
          </div>
        </Card>

        <div>
          {!result && (
            <Card className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-50 text-ember-600">
                <Icon name="FlaskConical" size={22} />
              </span>
              <h3 className="mt-4 font-display text-[18px] font-semibold text-ink">No scenario yet</h3>
              <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-muted">
                Configure a scenario on the left and run it — the estimated impact on demand, revenue and margin
                appears here with its assumptions.
              </p>
            </Card>
          )}

          {result && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[17px] font-semibold capitalize text-ink">{result.scenario.replace(/_/g, ' ')}</h3>
                <Badge tone="gold">Estimate</Badge>
                <span className="font-mono text-[12px] font-bold text-ink-muted">{result.item_id}</span>
              </div>
              <div className="mt-3 grid gap-3.5 sm:grid-cols-3">
                {impactEntries.slice(0, 3).map(([k, v]) => (
                  <KpiCard
                    key={k}
                    label={(IMPACT_LABELS[k] ?? { label: k }).label}
                    value={
                      v === null || v === undefined
                        ? 'n/a'
                        : (IMPACT_LABELS[k]?.money ? pkr(v, { decimals: true }) : `${v}${IMPACT_LABELS[k]?.suffix ?? ''}`)
                    }
                    icon={k.includes('revenue') ? 'Banknote' : k.includes('margin') || k.includes('profit') ? 'PiggyBank' : 'Activity'}
                    tone={v !== null && v !== undefined && v >= 0 ? 'sage' : 'clay'}
                  />
                ))}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Inputs" subtitle="What the simulation assumed as given" />
                  <div className="px-4 pb-3 sm:px-5">
                    {Object.entries(result.inputs).map(([k, v]) => (
                      <MetricRow key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
                    ))}
                    {impactEntries.slice(3).map(([k, v]) => (
                      <MetricRow key={k} label={(IMPACT_LABELS[k] ?? { label: k }).label} value={<ImpactValue k={k} v={v} />} />
                    ))}
                  </div>
                </Card>
                <InfoCard
                  title="Assumptions — read before acting"
                  items={result.assumptions}
                  tone="ember"
                  icon="AlertTriangle"
                />
              </div>
              {result.note && <LiveNote className="mt-4">{result.note}</LiveNote>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
