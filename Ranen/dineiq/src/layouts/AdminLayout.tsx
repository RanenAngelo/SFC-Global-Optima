import React, { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar, Badge, Button, Dropdown, Icon, IconButton, MenuItemRow, Tooltip, cn,
} from '../components/ui/primitives'
import { DateRangeSelect, LiveBanner, DineIQMark, LocationSelect } from '../components/shared'
import { useWorkspace } from '../store/app'
import { fmtDate, timeAgoISO, useApi, useAuth, useMeta } from '../lib/api'

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
      { to: '/admin/anomalies', label: 'Sales Anomalies', icon: 'AlertTriangle' },
      { to: '/admin/locations', label: 'Locations', icon: 'MapPinned' },
    ],
  },
  {
    title: 'Decisions',
    items: [
      { to: '/admin/recommendations', label: 'Recommendations', icon: 'Lightbulb' },
      { to: '/admin/comparison', label: 'Model Comparison', icon: 'GitCompareArrows', badge: 'Core' },
      { to: '/admin/what-if', label: 'What-If Lab', icon: 'FlaskConical' },
      { to: '/admin/reports', label: 'Reports', icon: 'FileBarChart' },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/admin/settings', label: 'Settings', icon: 'Settings' }],
  },
]

type AnomalyAlert = {
  category: string
  entity: string
  timestamp: string
  severity: string
  explanation: string
}

export default function AdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useWorkspace()
  const { user, logout } = useAuth()
  const { options: meta } = useMeta()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [alertsSeen, setAlertsSeen] = useState(false)

  const { data: alertData } = useApi<{ rows: AnomalyAlert[]; by_severity: { severity: string; n: number }[] }>(
    '/anomalies',
    { params: { limit: 4 } },
  )
  const alerts = useMemo(() => {
    const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return [...(alertData?.rows ?? [])].sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)).slice(0, 4)
  }, [alertData])
  const openAlerts = (alertData?.by_severity ?? []).filter((s) => s.severity === 'critical' || s.severity === 'high').reduce((s, r) => s + r.n, 0)

  const navGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          i.to === '/admin/anomalies' && openAlerts > 0 ? { ...i, badge: String(openAlerts) } : i,
        ),
      })),
    [openAlerts],
  )

  const allItems = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups])
  const current = useMemo(() => {
    const exact = allItems.find((i) => i.to === pathname)
    if (exact) return exact
    return [...allItems].filter((i) => !i.end).sort((a, b) => b.to.length - a.to.length).find((i) => pathname.startsWith(i.to))
  }, [pathname, allItems])
  const group = useMemo(() => navGroups.find((g) => g.items.some((i) => i.to === current?.to)), [current, navGroups])

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
        {navGroups.map((g) => (
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
              <p className="text-[12px] font-semibold text-ink">Live workspace</p>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-snug text-ink-muted">
              {meta
                ? `${meta.restaurants.length} branches · data through ${fmtDate((meta.date_range.max as string).slice(0, 10), { withYear: true })}`
                : 'Connecting to the DineIQ API…'}
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas">
      <LiveBanner />

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
                    {!alertsSeen && openAlerts > 0 && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-clay-500" />
                    )}
                  </span>
                )}
              >
                {(close) => (
                  <>
                    <div className="flex items-center justify-between px-2.5 pb-2 pt-1">
                      <p className="text-[12px] font-bold uppercase tracking-wide text-ink-faint">Recent alerts</p>
                      <span className="rounded-full bg-clay-50 px-1.5 py-0.5 text-[10px] font-bold text-clay-600">
                        {openAlerts} open
                      </span>
                    </div>
                    {alerts.length === 0 && (
                      <p className="px-2.5 py-3 text-[12.5px] text-ink-muted">No anomalies detected — all quiet.</p>
                    )}
                    {alerts.map((a, i) => (
                      <Link key={`${a.entity}-${i}`} to="/admin/anomalies" onClick={close} className="flex gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-canvas">
                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.severity === 'critical' ? 'bg-clay-500' : a.severity === 'high' ? 'bg-gold-500' : 'bg-sky-500')} />
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-semibold text-ink">{a.category.replace(/_/g, ' ')} · {a.entity}</span>
                          <span className="block text-[11.5px] leading-snug text-ink-muted">{a.explanation}</span>
                          <span className="mt-0.5 block text-[11px] text-ink-faint">{timeAgoISO(a.timestamp)}</span>
                        </span>
                      </Link>
                    ))}
                    <div className="my-1 h-px bg-line" />
                    <MenuItemRow
                      icon="CheckCheck"
                      onClick={() => {
                        setAlertsSeen(true)
                        close()
                      }}
                    >
                      Mark all as read
                    </MenuItemRow>
                  </>
                )}
              </Dropdown>

              <IconButton
                icon={theme === 'light' ? 'Moon' : 'Sun'}
                label={theme === 'light' ? 'Switch to warm theme' : 'Switch to light theme'}
                className="hidden sm:inline-flex"
                onClick={toggleTheme}
              />

              <Dropdown
                width={230}
                trigger={() => (
                  <span className="focus-ring ml-1 inline-flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-canvas">
                    <Avatar name={user?.username ?? '?'} size={30} tone="#B54E17" />
                    <Icon name="ChevronDown" size={14} className="text-ink-faint" />
                  </span>
                )}
              >
                {(close) => (
                  <>
                    <div className="rounded-lg bg-canvas px-2.5 py-2.5">
                      <p className="text-[13px] font-semibold capitalize text-ink">{user?.username}</p>
                      <p className="text-[11.5px] capitalize text-ink-muted">{user?.role} · DineIQ Analytics</p>
                    </div>
                    <div className="my-1 h-px bg-line" />
                    <Link to="/admin/settings" onClick={close}><MenuItemRow icon="User">Profile & account</MenuItemRow></Link>
                    <Link to="/admin/settings" onClick={close}><MenuItemRow icon="Building2">Restaurant profile</MenuItemRow></Link>
                    <Link to="/admin/settings" onClick={close}><MenuItemRow icon="Users">Team & permissions</MenuItemRow></Link>
                    <div className="my-1 h-px bg-line" />
                    <Link to="/" onClick={close}><MenuItemRow icon="Store">View customer store</MenuItemRow></Link>
                    <MenuItemRow
                      icon="LogOut"
                      tone="danger"
                      onClick={() => {
                        logout()
                        close()
                        navigate('/login')
                      }}
                    >
                      Log out
                    </MenuItemRow>
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
