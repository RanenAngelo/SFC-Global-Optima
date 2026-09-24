import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Field, Icon, Input, SectionTitle, Select, Textarea, cn } from '../../components/ui/primitives'
import { FoodImage } from '../../components/shared'
import { OFFERS, OPENING_HOURS, SPECIALTIES } from '../../lib/data/store'
import { useToast } from '../../components/ui/overlay'
import { MENU } from '../../lib/data/menu'
import { pkr } from '../../lib/utils'

/* ══════════════════════════════ Offers ══════════════════════════════ */
export function OffersPage() {
  const { push } = useToast()
  const [tab, setTab] = useState('active')

  const active = OFFERS
  const expired = [
    { id: 'ex-1', title: 'Buy One Get One Pasta', code: 'PASTA2FOR1', ended: 'Ended 31 Aug', body: 'Two pasta dishes for the price of one on delivery orders.' },
    { id: 'ex-2', title: 'Student Lunch 15%', code: 'STUDENT15', ended: 'Ended 30 Jun', body: 'Fifteen percent off the lunch menu with a valid student card.' },
  ]

  return (
    <div className="pb-20 lg:pb-0">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Badge tone="ember" icon="BadgePercent">
                Demo offers
              </Badge>
              <h1 className="mt-4 font-display text-[36px] font-semibold leading-tight text-ink sm:text-[46px]">
                Offers worth coming in for
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-muted">
                Weekly specials, family bundles and late-night desserts. Show the code at checkout — the cart updates
                instantly in this prototype.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/menu">
                  <Button icon="UtensilsCrossed">Browse the menu</Button>
                </Link>
                <Link to="/cart">
                  <Button variant="secondary" icon="ShoppingBag">
                    Go to cart
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MENU.filter((m) => ['woodfired-pepperoni', 'chicken-dum-biryani'].includes(m.slug)).map((m) => (
                <div key={m.id} className="overflow-hidden rounded-2xl border border-line">
                  <FoodImage src={m.img} name={m.name} ratio="square" rounded="none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="mb-6 inline-flex gap-1 rounded-xl bg-canvas-deep p-1">
          {[
            { label: 'Active offers', value: 'active' },
            { label: 'Expired offers', value: 'expired' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'focus-ring rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-all',
                tab === t.value ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'active' ? (
          <div className="grid gap-5 md:grid-cols-2">
            {active.map((o) => (
              <Card key={o.id} className="flex flex-col overflow-hidden" hover>
                <div className="relative">
                  <FoodImage src={o.img} name={o.title} ratio="wide" rounded="none" />
                  <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                    {o.badge}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-[19px] font-semibold text-ink">{o.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{o.subtitle}</p>
                  <ul className="mt-3.5 space-y-1.5">
                    {o.terms.map((t) => (
                      <li key={t} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                        <Icon name="Check" size={12} className="mt-0.5 shrink-0 text-sage-600" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-canvas px-3.5 py-2.5">
                      <span className="font-mono text-[14px] font-bold tracking-wide text-ember-700">{o.code}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(o.code)
                          push({ title: `Code ${o.code} copied`, body: 'Apply it at checkout', tone: 'success' })
                        }}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-ink-soft transition-colors hover:bg-white hover:text-ink"
                      >
                        <Icon name="Copy" size={13} /> Copy
                      </button>
                    </div>
                    <p className="mt-2 text-[11.5px] text-ink-faint">{o.expires}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {expired.map((o) => (
              <Card key={o.id} className="flex flex-col p-5 opacity-75">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-[18px] font-semibold text-ink">{o.title}</h3>
                  <Badge tone="neutral">{o.ended}</Badge>
                </div>
                <p className="mt-1.5 text-[13.5px] text-ink-muted">{o.body}</p>
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-canvas px-3.5 py-2.5">
                  <span className="font-mono text-[13px] font-bold tracking-wide text-ink-faint line-through">{o.code}</span>
                  <span className="text-[11.5px] text-ink-faint">No longer valid</span>
                </div>
              </Card>
            ))}
            <div className="md:col-span-2">
              <Card className="border-dashed bg-transparent p-8 text-center">
                <Icon name="CalendarX2" size={22} className="mx-auto text-ink-faint" />
                <p className="mt-2 text-[14px] font-semibold text-ink">That is the end of the expired offers</p>
                <p className="mt-1 text-[13px] text-ink-muted">New offers are added every Wednesday.</p>
              </Card>
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1280px] px-4 pb-6 sm:px-6">
        <Card className="bg-canvas p-6">
          <h3 className="font-display text-[17px] font-semibold text-ink">How to use an offer</h3>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { t: 'Pick your dishes', d: 'Add qualifying items from the menu to your cart.' },
              { t: 'Enter the code', d: 'Type the code into the promo box on the cart or checkout page.' },
              { t: 'See it applied', d: 'The discount appears in the order summary before you pay.' },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember-600 text-[12px] font-bold text-white">{i + 1}</span>
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">{s.t}</span>
                  <span className="block text-[12.5px] text-ink-muted">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  )
}

/* ══════════════════════════════ About ══════════════════════════════ */
export function AboutPage() {
  return (
    <div className="pb-20 lg:pb-0">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge tone="ember">Our story</Badge>
              <h1 className="mt-4 font-display text-[36px] font-semibold leading-tight text-ink sm:text-[46px]">
                A woodfire kitchen in the middle of the city
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
                Maison Ember started in 2021 as a twelve-seat grill counter in Clifton. The idea was simple: cook fewer
                things, cook them properly, and let the fire do most of the work. Five years later we still grind our own
                mince, ferment our dough for two days and finish every plate to order.
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                Today the kitchen runs three branches across Karachi, but the rule has not changed. If a dish leaves the
                pass without contrast — something rich, something acidic, something with crunch — it goes back.
              </p>
              <div className="mt-7 grid grid-cols-3 gap-4 border-t border-line pt-6">
                {[
                  { v: '2021', l: 'First branch' },
                  { v: '3', l: 'Branches' },
                  { v: '48h', l: 'Dough ferment' },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="font-display text-[24px] font-semibold text-ink">{s.v}</p>
                    <p className="text-[12.5px] font-medium text-ink-muted">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="overflow-hidden rounded-2xl border border-line">
                <img src="/img/karahi.jpg" alt="Chicken karahi cooking" className="aspect-[4/5] w-full object-cover" />
              </div>
              <div className="mt-8 grid gap-3">
                <div className="overflow-hidden rounded-2xl border border-line">
                  <img src="/img/pizza.jpg" alt="Pizza from the stone oven" className="aspect-square w-full object-cover" />
                </div>
                <div className="overflow-hidden rounded-2xl border border-line">
                  <img src="/img/pasta.jpg" alt="Fresh pasta" className="aspect-square w-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6">
        <SectionTitle eyebrow="What we stand for" title="Four things we refuse to compromise on" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SPECIALTIES.map((s) => (
            <Card key={s.title} className="p-5">
              <span className="text-[22px]">{s.icon}</span>
              <h3 className="mt-3 font-display text-[16px] font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-ink py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-300">Milestones</p>
              <h2 className="mt-3 font-display text-[30px] font-semibold text-white">From a grill counter to three kitchens</h2>
              <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-white/60">
                Each branch keeps its own charcoal pit and pasta bench, so the food tastes the same wherever you sit.
              </p>
            </div>
            <ol className="space-y-6">
              {[
                { y: '2021', t: 'Clifton opens', d: 'Twelve seats, one charcoal pit and a five-dish menu.' },
                { y: '2022', t: 'Downtown opens', d: 'A stone oven joins the kitchen and pizza becomes a section.' },
                { y: '2024', t: 'Gulshan opens', d: 'Family dining, larger biryani service and late-night chai.' },
                { y: '2026', t: 'DineIQ Analytics', d: 'Menu and profitability intelligence across all three branches.' },
              ].map((m) => (
                <li key={m.y} className="flex gap-4">
                  <span className="w-12 shrink-0 font-display text-[15px] font-bold text-ember-300">{m.y}</span>
                  <span>
                    <span className="block text-[14.5px] font-semibold text-white">{m.t}</span>
                    <span className="block text-[13px] leading-relaxed text-white/60">{m.d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <Card className="overflow-hidden">
            <img src="/img/wings.jpg" alt="Ember buffalo wings" className="aspect-[16/10] w-full object-cover" />
            <div className="p-5">
              <h3 className="font-display text-[18px] font-semibold text-ink">Meet the kitchen</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
                Chef Zohaib Ansari leads a team of thirty-four across the three branches. Every new dish spends two weeks
                on the specials board before it earns a place on the printed menu.
              </p>
              <p className="mt-3 text-[12.5px] font-semibold text-ink-faint">— Maison Ember, Clifton</p>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-display text-[18px] font-semibold text-ink">Opening hours</h3>
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
                <p className="text-[12px] font-semibold text-ink">Private dining</p>
                <p className="mt-1 text-[12.5px] text-ink-muted">A 14-seat room at Clifton, bookable for events.</p>
              </div>
              <div className="rounded-xl border border-line bg-canvas p-3.5">
                <p className="text-[12px] font-semibold text-ink">Catering</p>
                <p className="mt-1 text-[12.5px] text-ink-muted">Biryani and grill platters from 20 guests.</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}

/* ══════════════════════════════ Contact ══════════════════════════════ */
const BRANCHES = [
  { name: 'Clifton Branch', address: 'Shop 4, Silk Residences, Block 7, Clifton, Karachi', phone: '+92 21 111 362 637', hours: '11:00 AM – 11:30 PM', manager: 'Rida Hussain', open: true },
  { name: 'Downtown Branch', address: 'Ground floor, Ember Tower, I. I. Chundrigar Road, Karachi', phone: '+92 21 111 362 638', hours: '12:00 PM – 11:00 PM', manager: 'Ahmed Faraz', open: true },
  { name: 'Gulshan Branch', address: 'Plot 12, Block 4, Gulshan-e-Iqbal, Karachi', phone: '+92 21 111 362 639', hours: '12:30 PM – 12:00 AM', manager: 'Sana Yousuf', open: false },
]

const FAQS = [
  { q: 'Do you take reservations?', a: 'Yes. Tables for two to eight can be booked online; larger groups are handled by the branch directly.' },
  { q: 'Is everything halal?', a: 'All meat is halal certified and no pork is served or stored in any of our kitchens.' },
  { q: 'How long does delivery take?', a: 'Twenty to thirty minutes depending on distance and weather. Peak Friday evenings can run longer.' },
  { q: 'Can I order for a large group?', a: 'Family bundles serve three to four people. For twenty or more, contact the branch for catering trays.' },
]

export function ContactPage() {
  const { push } = useToast()
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic: 'general', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const submit = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Please enter your name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Enter a valid email address.'
    if (form.message.trim().length < 10) e.message = 'Tell us a little more — at least 10 characters.'
    setErrors(e)
    if (Object.keys(e).length) {
      push({ title: 'Please check the highlighted fields', tone: 'error' })
      return
    }
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setForm({ name: '', email: '', phone: '', topic: 'general', message: '' })
      push({ title: 'Message sent (demo)', body: 'Nothing was transmitted in this prototype', tone: 'success' })
    }, 1000)
  }

  return (
    <div className="pb-20 lg:pb-0">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
          <Badge tone="ember">Contact</Badge>
          <h1 className="mt-4 font-display text-[36px] font-semibold text-ink sm:text-[44px]">Get in touch</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            Questions about an order, a reservation or a large booking? The branch teams answer fastest between 11 AM and
            11 PM every day.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] gap-8 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          {BRANCHES.map((b) => (
            <Card key={b.name} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[16.5px] font-semibold text-ink">{b.name}</h3>
                  <span className={cn('mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-semibold', b.open ? 'text-sage-600' : 'text-ink-faint')}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', b.open ? 'bg-sage-500' : 'bg-ink-faint')} />
                    {b.open ? 'Open now' : 'Opens 12:30 PM'}
                  </span>
                </div>
                <Badge tone="neutral">{b.manager}</Badge>
              </div>
              <dl className="mt-3.5 space-y-2.5 text-[13px]">
                <div className="flex gap-2.5">
                  <Icon name="MapPin" size={15} className="mt-0.5 shrink-0 text-ember-600" />
                  <dd className="text-ink-soft">{b.address}</dd>
                </div>
                <div className="flex gap-2.5">
                  <Icon name="Phone" size={15} className="shrink-0 text-ember-600" />
                  <dd className="text-ink-soft">{b.phone}</dd>
                </div>
                <div className="flex gap-2.5">
                  <Icon name="Clock" size={15} className="shrink-0 text-ember-600" />
                  <dd className="text-ink-soft">{b.hours}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" icon="Phone">
                  Call branch
                </Button>
                <Button size="sm" variant="ghost" icon="Navigation">
                  Directions
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-display text-[18px] font-semibold text-ink">Send us a message</h2>
            <p className="mt-1 text-[12.5px] text-ink-muted">Demo form — nothing is submitted anywhere.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Your name" required error={errors.name}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} placeholder="Zara Mehdi" icon="User" />
              </Field>
              <Field label="Email" required error={errors.email}>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!errors.email} placeholder="you@example.com" icon="Mail" />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 1234567" icon="Phone" />
              </Field>
              <Field label="Topic">
                <Select
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  options={[
                    { label: 'General enquiry', value: 'general' },
                    { label: 'Order issue', value: 'order' },
                    { label: 'Reservation', value: 'reservation' },
                    { label: 'Catering', value: 'catering' },
                    { label: 'Feedback', value: 'feedback' },
                  ]}
                />
              </Field>
              <Field label="Message" required error={errors.message} className="sm:col-span-2">
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  invalid={!!errors.message}
                  placeholder="Tell us how we can help…"
                  className="min-h-[120px]"
                />
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <Button icon="Send" loading={sending} onClick={submit}>
                Send message
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-[17px] font-semibold text-ink">Frequently asked</h2>
            <div className="mt-3 divide-y divide-line">
              {FAQS.map((f, i) => (
                <div key={f.q}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                  >
                    <span className="text-[13.5px] font-semibold text-ink">{f.q}</span>
                    <Icon name={openFaq === i ? 'ChevronUp' : 'ChevronDown'} size={16} className="shrink-0 text-ink-faint" />
                  </button>
                  {openFaq === i && <p className="pb-4 text-[13px] leading-relaxed text-ink-muted">{f.a}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
