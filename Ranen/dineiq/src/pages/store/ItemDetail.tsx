import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, Checkbox, Icon, IconButton, Rating, SectionTitle, SpiceLevel, Tabs, Textarea, cn } from '../../components/ui/primitives'
import { FoodImage } from '../../components/shared'
import { QtyStepper } from '../../components/store/DishCard'
import { useToast } from '../../components/ui/overlay'
import { MENU, menuBySlug, pairedItems, relatedItems } from '../../lib/data/menu'
import { BUNDLES } from '../../lib/data/analytics'
import { REVIEWS } from '../../lib/data/store'
import { useCart, useFavourites } from '../../store/app'
import { pkr } from '../../lib/utils'
import { EmptyState } from '../../components/ui/states'
import { DishCard } from '../../components/store/DishCard'

export default function ItemDetail() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const item = menuBySlug(slug)
  const { add } = useCart()
  const { toggle, isFav } = useFavourites()
  const { push } = useToast()

  const [sizeIdx, setSizeIdx] = useState(0)
  const [addons, setAddons] = useState<string[]>([])
  const [qty, setQty] = useState(1)
  const [instructions, setInstructions] = useState('')
  const [tab, setTab] = useState('overview')
  const [added, setAdded] = useState(false)

  const related = useMemo(() => relatedItems(slug, 4), [slug])
  const paired = useMemo(() => pairedItems(slug), [slug])

  if (!item) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6">
        <EmptyState
          variant="search"
          title="We couldn’t find that dish"
          message="The dish may have been renamed or removed from the demo menu."
          action={
            <Link to="/menu">
              <Button variant="secondary" size="sm" icon="ArrowLeft">
                Back to menu
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  const size = item.sizes?.[sizeIdx]
  const chosenAddons = (item.addons ?? []).filter((a) => addons.includes(a.name))
  const unitPrice = item.price + (size?.delta ?? 0) + chosenAddons.reduce((s, a) => s + a.price, 0)
  const fav = isFav(item.slug)
  const itemReviews = REVIEWS.filter((r) => r.dish === item.name)
  const reviews = itemReviews.length ? itemReviews : REVIEWS.slice(0, 2)

  const handleAdd = (goToCart = false) => {
    add(item, { size: size?.label, addons: chosenAddons, instructions, qty })
    setAdded(true)
    push({ title: `${qty} × ${item.name} added to cart`, body: `${pkr(unitPrice * qty)} · ${item.prep} prep`, tone: 'success' })
    setTimeout(() => setAdded(false), 2200)
    if (goToCart) navigate('/cart')
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6">
        <nav className="flex items-center gap-1.5 text-[12.5px] text-ink-faint">
          <Link to="/" className="hover:text-ink">Home</Link>
          <Icon name="ChevronRight" size={12} />
          <Link to="/menu" className="hover:text-ink">Menu</Link>
          <Icon name="ChevronRight" size={12} />
          <Link to={`/menu?category=${item.categorySlug}`} className="hover:text-ink">{item.category}</Link>
          <Icon name="ChevronRight" size={12} />
          <span className="truncate font-medium text-ink-muted">{item.name}</span>
        </nav>
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        {/* ── Gallery ─────────────────────────────────────── */}
        <div>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-white shadow-card">
            <FoodImage src={item.img} name={item.name} ratio="wide" rounded="none" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {item.tags.map((t) => (
                <span key={t} className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink shadow-sm backdrop-blur">
                  {t}
                </span>
              ))}
            </div>
            {!item.available && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm">
                <span className="rounded-full bg-ink px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white">Unavailable today</span>
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-3">
            {[item.img, '/img/pizza.jpg', '/img/wings.jpg', '/img/drink.jpg'].map((src, i) => (
              <button key={i} className="focus-ring overflow-hidden rounded-xl border border-line transition-colors hover:border-line-strong">
                <FoodImage src={src ?? undefined} name={`${item.name} view ${i + 1}`} ratio="square" rounded="none" />
              </button>
            ))}
          </div>

          {/* Info grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: 'Clock', label: 'Prep time', value: item.prep },
              { icon: 'Flame', label: 'Energy', value: `${item.kcal} kcal` },
              { icon: 'Users', label: 'Portion', value: item.portion },
              { icon: 'Award', label: 'Rating', value: `${item.rating} (${item.reviews})` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-line bg-white p-3.5">
                <Icon name={s.icon} size={15} className="text-ember-600" />
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{s.label}</p>
                <p className="mt-0.5 text-[13.5px] font-semibold text-ink">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <Tabs
              tabs={[
                { label: 'Overview', value: 'overview' },
                { label: 'Ingredients & allergens', value: 'ingredients' },
                { label: 'Reviews', value: 'reviews', count: reviews.length },
              ]}
              value={tab}
              onChange={setTab}
            />
            <div className="py-5">
              {tab === 'overview' && (
                <div className="space-y-4">
                  <p className="text-[14.5px] leading-relaxed text-ink-soft">{item.desc}</p>
                  <p className="text-[14.5px] leading-relaxed text-ink-muted">
                    Plated to order in the {item.category.toLowerCase()} section. Spice level can be adjusted on request —
                    leave a note in the special instructions box and the kitchen will tune the heat for you.
                  </p>
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="text-[13px] font-semibold text-ink">From the kitchen</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                      “We build this dish around contrast — something rich, something acidic, something with crunch. If
                      any of that is missing when it reaches your table, tell us and we will remake it.”
                    </p>
                    <p className="mt-2.5 text-[12px] font-semibold text-ink-faint">— Chef Zohaib, Maison Ember</p>
                  </div>
                </div>
              )}

              {tab === 'ingredients' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="text-[13px] font-semibold text-ink">Ingredients</p>
                    <ul className="mt-2.5 space-y-2">
                      {(item.ingredients.length ? item.ingredients : ['Fresh ingredients', 'House spice blend']).map((i) => (
                        <li key={i} className="flex items-center gap-2 text-[13.5px] text-ink-soft">
                          <Icon name="Check" size={13} className="text-sage-600" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="text-[13px] font-semibold text-ink">Allergens</p>
                    {item.allergens.length ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {item.allergens.map((a) => (
                          <Badge key={a} tone="clay" icon="AlertTriangle">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[13.5px] text-ink-muted">No declared allergens for this dish.</p>
                    )}
                    <p className="mt-3.5 rounded-xl bg-canvas px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
                      Our kitchen handles gluten, dairy, nuts and shellfish. Cross-contamination is possible even where a
                      dish has no declared allergens.
                    </p>
                  </div>
                </div>
              )}

              {tab === 'reviews' && (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-line bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: r.avatarTone }}>
                            {r.name.split(' ').map((n) => n[0]).join('')}
                          </span>
                          <div>
                            <p className="text-[13.5px] font-semibold text-ink">{r.name}</p>
                            <p className="text-[11.5px] text-ink-faint">{r.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Rating value={r.rating} />
                          <span className="text-[11.5px] text-ink-faint">{r.date}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">“{r.text}”</p>
                      {r.reply && (
                        <div className="mt-3 rounded-xl border-l-2 border-ember-300 bg-canvas px-3.5 py-2.5">
                          <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Response from Maison Ember</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{r.reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <p className="text-[12px] text-ink-faint">Demo reviews shown for interface presentation.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Order panel ─────────────────────────────────── */}
        <div className="lg:sticky lg:top-[128px] lg:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-line p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-ember-700">{item.category}</p>
                  <h1 className="mt-1.5 font-display text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">{item.name}</h1>
                </div>
                <IconButton
                  icon="Heart"
                  label={fav ? 'Remove from favourites' : 'Save to favourites'}
                  onClick={() => toggle(item.slug)}
                  className={cn('shrink-0', fav ? 'text-clay-500' : 'text-ink-faint')}
                  size={38}
                  variant="outline"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Rating value={item.rating} reviews={item.reviews} size={13} />
                <SpiceLevel level={item.spice} />
                <span className="text-[12.5px] text-ink-muted">{item.prep}</span>
              </div>

              <p className="mt-3.5 text-[14px] leading-relaxed text-ink-muted">{item.desc}</p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-[28px] font-semibold text-ink">{pkr(unitPrice)}</span>
                <span className="text-[13px] text-ink-faint">incl. taxes</span>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {item.sizes && (
                <div>
                  <p className="mb-2.5 text-[13px] font-semibold text-ink">Choose a size</p>
                  <div className="space-y-2">
                    {item.sizes.map((s, i) => (
                      <label
                        key={s.label}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors',
                          sizeIdx === i ? 'border-ember-600 bg-ember-50/60' : 'border-line hover:border-line-strong',
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="size"
                            checked={sizeIdx === i}
                            onChange={() => setSizeIdx(i)}
                            className="h-4 w-4 accent-ember-600"
                          />
                          <span className="text-[13.5px] font-medium text-ink">{s.label}</span>
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-ink">
                          {s.delta === 0 ? pkr(item.price) : `${s.delta > 0 ? '+' : '−'} ${pkr(Math.abs(s.delta))}`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {item.addons && (
                <div>
                  <p className="mb-2.5 text-[13px] font-semibold text-ink">Add-ons</p>
                  <div className="space-y-2">
                    {item.addons.map((a) => (
                      <Checkbox
                        key={a.name}
                        label={
                          <span className="flex items-center justify-between gap-3">
                            <span>{a.name}</span>
                            <span className="font-semibold text-ink">{a.price === 0 ? 'Free' : `+ ${pkr(a.price)}`}</span>
                          </span>
                        }
                        checked={addons.includes(a.name)}
                        onChange={() => setAddons((prev) => (prev.includes(a.name) ? prev.filter((x) => x !== a.name) : [...prev, a.name]))}
                        className="rounded-xl border border-line px-3.5 py-2.5 transition-colors hover:border-line-strong"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink">Special instructions</p>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. mild spice, no coriander, sauce on the side…"
                  maxLength={240}
                  className="min-h-[76px]"
                />
                <div className="mt-1 flex justify-between text-[11.5px] text-ink-faint">
                  <span>The kitchen reads every note.</span>
                  <span>{instructions.length}/240</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
                <div>
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Quantity</p>
                  <div className="mt-1.5">
                    <QtyStepper qty={qty} onChange={(v) => setQty(Math.max(1, v))} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Item total</p>
                  <p className="font-display text-[22px] font-semibold text-ink">{pkr(unitPrice * qty)}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <Button block size="lg" icon={added ? 'Check' : 'ShoppingBag'} onClick={() => handleAdd(false)} disabled={!item.available}>
                  {added ? 'Added to cart' : item.available ? `Add to cart · ${pkr(unitPrice * qty)}` : 'Currently unavailable'}
                </Button>
                <Button block size="lg" variant="dark" iconRight="ArrowRight" onClick={() => handleAdd(true)} disabled={!item.available}>
                  Order now
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-canvas p-3.5">
                <div className="flex items-center gap-2">
                  <Icon name="Truck" size={15} className="text-ember-600" />
                  <span className="text-[12px] text-ink-soft">Delivery in 20–30 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="Store" size={15} className="text-ember-600" />
                  <span className="text-[12px] text-ink-soft">Pickup in {item.prep}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="ShieldCheck" size={15} className="text-ember-600" />
                  <span className="text-[12px] text-ink-soft">Halal certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="RotateCcw" size={15} className="text-ember-600" />
                  <span className="text-[12px] text-ink-soft">Remade if not right</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Frequently paired ─────────────────────────────── */}
      <section className="mx-auto mt-12 max-w-[1280px] px-4 sm:px-6">
        <SectionTitle eyebrow="Goes well with" title="Frequently paired with this dish" desc="Demo pairings shown for interface presentation." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paired.map((p) => (
            <div key={p.id} className="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-3.5 transition-colors hover:border-line-strong hover:shadow-card">
              <Link to={`/menu/${p.slug}`} className="shrink-0">
                <FoodImage src={p.img} name={p.name} className="h-16 w-16" ratio="fill" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/menu/${p.slug}`}>
                  <p className="truncate text-[14px] font-semibold text-ink hover:text-ember-700">{p.name}</p>
                </Link>
                <p className="text-[12.5px] text-ink-muted">{pkr(p.price)} · {p.prep}</p>
              </div>
              <Button size="sm" variant="secondary" icon="Plus" onClick={() => { add(p); push({ title: `${p.name} added`, tone: 'success' }) }}>
                Add
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recommended combinations ──────────────────────── */}
      <section className="mt-12 bg-canvas-deep/60 py-14">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <SectionTitle eyebrow="Combos" title="Recommended combinations" desc="Bundled prices shown for interface presentation." />
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {BUNDLES.map((b) => (
              <Card key={b.id} className="overflow-hidden" hover>
                <FoodImage src={b.img} name={b.name} ratio="wide" rounded="none" />
                <div className="p-4">
                  <h3 className="font-display text-[15.5px] font-semibold text-ink">{b.name}</h3>
                  <ul className="mt-2 space-y-1">
                    {b.items.map((i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-ink-muted">
                        <Icon name="Check" size={12} className="mt-0.5 shrink-0 text-sage-600" />
                        {i}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3.5 flex items-center gap-2">
                    <span className="font-display text-[18px] font-semibold text-ink">{pkr(b.price)}</span>
                    <span className="text-[12.5px] text-ink-faint line-through">{pkr(b.was)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    block
                    className="mt-3"
                    icon="Plus"
                    onClick={() => push({ title: `${b.name} added to cart`, body: 'Demo bundle — presentation only', tone: 'success' })}
                  >
                    Add combo
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related dishes ────────────────────────────────── */}
      <section className="mx-auto mt-12 max-w-[1280px] px-4 pb-4 sm:px-6">
        <SectionTitle
          title="More from the kitchen"
          actions={
            <Link to="/menu">
              <Button variant="ghost" size="sm" iconRight="ArrowRight">
                Full menu
              </Button>
            </Link>
          }
        />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((r) => (
            <DishCard key={r.id} item={r} />
          ))}
        </div>
      </section>
    </div>
  )
}
