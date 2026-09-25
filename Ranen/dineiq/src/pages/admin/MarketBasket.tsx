import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, SearchInput, cn } from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { FoodImage, KpiCard, LiveNote, Progress } from '../../components/shared'
import { PageError, PageLoader } from '../../lib/api'
import { useBasketData, type BasketPair, type BundleIdea } from '../../lib/live'
import { downloadCsv, num } from '../../lib/utils'

const OPPORTUNITY_TONE: Record<string, 'sage' | 'gold' | 'sky'> = { High: 'sage', Medium: 'gold', Low: 'sky' }

export default function MarketBasket() {
  const { push } = useToast()
  const [query, setQuery] = useState('')
  const [minLift, setMinLift] = useState(0)
  const { data, loading, error, refetch } = useBasketData()

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.pairs ?? [])
      .filter((p) => p.lift >= minLift)
      .filter((p) => !q || p.a.toLowerCase().includes(q) || p.b.toLowerCase().includes(q))
  }, [data, query, minLift])

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No basket data.'} onRetry={refetch} />

  const rules = data.pairs.map((p, i) => ({
    id: `ar-${i}`,
    rule: `{${p.a}} → {${p.b}}`,
    antecedent: p.a,
    consequent: p.b,
    support: p.support,
    confidence: p.confidence,
    lift: p.lift,
  }))

  const pairColumns: Column<BasketPair>[] = [
    {
      key: 'a',
      header: 'Item A',
      sort: (a, b) => a.a.localeCompare(b.a),
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <FoodImage src={undefined} name={p.a} className="h-8 w-8 shrink-0" ratio="fill" />
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
          <FoodImage src={undefined} name={p.b} className="h-8 w-8 shrink-0" ratio="fill" />
          <span className="truncate text-[13px] font-medium text-ink">{p.b}</span>
        </div>
      ),
    },
    {
      key: 'support',
      header: 'Support',
      align: 'right',
      sort: (a, b) => a.support - b.support,
      headerTip: 'Share of baskets containing both items',
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
          <span className="w-12 tabular-nums text-ink-soft">{p.confidence}%</span>
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
        <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-bold', p.lift >= 8 ? 'bg-sage-50 text-sage-700' : p.lift >= 3 ? 'bg-gold-50 text-gold-600' : 'bg-canvas-deep text-ink-muted')}>
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
            <span key={i} className={cn('h-1.5 w-1.5 rounded-full', r.lift / 4 >= i ? 'bg-ember-500' : 'bg-line')} />
          ))}
        </div>
      ),
    },
  ]

  /* ── Category network (SVG, live edges) ─────────────────── */
  const nodes = data.cats.map((c, i) => {
    const angle = (i / Math.max(1, data.cats.length)) * Math.PI * 2 - Math.PI / 2
    return { id: c, x: 190 + Math.cos(angle) * 132, y: 175 + Math.sin(angle) * 132 }
  })
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const maxStrength = Math.max(1, ...data.edges.map((p) => p.strength))
  const short = (c: string) => c.split(' ')[0]

  const copyText = (text: string, title: string) => {
    void navigator.clipboard.writeText(text).then(
      () => push({ title, tone: 'success' }),
      () => push({ title: 'Copy failed', tone: 'error' }),
    )
  }

  const exportBundles = () => {
    downloadCsv(
      'bundle-ideas.csv',
      ['Bundle', 'Items', 'Lift', 'Confidence %', 'Evidence'],
      data.bundles.map((b: BundleIdea) => [b.name, b.items.join(' | '), b.lift.toFixed(3), b.confidence.toFixed(1), b.evidence]),
    )
    push({ title: 'Bundle ideas exported', body: `${data.bundles.length} ideas saved as CSV`, tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Market-Basket Analysis"
        subtitle="Live association rules from basket mining — where bundling or cross-selling can lift the cheque."
        demoNote="Rules mined from live orders: support, confidence and lift are real pipeline output."
        onRefresh={refetch}
        dataset="market_basket"
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pairs analysed" value={num(data.pairs.length)} compare="mined rules" icon="Network" tone="ember" />
        <KpiCard label="Average lift" value={data.avgLift.toFixed(2)} compare="across rules" icon="TrendingUp" tone="sage" />
        <KpiCard label="Strongest pair" value={data.top ? data.top.lift.toFixed(2) : '—'} compare={data.top ? `${data.top.a} + ${data.top.b}` : '—'} icon="Sparkles" tone="gold" />
        <KpiCard label="Bundle opportunities" value={num(data.bundles.length)} compare="cross-sell ideas" icon="PackagePlus" tone="sky" />
      </div>

      {/* Frequently purchased together */}
      <Card className="mb-5">
        <CardHeader title="Frequently purchased together" subtitle="Top pairs by lift — live" icon="Sparkles" className="border-b" />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {[...data.pairs].sort((a, b) => b.lift - a.lift).slice(0, 6).map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-white p-4 transition-colors hover:border-line-strong">
              <div className="flex items-center gap-2">
                <FoodImage src={undefined} name={p.a} className="h-12 w-12 shrink-0" ratio="fill" />
                <Icon name="Plus" size={14} className="shrink-0 text-ink-faint" />
                <FoodImage src={undefined} name={p.b} className="h-12 w-12 shrink-0" ratio="fill" />
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
                <Progress value={Math.min(100, p.support * 4)} tone="ember" height={4} />
                <div className="flex items-center justify-between text-[11.5px] text-ink-muted">
                  <span>Confidence</span>
                  <span className="font-semibold tabular-nums text-ink-soft">{p.confidence}%</span>
                </div>
                <Progress value={p.confidence} tone="sage" height={4} />
              </div>
              <p className="mt-3 rounded-lg bg-canvas px-2.5 py-1.5 text-[11.5px] leading-snug text-ink-muted">{p.action} · in {num(p.transactions)} orders</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Category network + bundles */}
      <div className="mb-5 grid gap-4 xl:grid-cols-[1.1fr_1.3fr]">
        <Card>
          <CardHeader title="Category pairing network" subtitle="Live edges from mined rules" className="border-b" />
          <div className="p-4">
            <svg viewBox="0 0 380 350" className="w-full" role="img" aria-label="Category pairing network diagram">
              {data.edges.map((p, i) => {
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
                  <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={short(n.id).length > 10 ? 7.5 : 9} fontWeight={700} fill="#1D1B19" fontFamily="Inter, sans-serif">
                    {short(n.id)}
                  </text>
                </g>
              ))}
            </svg>
            <p className="mt-2 text-center text-[11.5px] text-ink-faint">
              Line thickness is the strongest mined lift between categories · {data.edges.length} live edges.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recommended bundles"
            subtitle="Cross-sell ideas from the strongest rules"
            className="border-b"
            actions={
              <Button size="xs" variant="ghost" onClick={exportBundles} icon="Download">
                Export ideas
              </Button>
            }
          />
          <div className="grid max-h-[520px] gap-3 overflow-y-auto p-4 sm:grid-cols-2">
            {data.bundles.map((b) => (
              <div key={b.id} className="overflow-hidden rounded-2xl border border-line">
                <div className="flex items-center gap-2 bg-canvas px-3.5 py-3">
                  <FoodImage src={undefined} name={b.items[0] ?? b.name} className="h-10 w-10 shrink-0" ratio="fill" />
                  <Icon name="Plus" size={12} className="shrink-0 text-ink-faint" />
                  <FoodImage src={undefined} name={b.items[1] ?? b.name} className="h-10 w-10 shrink-0" ratio="fill" />
                  <Badge tone="gold" className="ml-auto">Lift {b.lift.toFixed(2)}</Badge>
                </div>
                <div className="p-3.5">
                  <h4 className="font-display text-[14.5px] font-semibold leading-snug text-ink">{b.name}</h4>
                  <ul className="mt-2 space-y-1">
                    {b.items.map((i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] text-ink-muted">
                        <Icon name="Check" size={11} className="mt-0.5 shrink-0 text-sage-600" />
                        {i}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2.5 rounded-lg bg-canvas px-2.5 py-1.5 font-mono text-[11px] leading-snug text-ink-muted">{b.evidence}</p>
                  <Button
                    size="xs"
                    variant="secondary"
                    block
                    className="mt-2.5"
                    icon="Copy"
                    onClick={() => copyText(`${b.name} — ${b.evidence}`, 'Bundle idea copied')}
                  >
                    Copy idea
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Cross-sell + reading guide */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Cross-sell opportunities" subtitle="Highest-confidence rules — live" className="border-b" />
          <div className="divide-y divide-line">
            {[...data.pairs].sort((a, b) => b.confidence - a.confidence).slice(0, 4).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">Add “{p.b}”</p>
                  <p className="text-[11.5px] text-ink-muted">to baskets containing {p.a}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-ink-soft">{p.confidence}% attach</span>
                  <Badge tone="sage">Lift {p.lift.toFixed(1)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="How to read this page" subtitle="What the mining metrics mean" className="border-b" />
          <div className="space-y-3.5 p-4">
            {[
              { t: 'Support', d: 'How often the pair appears across all baskets. High support means a common, reliable pattern.' },
              { t: 'Confidence', d: 'When Item A is in the basket, how often Item B is too. High confidence means a strong suggestion.' },
              { t: 'Lift', d: 'How much more often the pair appears than chance. Lift above 1 is a real affinity; our High band starts at 8.' },
            ].map((r) => (
              <div key={r.t} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember-50 text-[12px] font-bold text-ember-600">
                  {r.t[0]}
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-ink">{r.t}</span>
                  <span className="block text-[12.5px] leading-relaxed text-ink-muted">{r.d}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Pair table */}
      <Card className="mb-5">
        <CardHeader
          title="Product pair table"
          subtitle="Live association metrics for each mined pair"
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
                <option value={3}>Lift ≥ 3.0</option>
                <option value={8}>Lift ≥ 8.0</option>
                <option value={15}>Lift ≥ 15.0</option>
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
          subtitle="Mined rule notation with live support, confidence and lift"
          className="border-b"
          actions={<Badge tone="sage">Live</Badge>}
        />
        <DataTable columns={ruleColumns} rows={rules} rowKey={(r) => r.id} pageSize={8} initialSort={{ key: 'lift', dir: 'desc' }} />
        <div className="border-t border-line p-4">
          <LiveNote>Rules are mined from live baskets by the association pipeline — not typed examples.</LiveNote>
        </div>
      </Card>
    </div>
  )
}
