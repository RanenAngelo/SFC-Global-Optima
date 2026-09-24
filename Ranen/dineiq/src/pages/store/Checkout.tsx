import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Badge, Button, Card, Checkbox, Field, Icon, Input, Radio, Select, Textarea, Tooltip, cn,
} from '../../components/ui/primitives'
import { FoodImage } from '../../components/shared'
import { useCart } from '../../store/app'
import { ADDRESSES, SAVED_CARDS, WALLETS } from '../../lib/data/store'
import { pkr } from '../../lib/utils'
import { ConfirmDialog, useToast } from '../../components/ui/overlay'

const STEPS = [
  { key: 1, label: 'Customer', icon: 'User' },
  { key: 2, label: 'Fulfilment', icon: 'Truck' },
  { key: 3, label: 'Address', icon: 'MapPin' },
  { key: 4, label: 'Payment', icon: 'CreditCard' },
  { key: 5, label: 'Review', icon: 'ClipboardCheck' },
]

const SLOTS = ['ASAP (20–30 min)', 'Today, 9:00 – 9:30 PM', 'Today, 10:00 – 10:30 PM', 'Tomorrow, 1:00 – 1:30 PM']

export default function Checkout() {
  const cart = useCart()
  const navigate = useNavigate()
  const { push } = useToast()

  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name: 'Zara Mehdi',
    phone: '+92 300 1234567',
    email: 'zara.m@example.com',
    fulfilment: cart.fulfilment,
    slot: SLOTS[0],
    addressId: ADDRESSES[0].id,
    line1: ADDRESSES[0].line1,
    area: ADDRESSES[0].area,
    instructions: '',
    payment: 'cod' as 'cod' | 'card' | 'wallet',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardName: '',
    wallet: WALLETS[0].id,
    saveCard: false,
    tip: 0,
    contactless: true,
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (!form.name.trim()) e.name = 'Please enter your full name.'
      if (!/^[+\d][\d\s-]{7,}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number, e.g. +92 300 1234567.'
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.'
    }
    if (s === 3 && form.fulfilment === 'delivery') {
      if (!form.line1.trim()) e.line1 = 'Delivery address is required.'
      if (!form.area.trim()) e.area = 'Area or locality is required.'
    }
    if (s === 4 && form.payment === 'card') {
      if (form.cardNumber.replace(/\s/g, '').length < 16) e.cardNumber = 'Enter the 16-digit card number.'
      if (!/^\d{2}\/\d{2}$/.test(form.cardExpiry)) e.cardExpiry = 'Use MM/YY format.'
      if (form.cardCvc.length < 3) e.cardCvc = 'Enter the 3-digit security code.'
      if (!form.cardName.trim()) e.cardName = 'Name on card is required.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (!validate(step)) {
      push({ title: 'Please check the highlighted fields', tone: 'error' })
      return
    }
    if (step === 2 && form.fulfilment === 'pickup') setStep(4)
    else setStep((s) => Math.min(5, s + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tipAmount = form.tip
  const grandTotal = cart.totals.total + tipAmount

  const placeOrder = () => {
    const number = `ME-${Math.floor(24817 + Math.random() * 400)}`
    cart.clear()
    push({ title: 'Order placed', body: `${number} · prototype confirmation`, tone: 'success' })
    navigate(`/order-confirmed/${number}`)
  }

  if (cart.isEmpty) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Card className="p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ember-50 text-ember-600">
            <Icon name="ShoppingBag" size={24} />
          </div>
          <h1 className="mt-4 font-display text-[22px] font-semibold text-ink">Nothing to check out</h1>
          <p className="mt-1.5 text-[14px] text-ink-muted">Add a few dishes to your cart and the checkout will open here.</p>
          <Link to="/menu" className="mt-5 inline-block">
            <Button icon="UtensilsCrossed">Browse the menu</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6">
          <h1 className="font-display text-[28px] font-semibold text-ink">Checkout</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">Demo checkout — no payment is processed and no data is stored.</p>

          {/* Stepper */}
          <ol className="mt-6 flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => {
              const done = step > s.key
              const active = step === s.key
              return (
                <li key={s.key} className="flex min-w-0 items-center gap-1">
                  <button
                    onClick={() => done && setStep(s.key)}
                    disabled={!done}
                    className={cn(
                      'focus-ring flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors',
                      active ? 'bg-ember-50 text-ember-700' : done ? 'text-ink-soft hover:bg-canvas' : 'text-ink-faint',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        active ? 'bg-ember-600 text-white' : done ? 'bg-sage-600 text-white' : 'bg-line text-ink-muted',
                      )}
                    >
                      {done ? <Icon name="Check" size={13} /> : s.key}
                    </span>
                    <span className="hidden whitespace-nowrap text-[13px] font-semibold sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <span className={cn('h-px w-6 shrink-0', done ? 'bg-sage-500' : 'bg-line')} />}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-5">
          {/* Step 1 — Customer information */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas-deep text-[13px] font-bold text-ink">1</span>
              <div>
                <h2 className="font-display text-[17px] font-semibold text-ink">Customer information</h2>
                <p className="text-[12.5px] text-ink-muted">So the kitchen and rider can reach you.</p>
              </div>
            </div>
            {step === 1 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required error={errors.name}>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} placeholder="Zara Mehdi" icon="User" />
                </Field>
                <Field label="Phone number" required error={errors.phone} hint="We only call about this order.">
                  <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} invalid={!!errors.phone} placeholder="+92 300 1234567" icon="Phone" />
                </Field>
                <Field label="Email" required error={errors.email} className="sm:col-span-2" hint="Your receipt and order updates are sent here.">
                  <Input value={form.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} placeholder="you@example.com" icon="Mail" />
                </Field>
                <div className="sm:col-span-2">
                  <Checkbox label="Send me order updates by SMS" defaultChecked desc="Demo preference — nothing is transmitted." />
                </div>
              </div>
            ) : (
              <SummaryRow value={`${form.name} · ${form.phone} · ${form.email}`} onEdit={() => setStep(1)} />
            )}
          </Card>

          {/* Step 2 — Fulfilment */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas-deep text-[13px] font-bold text-ink">2</span>
              <div>
                <h2 className="font-display text-[17px] font-semibold text-ink">Delivery or pickup</h2>
                <p className="text-[12.5px] text-ink-muted">Choose how you would like to receive this order.</p>
              </div>
            </div>
            {step === 2 ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: 'delivery', icon: 'Truck', title: 'Delivery', body: '20–30 min · Rs. 150', sub: 'Clifton, PECHS and Gulshan' },
                    { key: 'pickup', icon: 'Store', title: 'Pickup', body: 'Ready in 20 min · Free', sub: 'Collect at counter 1' },
                  ].map((o) => (
                    <button
                      key={o.key}
                      onClick={() => {
                        set('fulfilment', o.key as any)
                        cart.setFulfilment(o.key as any)
                      }}
                      className={cn(
                        'focus-ring rounded-2xl border p-4 text-left transition-all',
                        form.fulfilment === o.key ? 'border-ember-600 bg-ember-50/50 ring-2 ring-ember-100' : 'border-line hover:border-line-strong',
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon name={o.icon} size={17} className={form.fulfilment === o.key ? 'text-ember-700' : 'text-ink-muted'} />
                        <span className="font-display text-[15.5px] font-semibold text-ink">{o.title}</span>
                        {form.fulfilment === o.key && <Icon name="CheckCircle2" size={16} className="ml-auto text-ember-600" />}
                      </span>
                      <p className="mt-2 text-[13px] font-semibold text-ink-soft">{o.body}</p>
                      <p className="text-[12px] text-ink-muted">{o.sub}</p>
                    </button>
                  ))}
                </div>
                <Field label="Preferred time slot">
                  <Select value={form.slot} onChange={(e) => set('slot', e.target.value)} options={SLOTS.map((s) => ({ label: s, value: s }))} />
                </Field>
              </div>
            ) : (
              <SummaryRow value={`${form.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'} · ${form.slot}`} onEdit={() => setStep(2)} />
            )}
          </Card>

          {/* Step 3 — Address */}
          {form.fulfilment === 'delivery' && (
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas-deep text-[13px] font-bold text-ink">3</span>
                <div>
                  <h2 className="font-display text-[17px] font-semibold text-ink">Delivery address</h2>
                  <p className="text-[12.5px] text-ink-muted">Pick a saved address or add a new one.</p>
                </div>
              </div>
              {step === 3 ? (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ADDRESSES.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          set('addressId', a.id)
                          set('line1', a.line1)
                          set('area', a.area)
                        }}
                        className={cn(
                          'focus-ring rounded-2xl border p-4 text-left transition-all',
                          form.addressId === a.id ? 'border-ember-600 bg-ember-50/50 ring-2 ring-ember-100' : 'border-line hover:border-line-strong',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon name={a.label === 'Home' ? 'Home' : 'Building2'} size={15} className="text-ember-600" />
                          <span className="text-[13.5px] font-semibold text-ink">{a.label}</span>
                          {a.isDefault && <Badge tone="sage">Default</Badge>}
                        </span>
                        <p className="mt-2 text-[12.5px] leading-snug text-ink-muted">{a.line1}</p>
                        <p className="text-[12.5px] text-ink-muted">{a.area}, {a.city}</p>
                      </button>
                    ))}
                  </div>
                  <button className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ember-700 hover:underline">
                    <Icon name="Plus" size={14} /> Add a new address
                  </button>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Street address" required error={errors.line1} className="sm:col-span-2">
                      <Input value={form.line1} onChange={(e) => set('line1', e.target.value)} invalid={!!errors.line1} icon="MapPin" />
                    </Field>
                    <Field label="Area / locality" required error={errors.area}>
                      <Input value={form.area} onChange={(e) => set('area', e.target.value)} invalid={!!errors.area} />
                    </Field>
                    <Field label="City">
                      <Input defaultValue="Karachi" disabled />
                    </Field>
                  </div>
                  <Field label="Delivery instructions" hint="Gate number, landmark, or where to leave the order.">
                    <Textarea
                      value={form.instructions}
                      onChange={(e) => set('instructions', e.target.value)}
                      placeholder="e.g. Ring the bell twice, building has a blue gate"
                      className="min-h-[80px]"
                    />
                  </Field>
                  <Checkbox label="Contactless delivery" checked={form.contactless} onChange={() => set('contactless', !form.contactless)} desc="Rider leaves the order at your door." />
                </div>
              ) : (
                <SummaryRow value={`${form.line1}, ${form.area}, Karachi`} onEdit={() => setStep(3)} />
              )}
            </Card>
          )}

          {/* Step 4 — Payment */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas-deep text-[13px] font-bold text-ink">{form.fulfilment === 'delivery' ? 4 : 3}</span>
              <div>
                <h2 className="font-display text-[17px] font-semibold text-ink">Payment method</h2>
                <p className="text-[12.5px] text-ink-muted">Visual prototype only — no card is charged.</p>
              </div>
            </div>
            {step === 4 ? (
              <div className="mt-5 space-y-4">
                {/* COD */}
                <label className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all', form.payment === 'cod' ? 'border-ember-600 bg-ember-50/50' : 'border-line hover:border-line-strong')}>
                  <input type="radio" name="payment" checked={form.payment === 'cod'} onChange={() => set('payment', 'cod')} className="mt-0.5 h-4 w-4 accent-ember-600" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <Icon name="Banknote" size={16} className="text-ember-600" />
                      <span className="text-[13.5px] font-semibold text-ink">Cash on delivery</span>
                    </span>
                    <span className="mt-1 block text-[12.5px] text-ink-muted">Pay the rider in cash. Please keep change ready.</span>
                  </span>
                  <span className="text-[12.5px] font-semibold text-ink">{pkr(grandTotal)}</span>
                </label>

                {/* Card */}
                <div className={cn('rounded-2xl border transition-all', form.payment === 'card' ? 'border-ember-600 bg-ember-50/30' : 'border-line')}>
                  <label className="flex cursor-pointer items-start gap-3 p-4">
                    <input type="radio" name="payment" checked={form.payment === 'card'} onChange={() => set('payment', 'card')} className="mt-0.5 h-4 w-4 accent-ember-600" />
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <Icon name="CreditCard" size={16} className="text-ember-600" />
                        <span className="text-[13.5px] font-semibold text-ink">Card payment</span>
                      </span>
                      <span className="mt-1 block text-[12.5px] text-ink-muted">Visa, Mastercard and UnionPay accepted.</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {['Visa', 'Mastercard'].map((b) => (
                        <span key={b} className="rounded-md border border-line bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-muted">{b}</span>
                      ))}
                    </span>
                  </label>

                  {form.payment === 'card' && (
                    <div className="space-y-4 border-t border-line px-4 py-4">
                      <div className="rounded-2xl bg-gradient-to-br from-ink to-ink-soft p-4 text-white shadow-lift">
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Credit card</span>
                          <Icon name="Nfc" size={18} className="text-white/70" />
                        </div>
                        <p className="mt-5 font-mono text-[16px] tracking-[0.14em]">
                          {form.cardNumber || '•••• •••• •••• ••••'}
                        </p>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <span>
                            <span className="block text-[9px] uppercase tracking-wider text-white/50">Card holder</span>
                            <span className="text-[12.5px] font-semibold uppercase">{form.cardName || 'YOUR NAME'}</span>
                          </span>
                          <span>
                            <span className="block text-[9px] uppercase tracking-wider text-white/50">Expires</span>
                            <span className="text-[12.5px] font-semibold">{form.cardExpiry || 'MM/YY'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Card number" required error={errors.cardNumber} className="sm:col-span-2">
                          <Input
                            value={form.cardNumber}
                            onChange={(e) => set('cardNumber', e.target.value.replace(/[^\d]/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())}
                            invalid={!!errors.cardNumber}
                            placeholder="4242 4242 4242 4242"
                            inputMode="numeric"
                          />
                        </Field>
                        <Field label="Expiry" required error={errors.cardExpiry}>
                          <Input value={form.cardExpiry} onChange={(e) => set('cardExpiry', e.target.value.slice(0, 5))} invalid={!!errors.cardExpiry} placeholder="08/28" />
                        </Field>
                        <Field label="Security code" required error={errors.cardCvc}>
                          <Input value={form.cardCvc} onChange={(e) => set('cardCvc', e.target.value.replace(/\D/g, '').slice(0, 4))} invalid={!!errors.cardCvc} placeholder="123" />
                        </Field>
                        <Field label="Name on card" required error={errors.cardName} className="sm:col-span-2">
                          <Input value={form.cardName} onChange={(e) => set('cardName', e.target.value)} invalid={!!errors.cardName} placeholder="ZARA MEHDI" />
                        </Field>
                      </div>
                      {SAVED_CARDS.length > 0 && (
                        <div>
                          <p className="mb-2 text-[12.5px] font-semibold text-ink">Saved cards</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {SAVED_CARDS.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  set('cardNumber', '4242 4242 4242 ' + c.last4)
                                  set('cardExpiry', c.expiry)
                                  set('cardName', c.holder.toUpperCase())
                                }}
                                className="focus-ring flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-line-strong"
                              >
                                <Icon name="CreditCard" size={15} className="text-ink-faint" />
                                <span className="min-w-0">
                                  <span className="block text-[12.5px] font-semibold text-ink">
                                    {c.brand} •••• {c.last4}
                                  </span>
                                  <span className="block text-[11px] text-ink-muted">Expires {c.expiry}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <Checkbox label="Save this card for faster checkout" checked={form.saveCard} onChange={() => set('saveCard', !form.saveCard)} />
                    </div>
                  )}
                </div>

                {/* Wallet */}
                <div className={cn('rounded-2xl border transition-all', form.payment === 'wallet' ? 'border-ember-600 bg-ember-50/30' : 'border-line')}>
                  <label className="flex cursor-pointer items-start gap-3 p-4">
                    <input type="radio" name="payment" checked={form.payment === 'wallet'} onChange={() => set('payment', 'wallet')} className="mt-0.5 h-4 w-4 accent-ember-600" />
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <Icon name="Smartphone" size={16} className="text-ember-600" />
                        <span className="text-[13.5px] font-semibold text-ink">Mobile wallet</span>
                      </span>
                      <span className="mt-1 block text-[12.5px] text-ink-muted">Pay from your JazzCash, Easypaisa or NayaPay balance.</span>
                    </span>
                  </label>
                  {form.payment === 'wallet' && (
                    <div className="space-y-2 border-t border-line px-4 py-4">
                      {WALLETS.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => set('wallet', w.id)}
                          className={cn(
                            'focus-ring flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                            form.wallet === w.id ? 'border-ember-600 bg-white' : 'border-line hover:border-line-strong',
                          )}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ background: w.tone }}>
                            {w.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-ink">{w.name}</span>
                            <span className="block text-[11.5px] text-ink-muted">
                              {w.number} · Balance {w.balance}
                            </span>
                          </span>
                          {form.wallet === w.id && <Icon name="CheckCircle2" size={17} className="text-ember-600" />}
                        </button>
                      ))}
                      <p className="pt-1 text-[11.5px] text-ink-faint">You will be asked to approve the payment in your wallet app.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <SummaryRow
                value={form.payment === 'cod' ? 'Cash on delivery' : form.payment === 'card' ? `Card •••• ${form.cardNumber.slice(-4) || '4242'}` : `${WALLETS.find((w) => w.id === form.wallet)?.name}`}
                onEdit={() => setStep(4)}
              />
            )}
          </Card>

          {/* Step 5 — Review */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas-deep text-[13px] font-bold text-ink">{form.fulfilment === 'delivery' ? 5 : 4}</span>
              <div>
                <h2 className="font-display text-[17px] font-semibold text-ink">Review your order</h2>
                <p className="text-[12.5px] text-ink-muted">Check the items and totals before placing the order.</p>
              </div>
            </div>
            {step === 5 ? (
              <div className="mt-5 space-y-4">
                <div className="divide-y divide-line rounded-2xl border border-line">
                  {cart.lines.map((l) => (
                    <div key={l.lineId} className="flex items-center gap-3 p-3">
                      <FoodImage src={l.img} name={l.name} className="h-12 w-12 shrink-0" ratio="fill" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          {l.qty} × {l.name}
                        </p>
                        <p className="truncate text-[12px] text-ink-muted">
                          {[l.size, ...l.addons.map((a) => a.name), l.instructions].filter(Boolean).join(' · ') || 'No customisation'}
                        </p>
                      </div>
                      <span className="text-[13px] font-semibold tabular-nums text-ink">
                        {pkr((l.price + l.addons.reduce((s, a) => s + a.price, 0)) * l.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-canvas p-3.5">
                    <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Customer</p>
                    <p className="mt-1 text-[13px] font-semibold text-ink">{form.name}</p>
                    <p className="text-[12.5px] text-ink-muted">{form.phone}</p>
                    <p className="text-[12.5px] text-ink-muted">{form.email}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas p-3.5">
                    <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">{form.fulfilment === 'delivery' ? 'Delivering to' : 'Collecting from'}</p>
                    <p className="mt-1 text-[13px] font-semibold text-ink">
                      {form.fulfilment === 'delivery' ? `${form.area}, Karachi` : 'Clifton Branch · Counter 1'}
                    </p>
                    <p className="text-[12.5px] text-ink-muted">{form.fulfilment === 'delivery' ? form.line1 : 'Block 7, Clifton'}</p>
                    <p className="text-[12.5px] text-ink-muted">{form.slot}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[12.5px] font-semibold text-ink">Add a tip for the team?</p>
                  <div className="flex flex-wrap gap-2">
                    {[0, 50, 100, 200].map((t) => (
                      <button
                        key={t}
                        onClick={() => set('tip', t)}
                        className={cn(
                          'focus-ring rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition-colors',
                          form.tip === t ? 'border-ember-600 bg-ember-50 text-ember-700' : 'border-line-strong text-ink-soft hover:border-ink-faint',
                        )}
                      >
                        {t === 0 ? 'No tip' : pkr(t)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-clay-100 bg-clay-50/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-clay-600">
                  <span className="font-semibold">Prototype notice:</span> placing this order does not charge a card, contact a
                  payment gateway or send any data anywhere.
                </div>
              </div>
            ) : (
              <SummaryRow value={`${cart.lines.length} items · ${pkr(grandTotal)}`} onEdit={() => setStep(5)} />
            )}
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              icon="ArrowLeft"
              onClick={() => {
                if (step === 4 && form.fulfilment === 'pickup') setStep(2)
                else setStep((s) => Math.max(1, s - 1))
              }}
              disabled={step === 1}
            >
              Back
            </Button>
            {step < 5 ? (
              <Button size="lg" iconRight="ArrowRight" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button size="lg" icon="Check" onClick={placeOrder}>
                Place order · {pkr(grandTotal)}
              </Button>
            )}
          </div>
        </div>

        {/* Summary sidebar */}
        <aside className="lg:sticky lg:top-[128px] lg:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-line p-5">
              <h2 className="font-display text-[17px] font-semibold text-ink">Payment summary</h2>
              <div className="mt-3 space-y-2.5">
                <SummaryRowSmall label="Subtotal" value={pkr(cart.totals.subtotal)} />
                {cart.totals.discount > 0 && <SummaryRowSmall label={`Discount (${cart.promo})`} value={`− ${pkr(cart.totals.discount)}`} tone="text-sage-600" />}
                <SummaryRowSmall
                  label={cart.fulfilment === 'delivery' ? 'Delivery fee' : 'Pickup'}
                  value={cart.fulfilment === 'delivery' ? pkr(cart.totals.delivery) : 'Free'}
                />
                <SummaryRowSmall label="Sales tax (5%)" value={pkr(cart.totals.tax)} />
                {form.tip > 0 && <SummaryRowSmall label="Tip" value={pkr(form.tip)} />}
                <div className="h-px bg-line" />
                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="text-[14px] font-semibold text-ink">Total</span>
                  <span className="font-display text-[24px] font-semibold text-ink">{pkr(grandTotal)}</span>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Order items</p>
              <ul className="mt-3 space-y-3">
                {cart.lines.map((l) => (
                  <li key={l.lineId} className="flex items-center gap-2.5">
                    <FoodImage src={l.img} name={l.name} className="h-10 w-10 shrink-0" ratio="fill" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-ink">{l.name}</span>
                      <span className="block text-[11.5px] text-ink-muted">Qty {l.qty}</span>
                    </span>
                    <span className="text-[12.5px] font-semibold tabular-nums text-ink">
                      {pkr((l.price + l.addons.reduce((s, a) => s + a.price, 0)) * l.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl bg-canvas p-3.5">
                <div className="flex gap-2">
                  <input
                    placeholder="Promo code"
                    className="focus-ring h-9 w-full rounded-lg border border-line-strong bg-white px-2.5 text-[12.5px] font-semibold uppercase"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = (e.target as HTMLInputElement).value
                        if (cart.applyPromo(v)) push({ title: 'Promo applied', tone: 'success' })
                        else push({ title: 'Invalid code', body: cart.promoError ?? '', tone: 'error' })
                      }
                    }}
                  />
                  <Button size="sm" variant="secondary">
                    Apply
                  </Button>
                </div>
                {cart.promo && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-sage-600">
                    <Icon name="Check" size={12} /> {cart.promo} applied
                  </p>
                )}
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function SummaryRow({ value, onEdit }: { value: string; onEdit: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-3.5 py-3">
      <span className="min-w-0 truncate text-[13px] font-medium text-ink-soft">{value}</span>
      <button onClick={onEdit} className="focus-ring shrink-0 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-ember-700 hover:bg-white">
        Edit
      </button>
    </div>
  )
}

function SummaryRowSmall({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span className={cn('text-[13px] font-semibold tabular-nums', tone ?? 'text-ink')}>{value}</span>
    </div>
  )
}
