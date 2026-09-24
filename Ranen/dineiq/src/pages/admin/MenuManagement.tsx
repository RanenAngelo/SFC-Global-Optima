import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Badge, Button, Card, CardHeader, Field, Icon, Input, SearchInput, Select, Switch, Tabs, cn,
} from '../../components/ui/primitives'
import { Column, DataTable } from '../../components/ui/table'
import { ConfirmDialog, Drawer, Modal, useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { FoodImage } from '../../components/shared'
import { PageError, PageLoader, apiFetch, useAuth, useMeta } from '../../lib/api'
import { useMenuData, type MenuRow } from '../../lib/live'
import { money } from '../../lib/utils'

const TIER_TONE: Record<string, 'sage' | 'gold' | 'neutral'> = { High: 'sage', Medium: 'gold', Low: 'neutral' }

const BLANK: MenuRow = {
  id: '', name: '', price: 0, cost: 0, marginPct: 0, categoryId: '', category: '',
  rating: 0, reviews: 0, available: true, popular: false, demandTier: 'Medium',
  wastageTag: 'Normal', priceSensTag: 'Medium', seasonal: false, promoDep: false, introduced: '',
}

export default function MenuManagement() {
  const { push } = useToast()
  const { can } = useAuth()
  const { options: meta } = useMeta()
  const { data, loading, error, refetch } = useMenuData()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<MenuRow | null>(null)
  const [deleting, setDeleting] = useState<MenuRow | null>(null)
  const [preview, setPreview] = useState<MenuRow | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  if (loading && !data) return <PageLoader />
  if (error || !data) return <PageError message={error ?? 'No menu data.'} onRetry={refetch} />

  const rows = data.rows
  const categories = meta?.categories ?? []

  const filtered = rows.filter((r) => {
    if (tab === 'unavailable' && r.available) return false
    if (tab === 'popular' && !r.popular) return false
    if (category !== 'all' && r.categoryId !== category) return false
    if (status !== 'all' && (status === 'available') !== r.available) return false
    const q = query.trim().toLowerCase()
    if (q && !r.name.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) return false
    return true
  })

  const stats = [
    { l: 'Menu items', v: `${rows.length}`, i: 'UtensilsCrossed', t: 'text-ember-600' },
    { l: 'Available today', v: `${rows.filter((r) => r.available).length}`, i: 'CheckCircle2', t: 'text-sage-600' },
    { l: 'Average margin', v: `${Math.round(rows.reduce((s, r) => s + r.marginPct, 0) / Math.max(1, rows.length))}%`, i: 'Percent', t: 'text-sky-600' },
    { l: 'Categories', v: `${categories.length}`, i: 'LayoutGrid', t: 'text-gold-600' },
  ]

  async function toggleAvailability(id: string, to: boolean) {
    try {
      await apiFetch(`/menu/items/${id}`, { method: 'PATCH', body: { is_active: to } })
      const r = rows.find((x) => x.id === id)
      push({ title: `${r?.name} ${to ? 'made available' : 'hidden'}`, tone: 'success' })
      refetch()
    } catch (e) {
      push({ title: 'Update failed', body: e instanceof Error ? e.message : 'Unknown error', tone: 'error' })
    }
  }

  async function bulkAvailability(to: boolean) {
    let ok = 0
    for (const id of selected) {
      try {
        await apiFetch(`/menu/items/${id}`, { method: 'PATCH', body: { is_active: to } })
        ok += 1
      } catch {
        /* surfaced below */
      }
    }
    push({
      title: ok === selected.length ? (to ? 'Items made available' : 'Items hidden') : 'Partially updated',
      body: `${ok} of ${selected.length} updated.`,
      tone: ok === selected.length ? 'success' : 'error',
    })
    setSelected([])
    refetch()
  }

  async function save() {
    if (!editing) return
    const e: Record<string, string> = {}
    if (!editing.name.trim()) e.name = 'Item name is required.'
    if (editing.price <= 0) e.price = 'Price must be greater than zero.'
    if (editing.cost < 0) e.cost = 'Cost cannot be negative.'
    if (editing.cost >= editing.price) e.cost = 'Cost should be lower than price for a positive margin.'
    if (!editing.categoryId) e.category = 'Pick a category.'
    setErrors(e)
    if (Object.keys(e).length) {
      push({ title: 'Please fix the highlighted fields', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const isNew = editing.id === ''
      if (isNew) {
        const out = await apiFetch<{ item_id: string }>('/menu/items', {
          method: 'POST',
          body: {
            item_name: editing.name.trim(),
            category_id: editing.categoryId,
            base_cost: editing.cost,
            base_price: editing.price,
            is_active: editing.available,
          },
        })
        push({ title: 'Menu item created', body: `${editing.name} saved as ${out.item_id}.`, tone: 'success' })
      } else {
        const orig = rows.find((r) => r.id === editing.id)
        await apiFetch(`/menu/items/${editing.id}`, {
          method: 'PATCH',
          body: {
            item_name: editing.name.trim(),
            category_id: editing.categoryId,
            base_cost: editing.cost,
            is_active: editing.available,
          },
        })
        if (orig && Math.abs(orig.price - editing.price) > 0.0001) {
          await apiFetch(`/menu/items/${editing.id}/price`, {
            method: 'POST',
            body: { new_price: editing.price },
          })
        }
        push({ title: 'Menu item saved', body: `${editing.name} updated in the database.`, tone: 'success' })
      }
      setEditing(null)
      refetch()
    } catch (err) {
      push({ title: 'Save failed', body: err instanceof Error ? err.message : 'Unknown error', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await apiFetch(`/menu/items/${deleting.id}`, { method: 'DELETE' })
      push({ title: `${deleting.name} deleted`, tone: 'success' })
      setDeleting(null)
      refetch()
    } catch (err) {
      push({ title: 'Delete blocked', body: err instanceof Error ? err.message : 'Unknown error', tone: 'error' })
      setDeleting(null)
    }
  }

  const columns: Column<MenuRow>[] = [
    {
      key: 'name',
      header: 'Menu item',
      sort: (a, b) => a.name.localeCompare(b.name),
      render: (r) => (
        <div className="flex items-center gap-3">
          <FoodImage name={r.name} className="h-11 w-11 shrink-0" ratio="fill" />
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
      render: (r) => <span className="text-[13px] font-semibold tabular-nums text-ink">{money(r.price)}</span>,
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      hideBelow: 'md',
      sort: (a, b) => a.cost - b.cost,
      render: (r) => <span className="text-[13px] tabular-nums text-ink-muted">{money(r.cost)}</span>,
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
      key: 'demand',
      header: 'Demand',
      hideBelow: 'xl',
      render: (r) => <Badge tone={TIER_TONE[r.demandTier] ?? 'neutral'}>{r.demandTier}</Badge>,
    },
    {
      key: 'rating',
      header: 'Rating',
      hideBelow: 'lg',
      sort: (a, b) => a.rating - b.rating,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink">
          <Icon name="Star" size={12} className="fill-gold-500 text-gold-500" />
          {r.reviews > 0 ? r.rating.toFixed(1) : '—'}
        </span>
      ),
    },
    {
      key: 'available',
      header: 'Status',
      hideBelow: 'md',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            size="sm"
            checked={r.available}
            onChange={() => void toggleAvailability(r.id, !r.available)}
            disabled={!can('manager')}
          />
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
          <button onClick={() => setPreview(r)} className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-canvas hover:text-ink" aria-label="Preview">
            <Icon name="Eye" size={15} />
          </button>
          <button
            onClick={() => { setEditing(r); setErrors({}) }}
            disabled={!can('manager')}
            className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40"
            aria-label="Edit"
            title={can('manager') ? 'Edit item' : 'Requires manager role'}
          >
            <Icon name="Pencil" size={15} />
          </button>
          <button
            onClick={() => setDeleting(r)}
            disabled={!can('manager')}
            className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-clay-50 hover:text-clay-600 disabled:opacity-40"
            aria-label="Delete"
            title={can('manager') ? 'Delete item' : 'Requires manager role'}
          >
            <Icon name="Trash2" size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Menu Management"
        subtitle="Add, edit, reprice and de-list every dish — changes save to the database immediately."
        actions={
          <Button
            icon="Plus"
            disabled={!can('manager')}
            title={can('manager') ? 'Add menu item' : 'Requires manager role'}
            onClick={() => { setEditing({ ...BLANK, categoryId: categories[0]?.category_id ?? '' }); setErrors({}) }}
          >
            Add menu item
          </Button>
        }
        onRefresh={refetch}
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
        {categories.map((c) => {
          const items = rows.filter((r) => r.categoryId === c.category_id)
          return (
            <Card key={c.category_id} className="p-4" hover>
              <p className="font-display text-[15px] font-semibold text-ink">{c.category_name}</p>
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
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
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
              <Button size="xs" variant="secondary" icon="CheckCircle2" disabled={!can('manager')} onClick={() => void bulkAvailability(true)}>
                Make available
              </Button>
              <Button size="xs" variant="secondary" icon="EyeOff" disabled={!can('manager')} onClick={() => void bulkAvailability(false)}>
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
        title={editing && editing.id !== '' ? 'Edit menu item' : 'Add menu item'}
        subtitle={editing && editing.id !== '' ? `${editing.id} · price changes are versioned in pricing history.` : 'New dishes start with neutral pipeline tags.'}
        icon="UtensilsCrossed"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button icon="Save" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save item'}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-28 shrink-0">
                <FoodImage name={editing.name || 'New item'} ratio="square" />
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="text-[12.5px] font-semibold text-ink">Menu photography</p>
                <p className="text-[11.5px] text-ink-muted">The dataset carries no images — the storefront renders monogram tiles.</p>
              </div>
              <div className="w-full sm:w-40">
                <p className="mb-1.5 text-[12.5px] font-semibold text-ink">Availability</p>
                <Switch checked={editing.available} onChange={(v) => setEditing({ ...editing, available: v })} label={editing.available ? 'Available' : 'Hidden'} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Item name" required error={errors.name} className="sm:col-span-2">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} invalid={!!errors.name} placeholder="e.g. Chicken Dum Biryani" />
              </Field>
              <Field label="Category" required error={errors.category}>
                <Select
                  value={editing.categoryId}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value, category: categories.find((c) => c.category_id === e.target.value)?.category_name ?? editing.category })}
                  options={categories.map((c) => ({ label: c.category_name, value: c.category_id }))}
                />
              </Field>
              <Field label="Introduced">
                <Input value={editing.introduced || 'On creation'} disabled />
              </Field>
              <Field label="Selling price (USD)" required error={errors.price}>
                <Input type="number" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} invalid={!!errors.price} />
              </Field>
              <Field label="Item cost (USD)" required error={errors.cost} hint="Used to show contribution margin.">
                <Input type="number" step="0.01" value={editing.cost} onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) })} invalid={!!errors.cost} />
              </Field>
              <div className="rounded-xl border border-line bg-canvas p-3.5 sm:col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Contribution margin</p>
                <p className="font-display text-[20px] font-semibold text-ink">
                  {editing.price > 0 ? `${(((editing.price - editing.cost) / editing.price) * 100).toFixed(1)}%` : '—'}
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  {editing.price > 0 ? `${money(editing.price - editing.cost)} per unit` : 'Enter a price to calculate'}
                </p>
              </div>
            </div>

            {editing.id !== '' && (
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="neutral">Demand: {editing.demandTier}</Badge>
                <Badge tone="neutral">Wastage: {editing.wastageTag}</Badge>
                <Badge tone="neutral">Price sensitivity: {editing.priceSensTag}</Badge>
                {editing.seasonal && <Badge tone="gold">Seasonal</Badge>}
                {editing.promoDep && <Badge tone="gold">Promo-dependent</Badge>}
                <Badge tone="neutral">Rating {editing.reviews > 0 ? editing.rating.toFixed(1) : '—'} ({editing.reviews})</Badge>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Preview drawer */}
      <Drawer
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ''}
        subtitle={preview ? `${preview.category} · ${money(preview.price)}` : ''}
        width="md"
        footer={
          preview && (
            <>
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Close
              </Button>
              <Button
                icon="Pencil"
                disabled={!can('manager')}
                title={can('manager') ? 'Edit item' : 'Requires manager role'}
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
              <FoodImage name={preview.name} ratio="wide" rounded="none" />
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-[17px] font-semibold text-ink">{preview.name}</p>
                    <p className="text-[12.5px] text-ink-muted">{preview.category} · introduced {preview.introduced || '—'}</p>
                  </div>
                  <span className="font-display text-[19px] font-semibold text-ink">{money(preview.price)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone={TIER_TONE[preview.demandTier] ?? 'neutral'}>{preview.demandTier} demand</Badge>
                  <Badge tone="neutral">Wastage: {preview.wastageTag}</Badge>
                  <Badge tone="neutral">Price sensitivity: {preview.priceSensTag}</Badge>
                  {preview.seasonal && <Badge tone="gold">Seasonal</Badge>}
                  {preview.promoDep && <Badge tone="gold">Promo-dependent</Badge>}
                  {!preview.available && <Badge tone="clay">Hidden</Badge>}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { l: 'Item cost', v: money(preview.cost) },
                { l: 'Contribution margin', v: `${preview.marginPct}%` },
                { l: 'Rating', v: preview.reviews > 0 ? `${preview.rating.toFixed(1)} (${preview.reviews})` : 'No ratings yet' },
                { l: 'Status', v: preview.available ? 'Available' : 'Hidden' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="mt-0.5 text-[14px] font-semibold text-ink">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete this menu item?"
        message={<>“{deleting?.name}” will be permanently removed. Items with orders or ratings cannot be deleted — hide them instead.</>}
        confirmLabel="Delete item"
      />
    </div>
  )
}
