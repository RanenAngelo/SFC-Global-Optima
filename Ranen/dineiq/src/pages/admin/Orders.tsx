import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, Icon, SearchInput, Select, Tabs, Tooltip, cn } from '../../components/ui/primitives'
import { DataTable, Column } from '../../components/ui/table'
import { Drawer, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { DateRangeSelect, LocationSelect, StatusDot } from '../../components/shared'
import { ADMIN_ORDERS, type AdminOrder } from '../../lib/data/analytics'
import { pkr } from '../../lib/utils'

const STATUS_TONE: Record<string, 'ember' | 'sage' | 'clay' | 'sky' | 'neutral' | 'gold'> = {
  Pending: 'gold',
  Preparing: 'ember',
  Ready: 'sky',
  Completed: 'sage',
  Cancelled: 'clay',
}

const PAY_TONE: Record<string, 'sage' | 'clay' | 'gold'> = { Paid: 'sage', Unpaid: 'gold', Refunded: 'clay' }

export default function Orders() {
  const { push } = useToast()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState('all')
  const [location, setLocation] = useState('all')
  const [payment, setPayment] = useState('all')
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState<AdminOrder | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  const counts = useMemo(
    () => ({
      all: ADMIN_ORDERS.length,
      Pending: ADMIN_ORDERS.filter((o) => o.status === 'Pending').length,
      Preparing: ADMIN_ORDERS.filter((o) => o.status === 'Preparing').length,
      Completed: ADMIN_ORDERS.filter((o) => o.status === 'Completed').length,
      Cancelled: ADMIN_ORDERS.filter((o) => o.status === 'Cancelled').length,
    }),
    [],
  )

  const rows = useMemo(() => {
    let r = ADMIN_ORDERS
    if (tab !== 'all') r = r.filter((o) => o.status === tab)
    if (channel !== 'all') r = r.filter((o) => o.channel === channel)
    if (location !== 'all') r = r.filter((o) => o.location === location)
    if (payment !== 'all') r = r.filter((o) => o.payment === payment)
    const q = query.trim().toLowerCase()
    if (q) r = r.filter((o) => o.number.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.items.some((i) => i.name.toLowerCase().includes(q)))
    return r
  }, [tab, channel, location, payment, query])

  const hasFilters = channel !== 'all' || location !== 'all' || payment !== 'all' || !!query

  const columns: Column<AdminOrder>[] = [
    {
      key: 'number',
      header: 'Order',
      width: '150px',
      sort: (a, b) => a.number.localeCompare(b.number),
      render: (o) => (
        <div>
          <p className="font-mono text-[12.5px] font-bold text-ink">{o.number}</p>
          <p className="text-[11.5px] text-ink-faint">
            {o.time} · {o.table ?? o.channel}
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
          <p className="text-[13px] font-semibold text-ink">{o.customer}</p>
          <p className="text-[11.5px] text-ink-faint">{o.phone}</p>
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
      render: (o) => (
        <Tooltip content={o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}>
          <span className="text-[13px] font-semibold text-ink-soft">{o.items.reduce((s, i) => s + i.qty, 0)}</span>
        </Tooltip>
      ),
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
      key: 'payment',
      header: 'Payment',
      hideBelow: 'lg',
      render: (o) => (
        <div>
          <Badge tone={PAY_TONE[o.payment] ?? 'neutral'}>{o.payment}</Badge>
          <p className="mt-1 text-[11px] text-ink-faint">{o.paymentMethod}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sort: (a, b) => a.total - b.total,
      render: (o) => <span className="text-[13.5px] font-semibold tabular-nums text-ink">{pkr(o.total)}</span>,
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

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Order Management"
        subtitle="Every order across dine-in, takeaway, website and delivery platforms. All rows are fictional demo records."
        onRefresh={() => {
          setLoading(true)
          setTimeout(() => setLoading(false), 800)
        }}
      />

      {/* Summary strip */}
      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: 'Orders today', v: '186', d: '+12 vs yesterday', i: 'ReceiptText', t: 'text-sky-600' },
          { l: 'Pending action', v: `${counts.Pending + counts.Preparing}`, d: 'Needs kitchen attention', i: 'Clock', t: 'text-gold-600' },
          { l: 'Average order value', v: pkr(1140), d: 'Across all channels', i: 'TrendingUp', t: 'text-sage-600' },
          { l: 'Cancelled', v: `${counts.Cancelled}`, d: 'Refunded or voided', i: 'XCircle', t: 'text-clay-600' },
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
              { label: 'Pending', value: 'Pending', count: counts.Pending },
              { label: 'Preparing', value: 'Preparing', count: counts.Preparing },
              { label: 'Completed', value: 'Completed', count: counts.Completed },
              { label: 'Cancelled', value: 'Cancelled', count: counts.Cancelled },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search order, customer or dish…" className="w-full sm:w-64" />
          <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-auto" aria-label="Channel">
            <option value="all">All channels</option>
            <option value="Dine-in">Dine-in</option>
            <option value="Takeaway">Takeaway</option>
            <option value="Website">Website</option>
            <option value="Delivery platform">Delivery platform</option>
          </Select>
          <Select value={location} onChange={(e) => setLocation(e.target.value)} className="w-auto" aria-label="Location">
            <option value="all">All locations</option>
            <option value="Clifton Branch">Clifton Branch</option>
            <option value="Downtown Branch">Downtown Branch</option>
            <option value="Gulshan Branch">Gulshan Branch</option>
          </Select>
          <Select value={payment} onChange={(e) => setPayment(e.target.value)} className="w-auto" aria-label="Payment status">
            <option value="all">Any payment status</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Refunded">Refunded</option>
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
                setLocation('all')
                setPayment('all')
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
              <Button size="xs" variant="secondary" icon="Printer">
                Print receipts
              </Button>
              <Button size="xs" variant="secondary" icon="Check">
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
          emptyMessage="Try a different channel, location or payment status."
          emptyAction={
            hasFilters ? (
              <Button
                size="sm"
                variant="secondary"
                icon="RotateCcw"
                onClick={() => {
                  setQuery('')
                  setChannel('all')
                  setLocation('all')
                  setPayment('all')
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
                onClick={() => push({ title: 'Receipt opened (demo)', body: 'Print dialog is visual only', tone: 'info' })}
              >
                Print receipt
              </Button>
              {active.status !== 'Completed' && active.status !== 'Cancelled' && (
                <Button icon="Check" onClick={() => { push({ title: 'Order marked completed', tone: 'success' }); setActive(null) }}>
                  Mark as completed
                </Button>
              )}
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4 p-5">
            {/* Receipt */}
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-4 border-b border-dashed border-line pb-4">
                <div>
                  <p className="font-display text-[16px] font-semibold text-ink">Maison Ember</p>
                  <p className="text-[12px] text-ink-muted">{active.location}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[13px] font-bold text-ink">{active.number}</p>
                  <p className="text-[12px] text-ink-muted">
                    {active.time} · {active.table ?? active.channel}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {active.items.map((i, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">
                        {i.qty} × {i.name}
                      </p>
                      {i.notes && <p className="text-[12px] italic text-ink-muted">“{i.notes}”</p>}
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{pkr(i.price * i.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1.5 border-t border-dashed border-line pt-3">
                <div className="flex justify-between text-[13px] text-ink-muted">
                  <span>Subtotal</span>
                  <span>{pkr(active.total - 150)}</span>
                </div>
                {active.channel !== 'Dine-in' && (
                  <div className="flex justify-between text-[13px] text-ink-muted">
                    <span>Delivery fee</span>
                    <span>{pkr(150)}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-[14px] font-semibold text-ink">Total</span>
                  <span className="font-display text-[20px] font-semibold text-ink">{pkr(active.total)}</span>
                </div>
                <p className="pt-1 text-[12px] text-ink-muted">
                  {active.payment} · {active.paymentMethod}
                </p>
              </div>
            </div>

            {/* Customer */}
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Customer</p>
              <p className="mt-1.5 text-[14px] font-semibold text-ink">{active.customer}</p>
              <p className="text-[13px] text-ink-muted">{active.phone}</p>
              {active.address && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{active.address}</p>}
              <div className="mt-3 flex gap-2">
                <Button size="xs" variant="secondary" icon="Phone">
                  Call customer
                </Button>
                <Button size="xs" variant="ghost" icon="MessageSquare">
                  Message
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Status timeline</p>
              <ol className="mt-3 space-y-3">
                {['Order received', 'Confirmed', 'Preparing', active.channel === 'Dine-in' ? 'Served' : 'Out for delivery', 'Completed'].map((s, i) => {
                  const reached = ['Order received', 'Confirmed'].includes(s) || (active.status === 'Preparing' && i <= 2) || active.status === 'Completed'
                  return (
                    <li key={s} className="flex items-center gap-3">
                      <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold', reached ? 'bg-sage-600 text-white' : 'bg-line text-ink-muted')}>
                        {reached ? <Icon name="Check" size={12} /> : i + 1}
                      </span>
                      <span className={cn('text-[13px]', reached ? 'font-medium text-ink' : 'text-ink-faint')}>{s}</span>
                    </li>
                  )
                })}
              </ol>
              <p className="mt-3 text-[11.5px] text-ink-faint">Static demo timeline — no live order tracking.</p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
