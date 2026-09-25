import React, { useState } from 'react'
import { Badge, Button, Card, CardHeader, Icon, Select, Tabs, cn } from '../../components/ui/primitives'
import { useToast } from '../../components/ui/overlay'
import { EmptyState } from '../../components/ui/states'
import { PageHeader } from '../../components/admin/PageHeader'
import { LiveNote } from '../../components/shared'
import { PageError, PageLoader, downloadExport, useAuth } from '../../lib/api'
import { REPORT_DEFS, useReportPreview, useReportsData, type ReportDef } from '../../lib/live'
import { num } from '../../lib/utils'

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return Number.isInteger(v) ? num(v) : v.toFixed(2)
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60)
  return String(v).slice(0, 60)
}

export default function Reports() {
  const { push } = useToast()
  const { can } = useAuth()
  const [tab, setTab] = useState('library')
  const [category, setCategory] = useState('All')
  const [selectedId, setSelectedId] = useState('menu_performance')
  const { data, loading, error, refetch } = useReportsData()
  const { data: preview, loading: previewLoading } = useReportPreview(tab === 'preview' ? selectedId : null)

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No reports.'} onRetry={refetch} />

  const defs = data.defs.length ? data.defs : REPORT_DEFS
  const categories = ['All', ...Array.from(new Set(defs.map((r) => r.category)))]
  const rows = defs.filter((r) => category === 'All' || r.category === category)
  const selected: ReportDef = defs.find((r) => r.id === selectedId) ?? defs[0]

  const download = async (name: string, format: 'csv' | 'xlsx') => {
    try {
      await downloadExport(name, format)
      push({ title: 'Export ready', body: `${name}.${format} downloaded from the live API.`, tone: 'success' })
    } catch (e) {
      push({ title: 'Export failed', body: e instanceof Error ? e.message : 'Unknown error', tone: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Reporting"
        title="Reports"
        subtitle="Preview and export live datasets across sales, menu, customers, wastage and forecasting."
        demoNote="Live dataset exports in CSV and XLSX. Scheduling and PDF are not available in this build."
        onRefresh={refetch}
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: 'Available reports', v: num(defs.length), i: 'FileBarChart', t: 'text-ember-600' },
          { l: 'Export formats', v: 'CSV · XLSX', i: 'Sheet', t: 'text-sky-600' },
          { l: 'Preview rows', v: '50', i: 'Eye', t: 'text-gold-600' },
          { l: 'Export access', v: can('manager') ? 'Manager ✓' : 'Manager only', i: 'Lock', t: 'text-sage-600' },
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
          { label: 'Downloads', value: 'downloads' },
        ]}
      />

      {tab === 'library' && (
        <div className="mt-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {categories.map((c) => (
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
                message="Choose another category to see the available reports."
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
                        <Icon name={r.icon} size={20} />
                      </span>
                      <Badge tone="neutral">{r.category}</Badge>
                    </div>

                    <h3 className="mt-3.5 font-display text-[16px] font-semibold leading-snug text-ink">{r.name}</h3>
                    <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-ink-muted">{r.desc}</p>

                    <dl className="mt-3.5 space-y-1.5 text-[12px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-faint">Dataset</dt>
                        <dd className="font-mono font-semibold text-ink-soft">{r.id}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-faint">Format</dt>
                        <dd className="font-semibold text-ink-soft">CSV · XLSX</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-faint">Refresh</dt>
                        <dd className="font-semibold text-ink-soft">Live query</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3.5">
                      <Button
                        size="xs"
                        variant={active ? 'primary' : 'secondary'}
                        icon="Eye"
                        onClick={() => {
                          setSelectedId(r.id)
                          setTab('preview')
                        }}
                      >
                        Preview
                      </Button>
                      <Button size="xs" variant="secondary" icon="Sheet" onClick={() => void download(r.id, 'csv')}>
                        CSV
                      </Button>
                      <Button size="xs" variant="secondary" icon="Sheet" onClick={() => void download(r.id, 'xlsx')}>
                        XLSX
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
              <Select value={selected.id} onChange={(e) => setSelectedId(e.target.value)} options={defs.map((r) => ({ label: r.name, value: r.id }))} className="w-full sm:w-72" />
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="secondary" icon="Printer" onClick={() => window.print()}>
                  Print
                </Button>
                <Button size="sm" variant="secondary" icon="Sheet" onClick={() => void download(selected.id, 'csv')}>
                  Export CSV
                </Button>
                <Button size="sm" icon="Sheet" onClick={() => void download(selected.id, 'xlsx')}>
                  Export XLSX
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
                    <p className="font-semibold text-ink">DineIQ Network</p>
                    <p>All locations</p>
                    <p className="font-mono">{selected.id}</p>
                    <p>Live preview · 50 rows</p>
                  </div>
                </div>

                {previewLoading && <p className="mt-6 text-[13px] text-ink-muted">Loading preview…</p>}
                {!previewLoading && preview && (
                  <>
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        { l: 'Rows shown', v: num(preview.rows.length) },
                        { l: 'Columns', v: num(preview.totalCols) },
                        { l: 'Category', v: selected.category },
                        { l: 'Source', v: 'Live API' },
                      ].map((s) => (
                        <div key={s.l} className="rounded-xl border border-line p-3.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                          <p className="mt-1 font-display text-[18px] font-semibold text-ink">{s.v}</p>
                        </div>
                      ))}
                    </div>

                    <h3 className="mt-8 font-display text-[16px] font-semibold text-ink">Data preview</h3>
                    <div className="overflow-x-auto">
                      <table className="mt-3 w-full text-left">
                        <thead>
                          <tr className="border-b border-line">
                            {preview.cols.map((h) => (
                              <th key={h} className="py-2 pr-3 font-mono text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.slice(0, 12).map((r, i) => (
                            <tr key={i} className="border-b border-line/60">
                              {preview.cols.map((c) => (
                                <td key={c} className="py-2 pr-3 text-[12px] tabular-nums text-ink-soft">
                                  {cell(r[c])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <p className="mt-6 rounded-lg bg-canvas px-3.5 py-3 text-[11.5px] leading-relaxed text-ink-muted">
                  Live preview of the first rows. Full datasets download via CSV or XLSX export above.
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

      {tab === 'downloads' && (
        <div className="mt-5">
          <Card>
            <CardHeader title="All datasets" subtitle="One-click live exports — CSV or XLSX" className="border-b" />
            <div className="divide-y divide-line">
              {defs.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{r.name}</p>
                    <p className="truncate font-mono text-[11.5px] text-ink-muted">
                      {r.id} · {r.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="xs" variant="secondary" icon="Sheet" onClick={() => void download(r.id, 'csv')}>
                      CSV
                    </Button>
                    <Button size="xs" variant="secondary" icon="Sheet" onClick={() => void download(r.id, 'xlsx')}>
                      XLSX
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="mt-4">
            <LiveNote>Exports query the live serving database. XLSX and CSV downloads require the manager role.</LiveNote>
          </div>
        </div>
      )}
    </div>
  )
}
