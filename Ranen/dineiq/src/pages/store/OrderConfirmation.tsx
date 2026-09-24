import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, Icon, cn } from '../../components/ui/primitives'
import { FoodImage } from '../../components/shared'
import { CUSTOMER_ORDERS } from '../../lib/data/store'
import { money } from '../../lib/utils'

export default function OrderConfirmation() {
  const { number = 'ME-24816' } = useParams()
  const [stage, setStage] = useState(0)
  const order = CUSTOMER_ORDERS.find((o) => o.number === number)

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 350)
    const t2 = setTimeout(() => setStage(2), 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const items = order?.items ?? [
    { name: 'Maison Signature Smash', qty: 2, price: 1150, img: '/img/hero-burger.jpg' },
    { name: 'Mint Lime Cooler', qty: 2, price: 320, img: '/img/drink.jpg' },
  ]
  const total = order?.total ?? 3420
  const eta = order?.etaMinutes ?? 28

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-24 sm:px-6 lg:py-16 lg:pb-16">
      <div className="text-center">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span className={cn('absolute inset-0 rounded-full bg-sage-100 transition-all duration-500', stage >= 1 ? 'scale-100 opacity-100' : 'scale-75 opacity-0')} />
          <span className={cn('absolute inset-0 rounded-full bg-sage-100 transition-all duration-700', stage >= 1 ? 'animate-ping opacity-40' : 'opacity-0')} />
          <span
            className={cn(
              'relative flex h-16 w-16 items-center justify-center rounded-full bg-sage-600 text-white shadow-lift transition-all duration-500',
              stage >= 1 ? 'scale-100' : 'scale-50 opacity-0',
            )}
          >
            <Icon name="Check" size={30} />
          </span>
        </div>

        <h1 className="mt-6 font-display text-[30px] font-semibold text-ink sm:text-[36px]">Order confirmed</h1>
        <p className="mt-2 text-[14.5px] text-ink-muted">
          Thank you — the kitchen has received your order and is already preparing it.
        </p>

        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-line bg-white px-5 py-3">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">Order number</span>
          <span className="font-mono text-[17px] font-bold tracking-wide text-ink">{number}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(number)}
            className="focus-ring rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
            aria-label="Copy order number"
          >
            <Icon name="Copy" size={14} />
          </button>
        </div>
      </div>

      {/* ETA */}
      <Card className={cn('mt-8 overflow-hidden transition-all duration-500', stage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0')}>
        <div className="grid gap-4 border-b border-line bg-ember-50/50 p-5 sm:grid-cols-3">
          {[
            { icon: 'Timer', label: 'Estimated preparation', value: `${eta} min` },
            { icon: 'Truck', label: 'Delivery window', value: '20 – 30 min' },
            { icon: 'MapPin', label: 'Delivering to', value: 'Clifton, Karachi' },
          ].map((s) => (
            <div key={s.label} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ember-600 shadow-card">
                <Icon name={s.icon} size={16} />
              </span>
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint">{s.label}</span>
                <span className="block text-[15px] font-semibold text-ink">{s.value}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="p-5">
          <h2 className="font-display text-[17px] font-semibold text-ink">Order summary</h2>
          <ul className="mt-3 divide-y divide-line">
            {items.map((i, idx) => (
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
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            <div className="flex justify-between text-[13.5px] text-ink-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(Math.round(total / 1.05) - 150)}</span>
            </div>
            <div className="flex justify-between text-[13.5px] text-ink-muted">
              <span>Delivery fee</span>
              <span className="tabular-nums">{money(150)}</span>
            </div>
            <div className="flex justify-between text-[13.5px] text-ink-muted">
              <span>Sales tax (5%)</span>
              <span className="tabular-nums">{money(Math.round((total - 150) / 21))}</span>
            </div>
            <div className="flex items-baseline justify-between pt-1.5">
              <span className="text-[15px] font-semibold text-ink">Total paid</span>
              <span className="font-display text-[22px] font-semibold text-ink">{money(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Next steps */}
      <Card className="mt-5 p-5">
        <h2 className="font-display text-[16px] font-semibold text-ink">What happens next</h2>
        <ol className="mt-4 space-y-4">
          {[
            { t: 'Kitchen acceptance', d: 'The branch confirms your order within 2 minutes.', icon: 'CheckCheck' },
            { t: 'Preparation', d: 'Your dishes go on the charcoal grill and stone oven.', icon: 'ChefHat' },
            { t: 'Packing & handover', d: 'Insulated packaging, sealed and handed to the rider.', icon: 'Package' },
            { t: 'On the way', d: 'You will get a call when the rider is outside.', icon: 'Bike' },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-3.5">
              <span className="relative flex flex-col items-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas-deep text-ink-muted">
                  <Icon name={s.icon} size={15} />
                </span>
                {i < 3 && <span className="mt-1 w-px flex-1 bg-line" />}
              </span>
              <span className="pb-1">
                <span className="block text-[13.5px] font-semibold text-ink">{s.t}</span>
                <span className="block text-[12.5px] text-ink-muted">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/track/${number}`} className="flex-1">
          <Button block size="lg" icon="MapPin">
            View order
          </Button>
        </Link>
        <Link to="/menu" className="flex-1">
          <Button block size="lg" variant="secondary" icon="UtensilsCrossed">
            Continue browsing
          </Button>
        </Link>
      </div>

      <p className="mt-5 text-center text-[12px] text-ink-faint">
        Demo confirmation screen. No order was placed and no payment was processed.
      </p>
    </div>
  )
}
