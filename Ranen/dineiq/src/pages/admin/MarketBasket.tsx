import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, Tooltip, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { ChartCard } from '../../components/charts'
import { DemoNote, FoodImage, KpiCard, MetricRow, Progress } from '../../components/shared'
import { BASKET_PAIRS, BUNDLES, CATEGORY_PAIRING } from '../../lib/data/analytics'
import { money } from '../../lib/utils'

const OPPORTUNITY_TONE: Record<string, 'sage' | 'gold' | 'sky'> = { High: 'sage', Medium: 'gold', Low: 'sky' }

export default function MarketBasket() {
  const { push } = useToast()
  const [query, setQuery] = useState('')
  const [minLift, setMinLift] = useState(0)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return BASKET_PAIRS.filter((p) => p.lift >= minLift).filter((p) => !q || p.a.toLowerCase().includes(q) || p.b.toLowerCase().includes(q))
  }, [query, minLift])

  const rules = BASKET_PAIRS.map((p, i) => ({
    id: `ar-${i}`,
    rule: `{${p.a}} → {${p.b}}`,
    antecedent: p.a,
    consequent: p.b,
    support: p.support,
    confidence: p.confidence,
    lift: p.lift,
  }))

  const pairColumns: Column<(typeof BASKET_PAIRS)[number]>[] = [
    {
      key: 'a',
      header: 'Item A',
      sort: (a, b) => a.a.localeCompare(b.a),
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <FoodImage src={p.imgA} name={p.a} className="h-8 w-8 shrink-0" ratio="fill" />
          <span className="truncate text-[13px] font-medium text-ink">{p.a}</span>
        </div>
      ),
    },
    {
      key: 'b',
      header: 'Item B',
      sort: (a, b) => a.b.localeCompare(b.b),
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <FoodImage src={p.imgB} name={p.b} className="h-8 w-8 shrink-0" ratio="fill" />
          <span className="truncate text-[13px] font-medium text-ink">{p.b}</span>
        </div>
      ),
    },
    {
      key: 'support',
      header: 'Support',
      align: 'right',
      sort: (a, b) => a.support - b.support,
      headerTip: 'Share of demo baskets containing both items',
      render: (p) => <span className="tabular-nums text-ink-soft">{p.support}%</span>,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      align: 'right',
      sort: (a, b) => a.confidence - b.confidence,
      headerTip: 'Share of Item A baskets that also contain Item B',
      render: (p) => (
        <div className="flex items-center justify-end gap-2">
          <Progress value={p.confidence} className="hidden w-14 sm:block" tone="ember" height={5} />
          <span className="w-10 tabular-nums text-ink-soft">{p.confidence}%</span>
        </div>
      ),
    },
    {
      key: 'lift',
      header: 'Lift',
      align: 'right',
      sort: (a, b) => a.lift - b.lift,
      headerTip: 'How much more often the pair appears than expected by chance',
      render: (p) => (
        <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-bold', p.lift >= 3 ? 'bg-sage-50 text-sage-700' : p.lift >= 2 ? 'bg-gold-50 text-gold-600' : 'bg-canvas-deep text-ink-muted')}>
          {p.lift.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'opportunity',
      header: 'Opportunity',
      align: 'center',
      render: (p) => <Badge tone={OPPORTUNITY_TONE[p.opportunity] ?? 'neutral'}>{p.opportunity}</Badge>,
    },
    {
      key: 'action',
      header: 'Suggested action',
      hideBelow: 'lg',
      render: (p) => <span className="text-[12.5px] text-ink-muted">{p.action}</span>,
    },
  ]

  const ruleColumns: Column<(typeof rules)[number]>[] = [
    { key: 'rule', header: 'Association rule', sort: (a, b) => a.rule.localeCompare(b.rule), render: (r) => <span className="font-mono text-[12px] text-ink">{r.rule}</span> },
    {
      key: 'support',
      header: 'Support',
      align: 'right',
      sort: (a, b) => a.support - b.support,
      render: (r) => <span className="tabular-nums text-ink-soft">{r.support}%</span>,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      align: 'right',
      sort: (a, b) => a.confidence - b.confidence,
      render: (r) => <span className="tabular-nums text-ink-soft">{r.confidence}%</span>,
    },
    {
      key: 'lift',
      header: 'Lift',
      align: 'right',
      sort: (a, b) => a.lift - b.lift,
      render: (r) => <span className="font-semibold tabular-nums text-ink">{r.lift.toFixed(2)}</span>,
    },
    {
      key: 'strength',
      header: 'Strength',
      align: 'center',
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={cn('h-1.5 w-1.5 rounded-full', r.lift / 0.8 >= i ? 'bg-ember-500' : 'bg-line')} />
          ))}
        </div>
      ),
    },
  ]

  /* ── Category network (SVG) ─────────────────────────────── */
  const cats = ['Burgers', 'Pizza', 'Rice & Bowls', 'Pasta', 'Main Course', 'Starters', 'Desserts', 'Beverages']
  const nodes = cats.map((c, i) => {
    const angle = (i / cats.length) * Math.PI * 2 - Math.PI / 2
    return { id: c, x: 190 + Math.cos(angle) * 132, y: 175 + Math.sin(angle) * 132 }
  })
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const maxStrength = Math.max(...CATEGORY_PAIRING.map((p) => p.strength))

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Market-Basket Analysis"
        subtitle="See how dishes tend to appear together in demo baskets, and where bundling or cross-selling could be explored."
        demoNote="Support, confidence and lift values are hand-written demonstration numbers. No association-rule mining is performed."
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pairs analysed" value={`${BASKET_PAIRS.length}`} compare="demo basket pairs" icon="Network" tone="ember" />
        <KpiCard label="Average lift" value="2.51" compare="across demo pairs" icon="TrendingUp" tone="sage" />
        <KpiCard label="Strongest pair" value="3.42" compare="Signature Smash + Truffle Fries" icon="Sparkles" tone="gold" />
        <KpiCard label="Bundle opportunities" value="4" compare="illustrative" icon="PackagePlus" tone="sky" />
      </div>

      {/* Frequently purchased together */}
      <Card className="mb-5">
        <CardHeader title="Frequently purchased together" subtitle="Top demo pairs by lift" icon="Sparkles" className="border-b" />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {BASKET_PAIRS.slice(0, 6).map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-white p-4 transition-colors hover:border-line-strong">
              <div className="flex items-center gap-2">
                <FoodImage src={p.imgA} name={p.a} className="h-12 w-12 shrink-0" ratio="fill" />
                <Icon name="Plus" size={14} className="shrink-0 text-ink-faint" />
                <FoodImage src={p.imgB} name={p.b} className="h-12 w-12 shrink-0" ratio="fill" />
                <Badge tone={OPPORTUNITY_TONE[p.opportunity] ?? 'neutral'} className="ml-auto">
                  Lift {p.lift.toFixed(2)}
                </Badge>
              </div>
              <p className="mt-3 text-[13px] font-semibold leading-snug text-ink">
                {p.a} <span className="text-ink-faint">+</span> {p.b}
              </p>
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11.5px] text-ink-muted">
                  <span>Support</span>
                  <span className="font-semibold tabular-nums text-ink-soft">{p.support}%</span>
                </div>
                <Progress value={p.support * 4} tone="ember" height={4} />
                <div className="flex items-center justify-between text-[11.5px] text-ink-muted">
                  <span>Confidence</span>
                  <span className="font-semibold tabular-nums text-ink-soft">{p.confidence}%</span>
                </div>
                <Progress value={p.confidence} tone="sage" height={4} />
              </div>
              <p className="mt-3 rounded-lg bg-canvas px-2.5 py-1.5 text-[11.5px] leading-snug text-ink-muted">{p.action}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Category network + bundles */}
      <div className="mb-5 grid gap-4 xl:grid-cols-[1.1fr_1.3fr]">
        <Card>
          <CardHeader title="Category pairing network" subtitle="Strength of association between menu categories" className="border-b" />
          <div className="p-4">
            <svg viewBox="0 0 380 350" className="w-full" role="img" aria-label="Category pairing network diagram">
              {CATEGORY_PAIRING.map((p, i) => {
                const a = nodeMap[p.source]
                const b = nodeMap[p.target]
                if (!a || !b) return null
                const mx = (a.x + b.x) / 2
                const my = (a.y + b.y) / 2
                const cx = 190 + (mx - 190) * 0.62
                const cy = 175 + (my - 175) * 0.62
                return (
                  <path
                    key={i}
                    d={`M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`}
                    fill="none"
                    stroke="#B54E17"
                    strokeWidth={1 + (p.strength / maxStrength) * 5}
                    strokeOpacity={0.12 + (p.strength / maxStrength) * 0.5}
                    strokeLinecap="round"
                  />
                )
              })}
              {nodes.map((n) => (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r={26} fill="#fff" stroke="#E9E2D9" strokeWidth={1.5} />
                  <circle cx={n.x} cy={n.y} r={26} fill="#B54E17" fillOpacity={0.06} />
                  <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={n.id.length > 10 ? 7.5 : 9} fontWeight={700} fill="#1D1B19" fontFamily="Inter, sans-serif">
                    {n.id.split(' ')[0]}
                  </text>
                </g>
              ))}
            </svg>
            <p className="mt-2 text-center text-[11.5px] text-ink-faint">
              Line thickness represents the illustrative association strength between categories.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recommended bundles"
            subtitle="Illustrative combos derived from the strongest demo pairs"
            className="border-b"
            actions={
              <Button size="xs" variant="ghost" onClick={() => push({ title: 'Bundle ideas exported', body: 'Demo control — no file generated', tone: 'info' })} icon="Download">
                Export ideas
              </Button>
            }
          />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {BUNDLES.map((b) => (
              <div key={b.id} className="overflow-hidden rounded-2xl border border-line">
                <FoodImage src={b.img} name={b.name} ratio="wide" rounded="none" />
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display text-[14.5px] font-semibold leading-snug text-ink">{b.name}</h4>
                    <Badge tone="gold">Lift {b.lift}</Badge>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {b.items.map((i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] text-ink-muted">
                        <Icon name="Check" size={11} className="mt-0.5 shrink-0 text-sage-600" />
                        {i}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-display text-[17px] font-semibold text-ink">{money(b.price)}</span>
                    <span className="text-[12px] text-ink-faint line-through">{money(b.was)}</span>
                  </div>
                  <Button
                    size="xs"
                    variant="secondary"
                    block
                    className="mt-2.5"
                    icon="Plus"
                    onClick={() => push({ title: `${b.name} saved as a draft bundle`, tone: 'success' })}
                  >
                    Create bundle
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Upsell / cross-sell */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Cross-sell opportunities" subtitle="Items most often added alongside a high-volume dish" className="border-b" />
          <div className="divide-y divide-line">
            {BASKET_PAIRS.slice(0, 4).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">Add “{p.b}”</p>
                  <p className="text-[11.5px] text-ink-muted">to baskets containing {p.a}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-ink-soft">{p.confidence}% accept</span>
                  <Button size="xs" variant="secondary" onClick={() => push({ title: 'Cross-sell rule saved (demo)', tone: 'success' })}>
                    Enable
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Upsell opportunities" subtitle="Higher-value alternatives frequently chosen instead" className="border-b" />
          <div className="divide-y divide-line">
            {[
              { from: 'Regular basket', to: 'Large basket', delta: '+Rs. 180', note: 'Chosen in 61% of upgrade prompts' },
              { from: '10" pizza', to: '12" pizza', delta: '+Rs. 350', note: 'Chosen in 48% of upgrade prompts' },
              { from: 'Single patty', to: 'Double patty', delta: '+Rs. 320', note: 'Chosen in 54% of upgrade prompts' },
              { from: 'Regular latte', to: 'Large latte', delta: '+Rs. 160', note: 'Chosen in 37% of upgrade prompts' },
            ].map((u) => (
              <div key={u.to} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {u.from} <Icon name="ArrowRight" size={12} className="mx-1 inline text-ink-faint" /> {u.to}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">{u.note}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-sage-700">{u.delta}</span>
                  <Button size="xs" variant="secondary" onClick={() => push({ title: 'Upsell rule saved (demo)', tone: 'success' })}>
                    Enable
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Pair table */}
      <Card className="mb-5">
        <CardHeader
          title="Product pair table"
          subtitle="Demo association metrics for each item pair"
          className="border-b"
          actions={
            <div className="flex items-center gap-2">
              <select
                value={minLift}
                onChange={(e) => setMinLift(Number(e.target.value))}
                className="focus-ring h-8 rounded-lg border border-line-strong bg-white px-2 text-[12.5px] font-medium"
                aria-label="Minimum lift"
              >
                <option value={0}>Any lift</option>
                <option value={2}>Lift ≥ 2.0</option>
                <option value={2.5}>Lift ≥ 2.5</option>
                <option value={3}>Lift ≥ 3.0</option>
              </select>
            </div>
          }
        />
        <div className="border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by dish name…" className="w-full sm:w-72" />
        </div>
        <DataTable
          columns={pairColumns}
          rows={rows}
          rowKey={(p) => p.id}
          pageSize={8}
          initialSort={{ key: 'lift', dir: 'desc' }}
          emptyTitle="No pairs match these filters"
          emptyMessage="Lower the minimum lift threshold or clear the search box."
          emptyAction={
            <Button
              size="sm"
              variant="secondary"
              icon="RotateCcw"
              onClick={() => {
                setQuery('')
                setMinLift(0)
              }}
            >
              Clear filters
            </Button>
          }
        />
      </Card>

      {/* Rules table */}
      <Card>
        <CardHeader
          title="Association rules"
          subtitle="Rule notation with demo support, confidence and lift"
          className="border-b"
          actions={<Badge tone="neutral">Illustrative</Badge>}
        />
        <DataTable columns={ruleColumns} rows={rules} rowKey={(r) => r.id} pageSize={8} initialSort={{ key: 'lift', dir: 'desc' }} />
        <div className="border-t border-line p-4">
          <DemoNote>
            Association rules shown here are typed examples for interface demonstration. No rule mining is executed in this
            prototype.
          </DemoNote>
        </div>
      </Card>
    </div>
  )
}
