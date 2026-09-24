import React, { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Avatar, Badge, Button, Dropdown, Icon, IconButton, MenuItemRow, Tooltip, cn,
} from '../components/ui/primitives'
import { DateRangeSelect, DemoBanner, DineIQMark, LocationSelect } from '../components/shared'
import { useWorkspace } from '../store/app'
import { RECENT_ALERTS } from '../lib/data/analytics'

export type NavItem = { to: string; label: string; icon: string; badge?: string; end?: boolean }

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operations',
    items: [
      { to: '/admin', label: 'Overview', icon: 'LayoutDashboard', end: true },
      { to: '/admin/orders', label: 'Orders', icon: 'ReceiptText' },
      { to: '/admin/menu', label: 'Menu Management', icon: 'UtensilsCrossed' },
    ],
  },
  {
    title: 'Menu Intelligence',
    items: [
      { to: '/admin/menu-intelligence', label: 'Menu Intelligence', icon: 'Sparkles', badge: 'Core' },
      { to: '/admin/customers', label: 'Customers', icon: 'Users' },
      { to: '/admin/market-basket', label: 'Market Basket', icon: 'Network' },
      { to: '/admin/forecasting', label: 'Demand Forecasting', icon: 'LineChart' },
      { to: '/admin/inventory', label: 'Inventory & Wastage', icon: 'PackageMinus' },
      { to: '/admin/pricing', label: 'Pricing Intelligence', icon: 'Tags' },
    ],
  },
  {
    title: 'Performance',
    items: [
      { to: '/admin/promotions', label: 'Promotions', icon: 'BadgePercent' },
      { to: '/admin/ratings', label: 'Ratings & Reviews', icon: 'Star' },
      { to: '/admin/anomalies', label: 'Sales Anomalies', icon: 'AlertTriangle', badge: '4' },
      { to: '/admin/locations', label: 'Locations', icon: 'MapPinned' },
    ],
  },
  {
    title: 'Decisions',
    items: [
      { to: '/admin/recommendations', label: 'Recommendations', icon: 'Lightbulb', badge: '10' },
      { to: '/admin/reports', label: 'Reports', icon: 'FileBarChart' },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/admin/settings', label: 'Settings', icon: 'Settings' }],
  },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useWorkspace()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')

  const allItems = useMemo(() => NAV_GROUPS.flatMap((g) => g.items), [])
  const current = useMemo(() => {
    const exact = allItems.find((i) => i.to === pathname)
    if (exact) return exact
    return [...allItems].filter((i) => !i.end).sort((a, b) => b.to.length - a.to.length).find((i) => pathname.startsWith(i.to))
  }, [pathname, allItems])
  const group = useMemo(() => NAV_GROUPS.find((g) => g.items.some((i) => i.to === current?.to)), [current])

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return allItems.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 6)
  }, [query, allItems])

  const Sidebar = ({ mobile }: { mobile?: boolean }) => (
    <div className={cn('flex h-full flex-col bg-white', mobile ? 'w-[280px]' : sidebarCollapsed ? 'w-[76px]' : 'w-[252px]')}>
      <div className={cn('flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4', sidebarCollapsed && !mobile && 'justify-center px-0')}>
        <DineIQMark size={32} />
        {(!sidebarCollapsed || mobile) && (
          <span className="min-w-0">
            <span className="block truncate font-display text-[15px] font-semibold leading-none text-ink">DineIQ Analytics</span>
            <span className="mt-1 block truncate text-[9.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">MenuMatrix</span>
          </span>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.title} className="mb-5">
            {(!sidebarCollapsed || mobile) && (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">{g.title}</p>
            )}
            <div className="space-y-0.5">
              {g.items.map((i) => (
                <Tooltip key={i.to} content={sidebarCollapsed && !mobile ? i.label : ''} side="bottom">
                  <NavLink
                    to={i.to}
                    end={i.end}
                    onClick={() => mobile && setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                        sidebarCollapsed && !mobile && 'justify-center px-0',
                        isActive ? 'bg-ember-50 text-ember-700' : 'text-ink-soft hover:bg-canvas hover:text-ink',
                      )
                    }
                  >
                    <Icon name={i.icon} size={17} className="shrink-0" />
                    {(!sidebarCollapsed || mobile) && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{i.label}</span>
                        {i.badge && (
                          <span className="rounded-full bg-canvas-deep px-1.5 py-0.5 text-[10px] font-bold text-ink-muted">{i.badge}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {(!sidebarCollapsed || mobile) && (
        <div className="shrink-0 border-t border-line p-3">
          <div className="rounded-xl bg-canvas p-3.5">
            <div className="flex items-center gap-2">
              <Icon name="Database" size={14} className="text-ink-muted" />
              <p className="text-[12px] font-semibold text-ink">Demo workspace</p>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-snug text-ink-muted">
              All metrics are static placeholders. Data connection is not part of this prototype.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas">
      <DemoBanner />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-line transition-[width] duration-200 lg:block',
          sidebarCollapsed ? 'w-[76px]' : 'w-[252px]',
        )}
      >
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full animate-slide-in">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[252px]')}>
        <header className="sticky top-0 z-30 border-b border-line bg-white/92 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="focus-ring -ml-1 rounded-lg p-2 text-ink-soft lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Icon name="Menu" size={19} />
            </button>
            <button
              className="focus-ring hidden rounded-lg p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink lg:block"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name={sidebarCollapsed ? 'PanelLeftOpen' : 'PanelLeftClose'} size={18} />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
              <Link to="/admin" className="shrink-0 font-medium text-ink-muted transition-colors hover:text-ink">
                DineIQ
              </Link>
              <Icon name="ChevronRight" size={13} className="shrink-0 text-ink-faint" />
              {group && <span className="shrink-0 text-ink-faint">{group.title}</span>}
              {group && <Icon name="ChevronRight" size={13} className="shrink-0 text-ink-faint" />}
              <span className="truncate font-semibold text-ink">{current?.label ?? 'Dashboard'}</span>
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {/* Search */}
              <div className="relative hidden xl:block">
                <Icon name="Search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search modules…"
                  className="focus-ring h-9 w-[220px] rounded-xl border border-line-strong bg-white pl-9 pr-3 text-[13px] transition-colors hover:border-ink-faint"
                />
                {searchResults.length > 0 && (
                  <div className="absolute right-0 z-50 mt-2 w-[280px] overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-pop">
                    {searchResults.map((r) => (
                      <Link
                        key={r.to}
                        to={r.to}
                        onClick={() => setQuery('')}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
                      >
                        <Icon name={r.icon} size={15} />
                        {r.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <LocationSelect className="hidden sm:block" />
              <DateRangeSelect className="hidden md:block" />

              <Dropdown
                width={330}
                trigger={() => (
                  <span className="focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas hover:text-ink">
                    <Icon name="Bell" size={18} />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-clay-500" />
                  </span>
                )}
              >
                {() => (
                  <>
                    <div className="flex items-center justify-between px-2.5 pb-2 pt-1">
                      <p className="text-[12px] font-bold uppercase tracking-wide text-ink-faint">Recent alerts</p>
                      <span className="rounded-full bg-clay-50 px-1.5 py-0.5 text-[10px] font-bold text-clay-600">4 new</span>
                    </div>
                    {RECENT_ALERTS.map((a) => (
                      <Link key={a.id} to="/admin/anomalies" className="flex gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-canvas">
                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.tone === 'clay' ? 'bg-clay-500' : a.tone === 'gold' ? 'bg-gold-500' : a.tone === 'sky' ? 'bg-sky-500' : 'bg-sage-500')} />
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-semibold text-ink">{a.title}</span>
                          <span className="block text-[11.5px] leading-snug text-ink-muted">{a.body}</span>
                          <span className="mt-0.5 block text-[11px] text-ink-faint">{a.time}</span>
                        </span>
                      </Link>
                    ))}
                    <div className="my-1 h-px bg-line" />
                    <MenuItemRow icon="CheckCheck">Mark all as read</MenuItemRow>
                  </>
                )}
              </Dropdown>

              <IconButton icon="CircleHelp" label="Help centre" className="hidden sm:inline-flex" />

              <Dropdown
                width={230}
                trigger={() => (
                  <span className="focus-ring ml-1 inline-flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-canvas">
                    <Avatar name="Zohaib Ansari" size={30} tone="#B54E17" />
                    <Icon name="ChevronDown" size={14} className="text-ink-faint" />
                  </span>
                )}
              >
                {(close) => (
                  <>
                    <div className="rounded-lg bg-canvas px-2.5 py-2.5">
                      <p className="text-[13px] font-semibold text-ink">Zohaib Ansari</p>
                      <p className="text-[11.5px] text-ink-muted">Owner · Maison Ember</p>
                    </div>
                    <div className="my-1 h-px bg-line" />
                    <Link to="/admin/settings"><MenuItemRow icon="User">Profile & account</MenuItemRow></Link>
                    <Link to="/admin/settings"><MenuItemRow icon="Building2">Restaurant profile</MenuItemRow></Link>
                    <Link to="/admin/settings"><MenuItemRow icon="Users">Team & permissions</MenuItemRow></Link>
                    <div className="my-1 h-px bg-line" />
                    <Link to="/"><MenuItemRow icon="Store">View customer store</MenuItemRow></Link>
                    <MenuItemRow icon="LogOut" tone="danger" onClick={close}>Log out</MenuItemRow>
                  </>
                )}
              </Dropdown>

              <Link to="/" className="focus-ring ml-1 hidden h-9 items-center gap-2 rounded-xl border border-line-strong px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:border-ink-faint hover:text-ink xl:inline-flex">
                <Icon name="Store" size={15} />
                View store
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
