import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Avatar, Badge, Button, Card, CardHeader, Checkbox, Field, Icon, Input, Select, Switch, Tabs, cn,
} from '../../components/ui/primitives'
import { ConfirmDialog, Modal, useToast } from '../../components/ui/overlay'
import { EmptyState } from '../../components/ui/states'
import { FoodImage } from '../../components/shared'
import { AddToCartControl } from '../../components/store/DishCard'
import { ADDRESSES, CUSTOMER_ORDERS, NOTIFICATIONS, SAVED_CARDS, WALLETS, type Address, type CustomerOrder } from '../../lib/data/store'
import { menuBySlug } from '../../lib/data/menu'
import { useCart, useFavourites } from '../../store/app'
import { pkr } from '../../lib/utils'

/* ══════════════════════════════ Profile ══════════════════════════════ */
export function AccountProfile() {
  const { push } = useToast()
  const [form, setForm] = useState({ name: 'Zara Mehdi', email: 'zara.m@example.com', phone: '+92 300 1234567', dob: '1994-06-12', gender: 'female' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const save = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Enter a valid email address.'
    if (!/^[+\d][\d\s-]{7,}$/.test(form.phone)) e.phone = 'Enter a valid phone number.'
    setErrors(e)
    if (Object.keys(e).length) {
      push({ title: 'Please fix the highlighted fields', tone: 'error' })
      return
    }
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      push({ title: 'Profile saved', body: 'Demo only — nothing is stored', tone: 'success' })
    }, 900)
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <CardHeader title="Personal information" subtitle="Update the details we use for your orders and receipts." className="-mx-5 -mt-5 mb-5 border-b px-5 py-4" />
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <Avatar name={form.name} size={72} />
            <button className="focus-ring absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ink text-white shadow-card" aria-label="Change photo">
              <Icon name="Camera" size={14} />
            </button>
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-ink">Profile photo</p>
            <p className="text-[12.5px] text-ink-muted">JPG or PNG, up to 2 MB.</p>
            <div className="mt-2 flex gap-2">
              <Button size="xs" variant="secondary" icon="Upload">
                Upload new
              </Button>
              <Button size="xs" variant="ghost" icon="Trash2" className="text-clay-600">
                Remove
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} icon="User" />
          </Field>
          <Field label="Phone number" required error={errors.phone}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} invalid={!!errors.phone} icon="Phone" />
          </Field>
          <Field label="Email address" required error={errors.email}>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!errors.email} icon="Mail" />
          </Field>
          <Field label="Date of birth">
            <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          </Field>
          <Field label="Pronoun">
            <Select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[
                { label: 'Prefer not to say', value: 'na' },
                { label: 'She / her', value: 'female' },
                { label: 'He / him', value: 'male' },
              ]}
            />
          </Field>
          <Field label="Default city">
            <Select options={[{ label: 'Karachi', value: 'khi' }, { label: 'Lahore', value: 'lhr' }, { label: 'Islamabad', value: 'isb' }]} />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={() => setForm({ name: 'Zara Mehdi', email: 'zara.m@example.com', phone: '+92 300 1234567', dob: '1994-06-12', gender: 'female' })}>
            Reset
          </Button>
          <Button icon="Save" loading={saving} onClick={save}>
            Save changes
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Account activity" subtitle="Demo summary of your fictional account." className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { l: 'Total orders', v: '29', i: 'ReceiptText' },
            { l: 'Lifetime spend', v: pkr(63150), i: 'Wallet' },
            { l: 'Average order', v: pkr(2177), i: 'TrendingUp' },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-line bg-canvas p-4">
              <Icon name={s.i} size={16} className="text-ember-600" />
              <p className="mt-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
              <p className="font-display text-[20px] font-semibold text-ink">{s.v}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-clay-100 p-5">
        <h3 className="font-display text-[16px] font-semibold text-ink">Delete account</h3>
        <p className="mt-1 text-[13px] text-ink-muted">
          Removes your profile, saved addresses and order history from this demo. This action cannot be undone.
        </p>
        <Button variant="danger" size="sm" icon="Trash2" className="mt-3" onClick={() => setDeleteOpen(true)}>
          Delete my account
        </Button>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false)
          push({ title: 'Demo only', body: 'No account was deleted', tone: 'info' })
        }}
        title="Delete your account?"
        message="This is a prototype — no account data exists and nothing will be deleted."
        confirmLabel="Delete account"
      />
    </div>
  )
}

/* ══════════════════════════════ Addresses ══════════════════════════════ */
export function AccountAddresses() {
  const { push } = useToast()
  const [list, setList] = useState<Address[]>(ADDRESSES)
  const [editing, setEditing] = useState<Address | null>(null)
  const [removing, setRemoving] = useState<Address | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const blank: Address = { id: 'new', label: 'Home', name: 'Zara Mehdi', phone: '+92 300 1234567', line1: '', area: '', city: 'Karachi' }

  const save = () => {
    if (!editing) return
    const e: Record<string, string> = {}
    if (!editing.line1.trim()) e.line1 = 'Street address is required.'
    if (!editing.area.trim()) e.area = 'Area is required.'
    if (!/^[+\d][\d\s-]{7,}$/.test(editing.phone)) e.phone = 'Enter a valid phone number.'
    setErrors(e)
    if (Object.keys(e).length) return
    setList((prev) => {
      const exists = prev.some((a) => a.id === editing.id)
      const next = exists ? prev.map((a) => (a.id === editing.id ? editing : a)) : [...prev, { ...editing, id: `ad-${Date.now()}` }]
      return next
    })
    setEditing(null)
    push({ title: 'Address saved', tone: 'success' })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Saved addresses"
          subtitle="Used at checkout for faster delivery."
          className="border-b"
          actions={
            <Button size="sm" icon="Plus" onClick={() => { setEditing(blank); setErrors({}) }}>
              Add address
            </Button>
          }
        />
        {list.length === 0 ? (
          <EmptyState
            variant="generic"
            title="No saved addresses yet"
            message="Add a home or work address and it will appear at checkout."
            action={
              <Button size="sm" icon="Plus" onClick={() => setEditing(blank)}>
                Add address
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {list.map((a) => (
              <div key={a.id} className={cn('rounded-2xl border p-4 transition-colors', a.isDefault ? 'border-ember-300 bg-ember-50/40' : 'border-line hover:border-line-strong')}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Icon name={a.label === 'Home' ? 'Home' : 'Building2'} size={15} className="text-ember-600" />
                    <span className="text-[13.5px] font-semibold text-ink">{a.label}</span>
                    {a.isDefault && <Badge tone="ember">Default</Badge>}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(a); setErrors({}) }} className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white hover:text-ink" aria-label="Edit address">
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button onClick={() => setRemoving(a)} className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white hover:text-clay-600" aria-label="Delete address">
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-2.5 text-[13px] font-medium text-ink">{a.name}</p>
                <p className="text-[12.5px] leading-relaxed text-ink-muted">
                  {a.line1}
                  <br />
                  {a.area}, {a.city}
                </p>
                <p className="mt-1.5 text-[12.5px] text-ink-muted">{a.phone}</p>
                {a.instructions && <p className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-[12px] italic text-ink-muted">“{a.instructions}”</p>}
                {!a.isDefault && (
                  <button
                    onClick={() => {
                      setList((prev) => prev.map((x) => ({ ...x, isDefault: x.id === a.id })))
                      push({ title: 'Default address updated', tone: 'success' })
                    }}
                    className="mt-3 text-[12.5px] font-semibold text-ember-700 hover:underline"
                  >
                    Set as default
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing && ADDRESSES.some((a) => a.id === editing.id) ? 'Edit address' : 'Add address'}
        subtitle="Demo form — nothing is stored."
        icon="MapPin"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button icon="Save" onClick={save}>
              Save address
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label" className="sm:col-span-2">
              <Select
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                options={[
                  { label: 'Home', value: 'Home' },
                  { label: 'Office', value: 'Office' },
                  { label: 'Other', value: 'Other' },
                ]}
              />
            </Field>
            <Field label="Recipient name" required>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Phone number" required error={errors.phone}>
              <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} invalid={!!errors.phone} />
            </Field>
            <Field label="Street address" required error={errors.line1} className="sm:col-span-2">
              <Input value={editing.line1} onChange={(e) => setEditing({ ...editing, line1: e.target.value })} invalid={!!errors.line1} placeholder="Apartment, building, street" />
            </Field>
            <Field label="Area / locality" required error={errors.area}>
              <Input value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} invalid={!!errors.area} placeholder="Clifton" />
            </Field>
            <Field label="City">
              <Input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
            </Field>
            <Field label="Delivery instructions" className="sm:col-span-2">
              <Input value={editing.instructions ?? ''} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} placeholder="Landmark, gate number, or where to leave the order" />
            </Field>
            <div className="sm:col-span-2">
              <Checkbox label="Set as my default delivery address" defaultChecked={editing.isDefault} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          setList((prev) => prev.filter((a) => a.id !== removing?.id))
          push({ title: 'Address removed', tone: 'info' })
          setRemoving(null)
        }}
        title="Remove this address?"
        message={<>“{removing?.label}” will be removed from your saved addresses.</>}
        confirmLabel="Remove"
      />
    </div>
  )
}

/* ══════════════════════════════ Orders ══════════════════════════════ */
export function AccountOrders() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')

  const filtered = CUSTOMER_ORDERS.filter((o) => {
    if (tab === 'active') return o.status !== 'Delivered' && o.status !== 'Cancelled'
    if (tab === 'delivered') return o.status === 'Delivered'
    if (tab === 'cancelled') return o.status === 'Cancelled'
    return true
  }).filter((o) => o.number.toLowerCase().includes(query.toLowerCase()) || o.items.some((i) => i.name.toLowerCase().includes(query.toLowerCase())))

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Order history" subtitle="Demo orders shown for interface presentation." className="border-b" />
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <Tabs
            tabs={[
              { label: 'All', value: 'all', count: CUSTOMER_ORDERS.length },
              { label: 'Active', value: 'active' },
              { label: 'Delivered', value: 'delivered' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
            value={tab}
            onChange={setTab}
            variant="pill"
          />
          <div className="relative ml-auto w-full sm:w-56">
            <Icon name="Search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders…"
              className="focus-ring h-9 w-full rounded-xl border border-line-strong pl-9 pr-3 text-[13px]"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            variant="orders"
            title="No orders found"
            message={query ? `Nothing matched “${query}”.` : 'Orders you place will appear here.'}
            action={
              query ? (
                <Button size="sm" variant="secondary" icon="RotateCcw" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              ) : (
                <Link to="/menu">
                  <Button size="sm" icon="UtensilsCrossed">
                    Order something
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function OrderRow({ order }: { order: CustomerOrder }) {
  const navigate = useNavigate()
  const cart = useCart()
  const { push } = useToast()
  const tone: Record<string, 'ember' | 'sage' | 'clay' | 'sky' | 'neutral'> = {
    Delivered: 'sage',
    Preparing: 'ember',
    'Out for delivery': 'sky',
    Ready: 'sky',
    Cancelled: 'clay',
  }

  return (
    <div className="p-4 transition-colors hover:bg-canvas/50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[13px] font-bold text-ink">{order.number}</span>
            <Badge tone={tone[order.status] ?? 'neutral'} dot>
              {order.status}
            </Badge>
            <span className="text-[12px] text-ink-faint">{order.channel}</span>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            {order.date} · {order.placedAt.split(', ')[1]} · {order.items.length} items
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-[16px] font-semibold text-ink">{pkr(order.total)}</p>
          <p className="text-[11.5px] text-ink-faint">{order.payment}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto">
        {order.items.map((i, idx) => (
          <div key={idx} className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-white p-1.5 pr-3">
            <FoodImage src={i.img} name={i.name} className="h-9 w-9" ratio="fill" />
            <span className="text-[12px] font-medium text-ink-soft">
              {i.qty}× {i.name}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="xs" variant="secondary" icon="Eye" onClick={() => navigate(`/account/orders/${order.number}`)}>
          View details
        </Button>
        {order.status === 'Preparing' || order.status === 'Out for delivery' ? (
          <Button size="xs" icon="MapPin" onClick={() => navigate(`/track/${order.number}`)}>
            Track order
          </Button>
        ) : null}
        <Button
          size="xs"
          variant="ghost"
          icon="RotateCcw"
          onClick={() => {
            order.items.forEach((i) => {
              const item = menuBySlug(i.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
              if (item) cart.add(item, { qty: i.qty })
            })
            push({ title: 'Added to cart', body: 'Demo reorder', tone: 'success' })
          }}
        >
          Reorder
        </Button>
        {order.status === 'Delivered' && (
          <Button size="xs" variant="ghost" icon="Star">
            Rate order
          </Button>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════ Order details ══════════════════════════════ */
export function AccountOrderDetails() {
  const { number = '' } = useParams()
  const order = CUSTOMER_ORDERS.find((o) => o.number === number)
  const navigate = useNavigate()

  if (!order) {
    return (
      <Card>
        <EmptyState
          variant="orders"
          title="Order not found"
          message={`No demo order matches “${number}”.`}
          action={
            <Link to="/account/orders">
              <Button size="sm" variant="secondary" icon="ArrowLeft">
                Back to orders
              </Button>
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" icon="ArrowLeft" onClick={() => navigate('/account/orders')} className="px-0">
        Back to orders
      </Button>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[15px] font-bold text-ink">{order.number}</p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {order.date} · {order.placedAt.split(', ')[1]} · {order.channel}
            </p>
          </div>
          <Badge tone={order.status === 'Delivered' ? 'sage' : order.status === 'Cancelled' ? 'clay' : 'ember'} dot>
            {order.status}
          </Badge>
        </div>

        <div className="mt-5 divide-y divide-line border-t border-line">
          {order.items.map((i, idx) => (
            <div key={idx} className="flex items-center gap-3 py-3">
              <FoodImage src={i.img} name={i.name} className="h-14 w-14 shrink-0" ratio="fill" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{i.name}</p>
                <p className="text-[12px] text-ink-muted">
                  {pkr(i.price)} × {i.qty}
                </p>
              </div>
              <span className="text-[13.5px] font-semibold tabular-nums text-ink">{pkr(i.price * i.qty)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-line pt-4">
          <div className="flex justify-between text-[13px] text-ink-muted">
            <span>Subtotal</span>
            <span>{pkr(Math.round((order.total - 150) / 1.05))}</span>
          </div>
          <div className="flex justify-between text-[13px] text-ink-muted">
            <span>Delivery fee</span>
            <span>{pkr(150)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-ink-muted">
            <span>Sales tax</span>
            <span>{pkr(Math.round((order.total - 150) / 21))}</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-[14px] font-semibold text-ink">Total</span>
            <span className="font-display text-[20px] font-semibold text-ink">{pkr(order.total)}</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-[15px] font-semibold text-ink">Delivery details</h3>
          <dl className="mt-3 space-y-2.5 text-[13px]">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Address</dt>
              <dd className="text-ink-soft">{order.address}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Payment</dt>
              <dd className="text-ink-soft">{order.payment}</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-5">
          <h3 className="font-display text-[15px] font-semibold text-ink">Need help?</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            Something missing or not right? The branch can remake an item or refund it within 24 hours.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon="Phone">
              Call branch
            </Button>
            <Button size="sm" variant="ghost" icon="MessageSquareWarning" className="text-clay-600">
              Report an issue
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ══════════════════════════════ Favourites ══════════════════════════════ */
export function AccountFavourites() {
  const { favourites, toggle } = useFavourites()
  const items = useMemo(() => favourites.map((s) => menuBySlug(s)).filter(Boolean) as NonNullable<ReturnType<typeof menuBySlug>>[], [favourites])

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          variant="generic"
          title="No favourite dishes yet"
          message="Tap the heart on any dish and it will be saved here for quick reordering."
          action={
            <Link to="/menu">
              <Button size="sm" icon="UtensilsCrossed">
                Browse the menu
              </Button>
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-ink-muted">
          <span className="font-semibold text-ink">{items.length}</span> saved {items.length === 1 ? 'dish' : 'dishes'}
        </p>
        <Link to="/menu">
          <Button size="sm" variant="secondary" icon="Plus">
            Add more
          </Button>
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((m) => (
          <div key={m.id} className="flex gap-3 rounded-2xl border border-line bg-white p-3">
            <Link to={`/menu/${m.slug}`} className="shrink-0">
              <FoodImage src={m.img} name={m.name} className="h-20 w-20" ratio="fill" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link to={`/menu/${m.slug}`}>
                <p className="truncate font-display text-[14.5px] font-semibold text-ink hover:text-ember-700">{m.name}</p>
              </Link>
              <p className="text-[12.5px] text-ink-muted">{m.category}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <span className="font-display text-[15px] font-semibold text-ink">{pkr(m.price)}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => toggle(m.slug)} aria-label="Remove from favourites" className="focus-ring rounded-lg p-2 text-clay-500 transition-colors hover:bg-clay-50">
                    <Icon name="Heart" size={15} className="fill-clay-500" />
                  </button>
                  <AddToCartControl item={m} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════ Payments ══════════════════════════════ */
export function AccountPayments() {
  const { push } = useToast()
  const [cards, setCards] = useState(SAVED_CARDS)
  const [addOpen, setAddOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Saved payment methods"
          subtitle="Demo interface only — no card details are stored or processed."
          className="border-b"
          actions={
            <Button size="sm" icon="Plus" onClick={() => setAddOpen(true)}>
              Add card
            </Button>
          }
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {cards.map((c) => (
            <div key={c.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-ink-soft p-4 text-white">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">{c.brand}</span>
                <Icon name="Nfc" size={18} className="text-white/60" />
              </div>
              <p className="mt-6 font-mono text-[15px] tracking-[0.16em]">•••• •••• •••• {c.last4}</p>
              <div className="mt-4 flex items-end justify-between">
                <span>
                  <span className="block text-[9px] uppercase tracking-wider text-white/50">Card holder</span>
                  <span className="text-[12px] font-semibold uppercase">{c.holder}</span>
                </span>
                <span>
                  <span className="block text-[9px] uppercase tracking-wider text-white/50">Expires</span>
                  <span className="text-[12px] font-semibold">{c.expiry}</span>
                </span>
              </div>
              {c.isDefault && (
                <span className="absolute right-3 top-3 rounded-full bg-sage-500 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide">Default</span>
              )}
              <div className="mt-4 flex gap-2">
                {!c.isDefault && (
                  <button
                    onClick={() => {
                      setCards((prev) => prev.map((x) => ({ ...x, isDefault: x.id === c.id })))
                      push({ title: 'Default card updated', tone: 'success' })
                    }}
                    className="focus-ring rounded-lg bg-white/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-white/20"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => setRemoving(c.id)}
                  className="focus-ring rounded-lg bg-white/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-white/20"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Linked mobile wallets" subtitle="Pay directly from your wallet balance." className="border-b" />
        <div className="divide-y divide-line">
          {WALLETS.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-[12px] font-bold text-white" style={{ background: w.tone }}>
                  {w.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{w.name}</p>
                  <p className="text-[12px] text-ink-muted">
                    {w.number} · Balance {w.balance}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="sage" icon="Check">
                  Linked
                </Badge>
                <Button size="xs" variant="ghost" className="text-clay-600">
                  Unlink
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a card"
        subtitle="Prototype form — card details are never transmitted."
        icon="CreditCard"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAddOpen(false)
                push({ title: 'Card added (demo)', tone: 'success' })
              }}
            >
              Save card
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Card number" required className="sm:col-span-2">
            <Input placeholder="4242 4242 4242 4242" inputMode="numeric" />
          </Field>
          <Field label="Expiry" required>
            <Input placeholder="MM/YY" />
          </Field>
          <Field label="Security code" required>
            <Input placeholder="123" />
          </Field>
          <Field label="Name on card" required className="sm:col-span-2">
            <Input placeholder="ZARA MEHDI" />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox label="Set as my default payment method" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          setCards((prev) => prev.filter((c) => c.id !== removing))
          push({ title: 'Card removed', tone: 'info' })
          setRemoving(null)
        }}
        title="Remove this card?"
        message={<>The card ending {cards.find((c) => c.id === removing)?.last4} will be removed from your demo wallet.</>}
        confirmLabel="Remove card"
      />
    </div>
  )
}

/* ══════════════════════════════ Notifications ══════════════════════════════ */
export function AccountNotifications() {
  const [items, setItems] = useState(NOTIFICATIONS)
  const unread = items.filter((n) => !n.read).length

  return (
    <Card>
      <CardHeader
        title="Notifications"
        subtitle={`${unread} unread of ${items.length} demo notifications.`}
        className="border-b"
        actions={
          <Button size="sm" variant="secondary" icon="CheckCheck" onClick={() => setItems((prev) => prev.map((n) => ({ ...n, read: true })))}>
            Mark all read
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState variant="generic" title="No notifications" message="Updates about your orders and offers will appear here." />
      ) : (
        <div className="divide-y divide-line">
          {items.map((n) => (
            <div key={n.id} className={cn('flex gap-3.5 p-4 transition-colors', !n.read && 'bg-ember-50/40')}>
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  n.kind === 'order' ? 'bg-ember-50 text-ember-600' : n.kind === 'offer' ? 'bg-gold-50 text-gold-600' : 'bg-sky-50 text-sky-600',
                )}
              >
                <Icon name={n.kind === 'order' ? 'ReceiptText' : n.kind === 'offer' ? 'BadgePercent' : 'Bell'} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13.5px] font-semibold text-ink">{n.title}</p>
                  <span className="shrink-0 text-[11.5px] text-ink-faint">{n.time}</span>
                </div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{n.body}</p>
                {!n.read && (
                  <button
                    onClick={() => setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                    className="mt-1.5 text-[12px] font-semibold text-ember-700 hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ══════════════════════════════ Preferences ══════════════════════════════ */
export function AccountPreferences() {
  const { push } = useToast()
  const [prefs, setPrefs] = useState({
    orderUpdates: true,
    offers: true,
    newsletter: false,
    sms: true,
    veg: false,
    spicy: true,
    nuts: false,
  })
  const t = (k: keyof typeof prefs) => (v: boolean) => setPrefs((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <CardHeader title="Notification preferences" subtitle="Choose what we can tell you about." className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
        <div className="divide-y divide-line">
          <div className="py-3">
            <Switch checked={prefs.orderUpdates} onChange={t('orderUpdates')} label="Order updates" desc="Status changes from the kitchen and rider." />
          </div>
          <div className="py-3">
            <Switch checked={prefs.offers} onChange={t('offers')} label="Offers and promotions" desc="New offers, bundles and seasonal menus." />
          </div>
          <div className="py-3">
            <Switch checked={prefs.newsletter} onChange={t('newsletter')} label="Monthly newsletter" desc="Recipes, events and new dishes." />
          </div>
          <div className="py-3">
            <Switch checked={prefs.sms} onChange={t('sms')} label="SMS notifications" desc="Text messages for delivery arrivals." />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Dietary preferences" subtitle="Applied as suggestions when you browse the menu." className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Checkbox label="Vegetarian" checked={prefs.veg} onChange={() => setPrefs((p) => ({ ...p, veg: !p.veg }))} desc="Highlight meat-free dishes." />
          <Checkbox label="Spicy" checked={prefs.spicy} onChange={() => setPrefs((p) => ({ ...p, spicy: !p.spicy }))} desc="Show chili-forward dishes first." />
          <Checkbox label="Nut-free" checked={prefs.nuts} onChange={() => setPrefs((p) => ({ ...p, nuts: !p.nuts }))} desc="Flag dishes containing nuts." />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Default spice level">
            <Select options={[{ label: 'Mild', value: 'mild' }, { label: 'Medium', value: 'medium' }, { label: 'Hot', value: 'hot' }]} defaultValue="medium" />
          </Field>
          <Field label="Language">
            <Select options={[{ label: 'English', value: 'en' }, { label: 'Urdu', value: 'ur' }]} />
          </Field>
          <Field label="Currency">
            <Select options={[{ label: 'PKR — Pakistani Rupee', value: 'pkr' }]} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => setPrefs({ orderUpdates: true, offers: true, newsletter: false, sms: true, veg: false, spicy: true, nuts: false })}
        >
          Reset
        </Button>
        <Button icon="Save" onClick={() => push({ title: 'Preferences saved', body: 'Demo only — nothing is stored', tone: 'success' })}>
          Save preferences
        </Button>
      </div>
    </div>
  )
}
