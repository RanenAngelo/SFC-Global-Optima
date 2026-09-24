import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Pakistani Rupee formatting — presentation only. */
export function money(value: number, opts: { decimals?: boolean; compact?: boolean } = {}) {
  const { decimals = false, compact = false } = opts
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
    return `$${decimals ? value.toFixed(2) : value}`
  }
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`
}

/** @deprecated dataset currency is USD — use money(). Kept for unmigrated views. */
export function pkr(value: number, opts: { decimals?: boolean; compact?: boolean } = {}) {
  const { decimals = false, compact = false } = opts
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `Rs. ${(value / 1_000_000).toFixed(2)}M`
    if (Math.abs(value) >= 1_000) return `Rs. ${(value / 1_000).toFixed(1)}K`
    return `Rs. ${value}`
  }
  return `Rs. ${value.toLocaleString('en-PK', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`
}

export function num(value: number, digits = 0) {
  return value.toLocaleString('en-PK', { maximumFractionDigits: digits })
}

export function pct(value: number, digits = 1) {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`
}

export function timeAgo(minutes: number) {
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${Math.round(minutes)} min ago`
  const h = Math.round(minutes / 60)
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`
  const d = Math.round(h / 24)
  return `${d} day${d > 1 ? 's' : ''} ago`
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

/** Deterministic pseudo-value helper used ONLY to fill demo UI placeholders. */
export function hash(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length]
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function classNames(...c: ClassValue[]) {
  return cn(c)
}

/** Local-storage backed state (UI preferences only — no business data persistence). */
export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`dineiq:${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writePref<T>(key: string, value: T) {
  try {
    localStorage.setItem(`dineiq:${key}`, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
