import React, { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Badge, Button, Icon, IconButton, Avatar, Dropdown, MenuItemRow, SearchInput, cn,
} from '../components/ui/primitives'
import { Modal } from '../components/ui/overlay'
import { LiveBanner, EmberMark, FoodImage } from '../components/shared'
import { useCart } from '../store/app'
import { MENU, menuBySlug } from '../lib/data/menu'
import { money } from '../lib/utils'
import { OFFERS } from '../lib/data/store'

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Menu', to: '/menu' },
  { label: 'Offers', to: '/offers' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

const BRANCHES = [
  { id: 'clifton', name: 'Clifton Branch', area: 'Block 7, Clifton · 1.2 km', open: true },
  { id: 'downtown', name: 'Downtown Branch', area: 'I. I. Chundrigar Road · 4.8 km', open: true },
  { id: 'gulshan', name: 'Gulshan Branch', area: 'Block 4, Gulshan-e-Iqbal · 9.3 km', open: false },
]

export default function StoreLayout() {
  const { count } = useCart()
  const [branch, setBranch] = useState(BRANCHES[0])
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return MENU.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)).slice(0, 6)
  }, [query])

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <LiveBanner />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-line bg-white/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:h-[72px] sm:px-6 lg:gap-6">
          <button
            className="focus-ring -ml-1 rounded-lg p-2 text-ink-soft lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Icon name="Menu" size={20} />
          </button>

          <Link to="/" className="focus-ring flex shrink-0 items-center gap-2.5 rounded-lg">
            <EmberMark size={36} />
            <span className="hidden leading-none sm:block">
              <span className="block font-display text-[17px] font-semibold tracking-tight text-ink">Maison Ember</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Woodfire Kitchen</span>
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'focus-ring rounded-lg px-3.5 py-2 text-[14px] font-semibold transition-colors',
                    isActive ? 'bg-canvas-deep text-ink' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            {/* Branch selector */}
            <Dropdown
              width={252}
              trigger={() => (
                <span className="hidden h-9 items-center gap-2 rounded-xl border border-line-strong px-3 text-[13px] font-medium text-ink-soft transition-colors hover:border-ink-faint md:inline-flex">
                  <Icon name="MapPin" size={14} className="text-ember-600" />
                  <span className="max-w-[130px] truncate">{branch.name.replace(' Branch', '')}</span>
                  <Icon name="ChevronDown" size={13} className="text-ink-faint" />
                </span>
              )}
            >
              {(close) => (
                <>
                  <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Select branch</p>
                  {BRANCHES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBranch(b)
                        close()
                      }}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                        branch.id === b.id ? 'bg-ember-50' : 'hover:bg-canvas',
                      )}
                    >
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', b.open ? 'bg-sage-500' : 'bg-ink-faint')} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-ink">{b.name}</span>
                        <span className="block truncate text-[11px] text-ink-muted">{b.area}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </Dropdown>

            <IconButton icon="Search" label="Search menu" onClick={() => setSearchOpen(true)} />

            <Dropdown
              width={228}
              trigger={() => (
                <span className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas hover:text-ink">
                  <Icon name="User" size={19} />
                </span>
              )}
            >
              {(close) => (
                <>
                  <div className="flex items-center gap-2.5 rounded-lg bg-canvas px-2.5 py-2.5">
                    <Avatar name="Zara Mehdi" size={32} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink">Zara Mehdi</span>
                      <span className="block truncate text-[11px] text-ink-muted">zara.m@example.com</span>
                    </span>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <MenuItemRow icon="User" onClick={() => { close(); navigate('/account') }}>My profile</MenuItemRow>
                  <MenuItemRow icon="ReceiptText" onClick={() => { close(); navigate('/account/orders') }}>My orders</MenuItemRow>
                  <MenuItemRow icon="Heart" onClick={() => { close(); navigate('/account/favourites') }}>Favourite dishes</MenuItemRow>
                  <MenuItemRow icon="MapPin" onClick={() => { close(); navigate('/account/addresses') }}>Saved addresses</MenuItemRow>
                  <MenuItemRow icon="Bell" onClick={() => { close(); navigate('/account/notifications') }}>Notifications</MenuItemRow>
                  <div className="my-1 h-px bg-line" />
                  <MenuItemRow icon="LogOut" tone="danger" onClick={() => close()}>Log out</MenuItemRow>
                </>
              )}
            </Dropdown>

            <Link to="/cart" className="focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas hover:text-ink">
              <Icon name="ShoppingBag" size={19} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ember-600 px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>

            <Link
              to="/admin"
              className="focus-ring ml-1 hidden h-9 items-center gap-2 rounded-xl bg-ink px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink-soft lg:inline-flex"
            >
              <Icon name="LayoutDashboard" size={14} />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Offer strip */}
        <div className="border-t border-line bg-ember-50/60">
          <div className="mx-auto flex max-w-[1280px] items-center gap-3 overflow-x-auto px-4 py-2 sm:px-6">
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-ember-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <Icon name="BadgePercent" size={11} /> Today
            </span>
            {OFFERS.slice(0, 3).map((o) => (
              <span key={o.id} className="shrink-0 whitespace-nowrap text-[12.5px] text-ink-soft">
                <span className="font-semibold text-ink">{o.title}</span>
                <span className="mx-2 text-line-strong">•</span>
                <span className="font-mono text-[11px] font-bold text-ember-700">{o.code}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <EmberMark size={38} />
                <span>
                  <span className="block font-display text-[18px] font-semibold text-ink">Maison Ember</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Woodfire Kitchen</span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-ink-muted">
                A woodfire kitchen in the heart of Karachi. Live fire cooking, 48-hour dough and produce sourced from Sindh
                farms. Open daily for lunch, dinner and late-night service.
              </p>
              <div className="mt-5 flex items-center gap-2">
                {['Instagram', 'Facebook', 'Youtube'].map((s) => (
                  <button key={s} aria-label={s} className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink-muted transition-colors hover:border-ink-faint hover:text-ink">
                    <Icon name={s === 'Youtube' ? 'Youtube' : s === 'Facebook' ? 'Facebook' : 'Instagram'} size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">Explore</h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { l: 'Full menu', to: '/menu' },
                  { l: 'Today’s offers', to: '/offers' },
                  { l: 'About Maison Ember', to: '/about' },
                  { l: 'Contact & reservations', to: '/contact' },
                  { l: 'Track your order', to: '/track/ME-24815' },
                ].map((l) => (
                  <li key={l.l}>
                    <Link to={l.to} className="text-[13.5px] text-ink-muted transition-colors hover:text-ember-700">
                      {l.l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">Opening hours</h4>
              <ul className="mt-4 space-y-2.5 text-[13.5px] text-ink-muted">
                <li className="flex justify-between gap-3"><span>Mon – Thu</span><span className="tabular-nums text-ink-soft">11:00 – 23:00</span></li>
                <li className="flex justify-between gap-3"><span>Friday</span><span className="tabular-nums text-ink-soft">11:00 – 00:30</span></li>
                <li className="flex justify-between gap-3"><span>Saturday</span><span className="tabular-nums text-ink-soft">10:30 – 00:30</span></li>
                <li className="flex justify-between gap-3"><span>Sunday</span><span className="tabular-nums text-ink-soft">10:30 – 23:30</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">Find us</h4>
              <ul className="mt-4 space-y-3 text-[13.5px] text-ink-muted">
                {BRANCHES.map((b) => (
                  <li key={b.id} className="flex gap-2.5">
                    <Icon name="MapPin" size={15} className="mt-0.5 shrink-0 text-ember-600" />
                    <span>
                      <span className="block font-semibold text-ink">{b.name}</span>
                      {b.area}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl border border-line bg-canvas p-3.5">
                <p className="text-[12.5px] font-semibold text-ink">Reservations & delivery</p>
                <p className="mt-1 text-[13px] text-ink-muted">+92 21 111 362 637</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
            <p className="text-[12.5px] text-ink-faint">
              © 2026 Maison Ember (fictional demo restaurant). Part of the DineIQ Analytics interface prototype.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {['Cash on delivery', 'Visa', 'Mastercard', 'JazzCash', 'Easypaisa'].map((p) => (
                <span key={p} className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5">
          {[
            { l: 'Home', icon: 'House', to: '/' },
            { l: 'Menu', icon: 'UtensilsCrossed', to: '/menu' },
            { l: 'Offers', icon: 'BadgePercent', to: '/offers' },
            { l: 'Cart', icon: 'ShoppingBag', to: '/cart' },
            { l: 'Account', icon: 'User', to: '/account' },
          ].map((t) => (
            <NavLink
              key={t.l}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors', isActive ? 'text-ember-700' : 'text-ink-faint')
              }
            >
              <Icon name={t.icon} size={19} />
              {t.l}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile drawer */}
      <Modal open={mobileNav} onClose={() => setMobileNav(false)} title="Maison Ember" subtitle="Woodfire kitchen · Karachi" size="sm">
        <div className="space-y-1">
          {[...NAV, { label: 'My orders', to: '/track/ME-24815' }, { label: 'My account', to: '/account' }].map((n) => (
            <Link
              key={n.label}
              to={n.to}
              onClick={() => setMobileNav(false)}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-canvas"
            >
              {n.label}
              <Icon name="ChevronRight" size={16} className="text-ink-faint" />
            </Link>
          ))}
          <div className="my-2 h-px bg-line" />
          <Link
            to="/admin"
            onClick={() => setMobileNav(false)}
            className="flex items-center gap-2.5 rounded-xl bg-ink px-3 py-3 text-[15px] font-semibold text-white"
          >
            <Icon name="LayoutDashboard" size={16} />
            Open DineIQ dashboard
          </Link>
          <div className="mt-3 rounded-xl bg-canvas p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Selected branch</p>
            <p className="mt-1 text-[13.5px] font-semibold text-ink">{branch.name}</p>
            <p className="text-[12.5px] text-ink-muted">{branch.area}</p>
          </div>
        </div>
      </Modal>

      {/* Search modal */}
      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search the menu" subtitle="Dish name, category or ingredient">
        <div className="space-y-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Try “biryani”, “pizza” or “truffle”…" />
          {query && results.length === 0 && (
            <div className="rounded-xl border border-line bg-canvas px-4 py-8 text-center">
              <Icon name="SearchX" size={22} className="mx-auto text-ink-faint" />
              <p className="mt-2 text-[14px] font-semibold text-ink">No dishes found</p>
              <p className="mt-1 text-[13px] text-ink-muted">Nothing matched “{query}”. Try another search.</p>
            </div>
          )}
          <div className="space-y-1">
            {results.map((m) => (
              <Link
                key={m.slug}
                to={`/menu/${m.slug}`}
                onClick={() => {
                  setSearchOpen(false)
                  setQuery('')
                }}
                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-canvas"
              >
                <FoodImage src={m.img} name={m.name} className="h-12 w-12 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{m.name}</span>
                  <span className="block truncate text-[12px] text-ink-muted">{m.category}</span>
                </span>
                <span className="text-[13px] font-bold text-ink">{money(m.price)}</span>
              </Link>
            ))}
          </div>
          {!query && (
            <div>
              <p className="label mb-2">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {['Biryani', 'Pizza', 'Burger', 'Truffle', 'Karak chai'].map((s) => (
                  <button key={s} onClick={() => setQuery(s)} className="rounded-full border border-line-strong px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-ink-faint">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
