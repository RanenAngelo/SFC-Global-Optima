import React, { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Icon, cn } from '../../components/ui/primitives'
import { ConfirmDialog } from '../../components/ui/overlay'
import { useToast } from '../../components/ui/overlay'
import { CUSTOMER_ORDERS, NOTIFICATIONS } from '../../lib/data/store'
import { useFavourites } from '../../store/app'

const ITEMS = [
  { label: 'Profile', to: '/account', icon: 'User', end: true },
  { label: 'My orders', to: '/account/orders', icon: 'ReceiptText' },
  { label: 'Saved addresses', to: '/account/addresses', icon: 'MapPin' },
  { label: 'Favourite dishes', to: '/account/favourites', icon: 'Heart' },
  { label: 'Payment methods', to: '/account/payments', icon: 'CreditCard' },
  { label: 'Notifications', to: '/account/notifications', icon: 'Bell' },
  { label: 'Preferences', to: '/account/preferences', icon: 'Settings' },
]

export default function Account() {
  const [logout, setLogout] = useState(false)
  const { push } = useToast()
  const navigate = useNavigate()
  const { favourites } = useFavourites()
  const unread = NOTIFICATIONS.filter((n) => !n.read).length
  const activeOrders = CUSTOMER_ORDERS.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length

  const counters: Record<string, number> = {
    '/account/orders': CUSTOMER_ORDERS.length,
    '/account/favourites': favourites.length,
    '/account/notifications': unread,
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name="Zara Mehdi" size={54} />
              <div>
                <h1 className="font-display text-[26px] font-semibold text-ink">Zara Mehdi</h1>
                <p className="text-[13.5px] text-ink-muted">
                  zara.m@example.com · +92 300 1234567 · Member since Jan 2024
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="ember" icon="Award">
                Ember Club · Gold
              </Badge>
              <Button variant="secondary" size="sm" icon="LogOut" onClick={() => setLogout(true)}>
                Log out
              </Button>
            </div>
          </div>

          {activeOrders > 0 && (
            <Link
              to="/track/ME-24815"
              className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-ember-200 bg-ember-50 px-4 py-3 transition-colors hover:bg-ember-100/60"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-ember-600">
                  <Icon name="Bike" size={17} />
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">Order ME-24815 is on the way</span>
                  <span className="block text-[12.5px] text-ink-muted">Arriving in about 14 minutes</span>
                </span>
              </span>
              <Icon name="ChevronRight" size={17} className="text-ember-700" />
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <nav className="flex gap-1.5 overflow-x-auto pb-2 lg:sticky lg:top-[128px] lg:flex-col lg:overflow-visible lg:pb-0">
            {ITEMS.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  cn(
                    'focus-ring flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors',
                    isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-canvas hover:text-ink',
                  )
                }
              >
                <Icon name={i.icon} size={16} />
                <span className="whitespace-nowrap">{i.label}</span>
                {counters[i.to] ? (
                  <span className="ml-auto rounded-full bg-canvas-deep px-1.5 py-0.5 text-[10.5px] font-bold text-ink-muted lg:bg-white/20 lg:text-white">
                    {counters[i.to]}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <Card className="mt-5 hidden p-4 lg:block">
            <div className="flex items-center gap-2">
              <Icon name="Wallet" size={16} className="text-ember-600" />
              <p className="text-[13px] font-semibold text-ink">Ember Club</p>
            </div>
            <p className="mt-2 font-display text-[26px] font-semibold text-ink">1,340</p>
            <p className="text-[12px] text-ink-muted">loyalty points · worth Rs. 670</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full w-[68%] rounded-full bg-ember-500" />
            </div>
            <p className="mt-2 text-[11.5px] text-ink-faint">660 points to Platinum</p>
          </Card>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={logout}
        onClose={() => setLogout(false)}
        onConfirm={() => {
          setLogout(false)
          push({ title: 'Signed out (demo)', body: 'No session exists in this prototype', tone: 'info' })
          navigate('/')
        }}
        title="Log out of Maison Ember?"
        message="This is a demo confirmation. No account session is created or destroyed in this prototype."
        confirmLabel="Log out"
      />
    </div>
  )
}
