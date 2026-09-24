import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Badge, Button, Card, CardHeader, Checkbox, Field, Icon, Input, SearchInput, Select, Switch, Tabs, Textarea, Tooltip, cn,
} from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { ConfirmDialog, Drawer, Modal, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { FoodImage } from '../../components/shared'
import { CATEGORIES, MENU, type MenuItem } from '../../lib/data/menu'
import { pkr } from '../../lib/utils'

type Row = MenuItem & { marginPct: number }

const ROWS: Row[] = MENU.map((m) => ({ ...m, marginPct: Math.round(((m.price - m.cost) / m.price) * 1000) / 10 }))

export default function MenuManagement() {
  const { push } = useToast()
  const [rows, setRows] = useState<Row[]>(ROWS)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleting, setDeleting] = useState<Row | null>(null)
  const [preview, setPreview] = useState<Row | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filtered = rows.filter((r) => {
    if (tab === 'unavailable' && r.available) return false
    if (tab === 'popular' && !r.popular) return false
    if (category !== 'all' && r.categorySlug !== category) return false
    if (status !== 'all' && (status === 'available') !== r.available) return false
    const q = query.trim().toLowerCase()
    if (q && !r.name.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) return false
    return true
  })

  const stats = [
    { l: 'Menu items', v: `${rows.length}`, i: 'UtensilsCrossed', t: 'text-ember-600' },
    { l: 'Available today', v: `${rows.filter((r) => r.available).length}`, i: 'CheckCircle2', t: 'text-sage-600' },
    { l: 'Average margin', v: `${Math.round(rows.reduce((s, r) => s + r.marginPct, 0) / rows.length)}%`, i: 'Percent', t: 'text-sky-600' },
    { l: 'Categories', v: `${CATEGORIES.length}`, i: 'LayoutGrid', t: 'text-gold-600' },
  ]

  const toggleAvailability = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, available: !r.available } : r)))
    const r = rows.find((x) => x.id === id)
    push({ title: `${r?.name} ${r?.available ? 'hidden' : 'made available'}`, tone: 'success' })
  }

  const save = () => {
    if (!editing) return
    const e: Record<string, string> = {}
    if (!editing.name.trim()) e.name = 'Item name is required.'
    if (editing.price <= 0) e.price = 'Price must be greater than zero.'
    if (editing.cost < 0) e.cost = 'Cost cannot be negative.'
    if (editing.cost >= editing.price) e.cost = 'Cost should be lower than price for a positive margin.'
    setErrors(e)
    if (Object.keys(e).length) {
      push({ title: 'Please fix the highlighted fields', tone: 'error' })
      return
    }
    setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...editing, marginPct: Math.round(((editing.price - editing.cost) / editing.price) * 1000) / 10 } : r)))
    setEditing(null)
    push({ title: 'Menu item saved', body: 'Demo only — nothing is persisted', tone: 'success' })
  }

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Menu item',
      sort: (a, b) => a.name.localeCompare(b.name),
      render: (r) => (
        <div className="flex items-center gap-3">
          <FoodImage src={r.img} name={r.name} className="h-11 w-11 shrink-0" ratio="fill" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-ink">{r.name}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{r.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      sort: (a, b) => a.price - b.price,
      render: (r) => <span className="text-[13px] font-semibold tabular-nums text-ink">{pkr(r.price)}</span>,
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      hideBelow: 'md',
      sort: (a, b) => a.cost - b.cost,
      render: (r) => <span className="text-[13px] tabular-nums text-ink-muted">{pkr(r.cost)}</span>,
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      hideBelow: 'sm',
      sort: (a, b) => a.marginPct - b.marginPct,
      render: (r) => (
        <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-bold', r.marginPct >= 65 ? 'bg-sage-50 text-sage-700' : r.marginPct >= 55 ? 'bg-gold-50 text-gold-600' : 'bg-clay-50 text-clay-600')}>
          {r.marginPct}%
        </span>
      ),
    },
    {
      key: 'prep',
      header: 'Prep',
      hideBelow: 'xl',
      render: (r) => <span className="text-[12.5px] text-ink-muted">{r.prep}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      hideBelow: 'lg',
      sort: (a, b) => a.rating - b.rating,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink">
          <Icon name="Star" size={12} className="fill-gold-500 text-gold-500" />
          {r.rating}
        </span>
      ),
    },
    {
      key: 'available',
      header: 'Status',
      hideBelow: 'md',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch size="sm" checked={r.available} onChange={() => toggleAvailability(r.id)} />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '120px',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Preview item">
            <button onClick={() => setPreview(r)} className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-canvas hover:text-ink" aria-label="Preview">
              <Icon name="Eye" size={15} />
            </button>
          </Tooltip>
          <Tooltip content="Edit item">
            <button onClick={() => { setEditing(r); setErrors({}) }} className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-canvas hover:text-ink" aria-label="Edit">
              <Icon name="Pencil" size={15} />
            </button>
          </Tooltip>
          <Tooltip content="Delete item">
            <button onClick={() => setDeleting(r)} className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-clay-50 hover:text-clay-600" aria-label="Delete">
              <Icon name="Trash2" size={15} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Menu Management"
        subtitle="Add, edit and price every dish on the menu. Changes in this prototype affect the interface only — nothing is saved to a database."
        actions={
          <Button icon="Plus" onClick={() => { setEditing({ ...ROWS[0], id: `new-${Date.now()}`, name: '', price: 0, cost: 0, desc: '', available: true }); setErrors({}) }}>
            Add menu item
          </Button>
        }
        onRefresh={() => {
          setLoading(true)
          setTimeout(() => setLoading(false), 800)
        }}
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.l} className="flex items-center gap-3.5 p-4">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas-deep', s.t)}>
              <Icon name={s.i} size={18} />
            </span>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">{s.l}</p>
              <p className="font-display text-[20px] font-semibold text-ink">{s.v}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Categories */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((c) => {
          const items = rows.filter((r) => r.categorySlug === c.slug)
          return (
            <Card key={c.slug} className="p-4" hover>
              <div className="flex items-center gap-2.5">
                <span className="text-[18px]">{c.icon}</span>
                <p className="font-display text-[15px] font-semibold text-ink">{c.name}</p>
              </div>
              <p className="mt-1 text-[12px] text-ink-muted">{c.blurb}</p>
              <div className="mt-3 flex items-center justify-between text-[12px]">
                <span className="font-semibold text-ink">{items.length} items</span>
                <span className="text-ink-faint">{items.filter((i) => !i.available).length} unavailable</span>
              </div>
            </Card>
          )
        })}
      </div>

      <Card>
        <div className="border-b border-line px-4 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { label: 'All items', value: 'all', count: rows.length },
              { label: 'Bestsellers', value: 'popular' },
              { label: 'Unavailable', value: 'unavailable' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search menu items…" className="w-full sm:w-60" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto" aria-label="Category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto" aria-label="Availability">
            <option value="all">Any status</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </Select>
          {selected.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-ink-soft">{selected.length} selected</span>
              <Button
                size="xs"
                variant="secondary"
                icon="CheckCircle2"
                onClick={() => {
                  setRows((prev) => prev.map((r) => (selected.includes(r.id) ? { ...r, available: true } : r)))
                  push({ title: `${selected.length} items made available`, tone: 'success' })
                  setSelected([])
                }}
              >
                Make available
              </Button>
              <Button
                size="xs"
                variant="secondary"
                icon="EyeOff"
                onClick={() => {
                  setRows((prev) => prev.map((r) => (selected.includes(r.id) ? { ...r, available: false } : r)))
                  push({ title: `${selected.length} items hidden`, tone: 'info' })
                  setSelected([])
                }}
              >
                Hide
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          loading={loading}
          pageSize={10}
          selectable
          selected={selected}
          onSelectionChange={setSelected}
          onRowClick={(r) => setPreview(r)}
          emptyTitle="No menu items found"
          emptyMessage="Try a different search term or clear your filters."
          emptyAction={
            <Button
              size="sm"
              variant="secondary"
              icon="RotateCcw"
              onClick={() => {
                setQuery('')
                setCategory('all')
                setStatus('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      </Card>

      <div className="mt-5 rounded-2xl border border-ember-200 bg-ember-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-ember-800">Ready for deeper analysis?</p>
            <p className="text-[12.5px] text-ember-700/80">
              Menu Intelligence classifies each dish by profit and volume contribution.
            </p>
          </div>
          <Link to="/admin/menu-intelligence">
            <Button size="sm" variant="dark" iconRight="ArrowRight">
              Open Menu Intelligence
            </Button>
          </Link>
        </div>
      </div>

      {/* Edit / create modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing && rows.some((r) => r.id === editing.id) ? 'Edit menu item' : 'Add menu item'}
        subtitle="Demo form — changes are not persisted."
        icon="UtensilsCrossed"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button icon="Save" onClick={save}>
              Save item
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-28 shrink-0">
                <FoodImage src={editing.img} name={editing.name || 'New item'} ratio="square" />
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="text-[12.5px] font-semibold text-ink">Food image</p>
                <p className="text-[11.5px] text-ink-muted">JPG or PNG, 1:1 recommended, up to 4 MB.</p>
                <div className="mt-2 flex gap-2">
                  <Button size="xs" variant="secondary" icon="Upload">
                    Upload image
                  </Button>
                  <Button size="xs" variant="ghost" icon="Trash2" className="text-clay-600">
                    Remove
                  </Button>
                </div>
              </div>
              <div className="w-full sm:w-40">
                <p className="mb-1.5 text-[12.5px] font-semibold text-ink">Availability</p>
                <Switch checked={editing.available} onChange={(v) => setEditing({ ...editing, available: v })} label={editing.available ? 'Available' : 'Hidden'} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Item name" required error={errors.name} className="sm:col-span-2">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} invalid={!!errors.name} placeholder="e.g. Ember BBQ Bacon Burger" />
              </Field>
              <Field label="Category">
                <Select value={editing.categorySlug} onChange={(e) => setEditing({ ...editing, categorySlug: e.target.value as any, category: CATEGORIES.find((c) => c.slug === e.target.value)?.name ?? editing.category })} options={CATEGORIES.map((c) => ({ label: c.name, value: c.slug }))} />
              </Field>
              <Field label="Preparation time">
                <Input value={editing.prep} onChange={(e) => setEditing({ ...editing, prep: e.target.value })} placeholder="18 min" />
              </Field>
              <Field label="Selling price (PKR)" required error={errors.price}>
                <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} invalid={!!errors.price} />
              </Field>
              <Field label="Estimated cost (PKR)" required error={errors.cost} hint="Used to show contribution margin.">
                <Input type="number" value={editing.cost} onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) })} invalid={!!errors.cost} />
              </Field>
              <div className="rounded-xl border border-line bg-canvas p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Contribution margin</p>
                <p className="font-display text-[20px] font-semibold text-ink">
                  {editing.price > 0 ? `${(((editing.price - editing.cost) / editing.price) * 100).toFixed(1)}%` : '—'}
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  {editing.price > 0 ? `${pkr(editing.price - editing.cost)} per unit` : 'Enter a price to calculate'}
                </p>
              </div>
              <Field label="Portion size">
                <Input value={editing.portion} onChange={(e) => setEditing({ ...editing, portion: e.target.value })} placeholder="Serves 1" />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea value={editing.desc} onChange={(e) => setEditing({ ...editing, desc: e.target.value })} placeholder="Short description shown on the customer menu" className="min-h-[80px]" />
              </Field>
              <Field label="Ingredients" hint="Comma separated" className="sm:col-span-2">
                <Textarea
                  value={editing.ingredients.join(', ')}
                  onChange={(e) => setEditing({ ...editing, ingredients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="min-h-[72px]"
                />
              </Field>
              <Field label="Dietary tags" className="sm:col-span-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {['Vegetarian', 'Spicy', 'Signature', 'Bestseller', 'Gluten-Free', 'Chef Special', 'Vegan Option', 'New'].map((t) => (
                    <Checkbox
                      key={t}
                      label={t}
                      checked={editing.tags.includes(t)}
                      onChange={() =>
                        setEditing({ ...editing, tags: editing.tags.includes(t) ? editing.tags.filter((x) => x !== t) : [...editing.tags, t] })
                      }
                    />
                  ))}
                </div>
              </Field>
            </div>
          </div>
        )}
      </Modal>

      {/* Preview drawer */}
      <Drawer
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ''}
        subtitle={preview ? `${preview.category} · ${pkr(preview.price)}` : ''}
        width="md"
        footer={
          preview && (
            <>
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Close
              </Button>
              <Button
                icon="Pencil"
                onClick={() => {
                  setEditing(preview)
                  setPreview(null)
                  setErrors({})
                }}
              >
                Edit item
              </Button>
            </>
          )
        }
      >
        {preview && (
          <div className="p-5">
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              <FoodImage src={preview.img} name={preview.name} ratio="wide" rounded="none" />
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-[17px] font-semibold text-ink">{preview.name}</p>
                    <p className="text-[12.5px] text-ink-muted">{preview.category} · {preview.prep}</p>
                  </div>
                  <span className="font-display text-[19px] font-semibold text-ink">{pkr(preview.price)}</span>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">{preview.desc}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {preview.tags.map((t) => (
                    <Badge key={t} tone="neutral">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { l: 'Estimated cost', v: pkr(preview.cost) },
                { l: 'Contribution margin', v: `${preview.marginPct}%` },
                { l: 'Rating', v: `${preview.rating} (${preview.reviews})` },
                { l: 'Portion', v: preview.portion },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 text-[14px] font-semibold text-ink">{s.v}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-line bg-white p-4">
              <p className="text-[12.5px] font-semibold text-ink">Ingredients</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                {preview.ingredients.length ? preview.ingredients.join(' · ') : 'No ingredients recorded for this demo item.'}
              </p>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          setRows((prev) => prev.filter((r) => r.id !== deleting?.id))
          push({ title: `${deleting?.name} removed`, tone: 'info' })
          setDeleting(null)
        }}
        title="Delete this menu item?"
        message={<>“{deleting?.name}” will be removed from the demo menu. This action only affects this prototype view.</>}
        confirmLabel="Delete item"
      />
    </div>
  )
}
