import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, Icon, Select, cn } from '../../components/ui/primitives'
import { FoodImage } from '../../components/shared'
import { CUSTOMER_ORDERS, ORDER_STEPS, PICKUP_STEPS } from '../../lib/data/store'
import { menuBySlug } from '../../lib/data/menu'
import { money } from '../../lib/utils'
import { useCart } from '../../store/app'
import { useToast } from '../../components/ui/overlay'
import { EmptyState } from '../../components/ui/states'

export default function OrderTracking() {
  const { number = 'ME-24815' } = useParams()
  const cart = useCart()
  const { push } = useToast()
  const order = CUSTOMER_ORDERS.find((o) => o.number === number) ?? CUSTOMER_ORDERS[0]
  const [tick, setTick] = useState(0)

  const steps = order.channel === 'Pickup' ? PICKUP_STEPS : ORDER_STEPS
  const current = Math.min(order.progress, steps.length - 1)

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 8000)
    return () => clearInterval(t)
  }, [])

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <EmptyState
          variant="orders"
          title="Order not found"
          message="We couldn’t find a demo order with that number."
          action={
            <Link to="/account/orders">
              <Button size="sm" variant="secondary">Back to my orders</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const eta = Math.max(4, (order.etaMinutes ?? 14) - (tick % 3))

  return (
    <div className="pb-24 lg:pb-0">
      {/* Status banner */}
      <div className="border-b border-line bg-ink">
        <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-300">Order {order.number}</p>
              <h1 className="mt-2 font-display text-[28px] font-semibold text-white">
                {order.status === 'Delivered' ? 'Delivered' : `Arriving in about ${eta} minutes`}
              </h1>
              <p className="mt-1.5 text-[13.5px] text-white/60">
                Placed {order.placedAt} · {order.channel} · {money(order.total)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="ember" dot>
                {order.status}
              </Badge>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70">Live · {tick + 1} update</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-5">
          {/* Progress */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[17px] font-semibold text-ink">Order progress</h2>
              <span className="text-[12px] font-semibold text-ink-faint">Static demo timeline</span>
            </div>

            <ol className="mt-6">
              {steps.map((s, i) => {
                const done = i <= current
                const active = i === current
                return (
                  <li key={s} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                          done ? 'border-sage-600 bg-sage-600 text-white' : 'border-line bg-white text-ink-faint',
                          active && 'ring-4 ring-sage-100',
                        )}
                      >
                        {done ? <Icon name="Check" size={15} /> : i + 1}
                      </span>
                      {i < steps.length - 1 && <span className={cn('my-1 w-0.5 flex-1', i < current ? 'bg-sage-500' : 'bg-line')} />}
                    </div>
                    <div className={cn('pb-6', i === steps.length - 1 && 'pb-0')}>
                      <p className={cn('text-[14px] font-semibold', done ? 'text-ink' : 'text-ink-faint')}>{s}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-muted">
                        {[
                          'We received your order and sent it to the kitchen.',
                          'Maison Ember accepted the order and reserved your items.',
                          'Your dishes are on the grill and in the stone oven.',
                          'Sealed in insulated packaging and quality-checked.',
                          order.channel === 'Pickup' ? 'Collected from counter 1.' : 'The rider has collected your order.',
                          'Enjoy your meal — tell us what you thought.',
                        ][i]}
                      </p>
                      {active && (
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ember-50 px-2.5 py-1 text-[11.5px] font-bold text-ember-700">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-70" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember-600" />
                          </span>
                          In progress
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>

          {/* Map-ish visual */}
          {order.channel !== 'Pickup' && (
            <Card className="overflow-hidden">
              <div className="relative h-[220px] bg-canvas-deep">
                <svg viewBox="0 0 600 220" className="h-full w-full" role="img" aria-label="Stylised delivery route">
                  <rect width="600" height="220" fill="#F1ECE4" />
                  <g stroke="#E3D9CB" strokeWidth="1">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={i * 32} x2="600" y2={i * 32} />
                    ))}
                    {Array.from({ length: 19 }).map((_, i) => (
                      <line key={`v${i}`} x1={i * 32} y1="0" x2={i * 32} y2="220" />
                    ))}
                  </g>
                  <path d="M70 176 L170 176 L210 120 L330 120 L360 74 L520 74" stroke="#B54E17" strokeWidth="4" fill="none" strokeDasharray="8 6" strokeLinecap="round" opacity="0.55" />
                  <path d="M70 176 L170 176 L210 120 L330 120 L360 74 L430 74" stroke="#B54E17" strokeWidth="4" fill="none" strokeLinecap="round" />
                  <circle cx="70" cy="176" r="9" fill="#1D1B19" />
                  <circle cx="70" cy="176" r="4" fill="#fff" />
                  <circle cx="430" cy="74" r="11" fill="#B54E17" opacity="0.18">
                    <animate attributeName="r" values="11;20;11" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.22;0.02;0.22" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="430" cy="74" r="7" fill="#B54E17" />
                  <circle cx="520" cy="74" r="9" fill="#5E8C4A" />
                  <circle cx="520" cy="74" r="4" fill="#fff" />
                  <text x="70" y="200" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1D1B19" fontFamily="Inter, sans-serif">RESTAURANT</text>
                  <text x="520" y="52" textAnchor="middle" fontSize="10" fontWeight="700" fill="#4A7139" fontFamily="Inter, sans-serif">YOU</text>
                </svg>
                <span className="absolute left-4 top-4 rounded-xl bg-white/95 px-3 py-2 text-[12px] font-semibold text-ink shadow-card">
                  Rider {eta} min away
                </span>
              </div>
              {order.courier && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas-deep text-[13px] font-bold text-ink-soft">
                      {order.courier.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                    <div>
                      <p className="text-[13.5px] font-semibold text-ink">{order.courier.name}</p>
                      <p className="text-[12px] text-ink-muted">
                        {order.courier.vehicle} · {order.courier.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon="Phone">
                      Call rider
                    </Button>
                    <Button size="sm" variant="secondary" icon="MessageSquare">
                      Message
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Items */}
          <Card className="p-5">
            <h2 className="font-display text-[17px] font-semibold text-ink">Order items</h2>
            <ul className="mt-3 divide-y divide-line">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex items-center gap-3 py-3">
                  <FoodImage src={i.img} name={i.name} className="h-12 w-12 shrink-0" ratio="fill" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{i.name}</span>
                    <span className="block text-[12px] text-ink-muted">Qty {i.qty}</span>
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{money(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[14px] font-semibold text-ink">Total</span>
              <span className="font-display text-[20px] font-semibold text-ink">{money(order.total)}</span>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 lg:sticky lg:top-[128px] lg:self-start">
          <Card className="p-5">
            <h2 className="font-display text-[16px] font-semibold text-ink">Maison Ember · Clifton</h2>
            <p className="mt-1 text-[12.5px] text-ink-muted">Shop 4, Silk Residences, Block 7, Clifton, Karachi</p>
            <div className="mt-4 space-y-2.5">
              <Button block variant="secondary" size="sm" icon="Phone">
                Contact restaurant
              </Button>
              <Button
                block
                variant="secondary"
                size="sm"
                icon="RotateCcw"
                onClick={() => {
                  order.items.forEach((i) => {
                    const item = menuBySlug(i.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
                    if (item) cart.add(item, { qty: i.qty })
                  })
                  push({ title: 'Items added to cart', body: 'Demo reorder — nothing was charged', tone: 'success' })
                }}
              >
                Reorder this order
              </Button>
              <Link to="/contact" className="block">
                <Button block variant="ghost" size="sm" icon="MessageSquareWarning">
                  Report a problem
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-[16px] font-semibold text-ink">Delivery details</h2>
            <dl className="mt-3 space-y-3 text-[13px]">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Delivering to</dt>
                <dd className="mt-0.5 text-ink-soft">{order.address}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Placed</dt>
                <dd className="mt-0.5 text-ink-soft">{order.date}, {order.placedAt.split(', ')[1]}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Payment</dt>
                <dd className="mt-0.5 text-ink-soft">{order.payment}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-[16px] font-semibold text-ink">Rate your order</h2>
            <p className="mt-1 text-[12.5px] text-ink-muted">Demo control — your rating is not recorded.</p>
            <div className="mt-3 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} className="focus-ring rounded-lg p-1 text-line-strong transition-colors hover:text-gold-500">
                  <Icon name="Star" size={22} />
                </button>
              ))}
            </div>
            <Select
              className="mt-3"
              options={[
                { label: 'What went well?', value: '' },
                { label: 'Food quality', value: 'food' },
                { label: 'Packaging', value: 'packaging' },
                { label: 'Delivery time', value: 'time' },
              ]}
            />
            <Button block size="sm" className="mt-3" icon="Send">
              Submit feedback
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
