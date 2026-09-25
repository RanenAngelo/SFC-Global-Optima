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

/* ───────────────────────────── Market basket ───────────────────────────── */

export type BasketPair = {
  id: string
  aId: string
  bId: string
  a: string
  b: string
  support: number
  confidence: number
  lift: number
  transactions: number
  opportunity: 'High' | 'Medium' | 'Low'
  action: string
}

export type BundleIdea = {
  id: string
  name: string
  items: string[]
  lift: number
  confidence: number
  evidence: string
}

export function useBasketData() {
  const basket = useApi<{
    rules: {
      antecedent: string
      consequent: string
      support: number
      confidence: number
      lift: number
      transactions: number
      ant_name: string
      con_name: string
    }[]
    bundles: { kind: string; offer: string; antecedent: string; consequent: string; support: number; confidence: number; lift: number; evidence: string }[]
  }>('/market-basket')
  const items = useApi<{ item_id: string; category_name: string }[]>('/menu/items')

  const loading = basket.loading || items.loading
  const error = basket.error ?? items.error
  const refetch = () => {
    basket.refetch()
    items.refetch()
  }

  const shaped = useMemo(() => {
    if (!basket.data) return null
    const oppOf = (lift: number): BasketPair['opportunity'] => (lift >= 8 ? 'High' : lift >= 3 ? 'Medium' : 'Low')
    const actOf = (o: string) =>
      o === 'High' ? 'Feature as a bundle or combo' : o === 'Medium' ? 'Test a cross-sell prompt' : 'Monitor for now'
    const pairs: BasketPair[] = basket.data.rules.map((r, i) => {
      const o = oppOf(r.lift)
      return {
        id: `bp-${i}`,
        aId: r.antecedent,
        bId: r.consequent,
        a: r.ant_name,
        b: r.con_name,
        support: Math.round(r.support * 1000) / 10,
        confidence: Math.round(r.confidence * 1000) / 10,
        lift: Math.round(r.lift * 1000) / 1000,
        transactions: r.transactions,
        opportunity: o,
        action: actOf(o),
      }
    })
    const bundles: BundleIdea[] = basket.data.bundles.map((b, i) => ({
      id: `bd-${i}`,
      name: b.offer,
      items: b.offer.split(' + '),
      lift: Math.round(b.lift * 1000) / 1000,
      confidence: Math.round(b.confidence * 1000) / 10,
      evidence: b.evidence,
    }))

    const catOf: Record<string, string> = {}
    for (const m of items.data ?? []) catOf[m.item_id] = m.category_name
    const edgeMax: Record<string, { source: string; target: string; strength: number; n: number }> = {}
    for (const r of basket.data.rules) {
      const ca = catOf[r.antecedent]
      const cb = catOf[r.consequent]
      if (!ca || !cb || ca === cb) continue
      const key = [ca, cb].sort().join('|')
      const e = (edgeMax[key] ??= { source: [ca, cb].sort()[0], target: [ca, cb].sort()[1], strength: 0, n: 0 })
      e.strength = Math.max(e.strength, r.lift)
      e.n += 1
    }
    const edges = Object.values(edgeMax).sort((a, b) => b.strength - a.strength).slice(0, 14)
    const cats = Array.from(new Set(edges.flatMap((e) => [e.source, e.target])))

    const avgLift = pairs.length ? pairs.reduce((s, p) => s + p.lift, 0) / pairs.length : 0
    const top = [...pairs].sort((a, b) => b.lift - a.lift)[0]

    return { pairs, bundles, cats, edges, avgLift, top }
  }, [basket.data, items.data])

  return { data: shaped, loading, error, refetch }
}

/* ───────────────────────────── Forecasting ───────────────────────────── */

export type ForecastPoint = { date: string; units: number }

export function useForecastData(grain: 'item' | 'restaurant', entityId: string | null) {
  const fc = useApi<{
    forecasts: { date: string; forecast_units: number; method: string; history_rows: number }[]
    model_metrics: { task: string; metrics: string }[]
  }>('/forecast', { params: { grain, entity_id: entityId ?? '' }, enabled: !!entityId })
  const hist = useApi<{ history: { entity: string; d: string; units: number }[] }>('/forecast/history', {
    params: { grain, entity_id: entityId ?? '' },
    enabled: !!entityId,
  })
  const items = useApi<{ item_id: string; item_name: string; category_name: string }[]>('/menu/items')

  const loading = fc.loading || hist.loading || items.loading
  const error = fc.error ?? hist.error ?? items.error
  const refetch = () => {
    fc.refetch()
    hist.refetch()
    items.refetch()
  }

  const shaped = useMemo(() => {
    if (!fc.data || !hist.data) return null
    const forecasts: ForecastPoint[] = fc.data.forecasts.map((f) => ({
      date: f.date.slice(0, 10),
      units: Math.round(f.forecast_units * 100) / 100,
    }))
    const history: ForecastPoint[] = hist.data.history.map((h) => ({ date: h.d.slice(0, 10), units: h.units }))
    const runs = (fc.data.model_metrics ?? []).map((m, i) => {
      let parsed: Record<string, number> = {}
      try {
        parsed = JSON.parse(m.metrics) as Record<string, number>
      } catch {
        parsed = {}
      }
      return {
        run: i + 1,
        rmse: parsed.rmse as number | undefined,
        mae: parsed.mae as number | undefined,
        mape: parsed.mape as number | undefined,
        r2: parsed.r2 as number | undefined,
      }
    })
    return {
      forecasts,
      history,
      runs,
      method: fc.data.forecasts[0]?.method ?? '—',
      historyRows: fc.data.forecasts[0]?.history_rows ?? history.length,
      items: items.data ?? [],
    }
  }, [fc.data, hist.data, items.data])

  return { data: shaped, loading, error, refetch }
}

/* ───────────────────────────── Inventory & wastage ───────────────────────────── */

export type StockRow = {
  id: string
  itemId: string
  itemName: string
  restaurantId: string
  restaurantName: string
  date: string
  stock: number
  consumed: number
  replenished: number
}

export type RiskCard = {
  itemId: string
  itemName: string
  band: string
  score: number
  unitsSold: number
  recentWaste: number
  forecast28: number
}

export function useInventoryData() {
  const inv = useApi<{
    wastage_summary: { item_id: string; item_name: string; category_id: string; wasted_qty: number; wastage_cost: number; incidents: number; units_sold: number; waste_per_unit_sold: number }[]
    wastage_risk: { item_id: string; popularity: number; units_sold: number; recent_waste: number; forecast_28: number; risk_score: number; risk_band: string }[]
    risk_bands: { risk_band: string; n: number }[]
    trend: { d: string; qty: number; cost: number }[]
    by_reason: { reason: string; qty: number; cost: number }[]
    by_location: { restaurant_id: string; city: string; qty: number; cost: number }[]
    stock: { restaurant_id: string; item_id: string; date: string; stock_level: number; consumed_qty: number; replenished_qty: number }[]
  }>('/inventory')
  const items = useApi<{ item_id: string; item_name: string; category_name: string }[]>('/menu/items')
  const { options: meta } = useMeta()

  const loading = inv.loading || items.loading
  const error = inv.error ?? items.error
  const refetch = () => {
    inv.refetch()
    items.refetch()
  }

  const shaped = useMemo(() => {
    if (!inv.data) return null
    const itemName = (id: string) => (items.data ?? []).find((m) => m.item_id === id)?.item_name ?? id
    const restName = (id: string) => meta?.restaurants.find((r) => r.restaurant_id === id)?.restaurant_name ?? id
    const catName = (id: string) => meta?.categories.find((c) => c.category_id === id)?.category_name ?? id

    const stock: StockRow[] = inv.data.stock.map((s, i) => ({
      id: `${s.restaurant_id}-${s.item_id}-${i}`,
      itemId: s.item_id,
      itemName: itemName(s.item_id),
      restaurantId: s.restaurant_id,
      restaurantName: restName(s.restaurant_id),
      date: s.date.slice(0, 10),
      stock: s.stock_level,
      consumed: s.consumed_qty,
      replenished: s.replenished_qty,
    }))

    const risks: RiskCard[] = inv.data.wastage_risk.map((r) => ({
      itemId: r.item_id,
      itemName: itemName(r.item_id),
      band: r.risk_band,
      score: Math.round(r.risk_score * 1000) / 1000,
      unitsSold: r.units_sold,
      recentWaste: Math.round(r.recent_waste * 10) / 10,
      forecast28: Math.round(r.forecast_28 * 10) / 10,
    }))
    const bandCount = (b: string) => inv.data?.risk_bands.find((x) => x.risk_band === b)?.n ?? 0

    const totalCost = inv.data.trend.reduce((s, t) => s + t.cost, 0)
    const totalQty = inv.data.trend.reduce((s, t) => s + t.qty, 0)

    const byCat: Record<string, number> = {}
    for (const w of inv.data.wastage_summary) {
      const c = catName(w.category_id)
      byCat[c] = (byCat[c] ?? 0) + w.wastage_cost
    }
    const catBars = Object.entries(byCat)
      .map(([category, cost]) => ({ category, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => b.cost - a.cost)

    const byMonth: Record<string, { qty: number; cost: number }> = {}
    for (const t of inv.data.trend) {
      const m = t.d.slice(0, 7)
      const e = (byMonth[m] ??= { qty: 0, cost: 0 })
      e.qty += t.qty
      e.cost += t.cost
    }
    const trendMonthly = Object.entries(byMonth)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([m, v]) => ({ month: m, waste: Math.round(v.qty * 10) / 10, cost: Math.round(v.cost * 100) / 100 }))

    const locBars = inv.data.by_location.map((l) => ({
      location: restName(l.restaurant_id),
      cost: Math.round(l.cost * 100) / 100,
    }))

    const consByItem: Record<string, { name: string; consumed: number; replenished: number }> = {}
    for (const s of inv.data.stock) {
      const e = (consByItem[s.item_id] ??= { name: itemName(s.item_id), consumed: 0, replenished: 0 })
      e.consumed += s.consumed_qty
      e.replenished += s.replenished_qty
    }
    const consRows = Object.values(consByItem)
      .sort((a, b) => b.consumed - a.consumed)
      .slice(0, 10)
      .map((e) => ({ item: e.name.length > 22 ? `${e.name.slice(0, 21)}…` : e.name, consumed: e.consumed, replenished: e.replenished }))

    const topWaste = [...inv.data.wastage_summary].sort((a, b) => b.wastage_cost - a.wastage_cost).slice(0, 5)
    const maxWaste = topWaste[0]?.wastage_cost ?? 1

    return {
      stock,
      risks,
      bandCount,
      totalCost,
      totalQty,
      catBars,
      trendMonthly,
      locBars,
      consRows,
      topWaste,
      maxWaste,
      reasons: inv.data.by_reason,
      locationsAffected: inv.data.by_location.length,
    }
  }, [inv.data, items.data, meta])

  return { data: shaped, loading, error, refetch }
}

/* ───────────────────────────── Pricing ───────────────────────────── */

export type PricingLiveRow = {
  id: string
  name: string
  category: string
  current: number
  previous: number
  changePct: number | null
  unitsBefore: number | null
  unitsAfter: number | null
  margin: number
  revenue: number
  contribution: number
  units: number
  sensitivity: string
  elasticity: number | null
  reason: string
}

export type PricePoint = { date: string; price: number }

export function usePricingData() {
  const pricing = useApi<{
    elasticity: {
      item_id: string
      item_name: string
      verdict: string
      reason: string
      p1: number
      p2: number
      price_change_pct: number | null
      q1_day: number | null
      q2_day: number | null
      elasticity: number | null
    }[]
    margin_by_item: { item_id: string; item_name: string; revenue: number; contribution_margin: number; profit_pct: number; units_sold: number }[]
    history: { item_id: string; price: number; effective_from: string; effective_to: string }[]
  }>('/pricing')
  const items = useApi<{ item_id: string; category_name: string }[]>('/menu/items')

  const loading = pricing.loading || items.loading
  const error = pricing.error ?? items.error
  const refetch = () => {
    pricing.refetch()
    items.refetch()
  }

  const shaped = useMemo(() => {
    if (!pricing.data) return null
    const catOf: Record<string, string> = {}
    for (const m of items.data ?? []) catOf[m.item_id] = m.category_name
    const marginOf: Record<string, { revenue: number; contribution: number; profit_pct: number; units: number }> = {}
    for (const m of pricing.data.margin_by_item) {
      marginOf[m.item_id] = { revenue: m.revenue, contribution: m.contribution_margin, profit_pct: m.profit_pct, units: m.units_sold }
    }
    const rows: PricingLiveRow[] = pricing.data.elasticity.map((e) => ({
      id: e.item_id,
      name: e.item_name,
      category: catOf[e.item_id] ?? '—',
      current: e.p2,
      previous: e.p1,
      changePct: e.price_change_pct,
      unitsBefore: e.q1_day,
      unitsAfter: e.q2_day,
      margin: marginOf[e.item_id]?.profit_pct ?? 0,
      revenue: marginOf[e.item_id]?.revenue ?? 0,
      contribution: marginOf[e.item_id]?.contribution ?? 0,
      units: marginOf[e.item_id]?.units ?? 0,
      sensitivity: e.verdict === 'Highly Price Sensitive' ? 'Highly Price Sensitive' : 'Insufficient evidence',
      elasticity: e.elasticity,
      reason: e.reason,
    }))

    const histByItem: Record<string, PricePoint[]> = {}
    for (const h of pricing.data.history) {
      ;(histByItem[h.item_id] ??= []).push({ date: h.effective_from.slice(0, 10), price: h.price })
    }
    for (const k of Object.keys(histByItem)) histByItem[k].sort((a, b) => (a.date < b.date ? -1 : 1))

    const changed = rows.filter((r) => r.changePct != null)
    const avgChange = changed.length ? changed.reduce((s, r) => s + (r.changePct ?? 0), 0) / changed.length : 0
    const avgMargin = rows.length ? rows.reduce((s, r) => s + r.margin, 0) / rows.length : 0
    const highly = rows.filter((r) => r.sensitivity === 'Highly Price Sensitive')
    const ranked = [...rows].filter((r) => r.elasticity != null).sort((a, b) => Math.abs(b.elasticity ?? 0) - Math.abs(a.elasticity ?? 0))

    return { rows, histByItem, changed: changed.length, avgChange, avgMargin, highly: highly.length, ranked, total: rows.length }
  }, [pricing.data, items.data])

  return { data: shaped, loading, error, refetch }
}

/* ───────────────────────────── Promotions ───────────────────────────── */

export type PromoRow = {
  id: string
  name: string
  scope: string
  target: string
  discountPct: number
  start: string
  end: string
  channel: string
  status: 'Active' | 'Scheduled' | 'Expired'
  orders: number
  revenue: number
  margin: number
  marginPct: number
  aov: number
  buyers: number
  baseOrders: number
  baseRevenue: number
  baseMargin: number
  baseMarginPct: number
  newBuyers: number
  repeaters: number
  winWaste: number
  baseWaste: number
  revenueLift: number
  marginLift: number
  successful: boolean
  trap: string | null
}

const TRAP_LABEL: Record<string, string> = { margin_erosion: 'Margin erosion' }

export function usePromotionsData() {
  const promos = useApi<{
    promotions: { promotion_id: string; promotion_name: string; scope: string; target_id: string; discount_pct: number; start_date: string; end_date: string; channel: string }[]
    effectiveness: {
      promotion_id: string
      win_orders: number
      win_revenue: number
      win_margin: number
      win_buyers: number
      base_orders: number
      base_revenue: number
      base_margin: number
      win_aov: number
      win_wastage_cost: number
      base_wastage_cost: number
      new_buyers: number
      repeaters_30d: number
      revenue_lift: number
      margin_lift: number
      successful: number
    }[]
    traps: { promotion_id: string; promotion_name: string; trap: string }[]
  }>('/promotions')
  const { options: meta } = useMeta()

  const loading = promos.loading
  const error = promos.error
  const refetch = () => promos.refetch()

  const shaped = useMemo(() => {
    if (!promos.data) return null
    const dataMax = (meta?.date_range?.dmax as string | undefined)?.slice(0, 10) ?? '9999-12-31'
    const effOf: Record<string, (typeof promos.data.effectiveness)[number]> = {}
    for (const e of promos.data.effectiveness) effOf[e.promotion_id] = e
    const trapOf: Record<string, string> = {}
    for (const t of promos.data.traps) trapOf[t.promotion_id] = TRAP_LABEL[t.trap] ?? t.trap

    const rows: PromoRow[] = promos.data.promotions.map((p) => {
      const e = effOf[p.promotion_id]
      const s = p.start_date.slice(0, 10)
      const en = p.end_date.slice(0, 10)
      const status: PromoRow['status'] = s > dataMax ? 'Scheduled' : en < dataMax ? 'Expired' : 'Active'
      const marginPct = e && e.win_revenue ? (e.win_margin / e.win_revenue) * 100 : 0
      const baseMarginPct = e && e.base_revenue ? (e.base_margin / e.base_revenue) * 100 : 0
      return {
        id: p.promotion_id,
        name: p.promotion_name,
        scope: p.scope,
        target: p.target_id,
        discountPct: Math.round(p.discount_pct * 1000) / 10,
        start: fmtDate(s),
        end: fmtDate(en),
        channel: p.channel,
        status,
        orders: e?.win_orders ?? 0,
        revenue: Math.round((e?.win_revenue ?? 0) * 100) / 100,
        margin: Math.round((e?.win_margin ?? 0) * 100) / 100,
        marginPct: Math.round(marginPct * 10) / 10,
        aov: Math.round((e?.win_aov ?? 0) * 100) / 100,
        buyers: e?.win_buyers ?? 0,
        baseOrders: e?.base_orders ?? 0,
        baseRevenue: Math.round((e?.base_revenue ?? 0) * 100) / 100,
        baseMargin: Math.round((e?.base_margin ?? 0) * 100) / 100,
        baseMarginPct: Math.round(baseMarginPct * 10) / 10,
        newBuyers: e?.new_buyers ?? 0,
        repeaters: e?.repeaters_30d ?? 0,
        winWaste: Math.round((e?.win_wastage_cost ?? 0) * 100) / 100,
        baseWaste: Math.round((e?.base_wastage_cost ?? 0) * 100) / 100,
        revenueLift: e?.revenue_lift ?? 0,
        marginLift: e?.margin_lift ?? 0,
        successful: (e?.successful ?? 0) === 1,
        trap: trapOf[p.promotion_id] ?? null,
      }
    })

    const successful = rows.filter((r) => r.successful).length
    const avgLift = rows.length ? rows.reduce((t, r) => t + r.revenueLift, 0) / rows.length : 0
    const comparison = [...rows]
      .sort((x, y) => y.revenue - x.revenue)
      .map((r) => ({ name: r.name.length > 20 ? `${r.name.slice(0, 19)}…` : r.name, revenue: r.revenue, orders: r.orders, margin: r.marginPct }))
    const traps = rows.filter((r) => r.trap)

    return { rows, successful, avgLift, comparison, traps }
  }, [promos.data, meta])

  return { data: shaped, loading, error, refetch }
}

/* ───────────────────────────── Ratings ───────────────────────────── */

export type RatingReview = {
  id: string
  customer: string
  itemId: string
  item: string
  itemAvg: number
  itemClass: string
  locationId: string
  location: string
  orderId: string
  rating: number
  date: string
}

export type RatedItem = {
  id: string
  name: string
  rating: number
  n: number
  units: number
  margin: number
  repeat: number
  class: string
}

export function useRatingsData() {
  const ratings = useApi<{
    distribution: { rating: number; n: number }[]
    trend: { m: string; avg_rating: number; n: number }[]
    by_item: { item_id: string; item_name: string; avg_rating: number; n: number; performance_class: string; contribution_margin: number; units_sold: number; repeat_purchase_rate: number }[]
    by_location: { restaurant_id: string; avg_rating: number; n: number }[]
    anomalies: { kind: string; item_id: string; date: string; avg_rating: number; n: number; z: number | null }[]
    recent: { rating_id: string; customer_id: string; item_id: string; restaurant_id: string; order_id: string; rating: number; review_date: string; item_name: string }[]
  }>('/ratings')
  const { options: meta } = useMeta()

  const loading = ratings.loading
  const error = ratings.error
  const refetch = () => ratings.refetch()

  const shaped = useMemo(() => {
    if (!ratings.data) return null
    const restName = (id: string) => meta?.restaurants.find((r) => r.restaurant_id === id)?.restaurant_name ?? id
    const itemOf: Record<string, (typeof ratings.data.by_item)[number]> = {}
    for (const i of ratings.data.by_item) itemOf[i.item_id] = i

    const totalN = ratings.data.distribution.reduce((s, d) => s + d.n, 0)
    const overall = totalN ? ratings.data.distribution.reduce((s, d) => s + d.rating * d.n, 0) / totalN : 0
    const five = ratings.data.distribution.find((d) => d.rating === 5)?.n ?? 0
    const neg = ratings.data.distribution.filter((d) => d.rating <= 2).reduce((s, d) => s + d.n, 0)
    const maxDist = Math.max(1, ...ratings.data.distribution.map((d) => d.n))

    const items: RatedItem[] = ratings.data.by_item.map((i) => ({
      id: i.item_id,
      name: i.item_name,
      rating: Math.round(i.avg_rating * 100) / 100,
      n: i.n,
      units: i.units_sold,
      margin: Math.round(i.contribution_margin * 100) / 100,
      repeat: Math.round(i.repeat_purchase_rate * 1000) / 10,
      class: i.performance_class,
    }))
    const withBase = items.filter((i) => i.n >= 10)
    const topRated = [...withBase].sort((x, y) => y.rating - x.rating).slice(0, 4)
    const lowRated = [...withBase].sort((x, y) => x.rating - y.rating).slice(0, 4)

    const locBars = ratings.data.by_location.map((l) => ({
      location: restName(l.restaurant_id).length > 26 ? `${restName(l.restaurant_id).slice(0, 25)}…` : restName(l.restaurant_id),
      rating: Math.round(l.avg_rating * 100) / 100,
      n: l.n,
    }))

    const scatter = items.map((i) => ({ name: i.name, rating: i.rating, margin: i.margin, class: i.class }))
    const classes = Array.from(new Set(items.map((i) => i.class)))

    const reviews: RatingReview[] = ratings.data.recent.map((r) => ({
      id: r.rating_id,
      customer: r.customer_id,
      itemId: r.item_id,
      item: r.item_name,
      itemAvg: itemOf[r.item_id] ? Math.round(itemOf[r.item_id].avg_rating * 100) / 100 : 0,
      itemClass: itemOf[r.item_id]?.performance_class ?? '—',
      locationId: r.restaurant_id,
      location: restName(r.restaurant_id),
      orderId: r.order_id,
      rating: r.rating,
      date: fmtDate(r.review_date),
    }))

    const anomalies = ratings.data.anomalies.map((a, i) => ({
      id: `an-${i}`,
      kind: a.kind === 'identical_burst' ? 'Identical burst' : a.kind,
      itemId: a.item_id,
      item: itemOf[a.item_id]?.item_name ?? a.item_id,
      detail: `${num(a.n)} identical ${a.avg_rating.toFixed(1)}★ ratings${a.date ? ` on ${fmtDate(a.date)}` : ''} — possible ballot-stuffing or a data glitch.`,
      when: a.date ? fmtDate(a.date) : 'Across the window',
    }))

    return {
      overall: Math.round(overall * 100) / 100,
      totalN,
      five,
      fiveShare: totalN ? (five / totalN) * 100 : 0,
      neg,
      dist: ratings.data.distribution,
      maxDist,
      trend: ratings.data.trend,
      items: [...items].sort((x, y) => y.n - x.n),
      topRated,
      lowRated,
      locBars,
      scatter,
      classes,
      reviews,
      anomalies,
    }
  }, [ratings.data, meta])

  return { data: shaped, loading, error, refetch }
}

/* ───────────────────────────── Locations ───────────────────────────── */

export type BranchRow = {
  id: string
  name: string
  city: string
  revenue: number
  profit: number
  margin: number
  orders: number
  customers: number
  promoShare: number
  aov: number
  repeat: number
  wastedQty: number
  rating: number
  driverShare: number
}

export function useLocationsData() {
  const raw = useApi<
    {
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
    }[]
  >('/locations')

  const shaped = useMemo(() => {
    if (!raw.data) return null
    const rows: BranchRow[] = raw.data.map((l) => ({
      id: l.restaurant_id,
      name: l.restaurant_name,
      city: l.city,
      revenue: Math.round(l.revenue * 100) / 100,
      profit: Math.round(l.profit * 100) / 100,
      margin: l.revenue ? Math.round((l.profit / l.revenue) * 1000) / 10 : 0,
      orders: l.orders,
      customers: l.customers,
      promoShare: Math.round(l.promo_share * 1000) / 10,
      aov: Math.round(l.aov * 100) / 100,
      repeat: Math.round(l.repeat_rate * 1000) / 10,
      wastedQty: Math.round(l.wasted_qty * 10) / 10,
      rating: Math.round(l.avg_rating * 100) / 100,
      driverShare: Math.round(l.profit_driver_revenue_share * 1000) / 10,
    }))
    const short = (n: string) => {
      const m = n.match(/Branch\s*(\d+)/)
      return m ? `#${m[1]} ${rows.find((r) => r.name === n)?.city ?? ''}` : n
    }
    return {
      rows,
      revenueBars: [...rows].sort((a, b) => b.revenue - a.revenue).map((l) => ({ location: short(l.name), revenue: l.revenue })),
      wasteBars: [...rows].sort((a, b) => b.wastedQty - a.wastedQty).map((l) => ({ location: short(l.name), waste: l.wastedQty })),
      driverBars: [...rows].sort((a, b) => b.driverShare - a.driverShare).map((l) => ({ location: short(l.name), share: l.driverShare })),
      satRows: rows.map((l) => ({ location: short(l.name), rating: l.rating, repeat: l.repeat / 10 })),
      maxWaste: Math.max(1, ...rows.map((l) => l.wastedQty)),
    }
  }, [raw.data])

  return { data: shaped, loading: raw.loading, error: raw.error, refetch: raw.refetch }
}

export function useLocationDetail(restaurantId: string | null) {
  const detail = useApi<{
    location: {
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
    trend: { d: string; revenue: number }[]
    menu: {
      item_id: string
      item_name: string
      units_sold: number
      revenue: number
      contribution_margin: number
      location_class: string
      performance_class: string
      differs_from_global: number
    }[]
  }>(restaurantId ? `/locations/${restaurantId}` : null, { enabled: !!restaurantId })
  const over = useApi<OverviewOut>('/dashboard/overview', {
    params: restaurantId ? { location: restaurantId } : {},
    enabled: !!restaurantId,
  })
  const inv = useApi<{ by_location: { restaurant_id: string; city: string; qty: number; cost: number }[] }>('/inventory')

  const loading = detail.loading || over.loading || inv.loading
  const error = detail.error ?? over.error ?? inv.error
  const refetch = () => {
    detail.refetch()
    over.refetch()
    inv.refetch()
  }

  const shaped = useMemo(() => {
    if (!detail.data) return null
    const l = detail.data.location
    const byMonth: Record<string, number> = {}
    for (const t of detail.data.trend) {
      const m = t.d.slice(0, 7)
      byMonth[m] = (byMonth[m] ?? 0) + t.revenue
    }
    const trendMonthly = Object.entries(byMonth)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }))
    const classes: Record<string, number> = { 'Profit Driver': 0, 'Volume Driver': 0, 'Hidden Opportunity': 0, 'Low Performer': 0 }
    for (const m of detail.data.menu) {
      if (m.location_class in classes) classes[m.location_class] += 1
    }
    const branchWaste = inv.data?.by_location.find((x) => x.restaurant_id === l.restaurant_id)
    const networkWaste = (inv.data?.by_location ?? []).reduce((s, x) => s + x.cost, 0)
    return {
      location: {
        id: l.restaurant_id,
        name: l.restaurant_name,
        city: l.city,
        revenue: l.revenue,
        profit: l.profit,
        margin: l.revenue ? (l.profit / l.revenue) * 100 : 0,
        orders: l.orders,
        customers: l.customers,
        promoShare: l.promo_share * 100,
        aov: l.aov,
        repeat: l.repeat_rate * 100,
        wastedQty: l.wasted_qty,
        rating: l.avg_rating,
        driverShare: l.profit_driver_revenue_share * 100,
      },
      trendMonthly,
      menu: detail.data.menu,
      classes,
      channels: (over.data?.channels ?? []).map((c) => ({ name: c.channel, value: c.orders })),
      totalChannelOrders: (over.data?.channels ?? []).reduce((s, c) => s + c.orders, 0),
      wasteCost: branchWaste?.cost ?? 0,
      wasteShare: networkWaste ? ((branchWaste?.cost ?? 0) / networkWaste) * 100 : 0,
    }
  }, [detail.data, over.data, inv.data])

  return { data: shaped, loading, error, refetch }
}

/* ───────────────────────────── Recommendations ───────────────────────────── */

export type RecItem = {
  id: string
  type: string
  category: string
  tone: string
  title: string
  entity: string
  action: string
  evidence: string[]
  source: string
  priority: string
  impact: number
  state: string
}

const REC_TYPE_META: Record<string, { label: string; tone: string; route: string; routeLabel: string }> = {
  wastage_reduction: { label: 'Wastage', tone: '#96352C', route: '/admin/inventory', routeLabel: 'Inventory' },
  menu_promotion: { label: 'Menu', tone: '#B54E17', route: '/admin/menu-intelligence', routeLabel: 'Menu intelligence' },
  pricing: { label: 'Pricing', tone: '#2F6FA8', route: '/admin/pricing', routeLabel: 'Pricing' },
  bundling: { label: 'Bundles', tone: '#C08A16', route: '/admin/market-basket', routeLabel: 'Market basket' },
  inventory: { label: 'Inventory', tone: '#5E8C4A', route: '/admin/inventory', routeLabel: 'Inventory' },
  promotion_review: { label: 'Promotions', tone: '#7C5CBF', route: '/admin/promotions', routeLabel: 'Promotions' },
  location_investigation: { label: 'Locations', tone: '#B54E17', route: '/admin/locations', routeLabel: 'Locations' },
  customer_targeting: { label: 'Customers', tone: '#4A7139', route: '/admin/customers', routeLabel: 'Customers' },
}

export function recTypeMeta(type: string) {
  return REC_TYPE_META[type] ?? { label: type, tone: '#726B62', route: '/admin/menu-intelligence', routeLabel: 'Menu intelligence' }
}

export function useRecommendationsData() {
  const q = useApi<
    {
      id: string
      type: string
      title: string
      entity: string
      action: string
      evidence: string[] | string
      source: string
      priority: string
      impact_rs: number | null
      state: string
    }[]
  >('/recommendations')

  const shaped = useMemo(() => {
    if (!q.data) return null
    const items: RecItem[] = q.data.map((r) => {
      const meta = recTypeMeta(r.type)
      return {
        id: r.id,
        type: r.type,
        category: meta.label,
        tone: meta.tone,
        title: r.title,
        entity: r.entity,
        action: r.action,
        evidence: Array.isArray(r.evidence) ? r.evidence : [String(r.evidence)],
        source: r.source,
        priority: r.priority,
        impact: r.impact_rs ?? 0,
        state: r.state ?? 'new',
      }
    })
    return {
      items,
      categories: ['All', ...Array.from(new Set(items.map((r) => r.category)))],
      sources: Array.from(new Set(items.map((r) => r.source))),
    }
  }, [q.data])

  return { data: shaped, loading: q.loading, error: q.error, refetch: q.refetch }
}

/* ───────────────────────────── Anomalies ───────────────────────────── */

export type AnomalyAlert = {
  id: string
  kind: string
  title: string
  severity: 'Critical' | 'High' | 'Medium'
  entity: string
  entityName: string
  entityKind: string
  metric: string
  actual: number
  baseline: number
  z: number | null
  deltaPct: number | null
  when: string
  day: string
  action: string
}

const ANOMALY_KIND_LABEL: Record<string, string> = {
  sales_spike: 'Sales spike',
  high_order_value: 'High order value',
  identical_burst: 'Identical burst',
}

const ANOMALY_ACTION: Record<string, string> = {
  sales_spike: 'Check for a local event, bulk order or promotion overlap, then confirm the takings reconcile.',
  high_order_value: 'Verify the order Packed correctly and the payment cleared; large baskets are often legitimate catering.',
  identical_burst: 'Inspect the rating source for ballot-stuffing or a logging glitch before acting on the score.',
}

export function useAnomaliesData() {
  const q = useApi<{
    rows: { category: string; metric: string; entity: string; timestamp: string; actual: number; baseline: number; deviation_z: number | null; severity: string; explanation: string }[]
    by_category: { category: string; n: number }[]
    by_severity: { severity: string; n: number }[]
  }>('/anomalies', { params: { limit: 500 } })
  const items = useApi<{ item_id: string; item_name: string }[]>('/menu/items')
  const { options: meta } = useMeta()

  const shaped = useMemo(() => {
    if (!q.data) return null
    const restName = (id: string) => meta?.restaurants.find((r) => r.restaurant_id === id)?.restaurant_name ?? id
    const itemName = (id: string) => (items.data ?? []).find((m) => m.item_id === id)?.item_name ?? id
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

    const rows: AnomalyAlert[] = q.data.rows.map((r, i) => {
      const [prefix, ref] = r.entity.split(':')
      const entityName = prefix === 'restaurant' ? restName(ref) : prefix === 'item' ? itemName(ref) : ref
      return {
        id: `${r.category}-${r.entity}-${r.timestamp || i}`,
        kind: ANOMALY_KIND_LABEL[r.category] ?? r.category,
        title: r.explanation,
        severity: cap(r.severity) as AnomalyAlert['severity'],
        entity: ref,
        entityName,
        entityKind: prefix === 'restaurant' ? 'Branch' : prefix === 'item' ? 'Menu item' : 'Order',
        metric: r.metric,
        actual: r.actual,
        baseline: r.baseline,
        z: r.deviation_z,
        deltaPct: r.baseline ? ((r.actual - r.baseline) / Math.abs(r.baseline)) * 100 : null,
        when: r.timestamp ? fmtDate(r.timestamp) : 'Undated',
        day: r.timestamp ? r.timestamp.slice(0, 10) : '',
        action: ANOMALY_ACTION[r.category] ?? 'Review the underlying records before deciding.',
      }
    })

    const days = Array.from(new Set(rows.filter((r) => r.day).map((r) => r.day))).sort().slice(-14)
    const trend = days.map((d) => {
      const o: Record<string, string | number> = { d: d.slice(5) }
      for (const c of q.data?.by_category ?? []) {
        o[c.category] = rows.filter((r) => r.day === d && (ANOMALY_KIND_LABEL[c.category] ?? c.category) === r.kind).length
      }
      return o
    })
    const trendCats = (q.data.by_category ?? []).map((c, i) => ({
      key: c.category,
      label: ANOMALY_KIND_LABEL[c.category] ?? c.category,
      color: ['#96352C', '#C08A16', '#2F6FA8'][i % 3],
    }))
    const kinds = (q.data.by_category ?? []).map((c) => ({ kind: ANOMALY_KIND_LABEL[c.category] ?? c.category, count: c.n }))

    return { rows, trend, trendCats, kinds }
  }, [q.data, items.data, meta])

  return { data: shaped, loading: q.loading || items.loading, error: q.error ?? items.error, refetch: q.refetch }
}
