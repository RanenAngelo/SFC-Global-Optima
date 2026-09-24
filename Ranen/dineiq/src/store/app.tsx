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
}

const CartContext = createContext<CartCtx>(null as unknown as CartCtx)
export const useCart = () => useContext(CartContext)

export const PROMOS: Record<string, { type: 'percent' | 'fixed' | 'free-delivery'; value: number; label: string }> = {
  PIZZA20: { type: 'percent', value: 20, label: '20% off — Wednesday Pizza Night' },
  BURGERFRIES: { type: 'fixed', value: 250, label: 'Free fries bundle' },
  SWEET3000: { type: 'fixed', value: 650, label: 'Complimentary dessert' },
  WELCOME10: { type: 'percent', value: 10, label: '10% welcome discount' },
  FREESHIP: { type: 'free-delivery', value: 0, label: 'Free delivery' },
}

const DELIVERY_FEE = 150
const TAX_RATE = 0.05

function lineTotal(l: CartLine) {
  return (l.price + l.addons.reduce((s, a) => s + a.price, 0)) * l.qty
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => [
    // Demo cart contents — presentation only
    { lineId: 'l1', slug: 'maison-signature-smash', name: 'Maison Signature Smash', price: 1150, qty: 2, img: '/img/hero-burger.jpg', size: 'Double', addons: [{ name: 'Add beef bacon', price: 220 }], instructions: '' },
    { lineId: 'l2', slug: 'mint-lime-cooler', name: 'Mint Lime Cooler', price: 320, qty: 2, img: '/img/drink.jpg', addons: [] },
    { lineId: 'l3', slug: 'molten-lava-cake', name: 'Molten Lava Cake', price: 650, qty: 1, img: '/img/dessert.jpg', addons: [{ name: 'Extra gelato scoop', price: 180 }] },
  ])
  const [saved, setSaved] = useState<CartLine[]>([
    { lineId: 's1', slug: 'chicken-dum-biryani', name: 'Chicken Dum Biryani', price: 890, qty: 1, img: '/img/biryani.jpg', addons: [] },
  ])
  const [promo, setPromo] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [fulfilment, setFulfilment] = useState<'delivery' | 'pickup'>('delivery')

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

  const applyPromo = useCallback((code: string) => {
    const c = code.trim().toUpperCase()
    if (PROMOS[c]) {
      setPromo(c)
      setPromoError(null)
      return true
    }
    setPromoError(`“${code}” is not a valid demo promo code. Try PIZZA20, WELCOME10 or FREESHIP.`)
    return false
  }, [])

  const clearPromo = useCallback(() => {
    setPromo(null)
    setPromoError(null)
  }, [])

  const totals = useMemo<Totals>(() => {
    const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0)
    let discount = 0
    let delivery = fulfilment === 'delivery' ? (subtotal > 0 ? DELIVERY_FEE : 0) : 0
    if (promo && PROMOS[promo]) {
      const p = PROMOS[promo]
      if (p.type === 'percent') discount = Math.round(subtotal * (p.value / 100))
      else if (p.type === 'fixed') discount = Math.min(p.value, subtotal)
      else delivery = 0
    }
    const tax = Math.round((subtotal - discount) * TAX_RATE)
    return { subtotal, discount, delivery, tax, total: subtotal - discount + delivery + tax }
  }, [lines, promo, fulfilment])

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
    }),
    [lines, saved, promo, promoError, totals, add, setQty, remove, saveForLater, moveToCart, clear, setInstructions, applyPromo, clearPromo, fulfilment],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

/* ───────────────────────────── Favourites ───────────────────────────── */
type FavCtx = { favourites: string[]; toggle: (slug: string) => void; isFav: (slug: string) => boolean }
const FavContext = createContext<FavCtx>(null as unknown as FavCtx)
export const useFavourites = () => useContext(FavContext)

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const [favourites, setFavourites] = useState<string[]>(() => readPref<string[]>('favourites', ['maison-signature-smash', 'chicken-dum-biryani', 'truffle-fettuccine-alfredo']))
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
  return readPref<string>('lastOrder', 'ME-24816')
}

export { menuBySlug }
