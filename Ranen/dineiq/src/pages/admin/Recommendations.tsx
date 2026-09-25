import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardHeader, Icon, Tabs, cn } from '../../components/ui/primitives'
import { Drawer, useToast } from '../../components/ui/overlay'
import { EmptyState } from '../../components/ui/states'
import { PageHeader } from '../../components/admin/PageHeader'
import { KpiCard, LiveNote, MetricRow } from '../../components/shared'
import { PageError, PageLoader, apiFetch } from '../../lib/api'
import { recTypeMeta, useRecommendationsData, type RecItem } from '../../lib/live'
import { money, num } from '../../lib/utils'

const PRIORITY_TONE: Record<string, 'clay' | 'gold' | 'neutral'> = { Critical: 'clay', High: 'clay', Medium: 'gold', Low: 'neutral' }

export default function Recommendations() {
  const { push } = useToast()
  const [category, setCategory] = useState('All')
  const [priority, setPriority] = useState('all')
  const [tab, setTab] = useState('all')
  const [active, setActive] = useState<RecItem | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const { data, loading, error, refetch } = useRecommendationsData()

  const rows = useMemo(() => {
    let r = data?.items ?? []
    if (tab === 'saved') r = r.filter((x) => x.state === 'saved')
    else if (tab === 'done') r = r.filter((x) => x.state === 'done')
    else r = r.filter((x) => x.state === 'new' || x.state === 'saved')
    if (category !== 'All') r = r.filter((x) => x.category === category)
    if (priority !== 'all') r = r.filter((x) => x.priority === priority)
    return r
  }, [data, category, priority, tab])

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No recommendations.'} onRetry={refetch} />

  const items = data.items
  const openItems = items.filter((r) => r.state === 'new')
  const savedItems = items.filter((r) => r.state === 'saved')
  const doneItems = items.filter((r) => r.state === 'done')
  const urgent = items.filter((r) => (r.priority === 'Critical' || r.priority === 'High') && r.state === 'new')
  const openImpact = openItems.reduce((s, r) => s + r.impact, 0)

  const setState = async (rec: RecItem, state: 'saved' | 'dismissed' | 'done' | 'new', label: string) => {
    setBusy(rec.id)
    try {
      await apiFetch(`/recommendations/${rec.id}`, { method: 'PATCH', body: { state } })
      push({ title: label, tone: state === 'dismissed' ? 'info' : 'success' })
      refetch()
      if (active?.id === rec.id && (state === 'dismissed' || state === 'done')) setActive(null)
    } catch (e) {
      push({ title: 'Update failed', body: e instanceof Error ? e.message : 'Unknown error', tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Business Recommendations"
        subtitle="A live, prioritised action queue generated from the analytics pipeline — menu, pricing, promotions, inventory and customers."
        demoNote="Live rule-generated recommendations with evidence. Save, dismiss and completion persist on the server."
        onRefresh={refetch}
        dataset="recommendations"
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open recommendations" value={num(openItems.length)} compare="awaiting action" icon="Lightbulb" tone="ember" />
        <KpiCard label="Critical + High" value={num(urgent.length)} compare="act on these first" icon="AlertTriangle" tone="clay" />
        <KpiCard label="Saved for later" value={num(savedItems.length)} compare="bookmarked" icon="Bookmark" tone="gold" />
        <KpiCard label="Estimated impact" value={money(openImpact, { compact: true })} compare="open queue" icon="TrendingUp" tone="sage" />
      </div>

      <Card>
        <div className="border-b border-line px-4 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { label: 'All recommendations', value: 'all', count: openItems.length + savedItems.length },
              { label: 'Saved', value: 'saved', count: savedItems.length },
              { label: 'Done', value: 'done', count: doneItems.length },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {data.categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'focus-ring rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors',
                  category === c ? 'border-ember-600 bg-ember-600 text-white' : 'border-line-strong bg-white text-ink-soft hover:border-ink-faint',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="focus-ring ml-auto h-9 rounded-xl border border-line-strong bg-white px-3 text-[12.5px] font-medium"
            aria-label="Priority"
          >
            <option value="all">Any priority</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            variant="generic"
            title={tab === 'saved' ? 'Nothing saved yet' : tab === 'done' ? 'Nothing done yet' : 'No recommendations in this view'}
            message={
              tab === 'saved'
                ? 'Save a recommendation and it will be kept here for your next planning session.'
                : tab === 'done'
                  ? 'Completed actions land here once marked done.'
                  : 'Try a different category or priority filter.'
            }
            action={
              <Button
                size="sm"
                variant="secondary"
                icon="RotateCcw"
                onClick={() => {
                  setCategory('All')
                  setPriority('all')
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => {
              const isSaved = r.state === 'saved'
              const isDone = r.state === 'done'
              return (
                <Card key={r.id} className="flex flex-col overflow-hidden">
                  <div className="h-1 w-full" style={{ background: r.tone }} />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ color: r.tone }}>
                        {r.category}
                      </span>
                      <Badge tone={PRIORITY_TONE[r.priority] ?? 'neutral'}>{r.priority}</Badge>
                    </div>

                    <h3 className="mt-2 font-display text-[15.5px] font-semibold leading-snug text-ink">{r.title}</h3>
                    <ul className="mt-1.5 flex-1 space-y-1">
                      {r.evidence.slice(0, 3).map((e, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug text-ink-muted">
                          <Icon name="Check" size={11} className="mt-0.5 shrink-0 text-sage-600" />
                          {e}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { label: 'Impact', value: money(r.impact, { compact: true }) },
                        { label: 'Entity', value: r.entity },
                        { label: 'Source', value: r.source },
                      ].map((m) => (
                        <div key={m.label} className="rounded-lg bg-canvas px-2 py-1.5">
                          <p className="truncate text-[9.5px] font-bold uppercase tracking-wide text-ink-faint">{m.label}</p>
                          <p className="mt-0.5 truncate font-mono text-[12px] font-semibold text-ink">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-lg border border-dashed border-line-strong px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Suggested action</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{r.action}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                      <span className="font-mono text-[11px] font-semibold text-ink-muted">{r.id}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setState(r, isSaved ? 'new' : 'saved', isSaved ? 'Removed from saved' : 'Saved for later')}
                          aria-label={isSaved ? 'Unsave' : 'Save'}
                          disabled={busy === r.id}
                          className={cn(
                            'focus-ring rounded-lg p-1.5 transition-colors disabled:opacity-50',
                            isSaved ? 'text-gold-600 hover:bg-gold-50' : 'text-ink-faint hover:bg-canvas hover:text-ink',
                          )}
                        >
                          <Icon name="Bookmark" size={15} className={isSaved ? 'fill-gold-500' : ''} />
                        </button>
                        {!isDone && (
                          <button
                            onClick={() => setState(r, 'dismissed', 'Recommendation dismissed')}
                            aria-label="Dismiss"
                            disabled={busy === r.id}
                            className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-clay-50 hover:text-clay-600 disabled:opacity-50"
                          >
                            <Icon name="X" size={15} />
                          </button>
                        )}
                        <Button size="xs" variant="secondary" iconRight="ArrowRight" onClick={() => setActive(r)}>
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-[16px] font-semibold text-ink">How these are produced</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            A rules engine scores every analytics module after each pipeline run and emits actions with evidence. This
            queue draws on {data.sources.length} live sources.
          </p>
          <ul className="mt-3 space-y-2">
            {data.sources.map((s) => (
              <li key={s} className="flex items-center gap-2 font-mono text-[12.5px] text-ink-soft">
                <Icon name="Check" size={13} className="text-sage-600" />
                {s}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Link to="/admin/menu-intelligence">
              <Button size="sm" variant="secondary" iconRight="ArrowRight">
                Menu intelligence
              </Button>
            </Link>
            <Link to="/admin/market-basket">
              <Button size="sm" variant="ghost" iconRight="ArrowRight">
                Market basket
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-[16px] font-semibold text-ink">Dismissing and saving</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Dismissed cards leave the queue, saved cards are kept in the Saved tab and completed work lands in Done.
            All states persist on the server.
          </p>
          <div className="mt-3 space-y-2">
            <MetricRow label="Generated" value={num(items.length)} />
            <MetricRow label="Open" value={num(openItems.length)} />
            <MetricRow label="Saved" value={num(savedItems.length)} />
            <MetricRow label="Done" value={num(doneItems.length)} />
          </div>
          <LiveNote className="mt-3">Impact figures are the engine's estimates from live module output.</LiveNote>
        </Card>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title ?? ''}
        subtitle={active ? `${active.category} · ${active.priority} priority` : ''}
        width="lg"
        badge={active ? <Badge tone={PRIORITY_TONE[active.priority] ?? 'neutral'}>{active.priority}</Badge> : undefined}
        footer={
          active && (
            <>
              <Button
                variant="secondary"
                icon="Bookmark"
                disabled={busy === active.id}
                onClick={() => setState(active, active.state === 'saved' ? 'new' : 'saved', active.state === 'saved' ? 'Removed from saved' : 'Saved for later')}
              >
                {active.state === 'saved' ? 'Unsave' : 'Save'}
              </Button>
              {active.state !== 'done' ? (
                <Button icon="Check" disabled={busy === active.id} onClick={() => setState(active, 'done', 'Marked done')}>
                  Mark done
                </Button>
              ) : (
                <Button variant="secondary" icon="RotateCcw" disabled={busy === active.id} onClick={() => setState(active, 'new', 'Reopened')}>
                  Reopen
                </Button>
              )}
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <Card className="p-4">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ color: active.tone }}>
                {active.category}
              </span>
              <ul className="mt-2 space-y-1.5">
                {active.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
                    <Icon name="Check" size={13} className="mt-0.5 shrink-0 text-sage-600" />
                    {e}
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-xl border border-dashed border-line-strong p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Suggested action</p>
                <p className="mt-1 text-[13px] font-medium text-ink">{active.action}</p>
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Est. impact', value: money(active.impact, { compact: true }) },
                { label: 'Entity', value: active.entity },
                { label: 'Source', value: active.source },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{m.label}</p>
                  <p className="mt-0.5 truncate font-display text-[18px] font-semibold text-ink">{m.value}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Expected outcome</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Estimated impact" value={money(active.impact)} />
                <MetricRow label="Priority" value={active.priority} />
                <MetricRow label="Category" value={active.category} />
                <MetricRow label="State" value={active.state} />
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Related module</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Link to={recTypeMeta(active.type).route}>
                  <Button size="xs" variant="secondary" icon="ArrowRight">
                    {recTypeMeta(active.type).routeLabel}
                  </Button>
                </Link>
              </div>
            </Card>

            <LiveNote>Live engine output — evidence is computed from module data, not written by hand.</LiveNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
