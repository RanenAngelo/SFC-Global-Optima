import React, { useState } from 'react'
import {
  Badge, Button, Card, CardHeader, Checkbox, Field, Icon, Input, Select, Tabs, cn,
} from '../../components/ui/primitives'
import { Modal, useToast } from '../../components/ui/overlay'
import { EmptyState } from '../../components/ui/states'
import { PageHeader } from '../../components/admin/PageHeader'
import { DateRangeSelect, LocationSelect } from '../../components/shared'
import { REPORTS, REPORT_PREVIEW_ROWS } from '../../lib/data/analytics'
import { pkr, num } from '../../lib/utils'

const CATEGORIES = ['All', ...Array.from(new Set(REPORTS.map((r) => r.category)))]

export default function Reports() {
  const { push } = useToast()
  const [tab, setTab] = useState('library')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState(REPORTS[0])
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [range, setRange] = useState('Last 30 days')
  const [savedOnly, setSavedOnly] = useState(false)

  const rows = REPORTS.filter((r) => (category === 'All' || r.category === category) && (!savedOnly || r.schedule))

  const notify = (what: string) => push({ title: `${what} (demo)`, body: 'No file is generated in this prototype', tone: 'info' })

  return (
    <div>
      <PageHeader
        eyebrow="Reporting"
        title="Reports"
        subtitle="Preview, schedule and export demo reports across sales, menu, customers, wastage and forecasting."
        demoNote="Export, print and scheduling controls are visual only — no report file is generated in this prototype."
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: 'Available reports', v: `${REPORTS.length}`, i: 'FileBarChart', t: 'text-ember-600' },
          { l: 'Scheduled', v: `${REPORTS.filter((r) => r.schedule).length}`, i: 'CalendarClock', t: 'text-sky-600' },
          { l: 'Last generated', v: 'Today, 7:05 AM', i: 'Clock', t: 'text-gold-600' },
          { l: 'Default format', v: 'PDF', i: 'FileText', t: 'text-sage-600' },
        ].map((s) => (
          <Card key={s.l} className="flex items-center gap-3.5 p-4">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas-deep', s.t)}>
              <Icon name={s.i} size={18} />
            </span>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">{s.l}</p>
              <p className="font-display text-[18px] font-semibold text-ink">{s.v}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { label: 'Report library', value: 'library' },
          { label: 'Preview', value: 'preview' },
          { label: 'Saved & scheduled', value: 'scheduled' },
        ]}
      />

      {tab === 'library' && (
        <div className="mt-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'focus-ring rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                  category === c ? 'border-ember-600 bg-ember-600 text-white' : 'border-line-strong bg-white text-ink-soft hover:border-ink-faint',
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <Card>
              <EmptyState
                variant="generic"
                title="No reports in this category"
                message="Choose another category to see the available demo reports."
                action={
                  <Button size="sm" variant="secondary" icon="RotateCcw" onClick={() => setCategory('All')}>
                    Show all reports
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => {
                const active = selected.id === r.id
                return (
                  <Card key={r.id} className={cn('flex flex-col p-5 transition-all', active && 'ring-2 ring-ember-200')} hover>
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                          r.tone === 'ember' ? 'bg-ember-50 text-ember-600' : r.tone === 'sky' ? 'bg-sky-50 text-sky-600' : r.tone === 'sage' ? 'bg-sage-50 text-sage-600' : r.tone === 'gold' ? 'bg-gold-50 text-gold-600' : 'bg-clay-50 text-clay-600',
                        )}
                      >
                        <Icon name={r.format === 'XLSX' ? 'Sheet' : 'FileText'} size={20} />
                      </span>
                      <Badge tone="neutral">{r.category}</Badge>
                    </div>

                    <h3 className="mt-3.5 font-display text-[16px] font-semibold leading-snug text-ink">{r.name}</h3>
                    <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-ink-muted">{r.desc}</p>

                    <dl className="mt-3.5 space-y-1.5 text-[12px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-faint">Last run</dt>
                        <dd className="font-semibold text-ink-soft">{r.lastRun}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-faint">Format</dt>
                        <dd className="font-semibold text-ink-soft">{r.format}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-faint">Schedule</dt>
                        <dd className="font-semibold text-ink-soft">{r.schedule}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3.5">
                      <Button
                        size="xs"
                        variant={active ? 'primary' : 'secondary'}
                        icon="Eye"
                        onClick={() => {
                          setSelected(r)
                          setTab('preview')
                        }}
                      >
                        Preview
                      </Button>
                      <Button size="xs" variant="secondary" icon="FileText" onClick={() => notify('PDF export started')}>
                        PDF
                      </Button>
                      <Button size="xs" variant="secondary" icon="Sheet" onClick={() => notify('CSV export started')}>
                        CSV
                      </Button>
                      <Button size="xs" variant="ghost" icon="CalendarClock" onClick={() => setScheduleOpen(true)}>
                        Schedule
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'preview' && (
        <div className="mt-5">
          <Card className="mb-4">
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
              <Select value={selected.id} onChange={(e) => setSelected(REPORTS.find((r) => r.id === e.target.value) ?? REPORTS[0])} options={REPORTS.map((r) => ({ label: r.name, value: r.id }))} className="w-full sm:w-72" />
              <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-auto" options={['Last 7 days', 'Last 30 days', 'Last 90 days', 'Month to date'].map((r) => ({ label: r, value: r }))} />
              <LocationSelect />
              <DateRangeSelect className="hidden md:block" />
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="secondary" icon="Printer" onClick={() => notify('Print dialog opened')}>
                  Print
                </Button>
                <Button size="sm" variant="secondary" icon="Sheet" onClick={() => notify('CSV export started')}>
                  Export CSV
                </Button>
                <Button size="sm" icon="FileText" onClick={() => notify('PDF export started')}>
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Report document preview */}
            <div className="bg-canvas p-4 sm:p-8">
              <div className="mx-auto max-w-[820px] bg-white p-8 shadow-card sm:p-12">
                <div className="flex items-start justify-between gap-6 border-b border-line pb-6">
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ember-600">DineIQ Analytics</p>
                    <h2 className="mt-2 font-display text-[26px] font-semibold text-ink">{selected.name}</h2>
                    <p className="mt-1 text-[13px] text-ink-muted">{selected.desc}</p>
                  </div>
                  <div className="text-right text-[12px] text-ink-muted">
                    <p className="font-semibold text-ink">Maison Ember</p>
                    <p>All locations</p>
                    <p>{range}</p>
                    <p>Generated {selected.lastRun}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { l: 'Revenue', v: pkr(1248500, { compact: true }) },
                    { l: 'Orders', v: '4,286' },
                    { l: 'Avg order', v: pkr(1140) },
                    { l: 'Margin', v: '39.0%' },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl border border-line p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                      <p className="mt-1 font-display text-[18px] font-semibold text-ink">{s.v}</p>
                    </div>
                  ))}
                </div>

                <h3 className="mt-8 font-display text-[16px] font-semibold text-ink">Menu performance summary</h3>
                <table className="mt-3 w-full text-left">
                  <thead>
                    <tr className="border-b border-line">
                      {['Item', 'Units', 'Revenue', 'Cost', 'Contribution', 'Margin'].map((h) => (
                        <th key={h} className="py-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REPORT_PREVIEW_ROWS.map((r) => (
                      <tr key={r.item} className="border-b border-line/60">
                        <td className="py-2 text-[12.5px] font-medium text-ink">{r.item}</td>
                        <td className="py-2 text-[12.5px] tabular-nums text-ink-soft">{num(r.units)}</td>
                        <td className="py-2 text-[12.5px] tabular-nums text-ink-soft">{pkr(r.revenue, { compact: true })}</td>
                        <td className="py-2 text-[12.5px] tabular-nums text-ink-soft">{pkr(r.cost, { compact: true })}</td>
                        <td className="py-2 text-[12.5px] tabular-nums text-ink-soft">{pkr(r.margin, { compact: true })}</td>
                        <td className="py-2 text-[12.5px] font-semibold tabular-nums text-ink">{r.marginPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="mt-6 rounded-lg bg-canvas px-3.5 py-3 text-[11.5px] leading-relaxed text-ink-muted">
                  Demo report preview. Values shown are static placeholders and no report file is generated, downloaded or
                  emailed in this prototype.
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-[11px] text-ink-faint">
                  <span>DineIQ Analytics · MenuMatrix Dining Intelligence</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader
              title="Saved reports"
              subtitle="Reports with a demo delivery schedule"
              className="border-b"
              actions={
                <Checkbox label="Scheduled only" checked={savedOnly} onChange={() => setSavedOnly((v) => !v)} className="!py-0" />
              }
            />
            <div className="divide-y divide-line">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{r.name}</p>
                    <p className="truncate text-[11.5px] text-ink-muted">
                      {r.schedule} · {r.format} · last run {r.lastRun}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="sage" dot>
                      Scheduled
                    </Badge>
                    <Button size="xs" variant="secondary" icon="Pencil" onClick={() => setScheduleOpen(true)}>
                      Edit
                    </Button>
                    <Button size="xs" variant="ghost" icon="Send" onClick={() => notify('Report delivery triggered')}>
                      Send now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display text-[16px] font-semibold text-ink">Schedule a report</h3>
            <p className="mt-1 text-[12.5px] text-ink-muted">Demo scheduling form — no schedule is created.</p>
            <div className="mt-4 space-y-4">
              <Field label="Report">
                <Select options={REPORTS.map((r) => ({ label: r.name, value: r.id }))} />
              </Field>
              <Field label="Frequency">
                <Select
                  options={[
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly — Monday', value: 'weekly' },
                    { label: 'Monthly — 1st', value: 'monthly' },
                    { label: 'Quarterly', value: 'quarterly' },
                  ]}
                />
              </Field>
              <Field label="Format">
                <Select
                  options={[
                    { label: 'PDF', value: 'pdf' },
                    { label: 'CSV', value: 'csv' },
                    { label: 'Excel (XLSX)', value: 'xlsx' },
                  ]}
                />
              </Field>
              <Field label="Recipients" hint="Comma separated email addresses">
                <Input placeholder="owner@maisonember.pk, ops@maisonember.pk" />
              </Field>
              <div className="space-y-2">
                <Checkbox label="Include executive summary" defaultChecked />
                <Checkbox label="Include item-level detail" defaultChecked />
                <Checkbox label="Include charts" defaultChecked />
              </div>
              <Button block icon="CalendarClock" onClick={() => notify('Schedule saved')}>
                Save schedule
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule report"
        subtitle="Demo dialog — nothing is scheduled or emailed."
        icon="CalendarClock"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              icon="Check"
              onClick={() => {
                setScheduleOpen(false)
                notify('Schedule saved')
              }}
            >
              Save schedule
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Report" className="sm:col-span-2">
            <Select options={REPORTS.map((r) => ({ label: r.name, value: r.id }))} />
          </Field>
          <Field label="Frequency">
            <Select
              options={[
                { label: 'Daily', value: 'daily' },
                { label: 'Weekly — Monday', value: 'weekly' },
                { label: 'Monthly — 1st', value: 'monthly' },
              ]}
            />
          </Field>
          <Field label="Time">
            <Input type="time" defaultValue="07:00" />
          </Field>
          <Field label="Format">
            <Select options={[{ label: 'PDF', value: 'pdf' }, { label: 'CSV', value: 'csv' }, { label: 'Excel (XLSX)', value: 'xlsx' }]} />
          </Field>
          <Field label="Locations">
            <Select options={[{ label: 'All locations', value: 'all' }, { label: 'Clifton Branch', value: 'clifton' }, { label: 'Downtown Branch', value: 'downtown' }, { label: 'Gulshan Branch', value: 'gulshan' }]} />
          </Field>
          <Field label="Recipients" className="sm:col-span-2">
            <Input placeholder="owner@maisonember.pk, ops@maisonember.pk" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
