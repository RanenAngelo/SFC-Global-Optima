import React, { useState } from 'react'
import { Badge, Button, Card, Icon, IconButton, Tooltip, cn } from './ui/primitives'
import { hash } from '../lib/utils'
import { RANGE_LABELS, useWorkspace } from '../store/app'
import { downloadExport, useMeta, fmtDate } from '../lib/api'
import { useToast } from './ui/overlay'

export { Progress, Stars, Badge, Button, Card, Icon } from './ui/primitives'

/* ───────────────────────────── Food image with generated fallback ───────────────────────────── */
const TILE_THEMES = [
  ['#F6E3D2', '#E2B98F', '#B4733C'],
  ['#EFE7D8', '#CBB894', '#8B6F4E'],
  ['#F7E6E2', '#DDA79E', '#A8503F'],
  ['#E9EFE2', '#BCCFA6', '#6E8C4C'],
  ['#F4EAD8', '#E2C489', '#B4932B'],
]

export function FoodImage({
  src,
  name,
  className,
  ratio = 'square',
  rounded = 'xl',
}: {
  src?: string
  name: string
  className?: string
  ratio?: 'square' | 'wide' | 'tall' | 'fill'
  rounded?: 'none' | 'lg' | 'xl' | '2xl'
}) {
  const [failed, setFailed] = useState(false)
  const ratioClass = {
    square: 'aspect-square',
    wide: 'aspect-[16/10]',
    tall: 'aspect-[4/5]',
    fill: 'h-full w-full',
  }[ratio]
  const roundedClass = { none: '', lg: 'rounded-lg', xl: 'rounded-xl', '2xl': 'rounded-2xl' }[rounded]

  if (src && !failed) {
    return (
      <div className={cn('overflow-hidden bg-canvas-deep', ratioClass, roundedClass, className)}>
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]')}
        />
      </div>
    )
  }

  const h = hash(name)
  const theme = TILE_THEMES[h % TILE_THEMES.length]
  const monogram = name
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div
      className={cn('relative flex items-center justify-center overflow-hidden', ratioClass, roundedClass, className)}
      style={{ background: `linear-gradient(140deg, ${theme[0]} 0%, ${theme[1]} 100%)` }}
      role="img"
      aria-label={name}
    >
      <svg viewBox="0 0 120 120" className="absolute h-[78%] w-[78%] opacity-[0.22]" fill="none">
        <circle cx="60" cy="60" r="46" stroke={theme[2]} strokeWidth="2.5" />
        <circle cx="60" cy="60" r="33" stroke={theme[2]} strokeWidth="1.5" strokeDasharray="4 5" />
      </svg>
      <span className="relative font-display text-[26px] font-semibold tracking-tight" style={{ color: theme[2] }}>
        {monogram}
      </span>
    </div>
  )
}

/* ───────────────────────────── Brand ───────────────────────────── */
export function DineIQMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#B54E17" />
      <path d="M11 8v7a3 3 0 0 0 6 0V8M14 15v9" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M21 8c1.8 1.6 2.6 3.4 2.6 5.4 0 2-1 3.4-2.6 4.2V24" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function EmberMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="12" fill="#1D1B19" />
      <path d="M20 8c2.6 3 5.6 4.6 6.6 7.6.8 2.4-.4 4.6-2.6 5.6.8.6 1.2 1.4 1.2 2.4 0 2-1.8 3.6-4 3.6-1.6 0-3-.8-3.6-2" stroke="#E08349" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M20 8c-2.6 3-5.6 4.6-6.6 7.6-.8 2.4.4 4.6 2.6 5.6-.8.6-1.2 1.4-1.2 2.4 0 2 1.8 3.6 4 3.6 1.6 0 3-.8 3.6-2" stroke="#E08349" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".55" />
      <path d="M20 27v5" stroke="#E08349" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function DemoBanner() {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div className="relative z-40 bg-ink px-4 py-2 text-center text-[12px] font-medium text-white/85">
      <span className="mr-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
        <Icon name="FlaskConical" size={11} /> Prototype
      </span>
      DineIQ UI demo — all orders, prices, analytics and forecasts are fictional placeholders, not real business data.
      <button onClick={() => setOpen(false)} aria-label="Dismiss notice" className="ml-3 rounded p-0.5 align-middle text-white/60 transition-colors hover:text-white">
        <Icon name="X" size={13} />
      </button>
    </div>
  )
}

/* ───────────────────────────── KPI card ───────────────────────────── */
const TONE_STYLES: Record<string, { icon: string; chip: string }> = {
  ember: { icon: 'bg-ember-50 text-ember-600', chip: 'bg-ember-50 text-ember-700' },
  sage: { icon: 'bg-sage-50 text-sage-600', chip: 'bg-sage-50 text-sage-700' },
  clay: { icon: 'bg-clay-50 text-clay-500', chip: 'bg-clay-50 text-clay-600' },
  gold: { icon: 'bg-gold-50 text-gold-600', chip: 'bg-gold-50 text-gold-600' },
  sky: { icon: 'bg-sky-50 text-sky-600', chip: 'bg-sky-50 text-sky-600' },
  neutral: { icon: 'bg-canvas-deep text-ink-muted', chip: 'bg-canvas-deep text-ink-muted' },
}

export function KpiCard({
  label,
  value,
  change,
  compare,
  hint,
  icon = 'Activity',
  tone = 'ember',
  spark,
  onClick,
  active,
}: {
  label: string
  value: string
  change?: number
  compare?: string
  hint?: string
  icon?: string
  tone?: keyof typeof TONE_STYLES | string
  spark?: number[]
  onClick?: () => void
  active?: boolean
}) {
  const t = TONE_STYLES[tone] ?? TONE_STYLES.neutral
  const positive = (change ?? 0) >= 0
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-faint">{label}</p>
            {hint && (
              <Tooltip content={hint}>
                <Icon name="Info" size={12} className="text-ink-faint/70 hover:text-ink-muted" />
              </Tooltip>
            )}
          </div>
          <p className="metric mt-2">{value}</p>
        </div>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', t.icon)}>
          <Icon name={icon} size={17} />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {change !== undefined && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', positive ? 'bg-sage-50 text-sage-700' : 'bg-clay-50 text-clay-600')}>
              <Icon name={positive ? 'ArrowUpRight' : 'ArrowDownRight'} size={12} />
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
          {compare && <span className="text-[11px] text-ink-faint">{compare}</span>}
        </div>
        {spark && (
          <Spark values={spark} color={positive ? '#5E8C4A' : '#96352C'} />
        )}
      </div>
    </>
  )
  if (!onClick) return <Card className={cn('p-4', active && 'border-ember-300 ring-2 ring-ember-100')}>{content}</Card>
  return (
    <Card as="button" onClick={onClick} className={cn('p-4 text-left transition-all hover:border-line-strong hover:shadow-lift', active && 'border-ember-300 ring-2 ring-ember-100')}>
      {content}
    </Card>
  )
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 62
  const h = 22
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 2) + 1},${h - 2 - ((v - min) / span) * (h - 4)}`)
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ───────────────────────────── Toolbars & controls ───────────────────────────── */
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
}

export function ToolbarButton({ icon, children, onClick, active, className }: { icon?: string; children: React.ReactNode; onClick?: () => void; active?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'focus-ring inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-colors',
        active ? 'border-ember-300 bg-ember-50 text-ember-700' : 'border-line-strong bg-white text-ink-soft hover:border-ink-faint hover:text-ink',
        className,
      )}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  )
}

export function DateRangeSelect({ className }: { className?: string }) {
  const { range, setRange } = useWorkspace()
  const [open, setOpen] = useState(false)
  const options: (keyof typeof RANGE_LABELS)[] = ['today', '7d', '30d', '90d', 'mtd', 'custom']
  return (
    <div className={cn('relative', className)}>
      <ToolbarButton icon="CalendarDays" onClick={() => setOpen((o) => !o)} active={open}>
        {RANGE_LABELS[range]}
        <Icon name="ChevronDown" size={13} className="text-ink-faint" />
      </ToolbarButton>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-pop animate-scale-in">
            {options.map((o) => (
              <button
                key={o}
                onClick={() => {
                  setRange(o as any)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
                  range === o ? 'bg-ember-50 text-ember-700' : 'text-ink-soft hover:bg-canvas hover:text-ink',
                )}
              >
                {RANGE_LABELS[o]}
                {range === o && <Icon name="Check" size={14} />}
              </button>
            ))}
            <div className="mt-1 border-t border-line px-2.5 pb-1 pt-2 text-[11px] text-ink-faint">
              Anchored to the dataset window — every view recalculates.
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function LocationSelect({ className, variant = 'toolbar' }: { className?: string; variant?: 'toolbar' | 'select' }) {
  const { location, setLocation } = useWorkspace()
  const { options: meta } = useMeta()
  const options = [
    { value: 'all', label: 'All locations' },
    ...(meta?.restaurants ?? []).map((r) => ({
      value: r.restaurant_id,
      label: `${r.city} · ${r.restaurant_name.replace(/^DineIQ\s+/, '')}`,
    })),
  ]
  const current = options.find((o) => o.value === location) ?? options[0]

  if (variant === 'select') {
    return (
      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="focus-ring h-10 w-full cursor-pointer rounded-xl border border-line-strong bg-white px-3.5 text-sm text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <ToolbarButton icon="MapPin" onClick={() => {}}>
        {current.label}
      </ToolbarButton>
      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        aria-label="Select location"
        className="absolute inset-0 w-full cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="ChevronDown" size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
    </div>
  )
}

export function ExportMenu({
  label = 'Export',
  dataset,
  params,
}: {
  label?: string
  dataset?: string
  params?: Record<string, string | number | boolean | null | undefined>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const { push } = useToast()

  async function download(format: 'csv' | 'xlsx') {
    if (!dataset) return
    setBusy(format)
    try {
      await downloadExport(dataset, format, params)
      push({ title: 'Export ready', body: `${dataset}.${format} downloaded from the live API.`, tone: 'success' })
    } catch (e) {
      push({ title: 'Export failed', body: e instanceof Error ? e.message : 'Unknown error', tone: 'error' })
    } finally {
      setBusy(null)
      setOpen(false)
    }
  }

  function copyLink() {
    try {
      void navigator.clipboard.writeText(window.location.href)
      push({ title: 'Link copied', body: 'View URL copied to clipboard.', tone: 'success' })
    } catch {
      push({ title: 'Copy failed', body: 'Clipboard unavailable in this browser.', tone: 'error' })
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" icon="Download" onClick={() => setOpen((o) => !o)}>
        {label}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-pop animate-scale-in">
            <button
              onClick={() => void download('csv')}
              disabled={!dataset || busy !== null}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name={busy === 'csv' ? 'LoaderCircle' : 'Sheet'} size={14} className={busy === 'csv' ? 'animate-spin' : ''} />
              Download CSV
            </button>
            <button
              onClick={() => void download('xlsx')}
              disabled={!dataset || busy !== null}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name={busy === 'xlsx' ? 'LoaderCircle' : 'Sheet'} size={14} className={busy === 'xlsx' ? 'animate-spin' : ''} />
              Download Excel
            </button>
            <button
              onClick={copyLink}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
            >
              <Icon name="Link" size={14} />
              Copy link to view
            </button>
            <p className="border-t border-line px-2.5 pb-1 pt-2 text-[11px] text-ink-faint">
              {dataset ? `Live export · ${dataset} from the DineIQ API.` : 'No downloadable dataset on this view.'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

/* ───────────────────────────── Demo notes & disclosure ───────────────────────────── */
export function DemoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border border-gold-100 bg-gold-50/70 px-3.5 py-2.5 text-[12px] leading-relaxed text-gold-600', className)}>
      <Icon name="Info" size={14} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  )
}

/** Live-data disclosure strip: replaces DemoNote once a view is API-wired. */
export function LiveNote({ children, className }: { children?: React.ReactNode; className?: string }) {
  const { options } = useMeta()
  const max = (options?.date_range?.max as string | undefined)?.slice(0, 10)
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border border-sage-100 bg-sage-50/70 px-3.5 py-2.5 text-[12px] leading-relaxed text-sage-700', className)}>
      <Icon name="Activity" size={14} className="mt-px shrink-0" />
      <span>
        {children ?? (
          <>
            Live figures served by the DineIQ API from the project dataset
            {max ? <> (orders through {fmtDate(max, { withYear: true })})</> : null}. Filters above recalculate every value.
          </>
        )}
      </span>
    </div>
  )
}

export function LiveBanner() {
  const [open, setOpen] = useState(true)
  const { options } = useMeta()
  if (!open) return null
  const max = (options?.date_range?.max as string | undefined)?.slice(0, 10)
  return (
    <div className="relative z-40 bg-ink px-4 py-2 text-center text-[12px] font-medium text-white/85">
      <span className="mr-2 inline-flex items-center gap-1.5 rounded-full bg-sage-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-sage-400" /> Live
      </span>
      Connected to the DineIQ API — every figure on this page is computed from the project dataset
      {max ? ` (through ${fmtDate(max, { withYear: true })})` : ''}.
      <button onClick={() => setOpen(false)} aria-label="Dismiss notice" className="ml-3 rounded p-0.5 align-middle text-white/60 transition-colors hover:text-white">
        <Icon name="X" size={13} />
      </button>
    </div>
  )
}

export function InfoCard({
  title,
  items,
  tone = 'neutral',
  className,
  icon,
}: {
  title: string
  items: string[]
  tone?: 'neutral' | 'ember' | 'sage' | 'clay'
  className?: string
  icon?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'border-line bg-canvas/60 text-ink-soft',
    ember: 'border-ember-200 bg-ember-50/70 text-ember-800',
    sage: 'border-sage-100 bg-sage-50/70 text-sage-700',
    clay: 'border-clay-100 bg-clay-50/70 text-clay-600',
  }
  return (
    <div className={cn('rounded-xl border p-4', tones[tone], className)}>
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} size={14} />}
        <h4 className="text-[13px] font-semibold">{title}</h4>
      </div>
      <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed opacity-90">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ───────────────────────────── Misc display helpers ───────────────────────────── */
export function MetricRow({ label, value, tone, hint }: { label: string; value: React.ReactNode; tone?: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        {label}
        {hint && (
          <Tooltip content={hint}>
            <Icon name="Info" size={11} className="text-ink-faint/70" />
          </Tooltip>
        )}
      </span>
      <span className={cn('text-[13px] font-semibold tabular-nums text-ink', tone)}>{value}</span>
    </div>
  )
}

export function ProgressRing({ value, size = 54, stroke = 6, color = '#B54E17', children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDE6DD" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold tabular-nums text-ink">{children ?? `${Math.round(value)}%`}</span>
    </div>
  )
}

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    Paid: '#5E8C4A', Completed: '#5E8C4A', Delivered: '#5E8C4A', Active: '#5E8C4A', Healthy: '#5E8C4A',
    Pending: '#C08A16', Preparing: '#C08A16', Low: '#C08A16', Medium: '#C08A16',
    Ready: '#2F6FA8', Scheduled: '#2F6FA8', Out: '#2F6FA8',
    Cancelled: '#96352C', Refunded: '#96352C', Unpaid: '#96352C', Critical: '#96352C', High: '#96352C', Expired: '#726B62',
  }
  const color = map[status.split(' ')[0]] ?? '#9C948A'
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
}
