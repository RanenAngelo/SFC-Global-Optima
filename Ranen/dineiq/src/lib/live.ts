/* ───────────────────────────── Live page hooks ─────────────────────────────
 * One hook per admin page. Each hook queries the DineIQ API with the current
 * workspace filters and reshapes responses into the exact variable shapes the
 * (preserved) page JSX already consumes. No mock data, no invented values —
 * anything the API cannot provide is omitted or labelled.
 */
import { useEffect, useMemo, useState } from 'react'
import { apiFetch, fmtDate, timeAgoISO, useApi, useApiFilters, useMeta } from './api'
import { useWorkspace } from '../store/app'
import { num, money } from './utils'

/* ───────────────────────────── Date helpers ───────────────────────────── */

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function diffDaysISO(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`).getTime()
  const b = new Date(`${to}T12:00:00`).getTime()
  return Math.round((b - a) / 86400000)
}

export function pctChange(cur: number, prev: number): number | undefined {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return undefined
  const v = ((cur - prev) / Math.abs(prev)) * 100
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : undefined
}

/* ───────────────────────────── Shared API types ───────────────────────────── */

export type OverviewOut = {
  kpi: { orders: number; revenue: number; profit: number; aov: number; customers: number }
  revenue_trend: { d: string; revenue: number; orders: number }[]
  channels: { channel: string; orders: number; revenue: number }[]
  top_sellers: { item_id: string; item_name: string; units: number; revenue: number }[]
  category_revenue: { category_name: string; revenue: number }[]
  wastage: { qty: number; cost: number }
  open_critical_anomalies: number
  critical_recommendations: number
}

export type OrderRow = {
  order_id: string
  customer_id: string
  restaurant_id: string
  order_datetime: string
  channel: string
  promotion_id: string | null
  status: string
  total_amount: number
  restaurant_name?: string
}

export type AnomalyRow = {
  category: string
  metric: string
  entity: string
  timestamp: string
  actual: number
  baseline: number
  deviation_z: number
  severity: string
  explanation: string
}

export type RecRow = {
  id: string
  type: string
  title: string
  entity: string
  action: string
  evidence: string[]
  source: string
  priority: string
  impact_rs: number
  state: string
}

export type LocationRow = {
  restaurant_id: string
  restaurant_name: string
  city: string
  revenue: number
  profit: number
  orders: number
  customers: number
  promo_share: number
  aov: number
  repeat_rate: number
  wasted_qty: number
  avg_rating: number
  profit_driver_revenue_share: number
}

export type MenuIntelRow = {
  item_id: string
  item_name: string
  category_id: string
  category_name: string
  units_sold: number
  revenue: number
  contribution_margin: number
  profit_pct: number
  performance_class?: string
  location_class?: string
  avg_rating: number
  n_ratings: number
  rating_trend: number
  wasted_qty: number
  wastage_pct: number
  sales_trend_pct: number
  sales_trend: string
  popularity: number
  repeat_purchase_rate: number
  f_units: number
  f_revenue: number
  f_margin: number
  [k: string]: unknown
}

/* ───────────────────────────── Overview ───────────────────────────── */

export type Kpi = {
  key: string
  label: string
  value: string
  change?: number
  compare?: string
  hint?: string
  icon: string
  tone: string
}

const SEV_TONE: Record<string, string> = { critical: 'clay', high: 'gold', medium: 'sky', low: 'sage' }

export function useOverviewData() {
  const f = useApiFilters()
  const { options: meta } = useMeta()
  const { rangeLabel } = useWorkspace()

  const prevParams = useMemo(() => {
    if (!f.date_from || !f.date_to) return null
    const span = diffDaysISO(f.date_from, f.date_to) + 1
    const p: Record<string, string> = {
      date_from: addDaysISO(f.date_from, -span),
      date_to: addDaysISO(f.date_from, -1),
    }
    if (f.location !== 'all') p.restaurant_id = f.location
    return p
  }, [f.date_from, f.date_to, f.location])

  const cur = useApi<OverviewOut>('/dashboard/overview', { params: f.params, enabled: f.ready })
  const prev = useApi<OverviewOut>('/dashboard/overview', {
    params: prevParams ?? {},
    enabled: f.ready && !!prevParams,
  })
  const intel = useApi<{ scope: string; rows: MenuIntelRow[]; classes: { class: string; n: number }[] }>(
    '/menu-intelligence',
    { params: f.location !== 'all' ? { restaurant_id: f.location } : {}, enabled: f.ready },
  )
  const intelGlobal = useApi<{ rows: MenuIntelRow[] }>(
    '/menu-intelligence',
    { params: {}, enabled: f.ready && f.location !== 'all' },
  )
  const recent = useApi<{ rows: OrderRow[]; total: number }>('/orders', {
    params: { ...f.params, page_size: 6 },
    enabled: f.ready,
  })
  const hoursQ = useApi<{ rows: OrderRow[] }>('/orders', {
    params: { ...f.params, page_size: 5000 },
    enabled: f.ready,
  })
  const anom = useApi<{ rows: AnomalyRow[] }>('/anomalies', {
    params: { limit: 4 },
    enabled: f.ready,
  })
  const recs = useApi<RecRow[]>('/recommendations', { params: {}, enabled: f.ready })
  const locs = useApi<LocationRow[]>('/locations', { enabled: f.ready })
  const ratings = useApi<{ trend: { m: string; avg_rating: number; n: number }[]; distribution: { rating: number; n: number }[] }>(
    '/ratings',
    { enabled: f.ready },
  )

  // Location trends for honest in-range change (top 3 by revenue).
  const [locTrends, setLocTrends] = useState<Record<string, { d: string; revenue: number }[]>>({})
  const topLocIds = useMemo(
    () => [...(locs.data ?? [])].sort((a, b) => b.revenue - a.revenue).slice(0, 3).map((l) => l.restaurant_id),
    [locs.data],
  )
  useEffect(() => {
    let live = true
    if (topLocIds.length === 0) return
    Promise.all(
      topLocIds.map((id) =>
        apiFetch<{ trend: { d: string; revenue: number }[] }>(`/locations/${id}`)
          .then((d) => [id, d.trend] as const)
          .catch(() => [id, []] as const),
      ),
    ).then((pairs) => {
      if (live) setLocTrends(Object.fromEntries(pairs))
    })
    return () => {
      live = false
    }
  }, [topLocIds.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recent daily units per top seller for sparklines.
  const [sparks, setSparks] = useState<Record<string, number[]>>({})
  const sellerIds = useMemo(() => (cur.data?.top_sellers ?? []).map((s) => s.item_id), [cur.data])
  useEffect(() => {
    let live = true
    if (sellerIds.length === 0) return
    Promise.all(
      sellerIds.map((id) =>
        apiFetch<{ history: { d: string; units: number }[] }>('/forecast/history', { params: { grain: 'item', entity_id: id } })
          .then((d) => [id, d.history.slice(-8).map((h) => h.units)] as const)
          .catch(() => [id, []] as const),
      ),
    ).then((pairs) => {
      if (live) setSparks(Object.fromEntries(pairs))
    })
    return () => {
      live = false
    }
  }, [sellerIds.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading =
    cur.loading || prev.loading || intel.loading || recent.loading || hoursQ.loading || anom.loading || recs.loading || locs.loading || ratings.loading
  const error =
    cur.error ?? prev.error ?? intel.error ?? recent.error ?? hoursQ.error ?? anom.error ?? recs.error ?? locs.error ?? ratings.error
  const refetch = () => {
    cur.refetch()
    prev.refetch()
    intel.refetch()
    intelGlobal.refetch()
    recent.refetch()
    hoursQ.refetch()
    anom.refetch()
    recs.refetch()
    locs.refetch()
    ratings.refetch()
  }

  const shaped = useMemo(() => {
    if (!cur.data) return null
    const k = cur.data.kpi
    const pk = prev.data?.kpi
    const compare = prevParams ? `vs prior ${diffDaysISO(f.date_from!, f.date_to!) + 1} days` : undefined
    const margin = k.revenue ? (k.profit / k.revenue) * 100 : 0
    const pMargin = pk && pk.revenue ? (pk.profit / pk.revenue) * 100 : 0
    const wastePct = k.revenue ? (cur.data.wastage.cost / k.revenue) * 100 : 0

    const rTrend = ratings.data?.trend ?? []
    const lastM = rTrend[rTrend.length - 1]
    const prevM = rTrend[rTrend.length - 2]
    const dist = ratings.data?.distribution ?? []
    const distN = dist.reduce((s, r) => s + r.n, 0)
    const distAvg = distN ? dist.reduce((s, r) => s + r.rating * r.n, 0) / distN : 0

    const KPIS: Kpi[] = [
      { key: 'revenue', label: 'Total Revenue', value: money(k.revenue, { decimals: true }), change: pk ? pctChange(k.revenue, pk.revenue) : undefined, compare, hint: 'Live: gross completed sales in the selected period.', icon: 'Wallet', tone: 'ember' },
      { key: 'orders', label: 'Total Orders', value: num(k.orders), change: pk ? pctChange(k.orders, pk.orders) : undefined, compare, hint: 'Live: completed orders in the selected period.', icon: 'Receipt', tone: 'sky' },
      { key: 'aov', label: 'Average Order Value', value: money(k.aov, { decimals: true }), change: pk ? pctChange(k.aov, pk.aov) : undefined, compare, hint: 'Live: revenue divided by order count.', icon: 'TrendingUp', tone: 'gold' },
      { key: 'profit', label: 'Gross Profit', value: money(k.profit, { decimals: true }), change: pk ? pctChange(k.profit, pk.profit) : undefined, compare, hint: 'Live: revenue less item cost.', icon: 'Coins', tone: 'sage' },
      { key: 'margin', label: 'Contribution Margin', value: `${margin.toFixed(1)}%`, change: pk ? pctChange(margin, pMargin) : undefined, compare, hint: 'Live: profit as a share of revenue.', icon: 'Percent', tone: 'sage' },
      { key: 'customers', label: 'Customer Count', value: num(k.customers), change: pk ? pctChange(k.customers, pk.customers) : undefined, compare, hint: 'Live: unique customers who ordered in the period.', icon: 'Users', tone: 'sky' },
      { key: 'wastage', label: 'Food Wastage', value: `${wastePct.toFixed(1)}%`, compare: `${money(cur.data.wastage.cost, { compact: true })} cost in period`, hint: 'Live: recorded wastage cost as a share of revenue.', icon: 'Trash2', tone: 'clay' },
      { key: 'rating', label: 'Average Rating', value: (lastM?.avg_rating ?? distAvg).toFixed(2), change: lastM && prevM ? pctChange(lastM.avg_rating, prevM.avg_rating) : undefined, compare: lastM && prevM ? 'vs previous month' : `${num(distN)} ratings all-time`, hint: 'Live: mean customer rating.', icon: 'Star', tone: 'gold' },
      { key: 'alerts', label: 'Open Alerts', value: num(cur.data.open_critical_anomalies), compare: 'critical + high anomalies', hint: 'Live: anomalies awaiting review.', icon: 'AlertTriangle', tone: 'clay' },
      { key: 'recs', label: 'Critical Actions', value: num(cur.data.critical_recommendations), compare: 'critical recommendations', hint: 'Live: critical pipeline recommendations.', icon: 'Lightbulb', tone: 'ember' },
    ]

    const REVENUE_SERIES = cur.data.revenue_trend.map((r) => ({
      day: fmtDate(r.d),
      revenue: Math.round(r.revenue * 100) / 100,
      orders: r.orders,
    }))

    const chTotal = cur.data.channels.reduce((s, c) => s + c.revenue, 0)
    const CHANNEL_MIX = cur.data.channels.map((c) => ({
      name: c.channel,
      value: chTotal ? Math.round((c.revenue / chTotal) * 1000) / 10 : 0,
    }))
    const channelOrders = cur.data.channels.reduce((s, c) => s + c.orders, 0)

    const CATEGORY_REVENUE = cur.data.category_revenue.map((c) => ({
      category: c.category_name,
      revenue: Math.round(c.revenue * 100) / 100,
    }))

    const hourBuckets = new Array(24).fill(0) as number[]
    for (const o of hoursQ.data?.rows ?? []) {
      const h = new Date(o.order_datetime.replace(' ', 'T')).getHours()
      if (Number.isFinite(h)) hourBuckets[h] += 1
    }
    const ORDERS_BY_HOUR = hourBuckets.map((orders, h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      orders,
    }))

    const marginById: Record<string, number> = {}
    for (const r of (intelGlobal.data?.rows ?? intel.data?.rows ?? [])) {
      if (typeof r.profit_pct === 'number') marginById[r.item_id] = r.profit_pct
    }
    const TOP_SELLERS = cur.data.top_sellers.map((s) => ({
      item_id: s.item_id,
      name: s.item_name,
      img: undefined as string | undefined,
      units: s.units,
      revenue: s.revenue,
      margin: marginById[s.item_id] !== undefined ? Math.round(marginById[s.item_id] * 10) / 10 : 0,
      spark: sparks[s.item_id] ?? [],
    }))

    const classes = intel.data?.classes ?? []
    const classN = classes.reduce((s, c) => s + c.n, 0)
    const MENU_PERFORMANCE_DIST = classes.map((c) => ({
      name: c.class,
      value: classN ? Math.round((c.n / classN) * 1000) / 10 : 0,
    }))
    const classTotal = classN

    const trendChange = (id: string): number | undefined => {
      if (!f.date_from || !f.date_to) return undefined
      const t = locTrends[id] ?? []
      const span = diffDaysISO(f.date_from, f.date_to) + 1
      const prevFrom = addDaysISO(f.date_from, -span)
      let a = 0
      let b = 0
      for (const r of t) {
        if (r.d >= f.date_from && r.d <= f.date_to) a += r.revenue
        else if (r.d >= prevFrom && r.d < f.date_from) b += r.revenue
      }
      return pctChange(a, b)
    }
    const LOCATIONS = [...(locs.data ?? [])]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map((l) => ({
        id: l.restaurant_id,
        name: l.restaurant_name,
        area: l.city,
        revenue: l.revenue,
        margin: l.revenue ? Math.round((l.profit / l.revenue) * 1000) / 10 : 0,
        rating: Math.round(l.avg_rating * 100) / 100,
        trend: trendChange(l.restaurant_id) ?? 0,
      }))

    const ADMIN_ORDERS = (recent.data?.rows ?? []).map((o) => ({
      id: o.order_id,
      number: o.order_id,
      time: fmtDate(o.order_datetime),
      customer: o.customer_id,
      channel: o.channel,
      status: o.status,
      total: o.total_amount,
    }))

    const RECENT_ALERTS = (anom.data?.rows ?? []).slice(0, 4).map((a, i) => ({
      id: `${a.entity}-${i}`,
      tone: SEV_TONE[a.severity] ?? 'sky',
      title: `${a.category.replace(/_/g, ' ')} · ${a.entity}`,
      body: a.explanation,
      tag: a.severity,
      time: timeAgoISO(a.timestamp),
    }))

    const RECOMMENDATIONS = (recs.data ?? []).slice(0, 3).map((r) => ({
      id: r.id,
      priority: r.priority,
      category: r.source,
      title: r.title,
      description: r.action,
      metrics: [
        { label: 'Est. impact', value: money(r.impact_rs, { decimals: true }) },
        { label: 'Status', value: r.state },
      ],
    }))

    return {
      KPIS,
      REVENUE_SERIES,
      CHANNEL_MIX,
      channelOrders,
      CATEGORY_REVENUE,
      ORDERS_BY_HOUR,
      hoursSample: (hoursQ.data?.rows ?? []).length,
      TOP_SELLERS,
      MENU_PERFORMANCE_DIST,
      classTotal,
      LOCATIONS,
      ADMIN_ORDERS,
      RECENT_ALERTS,
      RECOMMENDATIONS,
      branchCount: (meta?.restaurants?.length as number | undefined) ?? (locs.data?.length ?? 0),
      dataMax: (meta?.date_range?.dmax as string | undefined)?.slice(0, 10) ?? null,
      rangeLabel,
    }
  }, [cur.data, prev.data, prevParams, intel.data, intelGlobal.data, recent.data, hoursQ.data, anom.data, recs.data, locs.data, ratings.data, locTrends, sparks, meta, f.date_from, f.date_to, rangeLabel])

  return { data: shaped, loading, error, refetch }
}

/* ───────────────────────────── Orders ───────────────────────────── */

export type LiveOrder = {
  id: string
  number: string
  time: string
  channel: string
  customer: string
  promo: string | null
  location: string
  itemsQty: number
  status: string
  total: number
}

export function useOrdersData() {
  const f = useApiFilters()
  const list = useApi<{ rows: (OrderRow & { lines_n: number; items_qty: number })[]; total: number }>('/orders', {
    params: { ...f.params, page_size: 5000 },
    enabled: f.ready,
  })
  const completed = useApi<{ total: number }>('/orders', {
    params: { ...f.params, page_size: 1, status: 'Completed' },
    enabled: f.ready,
  })
  const cancelled = useApi<{ total: number }>('/orders', {
    params: { ...f.params, page_size: 1, status: 'Cancelled' },
    enabled: f.ready,
  })
  const over = useApi<OverviewOut>('/dashboard/overview', { params: f.params, enabled: f.ready })

  const loading = list.loading || completed.loading || cancelled.loading || over.loading
  const error = list.error ?? completed.error ?? cancelled.error ?? over.error
  const refetch = () => {
    list.refetch()
    completed.refetch()
    cancelled.refetch()
    over.refetch()
  }

  const shaped = useMemo(() => {
    if (!list.data) return null
    const rows: LiveOrder[] = list.data.rows.map((o) => ({
      id: o.order_id,
      number: o.order_id,
      time: fmtDate(o.order_datetime),
      channel: o.channel,
      customer: o.customer_id,
      promo: o.promotion_id,
      location: o.restaurant_name ?? o.restaurant_id,
      itemsQty: o.items_qty ?? 0,
      status: o.status,
      total: o.total_amount,
    }))
    return {
      rows,
      total: list.data.total,
      truncated: list.data.total > list.data.rows.length,
      counts: {
        all: list.data.total,
        Completed: completed.data?.total ?? 0,
        Cancelled: cancelled.data?.total ?? 0,
      },
      aov: over.data?.kpi.aov ?? 0,
    }
  }, [list.data, completed.data, cancelled.data, over.data])

  return { data: shaped, loading, error, refetch }
}

export type OrderDetail = {
  order: OrderRow & { restaurant_name: string }
  lines: { item_id: string; item_name: string; quantity: number; unit_price: number; discount_pct: number; line_total: number }[]
}

export type CustomerProfile = {
  profile: {
    customer_id: string
    segment: string
    R: number
    F: number
    M: number
    RFM: string
    monetary: number
    frequency: number
    aov: number
    recency_days: number
  }
  recent_orders: OrderRow[]
}

export function useOrderDetail(orderId: string | null) {
  const detail = useApi<OrderDetail>(orderId ? `/orders/${orderId}` : null, { enabled: !!orderId })
  const customerId = detail.data?.order.customer_id ?? null
  const customer = useApi<CustomerProfile>(customerId ? `/customers/${customerId}` : null, {
    enabled: !!customerId,
  })
  return { detail: detail.data ?? null, loading: detail.loading, customer: customer.data ?? null }
}

/* ───────────────────────────── Menu management ───────────────────────────── */

export type MenuRow = {
  id: string
  name: string
  price: number
  cost: number
  marginPct: number
  categoryId: string
  category: string
  rating: number
  reviews: number
  available: boolean
  popular: boolean
  demandTier: string
  wastageTag: string
  priceSensTag: string
  seasonal: boolean
  promoDep: boolean
  introduced: string
}

export function useMenuData() {
  const items = useApi<
    {
      item_id: string
      item_name: string
      category_id: string
      base_cost: number
      base_price: number
      is_active: number
      introduced_date: string
      demand_tier: string
      wastage_tag: string
      price_sensitivity_tag: string
      seasonal_tag: number
      promo_dependent_tag: number
      category_name: string
    }[]
  >('/menu/items')
  const ratings = useApi<{ by_item: { item_id: string; avg_rating: number; n: number }[] }>('/ratings')

  const loading = items.loading || ratings.loading
  const error = items.error ?? ratings.error
  const refetch = () => {
    items.refetch()
    ratings.refetch()
  }

  const shaped = useMemo(() => {
    if (!items.data) return null
    const rById: Record<string, { avg_rating: number; n: number }> = {}
    for (const r of ratings.data?.by_item ?? []) rById[r.item_id] = r
    const rows: MenuRow[] = items.data.map((m) => ({
      id: m.item_id,
      name: m.item_name,
      price: m.base_price,
      cost: m.base_cost,
      marginPct: m.base_price > 0 ? Math.round(((m.base_price - m.base_cost) / m.base_price) * 1000) / 10 : 0,
      categoryId: m.category_id,
      category: m.category_name,
      rating: rById[m.item_id] ? Math.round(rById[m.item_id].avg_rating * 10) / 10 : 0,
      reviews: rById[m.item_id]?.n ?? 0,
      available: m.is_active === 1,
      popular: m.demand_tier === 'High',
      demandTier: m.demand_tier,
      wastageTag: m.wastage_tag,
      priceSensTag: m.price_sensitivity_tag,
      seasonal: m.seasonal_tag === 1,
      promoDep: m.promo_dependent_tag === 1,
      introduced: (m.introduced_date ?? '').slice(0, 10),
    }))
    return { rows }
  }, [items.data, ratings.data])

  return { data: shaped, loading, error, refetch }
}

/* ───────────────────────────── Menu intelligence ───────────────────────────── */

export type IntelClassKey = 'profit-driver' | 'volume-driver' | 'hidden-opportunity' | 'low-performer'

export const INTEL_CLASS_ORDER: IntelClassKey[] = ['profit-driver', 'volume-driver', 'hidden-opportunity', 'low-performer']

export function classToKey(c: string | null | undefined): IntelClassKey {
  switch ((c ?? '').trim().toLowerCase()) {
    case 'profit driver':
      return 'profit-driver'
    case 'volume driver':
      return 'volume-driver'
    case 'hidden opportunity':
      return 'hidden-opportunity'
    default:
      return 'low-performer'
  }
}

/** Presentation metadata for the four pipeline classes. Counts are filled live;
 * criteria describe the real percentile rules from classify_menu.py. */
export const INTEL_CLASSES: Record<
  IntelClassKey,
  { label: string; short: string; desc: string; color: string; bg: string; border: string; criteria: string[] }
> = {
  'profit-driver': {
    label: 'Profit Driver',
    short: 'Profit',
    desc: 'High demand and high profit with controlled wastage. These dishes carry the menu and should be protected from discounting.',
    color: '#4A7139', bg: '#F1F6EF', border: '#DDE9D8',
    criteria: ['Units sold ≥ p70 (high demand)', 'Contribution margin ≥ p70 (high profit)', 'Wastage below p75'],
  },
  'volume-driver': {
    label: 'Volume Driver',
    short: 'Volume',
    desc: 'High order volume below the high-profit bar. These dishes bring customers in and anchor combos and bundles.',
    color: '#2F6FA8', bg: '#F1F6FB', border: '#DDEBF7',
    criteria: ['Units sold ≥ p70 (high demand)', 'Below the high-profit bar, or excessive wastage'],
  },
  'hidden-opportunity': {
    label: 'Hidden Opportunity',
    short: 'Opportunity',
    desc: 'Strong margin, or strong ratings with good repeat — but low visibility. Merchandising and placement usually move these first.',
    color: '#C08A16', bg: '#FDF7EA', border: '#F8EBCB',
    criteria: ['High margin, or rated ≥ 4.0 with good repeat', 'Wastage below p75 and rating not poor (< 3.0)'],
  },
  'low-performer': {
    label: 'Low Performer',
    short: 'Low',
    desc: 'Low volume combined with low margin, high wastage or poor ratings. Candidates for rework, repositioning or removal.',
    color: '#96352C', bg: '#FBF3F1', border: '#F4E1DB',
    criteria: ['Below the high-demand and high-profit bars', 'Or blocked by excessive wastage / poor rating'],
  },
}

export type IntelRow = {
  id: string
  name: string
  category: string
  categoryId: string
  units: number
  revenue: number
  cost: number
  cm: number
  profitPct: number
  rating: number
  nRatings: number
  repeat: number
  wastage: number
  wastedQty: number
  promoDependency: number
  avgDiscount: number
  classification: IntelClassKey
  firstSold: string
  lastSold: string
}

export type PromoRec = {
  promotion_id: string
  promotion_name: string
  scope: string
  target_id: string
  discount_pct: number
  start_date: string
  end_date: string
}

export function useMenuIntelData() {
  const f = useApiFilters()
  const { options: meta } = useMeta()
  const global = useApi<{ scope: string; rows: MenuIntelRow[]; classes: { class: string; n: number }[] }>(
    '/menu-intelligence',
    { params: {}, enabled: f.ready },
  )
  const scoped = useApi<{ scope: string; rows: MenuIntelRow[]; classes: { class: string; n: number }[] }>(
    '/menu-intelligence',
    { params: f.location !== 'all' ? { restaurant_id: f.location } : {}, enabled: f.ready && f.location !== 'all' },
  )
  const waste = useApi<{ wastage_summary: { item_id: string; wasted_qty: number; wastage_cost: number; incidents: number }[] }>(
    '/inventory',
    { enabled: f.ready },
  )
  const promos = useApi<{ promotions: PromoRec[] }>('/promotions', { enabled: f.ready })
  const over = useApi<OverviewOut>('/dashboard/overview', { params: f.params, enabled: f.ready })

  const loading = global.loading || scoped.loading || waste.loading || promos.loading || over.loading
  const error = global.error ?? waste.error ?? promos.error ?? over.error
  const refetch = () => {
    global.refetch()
    scoped.refetch()
    waste.refetch()
    promos.refetch()
    over.refetch()
  }

  const shaped = useMemo(() => {
    if (!global.data) return null
    const gById: Record<string, MenuIntelRow> = {}
    for (const r of global.data.rows) gById[r.item_id] = r
    const useScoped = f.location !== 'all' && scoped.data?.scope === 'location'
    const srcRows = useScoped ? scoped.data!.rows : global.data.rows

    const rows: IntelRow[] = srcRows.map((r) => {
      const g = gById[r.item_id] ?? r
      const units = r.units_sold ?? 0
      const revenue = r.revenue ?? 0
      const cm = r.contribution_margin ?? 0
      const cls = useScoped ? (r.location_class as string | undefined) : (r.performance_class as string | undefined)
      const profitPct = revenue > 0 ? (cm / revenue) * 100 : 0
      return {
        id: r.item_id,
        name: (r.item_name as string) ?? r.item_id,
        category: (g.category_name as string) ?? '—',
        categoryId: (g.category_id as string) ?? '',
        units,
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(((g.cost as number) ?? revenue - cm) * 100) / 100,
        cm: Math.round(cm * 100) / 100,
        profitPct: Math.round(profitPct * 10) / 10,
        rating: Math.round(((r.avg_rating as number) ?? (g.avg_rating as number) ?? 0) * 100) / 100,
        nRatings: (g.n_ratings as number) ?? 0,
        repeat: Math.round((((r.repeat_purchase_rate as number) ?? 0) * 100) * 10) / 10,
        wastage: Math.round((((r.wastage_pct as number) ?? 0)) * 10) / 10,
        wastedQty: (r.wasted_qty as number) ?? 0,
        promoDependency: Math.round((((g.promotion_dependency as number) ?? 0) * 100) * 10) / 10,
        avgDiscount: Math.round((((g.avg_discount_pct as number) ?? 0) * 100) * 10) / 10,
        classification: classToKey(cls),
        firstSold: ((g.first_sold as string) ?? '').slice(0, 10),
        lastSold: ((g.last_sold as string) ?? '').slice(0, 10),
      }
    })

    const classCounts: Record<string, number> = {}
    for (const r of rows) classCounts[r.classification] = (classCounts[r.classification] ?? 0) + 1
    const classes = INTEL_CLASS_ORDER.map((key) => ({
      key,
      ...INTEL_CLASSES[key],
      count: classCounts[key] ?? 0,
      shareLabel: rows.length ? `${Math.round(((classCounts[key] ?? 0) / rows.length) * 100)}% of items` : '—',
    }))
    const dist = classes.map((c) => ({
      name: c.label,
      value: rows.length ? Math.round((c.count / rows.length) * 1000) / 10 : 0,
      color: c.color,
    }))

    const scatter = rows.map((r) => ({ name: r.name, units: r.units, profitPct: r.profitPct, classification: r.classification }))

    const byCat: Record<string, { revenue: number; units: number; cm: number }> = {}
    for (const r of rows) {
      const b = (byCat[r.category] ??= { revenue: 0, units: 0, cm: 0 })
      b.revenue += r.revenue
      b.units += r.units
      b.cm += r.cm
    }
    const categoryBars = Object.entries(byCat)
      .map(([category, b]) => ({
        category,
        revenue: Math.round(b.revenue * 100) / 100,
        units: b.units,
        margin: b.revenue ? Math.round((b.cm / b.revenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const buckets = ['<40%', '40–50%', '50–60%', '60–70%', '70%+']
    const marginDist = buckets.map((bucket) => ({ bucket, items: 0 }))
    for (const r of rows) {
      const i = r.profitPct < 40 ? 0 : r.profitPct < 50 ? 1 : r.profitPct < 60 ? 2 : r.profitPct < 70 ? 3 : 4
      marginDist[i].items += 1
    }

    const menuAvgRating = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0
    const wasteById: Record<string, { qty: number; cost: number; incidents: number }> = {}
    for (const w of waste.data?.wastage_summary ?? []) {
      wasteById[w.item_id] = { qty: w.wasted_qty, cost: w.wastage_cost, incidents: w.incidents }
    }

    return {
      rows,
      classes,
      dist,
      scatter,
      categoryBars,
      marginDist,
      menuAvgRating,
      wasteById,
      promos: promos.data?.promotions ?? [],
      salesTrend: (over.data?.revenue_trend ?? []).map((t) => ({ d: fmtDate(t.d), units: t.orders, revenue: t.revenue })),
      scoped: useScoped,
      dataMax: (meta?.date_range?.dmax as string | undefined)?.slice(0, 10) ?? null,
    }
  }, [global.data, scoped.data, waste.data, promos.data, over.data, f.location, meta])

  return { data: shaped, loading, error, refetch }
}

export type IntelDetail = {
  item: MenuIntelRow
  monthly_trend: { m: string; units: number; revenue: number }[]
  locations: {
    restaurant_id: string
    restaurant_name: string
    city: string
    units_sold: number
    revenue: number
    contribution_margin: number
    buyers: number
    wastage_pct: number
    avg_rating: number | null
    location_class: string
    differs_from_global: number
  }[]
  elasticity: { price_change_pct: number | null; elasticity: number | null; verdict: string; reason: string }[]
  slow: { slow_moving: number; signals: string } | null
  channels: { channel: string; units: number; lines: number; revenue: number }[]
  price_history: { price: number; effective_from: string; effective_to: string | null }[]
  rating_dist: { rating: number; n: number }[]
}

export function useIntelDetail(itemId: string | null) {
  const q = useApi<IntelDetail>(itemId ? `/menu-intelligence/${itemId}` : null, { enabled: !!itemId })
  return { detail: q.data ?? null, loading: q.loading }
}

/* ───────────────────────────── Customers ───────────────────────────── */

export const SEGMENT_META: Record<string, { color: string; desc: string; play: string }> = {
  'High-Value Loyal Customers': {
    color: '#4A7139',
    desc: 'Top RFM scorers with the highest lifetime value. The core of repeat revenue.',
    play: 'Protect and reward',
  },
  'Frequent Customers': {
    color: '#2F6FA8',
    desc: 'Order often with mid-range baskets. The most responsive to bundles.',
    play: 'Grow basket with bundles',
  },
  'Promotion-Driven Customers': {
    color: '#C08A16',
    desc: 'Buy mainly on offer. Valuable volume but discount-reliant.',
    play: 'Reduce discount reliance',
  },
  'At-Risk Customers': {
    color: '#96352C',
    desc: 'Were valuable but have gone quiet. Highest win-back priority.',
    play: 'Win-back campaign',
  },
  'New Customers': {
    color: '#B54E17',
    desc: 'First orders in the recent window. Habits are still forming.',
    play: 'Onboarding sequence',
  },
  'Occasional Customers': {
    color: '#726B62',
    desc: 'Order rarely with small baskets. The long tail of the base.',
    play: 'Re-activate with offers',
  },
}

export type LiveCustomer = {
  id: string
  segment: string
  color: string
  orders: number
  spend: number
  aov: number
  recency: number
  lastOrder: string
  rfm: string
  R: number
  F: number
  M: number
  tenure: number
  basket: number
  promoSens: number
  channel: string
  favCat: string
  joined: string
}

export type SegmentCard = {
  key: string
  name: string
  color: string
  desc: string
  play: string
  count: number
  share: number
  aov: number
  avgOrders: number
  totalValue: number
  meanR: number
  meanF: number
  meanM: number
}

export function useCustomersData() {
  const f = useApiFilters()
  const { options: meta } = useMeta()
  const analytics = useApi<{
    segments: { segment: string; n: number; avg_value: number; total_value: number }[]
    rfm: { R: number; F: number; M: number; n: number }[]
    high_value: { customer_id: string }[]
    at_risk: { customer_id: string }[]
    churn_bands: { band: string; n: number }[]
    trends: { m: string; active: number }[]
  }>('/customers/analytics', { enabled: f.ready })
  const list = useApi<{
    rows: {
      customer_id: string
      segment: string
      recency_days: number
      frequency: number
      monetary: number
      aov: number
      basket_size: number
      tenure_days: number
      R: number
      F: number
      M: number
      RFM: string
      promo_sensitivity: number
      channel_preference: string | null
      favorite_category: string | null
      signup_date: string
    }[]
    total: number
  }>('/customers', { params: { page_size: 5000 }, enabled: f.ready })
  const over = useApi<OverviewOut>('/dashboard/overview', { params: f.params, enabled: f.ready })

  const loading = analytics.loading || list.loading || over.loading
  const error = analytics.error ?? list.error ?? over.error
  const refetch = () => {
    analytics.refetch()
    list.refetch()
    over.refetch()
  }

  const shaped = useMemo(() => {
    if (!analytics.data || !list.data) return null
    const dataMax = (meta?.date_range?.dmax as string | undefined)?.slice(0, 10) ?? null
    const lastOrderOf = (recency: number) => (dataMax ? fmtDate(addDaysISO(dataMax, -recency)) : `${recency}d ago`)

    const customers: LiveCustomer[] = list.data.rows.map((r) => ({
      id: r.customer_id,
      segment: r.segment,
      color: SEGMENT_META[r.segment]?.color ?? '#726B62',
      orders: r.frequency,
      spend: Math.round(r.monetary * 100) / 100,
      aov: Math.round(r.aov * 100) / 100,
      recency: r.recency_days,
      lastOrder: lastOrderOf(r.recency_days),
      rfm: r.RFM,
      R: r.R,
      F: r.F,
      M: r.M,
      tenure: r.tenure_days,
      basket: Math.round(r.basket_size * 10) / 10,
      promoSens: Math.round(r.promo_sensitivity * 100),
      channel: r.channel_preference ?? '—',
      favCat: r.favorite_category ?? '—',
      joined: fmtDate(r.signup_date),
    }))

    const bySeg: Record<string, LiveCustomer[]> = {}
    for (const c of customers) (bySeg[c.segment] ??= []).push(c)
    const total = customers.length
    const segCards: SegmentCard[] = analytics.data.segments.map((s) => {
      const members = bySeg[s.segment] ?? []
      const mean = (k: 'aov' | 'orders' | 'R' | 'F' | 'M') =>
        members.length ? members.reduce((t, c) => t + c[k], 0) / members.length : 0
      return {
        key: s.segment,
        name: s.segment,
        color: SEGMENT_META[s.segment]?.color ?? '#726B62',
        desc: SEGMENT_META[s.segment]?.desc ?? 'Pipeline segment.',
        play: SEGMENT_META[s.segment]?.play ?? 'Review manually',
        count: s.n,
        share: total ? Math.round((s.n / total) * 1000) / 10 : 0,
        aov: Math.round(mean('aov') * 100) / 100,
        avgOrders: Math.round(mean('orders') * 10) / 10,
        totalValue: Math.round(s.total_value * 100) / 100,
        meanR: Math.round(mean('R') * 100) / 100,
        meanF: Math.round(mean('F') * 100) / 100,
        meanM: Math.round(mean('M') * 100) / 100,
      }
    })

    const segValue = [...segCards]
      .sort((a, b) => b.totalValue - a.totalValue)
      .map((s) => ({ segment: s.name.replace(' Customers', ''), value: s.totalValue, color: s.color }))

    const radarKeys = ['High-Value Loyal Customers', 'Promotion-Driven Customers', 'At-Risk Customers', 'New Customers']
    const radar = [
      { subject: 'Recency', key: 'meanR' },
      { subject: 'Frequency', key: 'meanF' },
      { subject: 'Monetary', key: 'meanM' },
    ].map((row) => {
      const o: Record<string, string | number> = { subject: row.subject }
      for (const name of radarKeys) {
        const card = segCards.find((c) => c.name === name)
        o[name.replace(' Customers', '')] = card ? (card[row.key as 'meanR' | 'meanF' | 'meanM'] as number) : 0
      }
      return o
    })

    const catTotal = (over.data?.category_revenue ?? []).reduce((s, c) => s + c.revenue, 0)
    const favCats = (over.data?.category_revenue ?? [])
      .map((c) => ({
        category: c.category_name,
        value: catTotal ? Math.round((c.revenue / catTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value - a.value)
    const channelBars = (over.data?.channels ?? []).map((c) => ({ channel: c.channel, orders: c.orders }))

    const totalRevenue = analytics.data.segments.reduce((s, g) => s + g.total_value, 0)
    const hv = analytics.data.segments.find((s) => s.segment === 'High-Value Loyal Customers')
    const ar = analytics.data.segments.find((s) => s.segment === 'At-Risk Customers')

    return {
      customers,
      total: list.data.total,
      segCards,
      radar,
      segValue,
      favCats,
      channelBars,
      trends: (analytics.data.trends ?? []).map((t) => ({ m: t.m, active: t.active })),
      timelineId: analytics.data.high_value?.[0]?.customer_id ?? customers[0]?.id ?? null,
      kpis: {
        total,
        avgValue: total ? totalRevenue / total : 0,
        avgOrders: total ? customers.reduce((s, c) => s + c.orders, 0) / total : 0,
        hvCount: hv?.n ?? 0,
        arCount: ar?.n ?? 0,
        churnBands: analytics.data.churn_bands ?? [],
      },
    }
  }, [analytics.data, list.data, over.data, meta])

  return { data: shaped, loading, error, refetch }
}

export function useCustomerDetail(customerId: string | null) {
  const q = useApi<CustomerProfile>(customerId ? `/customers/${customerId}` : null, { enabled: !!customerId })
  return { detail: q.data ?? null, loading: q.loading }
}
