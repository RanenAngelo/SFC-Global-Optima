import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MenuItem, menuBySlug } from '../lib/data/menu'
import { readPref, writePref } from '../lib/utils'

/* ───────────────────────────── Cart ───────────────────────────── */
export type CartLine = {
  lineId: string
  slug: string
  name: string
  price: number
  qty: number
  img?: string
  size?: string
  addons: { name: string; price: number }[]
  instructions?: string
}

export type Totals = { subtotal: number; discount: number; delivery: number; tax: number; total: number }

type CartCtx = {
  lines: CartLine[]
  saved: CartLine[]
  promo: string | null
  promoError: string | null
  isEmpty: boolean
  count: number
  totals: Totals
  add: (item: MenuItem, opts?: { size?: string; addons?: { name: string; price: number }[]; instructions?: string; qty?: number }) => void
  setQty: (lineId: string, qty: number) => void
  remove: (lineId: string) => void
  saveForLater: (lineId: string) => void
  moveToCart: (lineId: string) => void
  clear: () => void
  setInstructions: (lineId: string, v: string) => void
  applyPromo: (code: string) => boolean
  clearPromo: () => void
  fulfilment: 'delivery' | 'pickup'
  setFulfilment: (v: 'delivery' | 'pickup') => void
  policy: StorePolicy
  promos: LivePromo[]
  promoName: string | null
}

const CartContext = createContext<CartCtx>(null as unknown as CartCtx)
export const useCart = () => useContext(CartContext)

export type LivePromo = { code: string; name: string; discount_pct: number; scope: string }

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export type StorePolicy = { deliveryFee: number; taxRate: number; freeDeliveryOver: number }
export const DEFAULT_POLICY: StorePolicy = { deliveryFee: 2.99, taxRate: 0.05, freeDeliveryOver: 40 }

function lineTotal(l: CartLine) {
  return (l.price + l.addons.reduce((s, a) => s + a.price, 0)) * l.qty
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [saved, setSaved] = useState<CartLine[]>([])
  const [promo, setPromo] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [fulfilment, setFulfilment] = useState<'delivery' | 'pickup'>('delivery')
  const [policy, setPolicy] = useState<StorePolicy>(DEFAULT_POLICY)
  const [promos, setPromos] = useState<LivePromo[]>([])

  // Live offer codes + fulfilment policy (public endpoints; plain fetch
  // avoids a store <-> api module cycle).
  React.useEffect(() => {
    let live = true
    fetch(`${API_BASE}/api/store/promotions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d?.promotions) {
          setPromos(
            d.promotions.map((p: { promotion_id: string; promotion_name: string; discount_pct: number; scope: string }) => ({
              code: p.promotion_id,
              name: p.promotion_name,
              discount_pct: p.discount_pct,
              scope: p.scope,
            })),
          )
        }
      })
      .catch(() => {})
    fetch(`${API_BASE}/api/store/policy`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d) {
          setPolicy({
            deliveryFee: d.delivery_fee ?? DEFAULT_POLICY.deliveryFee,
            taxRate: d.tax_rate ?? DEFAULT_POLICY.taxRate,
            freeDeliveryOver: d.free_delivery_over ?? DEFAULT_POLICY.freeDeliveryOver,
          })
        }
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const add = useCallback<CartCtx['add']>((item, opts = {}) => {
    const key = `${item.slug}|${opts.size ?? ''}|${(opts.addons ?? []).map((a) => a.name).join(',')}`
    setLines((prev) => {
      const found = prev.find((l) => `${l.slug}|${l.size ?? ''}|${l.addons.map((a) => a.name).join(',')}` === key)
      if (found) return prev.map((l) => (l === found ? { ...l, qty: l.qty + (opts.qty ?? 1) } : l))
      return [
        ...prev,
        {
          lineId: `l${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          slug: item.slug,
          name: item.name,
          price: item.price,
          qty: opts.qty ?? 1,
          img: item.img,
          size: opts.size,
          addons: opts.addons ?? [],
          instructions: opts.instructions ?? '',
        },
      ]
    })
  }, [])

  const setQty = useCallback((lineId: string, qty: number) => {
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.lineId !== lineId) : prev.map((l) => (l.lineId === lineId ? { ...l, qty } : l))))
  }, [])

  const remove = useCallback((lineId: string) => setLines((prev) => prev.filter((l) => l.lineId !== lineId)), [])

  const saveForLater = useCallback(
    (lineId: string) => {
      setLines((prev) => {
        const l = prev.find((x) => x.lineId === lineId)
        if (l) setSaved((s) => [{ ...l }, ...s.filter((x) => x.lineId !== lineId)])
        return prev.filter((x) => x.lineId !== lineId)
      })
    },
    [],
  )

  const moveToCart = useCallback((lineId: string) => {
    setSaved((prev) => {
      const l = prev.find((x) => x.lineId === lineId)
      if (l) setLines((c) => [...c, { ...l, lineId: `l${Date.now()}` }])
      return prev.filter((x) => x.lineId !== lineId)
    })
  }, [])

  const clear = useCallback(() => {
    setLines([])
    setPromo(null)
  }, [])

  const setInstructions = useCallback((lineId: string, v: string) => {
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, instructions: v } : l)))
  }, [])

  const applyPromo = useCallback(
    (code: string) => {
      const c = code.trim().toUpperCase()
      const found = promos.find((p) => p.code.toUpperCase() === c)
      if (found) {
        setPromo(found.code)
        setPromoError(null)
        return true
      }
      const hint = promos.length > 0 ? `Try ${promos.slice(0, 3).map((p) => p.code).join(', ')}.` : 'Offer codes load with the menu.'
      setPromoError(`“${code}” is not a valid offer code. ${hint}`)
      return false
    },
    [promos],
  )

  const clearPromo = useCallback(() => {
    setPromo(null)
    setPromoError(null)
  }, [])

  const totals = useMemo<Totals>(() => {
    const round2 = (n: number) => Math.round(n * 100) / 100
    const subtotal = round2(lines.reduce((s, l) => s + lineTotal(l), 0))
    let discount = 0
    const active = promo ? promos.find((p) => p.code === promo) : undefined
    if (active) discount = round2(subtotal * active.discount_pct)
    const afterDiscount = subtotal - discount
    let delivery = 0
    if (fulfilment === 'delivery' && subtotal > 0) {
      delivery = afterDiscount >= policy.freeDeliveryOver ? 0 : policy.deliveryFee
    }
    const tax = round2(afterDiscount * policy.taxRate)
    return { subtotal, discount, delivery, tax, total: round2(afterDiscount + delivery + tax) }
  }, [lines, promo, promos, fulfilment, policy])

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      saved,
      promo,
      promoError,
      isEmpty: lines.length === 0,
      count: lines.reduce((s, l) => s + l.qty, 0),
      totals,
      add,
      setQty,
      remove,
      saveForLater,
      moveToCart,
      clear,
      setInstructions,
      applyPromo,
      clearPromo,
      fulfilment,
      setFulfilment,
      policy,
      promos,
      promoName: promo ? (promos.find((p) => p.code === promo)?.name ?? null) : null,
    }),
    [lines, saved, promo, promoError, totals, add, setQty, remove, saveForLater, moveToCart, clear, setInstructions, applyPromo, clearPromo, fulfilment, policy, promos],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

/* ───────────────────────────── Favourites ───────────────────────────── */
type FavCtx = { favourites: string[]; toggle: (slug: string) => void; isFav: (slug: string) => boolean }
const FavContext = createContext<FavCtx>(null as unknown as FavCtx)
export const useFavourites = () => useContext(FavContext)

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const [favourites, setFavourites] = useState<string[]>(() => readPref<string[]>('favourites', []))
  const toggle = useCallback((slug: string) => {
    setFavourites((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [slug, ...prev]
      writePref('favourites', next)
      return next
    })
  }, [])
  const isFav = useCallback((slug: string) => favourites.includes(slug), [favourites])
  return <FavContext.Provider value={{ favourites, toggle, isFav }}>{children}</FavContext.Provider>
}

/* ───────────────────────────── Workspace / filters ───────────────────────────── */
export type DateRange = 'today' | '7d' | '30d' | '90d' | 'mtd' | 'custom'

type WorkspaceCtx = {
  location: string
  setLocation: (v: string) => void
  range: DateRange
  setRange: (v: DateRange) => void
  rangeLabel: string
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  theme: 'light' | 'warm'
  toggleTheme: () => void
}

const WorkspaceContext = createContext<WorkspaceCtx>(null as unknown as WorkspaceCtx)
export const useWorkspace = () => useContext(WorkspaceContext)

export const RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  mtd: 'Month to date',
  custom: 'Custom range',
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<string>('all')
  const [range, setRange] = useState<DateRange>('30d')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readPref('sidebar', false))
  const [theme, setTheme] = useState<'light' | 'warm'>(() => readPref<'light' | 'warm'>('theme', 'light'))

  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => { writePref('sidebar', !v); return !v }), [])
  const toggleTheme = useCallback(() => setTheme((v) => { const n = v === 'light' ? 'warm' : 'light'; writePref('theme', n); return n }), [])

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const value = useMemo<WorkspaceCtx>(
    () => ({
      location,
      setLocation,
      range,
      setRange,
      rangeLabel: RANGE_LABELS[range],
      sidebarCollapsed,
      toggleSidebar,
      theme,
      toggleTheme,
    }),
    [location, range, sidebarCollapsed, toggleSidebar, theme, toggleTheme],
  )
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

/* ───────────────────────────── Orders placed in-session (UI only) ───────────────────────────── */
export function useLastOrderNumber() {
  return readPref<string>('lastOrder', '')
}

export { menuBySlug }
