/* ───────────────────────────── DineIQ live API layer ─────────────────────────────
 * Single integration point between the UI prototype and the FastAPI backend.
 * - apiFetch: typed fetch client (JWT attach, query params, error mapping)
 * - AuthProvider/useAuth/RequireAuth: login state + route guard
 * - MetaProvider/useMeta: filter options (restaurants, channels, data window)
 * - useApiFilters: workspace location/range -> { location, date_from, date_to }
 * - useApi: GET hook with loading/error/refetch
 * - useMutation: POST/PATCH/DELETE helper
 * - downloadExport: authenticated CSV/XLSX download
 * Date ranges anchor to the dataset max date (from /meta/filter-options),
 * NOT wall-clock today, so filters always cover real data.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useWorkspace, type DateRange } from '../store/app'
import { Card, Icon } from '../components/ui/primitives'

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const TOKEN_KEY = 'dineiq_token'
/** Fallback data anchor until /meta/filter-options loads (dataset max date). */
export const DATA_MAX_FALLBACK = '2026-09-24'

/* ───────────────────────────── Client ───────────────────────────── */

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode */
  }
}

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  params?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  auth?: boolean
}

export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = 'GET', params, body, auth = true } = opts
  const qs = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? getToken() : null
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/api${path}${qs}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const msg =
      (data as { detail?: string } | null)?.detail ??
      (typeof data === 'string' ? data : null) ??
      `Request failed (${res.status})`
    throw new ApiError(res.status, msg)
  }
  return data as T
}

export async function downloadExport(name: string, format: 'csv' | 'xlsx', params?: FetchOpts['params']) {
  const qs = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/api/export/${name}.${format}${qs}`, { headers })
  if (!res.ok) {
    const t = await res.text()
    throw new ApiError(res.status, t || `Export failed (${res.status})`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.${format}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/* ───────────────────────────── Auth ───────────────────────────── */

export type SessionUser = { username: string; role: string }

type AuthCtx = {
  user: SessionUser | null
  ready: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  can: (role: 'viewer' | 'analyst' | 'manager' | 'admin') => boolean
}

const ROLE_RANK: Record<string, number> = { viewer: 1, analyst: 2, manager: 3, admin: 4 }

const AuthContext = createContext<AuthCtx>(null as unknown as AuthCtx)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    async function boot() {
      if (!getToken()) {
        setReady(true)
        return
      }
      try {
        const me = await apiFetch<{ username: string; role: string }>('/auth/me')
        if (live) setUser({ username: me.username, role: me.role })
      } catch {
        setToken(null)
      } finally {
        if (live) setReady(true)
      }
    }
    boot()
    return () => {
      live = false
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const out = await apiFetch<{ access_token: string; username: string; role: string }>('/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    })
    setToken(out.access_token)
    setUser({ username: out.username, role: out.role })
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const can = useCallback(
    (role: 'viewer' | 'analyst' | 'manager' | 'admin') =>
      !!user && (ROLE_RANK[user.role] ?? 0) >= ROLE_RANK[role],
    [user],
  )

  const value = useMemo(() => ({ user, ready, login, logout, can }), [user, ready, login, logout, can])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <PageLoader label="Checking session…" />
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <>{children}</>
}

/* ───────────────────────────── Meta / filter options ───────────────────────────── */

export type Restaurant = { restaurant_id: string; restaurant_name: string; city: string }
export type FilterOptions = {
  restaurants: Restaurant[]
  channels: string[]
  categories: { category_id: string; category_name: string }[]
  statuses?: string[]
  date_range: { min: string; max: string }
  [k: string]: unknown
}

const MetaContext = createContext<{ options: FilterOptions | null; loading: boolean }>({
  options: null,
  loading: true,
})
export const useMeta = () => useContext(MetaContext)

export function MetaProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    async function load() {
      if (!ready) return
      if (!user) {
        setOptions(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const o = await apiFetch<FilterOptions>('/meta/filter-options')
        if (live) setOptions(o)
      } catch {
        if (live) setOptions(null)
      } finally {
        if (live) setLoading(false)
      }
    }
    load()
    return () => {
      live = false
    }
  }, [user, ready])

  const value = useMemo(() => ({ options, loading }), [options, loading])
  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>
}

/* ───────────────────────────── Filters: workspace -> API params ───────────────────────────── */

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function rangeToDates(range: DateRange, anchorMax: string): { from: string | null; to: string | null } {
  switch (range) {
    case 'today':
      return { from: anchorMax, to: anchorMax }
    case '7d':
      return { from: addDays(anchorMax, -6), to: anchorMax }
    case '30d':
      return { from: addDays(anchorMax, -29), to: anchorMax }
    case '90d':
      return { from: addDays(anchorMax, -89), to: anchorMax }
    case 'mtd':
      return { from: `${anchorMax.slice(0, 7)}-01`, to: anchorMax }
    case 'custom':
    default:
      return { from: null, to: null }
  }
}

export type ApiFilters = {
  /** 'all' or a restaurant_id */
  location: string
  range: DateRange
  rangeLabel: string
  date_from: string | null
  date_to: string | null
  anchorMax: string
  ready: boolean
  /** Spread into useApi params for range-aware endpoints. */
  params: { restaurant_id?: string; date_from?: string; date_to?: string }
}

export function useApiFilters(): ApiFilters {
  const { location, range, rangeLabel } = useWorkspace()
  const { options } = useMeta()
  const anchorMax = (options?.date_range?.max as string | undefined)?.slice(0, 10) ?? DATA_MAX_FALLBACK
  const { from, to } = rangeToDates(range, anchorMax)
  return useMemo(
    () => ({
      location,
      range,
      rangeLabel,
      date_from: from,
      date_to: to,
      anchorMax,
      ready: options !== null,
      params: {
        ...(location !== 'all' ? { restaurant_id: location } : {}),
        ...(from ? { date_from: from } : {}),
        ...(to ? { date_to: to } : {}),
      },
    }),
    [location, range, rangeLabel, from, to, anchorMax, options],
  )
}

/* ───────────────────────────── Data hooks ───────────────────────────── */

export function useApi<T>(path: string | null, opts: { params?: FetchOpts['params']; enabled?: boolean } = {}) {
  const { params, enabled = true } = opts
  const key = path ? `${path}?${JSON.stringify(params ?? {})}` : null
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!key || !path || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch<T>(path, { params })
      .then((d) => {
        if (!cancelled && alive.current) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled && alive.current) {
          setError(e instanceof ApiError ? e.message : 'Request failed')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce, enabled])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])
  return { data, loading, error, refetch }
}

export function useMutation<T = unknown>(path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(
    async (body?: unknown, params?: FetchOpts['params']) => {
      setLoading(true)
      setError(null)
      try {
        const out = await apiFetch<T>(path, { method, body, params })
        setLoading(false)
        return out
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Request failed'
        setError(msg)
        setLoading(false)
        throw e
      }
    },
    [path, method],
  )
  return { run, loading, error }
}

/* ───────────────────────────── Formatting helpers ───────────────────────────── */

export function fmtDate(iso: string | null | undefined, opts: { withYear?: boolean } = {}) {
  if (!iso) return '—'
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(opts.withYear ? { year: 'numeric' } : {}),
  })
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(String(iso).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function timeAgoISO(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(String(iso).replace(' ', 'T')).getTime()
  if (Number.isNaN(d)) return String(iso).slice(0, 10)
  const mins = Math.max(0, Math.round((Date.now() - d) / 60000))
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return fmtDate(iso, { withYear: true })
}

/* ───────────────────────────── Loading / error states ───────────────────────────── */

export function PageLoader({ label = 'Loading live data…' }: { label?: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-ink-faint" role="status" aria-live="polite">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ember-50 text-ember-600">
        <Icon name="LoaderCircle" size={20} className="animate-spin" />
      </span>
      <p className="text-[13px] font-medium">{label}</p>
    </div>
  )
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="mx-auto mt-16 max-w-md p-8 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-clay-50 text-clay-600">
        <Icon name="CloudOff" size={20} />
      </span>
      <h3 className="mt-4 font-display text-[18px] font-semibold text-ink">Couldn’t load live data</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{message}</p>
      <p className="mt-1 text-[12px] text-ink-faint">Check that the DineIQ API is running, then try again.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="focus-ring mx-auto mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-ink px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink-soft"
        >
          <Icon name="RefreshCw" size={14} /> Retry
        </button>
      )}
    </Card>
  )
}
