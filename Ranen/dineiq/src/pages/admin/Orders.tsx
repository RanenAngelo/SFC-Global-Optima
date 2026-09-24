import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Icon, SearchInput, Select, Tabs, cn } from '../../components/ui/primitives'
import { DataTable, Column } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { DateRangeSelect, LiveNote, StatusDot } from '../../components/shared'
import { PageError, PageLoader, apiFetch, useAuth, useMeta } from '../../lib/api'
import { useOrderDetail, useOrdersData, type LiveOrder, type OrderDetail } from '../../lib/live'
import { num, money } from '../../lib/utils'

const STATUS_TONE: Record<string, 'ember' | 'sage' | 'clay' | 'sky' | 'neutral' | 'gold'> = {
  Completed: 'sage',
  Cancelled: 'clay',
}

function printReceipts(groups: { order: OrderDetail['order']; lines: OrderDetail['lines'] }[]) {
  const w = window.open('', '_blank', 'width=420,height=640')
  if (!w) return false
  const body = groups
    .map(
      ({ order, lines }) => `
      <div class="receipt">
        <h2>DineIQ Analytics</h2>
        <p>${order.restaurant_name}</p>
        <p>${order.order_id} · ${order.order_datetime.slice(0, 16)} · ${order.channel}</p>
        <hr/>
        ${lines.map((l) => `<p>${l.quantity} × ${l.item_name}<span>$${l.line_total.toFixed(2)}</span></p>`).join('')}
        <hr/>
        <p class="total">Total<span>$${order.total_amount.toFixed(2)}</span></p>
        <p>${order.promotion_id ? 'Promo ' + order.promotion_id : 'No promo'} · ${order.status}</p>
      </div>`,
    )
    .join('')
  w.document.write(`<html><head><title>Receipts</title><style>
    body{font-family:monospace;padding:16px;color:#111}.receipt{margin-bottom:32px;page-break-inside:avoid}
    h2{margin:0 0 4px;font-size:18px}p{margin:2px 0;font-size:13px;display:flex;justify-content:space-between;gap:12px}
    hr{border:none;border-top:1px dashed #999;margin:8px 0}.total{font-weight:bold;font-size:15px}
  </style></head><body>${body}<script>window.onload=()=>window.print()<\/script></body></html>`)
  w.document.close()
  return true
}

export default function Orders() {
  const { push } = useToast()
  const { can } = useAuth()
  const { options: meta } = useMeta()
  const { data, loading, error, refetch } = useOrdersData()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState('all')
  const [active, setActive] = useState<LiveOrder | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [mutating, setMutating] = useState(false)

  const { detail, loading: detailLoading, customer } = useOrderDetail(active?.id ?? null)

  const rows = useMemo(() => {
    let r = data?.rows ?? []
    if (tab !== 'all') r = r.filter((o) => o.status === tab)
    if (channel !== 'all') r = r.filter((o) => o.channel === channel)
    const q = query.trim().toLowerCase()
    if (q) r = r.filter((o) => o.number.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q))
    return r
  }, [data, tab, channel, query])

  const hasFilters = channel !== 'all' || !!query || tab !== 'all'

  async function setStatus(orderId: string, status: 'Completed' | 'Cancelled') {
    setMutating(true)
    try {
      await apiFetch(`/orders/${orderId}`, { method: 'PATCH', body: { status } })
      push({ title: `Order ${status.toLowerCase()}`, body: `${orderId} → ${status}.`, tone: 'success' })
      refetch()
      if (active?.id === orderId) setActive((a) => (a ? { ...a, status } : a))
    } catch (e) {
      push({ title: 'Update failed', body: e instanceof Error ? e.message : 'Unknown error', tone: 'error' })
    } finally {
      setMutating(false)
    }
  }

  async function bulkComplete() {
    const targets = selected.filter((id) => data?.rows.find((r) => r.id === id)?.status !== 'Completed')
    if (targets.length === 0) return
    setMutating(true)
    let ok = 0
    for (const id of targets) {
      try {
        await apiFetch(`/orders/${id}`, { method: 'PATCH', body: { status: 'Completed' } })
        ok += 1
      } catch {
        /* surfaced below */
      }
    }
    setMutating(false)
    setSelected([])
    refetch()
    push({
      title: ok === targets.length ? 'Orders completed' : 'Partially completed',
      body: `${ok} of ${targets.length} selected order(s) marked completed.`,
      tone: ok === targets.length ? 'success' : 'error',
    })
  }

  async function bulkPrint() {
    const groups: { order: OrderDetail['order']; lines: OrderDetail['lines'] }[] = []
    for (const id of selected) {
      try {
        const d = await apiFetch<OrderDetail>(`/orders/${id}`)
        groups.push({ order: d.order, lines: d.lines })
      } catch {
        /* skip */
      }
    }
    if (groups.length === 0 || !printReceipts(groups)) {
      push({ title: 'Print blocked', body: 'Allow popups to print receipts.', tone: 'error' })
    }
  }

  const columns: Column<LiveOrder>[] = [
    {
      key: 'number',
      header: 'Order',
      width: '150px',
      sort: (a, b) => a.number.localeCompare(b.number),
      render: (o) => (
        <div>
          <p className="font-mono text-[12.5px] font-bold text-ink">{o.number}</p>
          <p className="text-[11.5px] text-ink-faint">
            {o.time} · {o.channel}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sort: (a, b) => a.customer.localeCompare(b.customer),
      render: (o) => (
        <div>
          <p className="font-mono text-[12.5px] font-semibold text-ink">{o.customer}</p>
          <p className="text-[11.5px] text-ink-faint">{o.promo ? `Promo ${o.promo}` : 'No promo'}</p>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      hideBelow: 'lg',
      render: (o) => <Badge tone="neutral">{o.channel}</Badge>,
    },
    {
      key: 'location',
      header: 'Location',
      hideBelow: 'xl',
      render: (o) => <span className="text-[13px] text-ink-muted">{o.location}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      align: 'center',
      hideBelow: 'md',
      sort: (a, b) => a.itemsQty - b.itemsQty,
      render: (o) => <span className="text-[13px] font-semibold text-ink-soft">{o.itemsQty}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
          <StatusDot status={o.status} />
          {o.status}
        </span>
      ),
    },
    {
      key: 'promo',
      header: 'Promotion',
      hideBelow: 'lg',
      render: (o) =>
        o.promo ? (
          <Badge tone="gold">{o.promo}</Badge>
        ) : (
          <span className="text-[12px] text-ink-faint">—</span>
        ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sort: (a, b) => a.total - b.total,
      render: (o) => <span className="text-[13.5px] font-semibold tabular-nums text-ink">{money(o.total)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '60px',
      render: (o) => (
        <Button size="xs" variant="secondary" icon="Eye" onClick={() => setActive(o)}>
          View
        </Button>
      ),
    },
  ]

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No orders.'} onRetry={refetch} />

  const counts = data.counts

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Order Management"
        subtitle="Every order across dine-in, takeaway, website and delivery platforms — live from the DineIQ API."
        onRefresh={refetch}
      />
      {data.truncated && (
        <LiveNote className="mb-5">
          Showing the most recent {num(data.rows.length)} of {num(data.total)} orders in range — narrow the date or
          location filters for complete results.
        </LiveNote>
      )}

      {/* Summary strip */}
      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: 'Orders in range', v: num(counts.all), d: 'Across all channels', i: 'ReceiptText', t: 'text-sky-600' },
          { l: 'Completed', v: num(counts.Completed), d: 'Fulfilled orders', i: 'CheckCircle2', t: 'text-sage-600' },
          { l: 'Average order value', v: money(data.aov), d: 'Across all channels', i: 'TrendingUp', t: 'text-sage-600' },
          { l: 'Cancelled', v: num(counts.Cancelled), d: 'Voided orders', i: 'XCircle', t: 'text-clay-600' },
        ].map((s) => (
          <Card key={s.l} className="flex items-center gap-3.5 p-4">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas-deep', s.t)}>
              <Icon name={s.i} size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">{s.l}</p>
              <p className="font-display text-[19px] font-semibold text-ink">{s.v}</p>
              <p className="text-[11.5px] text-ink-muted">{s.d}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-line px-4 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { label: 'All orders', value: 'all', count: counts.all },
              { label: 'Completed', value: 'Completed', count: counts.Completed },
              { label: 'Cancelled', value: 'Cancelled', count: counts.Cancelled },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search order or customer…" className="w-full sm:w-64" />
          <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-auto" aria-label="Channel">
            <option value="all">All channels</option>
            {(meta?.channels ?? []).map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <DateRangeSelect className="ml-auto hidden sm:block" />
          {hasFilters && (
            <Button
              size="xs"
              variant="ghost"
              icon="RotateCcw"
              onClick={() => {
                setQuery('')
                setChannel('all')
                setTab('all')
              }}
            >
              Reset
            </Button>
          )}
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ember-200 bg-ember-50 px-4 py-2.5">
            <p className="text-[13px] font-semibold text-ember-800">{selected.length} order(s) selected</p>
            <div className="flex gap-2">
              <Button size="xs" variant="secondary" icon="Printer" onClick={() => void bulkPrint()}>
                Print receipts
              </Button>
              <Button
                size="xs"
                variant="secondary"
                icon="Check"
                disabled={mutating || !can('manager')}
                title={can('manager') ? 'Mark selected completed' : 'Requires manager role'}
                onClick={() => void bulkComplete()}
              >
                Mark completed
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          loading={loading}
          onRowClick={(o) => setActive(o)}
          selectable
          selected={selected}
          onSelectionChange={setSelected}
          pageSize={8}
          initialSort={{ key: 'number', dir: 'desc' }}
          emptyTitle="No orders match these filters"
          emptyMessage="Try a different channel or widen the date range."
          emptyAction={
            hasFilters ? (
              <Button
                size="sm"
                variant="secondary"
                icon="RotateCcw"
                onClick={() => {
                  setQuery('')
                  setChannel('all')
                  setTab('all')
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      </Card>

      {/* Order drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `Order ${active.number}` : ''}
        subtitle={active ? `${active.channel} · ${active.location} · ${active.time}` : ''}
        badge={active ? <Badge tone={STATUS_TONE[active.status] ?? 'neutral'} dot>{active.status}</Badge> : undefined}
        width="lg"
        footer={
          active && (
            <>
              <Button
                variant="secondary"
                icon="Printer"
                disabled={!detail}
                onClick={() => {
                  if (detail && !printReceipts([{ order: detail.order, lines: detail.lines }])) {
                    push({ title: 'Print blocked', body: 'Allow popups to print receipts.', tone: 'error' })
                  }
                }}
              >
                Print receipt
              </Button>
              {active.status !== 'Completed' && (
                <Button
                  icon="Check"
                  disabled={mutating || !can('manager')}
                  title={can('manager') ? 'Mark completed' : 'Requires manager role'}
                  onClick={() => void setStatus(active.id, 'Completed')}
                >
                  Mark as completed
                </Button>
              )}
              {active.status !== 'Cancelled' && (
                <Button
                  variant="secondary"
                  icon="XCircle"
                  disabled={mutating || !can('manager')}
                  title={can('manager') ? 'Cancel order' : 'Requires manager role'}
                  onClick={() => void setStatus(active.id, 'Cancelled')}
                >
                  Cancel order
                </Button>
              )}
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            {detailLoading && !detail && <PageLoader label="Loading order lines…" />}
            {detail && (
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="flex items-start justify-between gap-4 border-b border-dashed border-line pb-4">
                  <div>
                    <p className="font-display text-[16px] font-semibold text-ink">DineIQ Analytics</p>
                    <p className="text-[12px] text-ink-muted">{detail.order.restaurant_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[13px] font-bold text-ink">{detail.order.order_id}</p>
                    <p className="text-[12px] text-ink-muted">
                      {detail.order.order_datetime.slice(0, 16)} · {detail.order.channel}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {detail.lines.map((l) => (
                    <div key={l.item_id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink">
                          {l.quantity} × {l.item_name}
                        </p>
                        {l.discount_pct > 0 && (
                          <p className="text-[12px] italic text-ink-muted">
                            {Math.round(l.discount_pct * 100)}% promo discount
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{money(l.line_total)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-1.5 border-t border-dashed border-line pt-3">
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[14px] font-semibold text-ink">Total</span>
                    <span className="font-display text-[20px] font-semibold text-ink">{money(detail.order.total_amount)}</span>
                  </div>
                  <p className="pt-1 text-[12px] text-ink-muted">
                    {detail.order.promotion_id ? `Promo ${detail.order.promotion_id}` : 'No promo'} · {detail.order.status}
                  </p>
                </div>
              </div>
            )}

            {/* Customer */}
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Customer</p>
              <p className="mt-1.5 font-mono text-[14px] font-semibold text-ink">{active.customer}</p>
              {customer ? (
                <div className="mt-2 grid grid-cols-2 gap-2 text-[12.5px]">
                  <div className="rounded-lg bg-canvas px-2.5 py-2">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Segment</p>
                    <p className="font-semibold text-ink">{customer.profile.segment}</p>
                  </div>
                  <div className="rounded-lg bg-canvas px-2.5 py-2">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">RFM</p>
                    <p className="font-semibold text-ink">
                      {customer.profile.RFM} · {customer.profile.frequency} orders
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-[13px] text-ink-muted">Guest or unprofiled customer.</p>
              )}
              <div className="mt-3">
                <Link to="/admin/customers">
                  <Button size="xs" variant="secondary" icon="Users">
                    Open customer analytics
                  </Button>
                </Link>
              </div>
            </div>

            {/* Fulfilment */}
            {detail && (
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Fulfilment</p>
                <dl className="mt-2 space-y-1.5 text-[13px]">
                  {[
                    ['Channel', detail.order.channel],
                    ['Branch', detail.order.restaurant_name],
                    ['Promotion', detail.order.promotion_id ?? 'None'],
                    ['Line items', String(detail.lines.length)],
                    ['Status', detail.order.status],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-ink-muted">{k}</dt>
                      <dd className="font-semibold text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
