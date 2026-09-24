import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Icon, Rating, SectionTitle, Tabs, cn } from '../../components/ui/primitives'
import { FoodImage } from '../../components/shared'
import { DishCard } from '../../components/store/DishCard'
import { CATEGORIES, MENU, POPULAR_ITEMS, VEG_ITEMS } from '../../lib/data/menu'
import { OFFERS, OPENING_HOURS, REVIEWS, SPECIALTIES } from '../../lib/data/store'
import { pkr } from '../../lib/utils'

const FEATURES = [
  { icon: 'Flame', title: 'Live fire cooking', body: 'Charcoal grill and cast iron, fired from open till close.' },
  { icon: 'Timer', title: '48-hour dough', body: 'Cold-fermented pizza bases, stretched to order.' },
  { icon: 'ShieldCheck', title: 'Quality sourcing', body: 'Local produce and halal-certified meat suppliers.' },
  { icon: 'Bike', title: '20–30 min delivery', body: 'Insulated packaging across Clifton, PECHS and Gulshan.' },
]

const FEATURED_TABS = [
  { label: 'Bestsellers', value: 'popular' },
  { label: 'Chef picks', value: 'chef' },
  { label: 'Vegetarian', value: 'veg' },
  { label: 'New on the menu', value: 'new' },
]

export default function Home() {
  const [tab, setTab] = useState('popular')

  const featured =
    tab === 'popular'
      ? POPULAR_ITEMS
      : tab === 'chef'
        ? MENU.filter((m) => m.recommended)
        : tab === 'veg'
          ? VEG_ITEMS.slice(0, 8)
          : MENU.filter((m) => m.new || m.tags.includes('New'))

  return (
    <div className="pb-20 lg:pb-0">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1280px] px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-ember-200 bg-ember-50 px-3 py-1.5 text-[12px] font-semibold text-ember-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember-600" />
              </span>
              Open now · Clifton until 11:30 PM
            </span>

            <h1 className="mt-5 font-display text-[42px] font-semibold leading-[1.03] tracking-[-0.03em] text-ink sm:text-[56px] lg:text-[62px]">
              Good Food.
              <br />
              <span className="text-ember-600">Better Moments.</span>
            </h1>

            <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-ink-muted sm:text-base">
              Discover freshly prepared dishes crafted with quality ingredients and served with care. Woodfire cooking,
              48-hour dough and dum-cooked biryani — plated the way it should be.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/menu">
                <Button size="lg" icon="UtensilsCrossed">
                  Explore Menu
                </Button>
              </Link>
              <Link to="/menu/maison-signature-smash">
                <Button size="lg" variant="dark" iconRight="ArrowRight">
                  Order Now
                </Button>
              </Link>
            </div>

            <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                { k: '4.6 / 5', v: 'Guest rating', sub: '2,184 reviews' },
                { k: '20–30 min', v: 'Average delivery', sub: 'Insulated packaging' },
                { k: '3 branches', v: 'Across Karachi', sub: 'Clifton · Downtown · Gulshan' },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="font-display text-[19px] font-semibold text-ink">{s.k}</dt>
                  <dd className="mt-0.5 text-[12px] font-semibold text-ink-soft">{s.v}</dd>
                  <dd className="text-[11px] text-ink-faint">{s.sub}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative animate-fade-up">
            <div className="relative">
              <div className="overflow-hidden rounded-[28px] border border-line shadow-lift">
                <img src="/img/hero-burger.jpg" alt="Maison Signature Smash burger" className="aspect-[4/5] w-full object-cover lg:aspect-[5/6]" />
              </div>

              <div className="absolute -bottom-5 -left-3 hidden w-[168px] overflow-hidden rounded-2xl border border-line bg-white p-3 shadow-pop sm:block lg:-left-8">
                <div className="overflow-hidden rounded-xl">
                  <img src="/img/pizza.jpg" alt="Woodfired pepperoni pizza" className="aspect-square w-full object-cover" />
                </div>
                <p className="mt-2.5 text-[13px] font-semibold text-ink">Woodfired Pizza</p>
                <p className="text-[11.5px] text-ink-muted">From {pkr(1250)}</p>
              </div>

              <div className="absolute -right-2 top-6 hidden rounded-2xl border border-line bg-white/96 px-4 py-3 shadow-pop backdrop-blur sm:block lg:-right-6">
                <div className="flex items-center gap-2">
                  <Rating value={4.9} />
                </div>
                <p className="mt-1.5 text-[12.5px] font-semibold text-ink">Signature Smash</p>
                <p className="text-[11.5px] text-ink-muted">742 orders this month</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature strip ──────────────────────────────────────────── */}
      <section className="mx-auto mt-14 max-w-[1280px] px-4 sm:px-6">
        <div className="grid gap-4 rounded-3xl border border-line bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas-deep text-ember-600">
                <Icon name={f.icon} size={18} />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-ink">{f.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-[1280px] px-4 sm:px-6">
        <SectionTitle
          eyebrow="Browse"
          title="Popular categories"
          desc="Eight kitchens under one roof — from the charcoal grill to the stone oven and the pasta bench."
          actions={
            <Link to="/menu">
              <Button variant="secondary" size="sm" iconRight="ArrowRight">
                View full menu
              </Button>
            </Link>
          }
        />
        <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const count = MENU.filter((m) => m.categorySlug === c.slug).length
            return (
              <Link
                key={c.slug}
                to={`/menu?category=${c.slug}`}
                className="group flex items-center gap-3.5 rounded-2xl border border-line bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-canvas-deep text-[20px] transition-colors group-hover:bg-ember-50">
                  {c.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[15px] font-semibold text-ink">{c.name}</span>
                  <span className="block truncate text-[12px] text-ink-muted">{count} dishes</span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Featured dishes ────────────────────────────────────────── */}
      <section className="mt-16 bg-canvas-deep/60 py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <SectionTitle eyebrow="Kitchen highlights" title="Featured dishes" desc="The plates our guests come back for, week after week." />
          <div className="mt-5">
            <Tabs tabs={FEATURED_TABS} value={tab} onChange={setTab} variant="pill" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 8).map((item) => (
              <DishCard key={item.id} item={item} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/menu">
              <Button variant="secondary" iconRight="ArrowRight">
                See all {MENU.length} dishes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Offers ─────────────────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-[1280px] px-4 sm:px-6">
        <SectionTitle
          eyebrow="Today’s offers"
          title="Something on for everyone"
          desc="Demo offers shown for interface presentation. Apply a code at checkout to see the cart update."
          actions={
            <Link to="/offers">
              <Button variant="ghost" size="sm" iconRight="ArrowRight">
                All offers
              </Button>
            </Link>
          }
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {OFFERS.slice(0, 3).map((o) => (
            <Card key={o.id} className="group overflow-hidden" hover>
              <div className="relative">
                <FoodImage src={o.img} name={o.title} ratio="wide" rounded="none" />
                <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                  {o.badge}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-display text-[16.5px] font-semibold text-ink">{o.title}</h3>
                <p className="mt-1 text-[13px] leading-snug text-ink-muted">{o.subtitle}</p>
                <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-canvas px-3 py-2">
                  <span className="font-mono text-[13px] font-bold tracking-wide text-ember-700">{o.code}</span>
                  <span className="text-[11.5px] text-ink-faint">{o.expires}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Specialties ────────────────────────────────────────────── */}
      <section className="mt-16 bg-ink py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-300">The Maison Ember way</p>
              <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-white sm:text-[38px]">
                Cooked over fire. Plated with restraint.
              </h2>
              <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-white/65">
                Every section of the kitchen works to a simple rule: fewer ingredients, handled better. We grind our own
                mince, ferment our dough for two days and finish plates to order.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {SPECIALTIES.map((s) => (
                <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <span className="text-[22px]">{s.icon}</span>
                  <h3 className="mt-3 font-display text-[16px] font-semibold text-white">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews ────────────────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-[1280px] px-4 sm:px-6">
        <SectionTitle eyebrow="Guest feedback" title="What our guests say" desc="Demo reviews written for interface presentation." />
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_2fr]">
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <p className="font-display text-[46px] font-semibold leading-none text-ink">4.6</p>
            <Rating value={4.6} size={15} />
            <p className="mt-2 text-[13px] text-ink-muted">Based on 2,184 demo reviews</p>
            <div className="mt-4 w-full space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-5 text-[11px] font-semibold text-ink-faint">{s}★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-gold-500" style={{ width: `${[78, 18, 5, 2, 1][5 - s]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            {REVIEWS.slice(0, 4).map((r) => (
              <Card key={r.id} className="flex flex-col p-5">
                <Rating value={r.rating} />
                <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-ink-soft">“{r.text}”</p>
                <div className="mt-4 flex items-center gap-3 border-t border-line pt-3.5">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ background: r.avatarTone }}
                  >
                    {r.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{r.name}</span>
                    <span className="block truncate text-[11.5px] text-ink-muted">
                      {r.role} · {r.dish}
                    </span>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Restaurant info ────────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-[1280px] px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card className="overflow-hidden">
            <div className="relative h-[240px] bg-canvas-deep">
              <svg viewBox="0 0 400 240" className="h-full w-full" role="img" aria-label="Stylised map of the branch location">
                <rect width="400" height="240" fill="#F1ECE4" />
                <g stroke="#DED5C8" strokeWidth="1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 30} x2="400" y2={i * 30} />
                  ))}
                  {Array.from({ length: 14 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="240" />
                  ))}
                </g>
                <path d="M0 168 L120 168 L150 132 L400 132" stroke="#E3D9CB" strokeWidth="14" fill="none" />
                <path d="M60 0 L60 240" stroke="#E3D9CB" strokeWidth="10" fill="none" />
                <path d="M300 0 L300 240" stroke="#E3D9CB" strokeWidth="8" fill="none" />
                <rect x="150" y="60" width="90" height="52" rx="6" fill="#E7DECE" />
                <rect x="258" y="72" width="60" height="40" rx="5" fill="#E7DECE" />
                <circle cx="196" cy="86" r="22" fill="#B54E17" opacity="0.12" />
                <circle cx="196" cy="86" r="9" fill="#B54E17" />
                <text x="196" y="118" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1D1B19" fontFamily="Inter, sans-serif">
                  MAISON EMBER
                </text>
                <text x="196" y="130" textAnchor="middle" fontSize="8" fill="#726B62" fontFamily="Inter, sans-serif">
                  Block 7, Clifton
                </text>
              </svg>
              <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[11.5px] font-semibold text-ink shadow-sm">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sage-500 align-middle" />
                Clifton Branch · 1.2 km away
              </span>
            </div>
            <div className="p-5">
              <h3 className="font-display text-[17px] font-semibold text-ink">Find us in Clifton</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
                Shop 4, Silk Residences, Block 7, Clifton, Karachi. Valet parking available from 7 PM. Wheelchair
                accessible entrance on the north side.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon="Navigation">
                  Get directions
                </Button>
                <Link to="/contact">
                  <Button variant="ghost" size="sm" icon="Phone">
                    +92 21 111 362 637
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display text-[17px] font-semibold text-ink">Opening hours</h3>
            <p className="mt-1 text-[13px] text-ink-muted">Kitchen closes 30 minutes before the branch.</p>
            <ul className="mt-4 divide-y divide-line">
              {OPENING_HOURS.map((o) => (
                <li key={o.day} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-[13.5px] font-medium text-ink-soft">{o.day}</span>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{o.hours}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-canvas p-3.5">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                  <Icon name="Truck" size={14} className="text-ember-600" /> Delivery
                </p>
                <p className="mt-1 text-[12.5px] text-ink-muted">20–30 min · Rs. 150 fee · Free over Rs. 2,500</p>
              </div>
              <div className="rounded-xl border border-line bg-canvas p-3.5">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                  <Icon name="Store" size={14} className="text-ember-600" /> Pickup
                </p>
                <p className="mt-1 text-[12.5px] text-ink-muted">Ready in 20 min · No fee · Counter 1</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-[1280px] px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-white">
          <div className="grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <h2 className="font-display text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">
                Hosting tonight? Let the kitchen handle it.
              </h2>
              <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-ink-muted">
                Family bundles, sharing platters and slow-cooked biryani for four to six guests. Order ahead and pick a
                slot that suits your table.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/menu?category=rice-bowls">
                  <Button icon="UtensilsCrossed">Order for the table</Button>
                </Link>
                <Link to="/contact">
                  <Button variant="secondary" icon="CalendarCheck">
                    Reserve a table
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MENU.filter((m) => ['chicken-dum-biryani', 'woodfired-pepperoni', 'ember-buffalo-wings', 'molten-lava-cake'].includes(m.slug)).map((m) => (
                <Link key={m.slug} to={`/menu/${m.slug}`} className="group overflow-hidden rounded-2xl border border-line">
                  <FoodImage src={m.img} name={m.name} ratio="square" rounded="none" />
                  <div className="p-2.5">
                    <p className="truncate text-[12px] font-semibold text-ink group-hover:text-ember-700">{m.name}</p>
                    <p className="text-[11.5px] font-bold text-ink-muted">{pkr(m.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
