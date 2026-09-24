import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Icon, IconButton, Rating, SectionTitle, Textarea, Tooltip, cn } from '../../components/ui/primitives'
import { FoodImage } from '../../components/shared'
import { QtyStepper } from '../../components/store/DishCard'
import { ConfirmDialog, useToast } from '../../components/ui/overlay'
import { EmptyState } from '../../components/ui/states'
import { useCart } from '../../store/app'
import { MENU, menuBySlug } from '../../lib/data/menu'
import { pkr } from '../../lib/utils'

const SUGGESTED = ['truffle-parmesan-fries', 'chicken-dum-biryani', 'molten-lava-cake', 'mango-lassi']
  .map((s) => menuBySlug(s))
  .filter(Boolean) as NonNullable<ReturnType<typeof menuBySlug>>[]

export default function CartPage() {
  const cart = useCart()
  const navigate = useNavigate()
  const { push } = useToast()
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [promoInput, setPromoInput] = useState('')
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const { lines, saved, totals, isEmpty } = cart
  const freeDeliveryTarget = 2500
  const progress = Math.min(100, (totals.subtotal / freeDeliveryTarget) * 100)
  const remaining = Math.max(0, freeDeliveryTarget - totals.subtotal)

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <h1 className="font-display text-[30px] font-semibold text-ink">Your cart</h1>
        <div className="mt-6">
          <Card>
            <EmptyState
              variant="cart"
              title="Your cart is empty"
              message="Add a dish from the menu and it will show up here with your add-ons, size and special instructions."
              action={
                <Link to="/menu">
                  <Button icon="UtensilsCrossed">Browse the menu</Button>
                </Link>
              }
              secondaryAction={
                saved.length > 0 ? (
                  <Button variant="secondary" icon="Bookmark" onClick={() => cart.moveToCart(saved[0].lineId)}>
                    Move saved item to cart
                  </Button>
                ) : undefined
              }
            />
          </Card>
        </div>
        {saved.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-[18px] font-semibold text-ink">Saved for later ({saved.length})</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((l) => (
                <SavedCard key={l.lineId} line={l} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label">Maison Ember · Clifton</p>
              <h1 className="mt-2 font-display text-[32px] font-semibold text-ink">Your cart</h1>
              <p className="mt-1.5 text-[14px] text-ink-muted">
                {lines.length} {lines.length === 1 ? 'item' : 'items'} · Estimated delivery 20–30 min
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas p-1">
              {(['delivery', 'pickup'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => cart.setFulfilment(f)}
                  className={cn(
                    'focus-ring rounded-lg px-3.5 py-2 text-[13px] font-semibold capitalize transition-all',
                    cart.fulfilment === f ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.5fr_1fr]">
        {/* ── Cart lines ──────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          {cart.fulfilment === 'delivery' && remaining > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-ink-soft">
                  Add <span className="font-semibold text-ink">{pkr(remaining)}</span> more for free delivery
                </p>
                <Link to="/menu" className="text-[13px] font-semibold text-ember-700 hover:underline">
                  Add dishes
                </Link>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-ember-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <Card className="divide-y divide-line">
            {lines.map((l) => {
              const item = menuBySlug(l.slug)
              const unit = l.price + l.addons.reduce((s, a) => s + a.price, 0)
              return (
                <div key={l.lineId} className="p-4 sm:p-5">
                  <div className="flex gap-3.5">
                    <Link to={`/menu/${l.slug}`} className="shrink-0">
                      <FoodImage src={l.img} name={l.name} className="h-20 w-20 sm:h-24 sm:w-24" ratio="fill" />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/menu/${l.slug}`} className="font-display text-[16px] font-semibold text-ink hover:text-ember-700">
                            {l.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted">
                            {l.size && <span className="rounded-md bg-canvas px-1.5 py-0.5 font-semibold text-ink-soft">{l.size}</span>}
                            {item && <Rating value={item.rating} />}
                            <span>{item?.prep ?? '18 min'}</span>
                          </div>
                          {l.addons.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {l.addons.map((a) => (
                                <li key={a.name} className="flex items-center justify-between gap-3 text-[12.5px] text-ink-muted">
                                  <span className="flex items-center gap-1.5">
                                    <Icon name="Plus" size={11} className="text-ink-faint" />
                                    {a.name}
                                  </span>
                                  <span className="tabular-nums">{a.price === 0 ? 'Free' : pkr(a.price)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-display text-[16px] font-semibold text-ink">{pkr(unit * l.qty)}</p>
                          <p className="text-[11.5px] text-ink-faint">{pkr(unit)} each</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <QtyStepper qty={l.qty} onChange={(v) => cart.setQty(l.lineId, v)} />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedNote(expandedNote === l.lineId ? null : l.lineId)}
                            className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                          >
                            <Icon name="MessageSquarePlus" size={13} />
                            {l.instructions ? 'Edit note' : 'Add note'}
                          </button>
                          <Tooltip content="Save for later">
                            <button
                              onClick={() => {
                                cart.saveForLater(l.lineId)
                                push({ title: `${l.name} saved for later`, tone: 'info' })
                              }}
                              aria-label="Save for later"
                              className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                            >
                              <Icon name="Bookmark" size={13} />
                              <span className="hidden sm:inline">Save</span>
                            </button>
                          </Tooltip>
                          <button
                            onClick={() => setPendingRemove(l.lineId)}
                            aria-label="Remove item"
                            className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-clay-600 transition-colors hover:bg-clay-50"
                          >
                            <Icon name="Trash2" size={13} />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      </div>

                      {l.instructions && expandedNote !== l.lineId && (
                        <p className="mt-2.5 rounded-lg bg-canvas px-3 py-2 text-[12.5px] italic text-ink-muted">“{l.instructions}”</p>
                      )}

                      {expandedNote === l.lineId && (
                        <div className="mt-3">
                          <Textarea
                            defaultValue={l.instructions}
                            placeholder="Special instructions for the kitchen…"
                            className="min-h-[72px]"
                            onBlur={(e) => cart.setInstructions(l.lineId, e.target.value)}
                          />
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="xs"
                              onClick={(e) => {
                                const el = (e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement) ?? null
                                cart.setInstructions(l.lineId, el?.value ?? '')
                                setExpandedNote(null)
                                push({ title: 'Note saved', tone: 'success' })
                              }}
                            >
                              Save note
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => setExpandedNote(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>

          {saved.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-[17px] font-semibold text-ink">Saved for later ({saved.length})</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {saved.map((l) => (
                  <SavedCard key={l.lineId} line={l} />
                ))}
              </div>
            </div>
          )}

          {/* Suggested add-ons */}
          <div>
            <SectionTitle title="Complete your order" desc="Dishes that pair well with what is in your cart." />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SUGGESTED.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                  <FoodImage src={s.img} name={s.name} className="h-14 w-14 shrink-0" ratio="fill" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{s.name}</p>
                    <p className="text-[12.5px] text-ink-muted">{pkr(s.price)}</p>
                  </div>
                  <Button
                    size="xs"
                    variant="secondary"
                    icon="Plus"
                    onClick={() => {
                      cart.add(s)
                      push({ title: `${s.name} added to cart`, tone: 'success' })
                    }}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Summary ─────────────────────────────────────── */}
        <div className="lg:sticky lg:top-[128px] lg:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-line p-5">
              <h2 className="font-display text-[18px] font-semibold text-ink">Order summary</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">Demo values for interface presentation.</p>

              <div className="mt-4">
                <label className="text-[12.5px] font-semibold text-ink">Promo code</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="e.g. PIZZA20"
                    className="focus-ring h-10 w-full rounded-xl border border-line-strong px-3 text-[13px] font-semibold uppercase tracking-wide"
                  />
                  <Button
                    size="sm"
                    variant={cart.promo ? 'secondary' : 'primary'}
                    onClick={() => {
                      if (cart.promo) {
                        cart.clearPromo()
                        setPromoInput('')
                        push({ title: 'Promo code removed', tone: 'info' })
                      } else if (promoInput.trim()) {
                        const ok = cart.applyPromo(promoInput)
                        push(
                          ok
                            ? { title: 'Promo applied', body: cart.promo ? '' : 'Discount added to your order', tone: 'success' }
                            : { title: 'Invalid code', body: cart.promoError ?? '', tone: 'error' },
                        )
                      }
                    }}
                  >
                    {cart.promo ? 'Remove' : 'Apply'}
                  </Button>
                </div>
                {cart.promoError && <p className="mt-1.5 text-[12px] font-medium text-clay-600">{cart.promoError}</p>}
                {cart.promo && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-sage-50 px-2.5 py-1.5 text-[12px] font-semibold text-sage-700">
                    <Icon name="Check" size={13} /> {cart.promo} applied
                  </p>
                )}
                {!cart.promo && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {['PIZZA20', 'WELCOME10', 'FREESHIP'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setPromoInput(c)}
                        className="rounded-md border border-dashed border-line-strong px-2 py-1 font-mono text-[11px] font-bold text-ink-muted hover:border-ember-400 hover:text-ember-700"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2.5 p-5">
              <Row label="Subtotal" value={pkr(totals.subtotal)} />
              {totals.discount > 0 && <Row label={`Discount (${cart.promo})`} value={`− ${pkr(totals.discount)}`} tone="text-sage-600" />}
              <Row
                label={cart.fulfilment === 'delivery' ? 'Delivery fee' : 'Pickup'}
                value={cart.fulfilment === 'delivery' ? pkr(totals.delivery) : 'Free'}
              />
              <Row label="Sales tax (5%)" value={pkr(totals.tax)} />
              <div className="h-px bg-line" />
              <div className="flex items-baseline justify-between gap-3 pt-1">
                <span className="text-[14px] font-semibold text-ink">Grand total</span>
                <span className="font-display text-[24px] font-semibold text-ink">{pkr(totals.total)}</span>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-line bg-canvas/60 p-5">
              <Button block size="lg" iconRight="ArrowRight" onClick={() => navigate('/checkout')}>
                Proceed to checkout
              </Button>
              <Link to="/menu" className="block">
                <Button block size="lg" variant="secondary" icon="ArrowLeft">
                  Continue shopping
                </Button>
              </Link>
              <p className="pt-1 text-center text-[11.5px] text-ink-faint">
                Prices are demo values in PKR. No payment is processed in this prototype.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => {
          const l = lines.find((x) => x.lineId === pendingRemove)
          if (l) {
            cart.remove(l.lineId)
            push({ title: `${l.name} removed from cart`, tone: 'info' })
          }
          setPendingRemove(null)
        }}
        title="Remove this item?"
        message={<>“{lines.find((x) => x.lineId === pendingRemove)?.name}” will be removed from your cart. You can add it again from the menu.</>}
        confirmLabel="Remove item"
      />
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13.5px] text-ink-muted">{label}</span>
      <span className={cn('text-[13.5px] font-semibold tabular-nums', tone ?? 'text-ink')}>{value}</span>
    </div>
  )
}

function SavedCard({ line }: { line: import('../../store/app').CartLine }) {
  const cart = useCart()
  const { push } = useToast()
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-white p-3">
      <FoodImage src={line.img} name={line.name} className="h-14 w-14 shrink-0" ratio="fill" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{line.name}</p>
        <p className="text-[12.5px] text-ink-muted">{pkr(line.price)}</p>
      </div>
      <Button
        size="xs"
        variant="secondary"
        icon="ShoppingBag"
        onClick={() => {
          cart.moveToCart(line.lineId)
          push({ title: `${line.name} moved to cart`, tone: 'success' })
        }}
      >
        Move to cart
      </Button>
    </div>
  )
}
