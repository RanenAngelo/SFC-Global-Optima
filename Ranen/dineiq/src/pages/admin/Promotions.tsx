import React, { useMemo, useState } from 'react'
import {
  Badge, Button, Card, CardHeader, Checkbox, Field, Icon, Input, Select, Switch, Tabs, Textarea, cn,
} from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { Drawer, Modal, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { BarSeries, ChartCard, TrendChart } from '../../components/charts'
import { DemoNote, KpiCard, MetricRow, Progress } from '../../components/shared'
import { PROMOTION_COMPARISON, PROMOTIONS, PROMOTION_TRAPS, type Promotion } from '../../lib/data/analytics'
import { MENU } from '../../lib/data/menu'
import { money, num } from '../../lib/utils'

const STATUS_TONE: Record<string, 'sage' | 'sky' | 'neutral'> = { Active: 'sage', Scheduled: 'sky', Expired: 'neutral' }

export default function Promotions() {
  const { push } = useToast()
  const [tab, setTab] = useState('Active')
  const [active, setActive] = useState<Promotion | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', type: 'Percentage', value: '10', start: '', end: '', channel: 'All channels' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const rows = useMemo(() => PROMOTIONS.filter((p) => p.status === tab), [tab])
  const counts = {
    Active: PROMOTIONS.filter((p) => p.status === 'Active').length,
    Scheduled: PROMOTIONS.filter((p) => p.status === 'Scheduled').length,
    Expired: PROMOTIONS.filter((p) => p.status === 'Expired').length,
  }

  const columns: Column<Promotion>[] = [
    {
      key: 'name',
      header: 'Promotion',
      sort: (a, b) => a.name.localeCompare(b.name),
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
          <p className="truncate font-mono text-[11.5px] text-ink-muted">{p.code}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'lg',
      render: (p) => (
        <div>
          <p className="text-[12.5px] text-ink-soft">{p.type}</p>
          <p className="text-[11.5px] font-semibold text-ink-muted">{p.value}</p>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      hideBelow: 'xl',
      render: (p) => (
        <span className="text-[12.5px] text-ink-muted">
          {p.start} – {p.end}
        </span>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      hideBelow: 'lg',
      render: (p) => <span className="text-[12.5px] text-ink-muted">{p.channel}</span>,
    },
    {
      key: 'redemptions',
      header: 'Redemptions',
      align: 'right',
      sort: (a, b) => a.redemptions - b.redemptions,
      render: (p) => <span className="tabular-nums text-ink-soft">{num(p.redemptions)}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      sort: (a, b) => a.revenue - b.revenue,
      render: (p) => <span className="font-semibold tabular-nums text-ink">{p.revenue ? money(p.revenue, { compact: true }) : '—'}</span>,
    },
    {
      key: 'aov',
      header: 'AOV',
      align: 'right',
      hideBelow: 'md',
      sort: (a, b) => a.aov - b.aov,
      render: (p) => <span className="tabular-nums text-ink-soft">{p.aov ? money(p.aov) : '—'}</span>,
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      sort: (a, b) => a.margin - b.margin,
      render: (p) =>
        p.margin ? (
          <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-bold', p.margin >= 40 ? 'bg-sage-50 text-sage-700' : p.margin >= 25 ? 'bg-gold-50 text-gold-600' : 'bg-clay-50 text-clay-600')}>
            {p.margin}%
          </span>
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <Badge tone={STATUS_TONE[p.status] ?? 'neutral'} dot>{p.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '110px',
      render: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="secondary" icon="ChartColumn" onClick={() => setActive(p)}>
            Detail
          </Button>
        </div>
      ),
    },
  ]

  const create = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Promotion name is required.'
    if (!form.code.trim()) e.code = 'A promo code is required.'
    if (!form.start) e.start = 'Start date is required.'
    if (!form.end) e.end = 'End date is required.'
    if (form.start && form.end && form.start > form.end) e.end = 'End date must be after the start date.'
    setErrors(e)
    if (Object.keys(e).length) {
      push({ title: 'Please fix the highlighted fields', tone: 'error' })
      return
    }
    setCreateOpen(false)
    setForm({ name: '', code: '', type: 'Percentage', value: '10', start: '', end: '', channel: 'All channels' })
    push({ title: 'Promotion created (demo)', body: 'Nothing was scheduled — prototype only', tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        eyebrow="MenuMatrix Dining Intelligence"
        title="Promotion Analytics"
        subtitle="See how offers move revenue, order volume and margin — and where a promotion may be costing more than it earns."
        demoNote="All promotion performance figures are static demonstration values. No analytics are computed here."
        actions={
          <Button icon="Plus" onClick={() => { setCreateOpen(true); setErrors({}) }}>
            Create promotion
          </Button>
        }
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active promotions" value={`${counts.Active}`} compare="running now" icon="BadgePercent" tone="sage" />
        <KpiCard label="Scheduled" value={`${counts.Scheduled}`} compare="upcoming" icon="CalendarClock" tone="sky" />
        <KpiCard label="Total redemptions" value="2,090" compare="demo period" icon="Ticket" tone="ember" />
        <KpiCard label="Promotion traps detected" value={`${PROMOTION_TRAPS.length}`} compare="illustrative examples" icon="AlertTriangle" tone="clay" />
      </div>

      <Card className="mb-5">
        <div className="border-b border-line px-4 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { label: 'Active', value: 'Active', count: counts.Active },
              { label: 'Scheduled', value: 'Scheduled', count: counts.Scheduled },
              { label: 'Expired', value: 'Expired', count: counts.Expired },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          pageSize={8}
          onRowClick={(p) => setActive(p)}
          initialSort={{ key: 'revenue', dir: 'desc' }}
          emptyTitle={`No ${tab.toLowerCase()} promotions`}
          emptyMessage="Promotions you create will appear here in this demo workspace."
          emptyAction={
            <Button size="sm" icon="Plus" onClick={() => { setCreateOpen(true); setErrors({}) }}>
              Create promotion
            </Button>
          }
        />
      </Card>

      {/* Promotion trap detection */}
      <Card className="mb-5 overflow-hidden">
        <CardHeader
          title="Promotion Trap Detection"
          subtitle="Illustrative scenarios where an offer grew activity but weakened the result"
          icon="AlertTriangle"
          className="border-b"
          actions={<Badge tone="clay">5 examples</Badge>}
        />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {PROMOTION_TRAPS.map((t) => (
            <div
              key={t.id}
              className={cn(
                'rounded-2xl border p-4',
                t.severity === 'High' ? 'border-clay-200 bg-clay-50/50' : t.severity === 'Medium' ? 'border-gold-200 bg-gold-50/40' : 'border-sky-100 bg-sky-50/40',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <Badge tone={t.severity === 'High' ? 'clay' : t.severity === 'Medium' ? 'gold' : 'sky'}>{t.severity}</Badge>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold tabular-nums text-ink-soft">{t.metric}</span>
              </div>
              <h4 className="mt-2.5 text-[13.5px] font-semibold leading-snug text-ink">{t.title}</h4>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{t.body}</p>
              <div className="mt-3 flex gap-2">
                <Button size="xs" variant="secondary" onClick={() => push({ title: 'Review task created (demo)', tone: 'success' })}>
                  Review
                </Button>
                <Button size="xs" variant="ghost" onClick={() => push({ title: 'Scenario dismissed', tone: 'info' })}>
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line p-4">
          <DemoNote>
            These trap scenarios are hand-written examples for interface demonstration. No detection logic is executed in
            this prototype.
          </DemoNote>
        </div>
      </Card>

      {/* Comparison */}
      <div className="mb-5 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <ChartCard title="Promotion performance comparison" subtitle="Revenue and orders per demo promotion" height={300}>
          <TrendChart
            data={PROMOTION_COMPARISON}
            xKey="name"
            series={[
              { key: 'revenue', label: 'Revenue', color: '#B54E17', type: 'bar' },
              { key: 'orders', label: 'Orders', color: '#2F6FA8', type: 'line' },
            ]}
            valueFormat={(v, n) => (n === 'Revenue' ? money(v, { compact: true }) : `${num(v)} orders`)}
          />
        </ChartCard>

        <ChartCard title="Contribution margin by promotion" subtitle="Margin retained during each demo offer" height={300}>
          <BarSeries
            data={PROMOTION_COMPARISON}
            xKey="name"
            layout="vertical"
            bars={[{ key: 'margin', label: 'Margin %', color: '#5E8C4A' }]}
            valueFormat={(v) => `${v}%`}
            showLegend={false}
          />
        </ChartCard>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create promotion"
        subtitle="Demo form — nothing is scheduled or published."
        icon="BadgePercent"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button icon="Save" onClick={create}>
              Create promotion
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Promotion name" required error={errors.name} className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} placeholder="e.g. Weekend Pizza Night" />
          </Field>
          <Field label="Promo code" required error={errors.code}>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} invalid={!!errors.code} placeholder="PIZZA20" className="font-mono uppercase" />
          </Field>
          <Field label="Discount type" required>
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={[
                { label: 'Percentage', value: 'Percentage' },
                { label: 'Fixed amount', value: 'Fixed amount' },
                { label: 'Buy one get one', value: 'Buy one get one' },
                { label: 'Bundle', value: 'Bundle' },
              ]}
            />
          </Field>
          <Field label="Discount value" required>
            <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="20" />
          </Field>
          <Field label="Channel">
            <Select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              options={[
                { label: 'All channels', value: 'All channels' },
                { label: 'Dine-in', value: 'Dine-in' },
                { label: 'Website', value: 'Website' },
                { label: 'Delivery platform', value: 'Delivery platform' },
              ]}
            />
          </Field>
          <Field label="Start date" required error={errors.start}>
            <Input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} invalid={!!errors.start} />
          </Field>
          <Field label="End date" required error={errors.end}>
            <Input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} invalid={!!errors.end} />
          </Field>
          <Field label="Eligible menu items" className="sm:col-span-2">
            <Select options={[{ label: 'All menu items', value: 'all' }, ...MENU.slice(0, 10).map((m) => ({ label: m.name, value: m.id }))]} />
          </Field>
          <Field label="Eligible locations" className="sm:col-span-2">
            <div className="grid gap-2 sm:grid-cols-3">
              {['Clifton Branch', 'Downtown Branch', 'Gulshan Branch'].map((l) => (
                <Checkbox key={l} label={l} defaultChecked />
              ))}
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Switch label="Notify the branch teams when this promotion goes live" defaultChecked desc="Demo preference — no notification is sent." />
          </div>
        </div>
      </Modal>

      {/* Drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.name ?? ''}
        subtitle={active ? `${active.type} · ${active.value} · ${active.code}` : ''}
        width="lg"
        badge={active ? <Badge tone={STATUS_TONE[active.status] ?? 'neutral'} dot>{active.status}</Badge> : undefined}
        footer={
          active && (
            <>
              <Button variant="secondary" icon="PauseCircle" onClick={() => push({ title: 'Promotion paused (demo)', tone: 'info' })}>
                Pause
              </Button>
              <Button icon="Pencil" onClick={() => push({ title: 'Promotion updated (demo)', tone: 'success' })}>
                Edit promotion
              </Button>
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { l: 'Redemptions', v: num(active.redemptions) },
                { l: 'Revenue', v: active.revenue ? money(active.revenue, { compact: true }) : '—' },
                { l: 'Orders', v: num(active.orders) },
                { l: 'Avg order value', v: active.aov ? money(active.aov) : '—' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 font-display text-[18px] font-semibold text-ink">{s.v}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Performance detail</p>
              <div className="mt-1 divide-y divide-line">
                <MetricRow label="Duration" value={`${active.start} – ${active.end}`} />
                <MetricRow label="Channel" value={active.channel} />
                <MetricRow label="Contribution margin" value={active.margin ? `${active.margin}%` : '—'} />
                <MetricRow label="New customers acquired" value={active.newCustomers ? num(active.newCustomers) : '—'} />
                <MetricRow label="Repeat purchase rate" value={active.repeatRate ? `${active.repeatRate}%` : '—'} />
                <MetricRow label="Wastage during promotion" value={active.wastage ? `${active.wastage}%` : '—'} tone={active.wastage > 8 ? 'text-clay-600' : undefined} />
              </div>
            </Card>

            {active.revenue > 0 && (
              <Card className="p-4">
                <p className="text-[13px] font-semibold text-ink">Versus baseline — demo comparison</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex justify-between text-[12px] text-ink-muted">
                      <span>Baseline revenue {money(active.baselineRevenue, { compact: true })}</span>
                      <span>Promotion revenue {money(active.revenue, { compact: true })}</span>
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-ink-faint" style={{ width: `${(active.baselineRevenue / 500000) * 100}%` }} />
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-ember-500" style={{ width: `${(active.revenue / 500000) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[12px] text-ink-muted">
                      <span>Baseline margin {active.baselineMargin}%</span>
                      <span>Promotion margin {active.margin}%</span>
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-ink-faint" style={{ width: `${active.baselineMargin}%` }} />
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                        <div className={cn('h-full rounded-full', active.margin < active.baselineMargin ? 'bg-clay-500' : 'bg-sage-500')} style={{ width: `${active.margin}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                {active.margin < active.baselineMargin && (
                  <p className="mt-3 rounded-xl border border-clay-100 bg-clay-50 px-3 py-2.5 text-[12px] leading-relaxed text-clay-600">
                    Illustrative trap: revenue grew while contribution margin declined versus the demo baseline.
                  </p>
                )}
              </Card>
            )}

            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">Eligibility</p>
              <div className="mt-2.5 space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Menu items</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {active.items.map((i) => (
                      <Badge key={i} tone="neutral">
                        {i}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Locations</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {active.locations.map((l) => (
                      <Badge key={l} tone="ember">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <DemoNote>Demo promotion record. No promotion is published or scheduled by this prototype.</DemoNote>
          </div>
        )}
      </Drawer>
    </div>
  )
}
