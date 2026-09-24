import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import { cn } from '../../lib/utils'

export { cn }

/* ─────────────────────────────── Icon ─────────────────────────────── */
export type IconName = keyof typeof Icons

export function Icon({
  name,
  className,
  size = 18,
  style,
}: {
  name: string
  className?: string
  size?: number
  style?: React.CSSProperties
}) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>>)[name]
  if (!Cmp) return <Icons.Circle className={className} size={size} />
  return <Cmp className={className} size={size} style={style} />
}

/* ─────────────────────────────── Button ─────────────────────────────── */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'dark'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ember-600 text-white hover:bg-ember-700 active:bg-ember-800 shadow-sm',
  secondary: 'bg-white text-ink border border-line-strong hover:border-ink-faint hover:bg-canvas',
  ghost: 'text-ink-soft hover:bg-canvas hover:text-ink',
  subtle: 'bg-canvas-deep text-ink-soft hover:bg-line/70 hover:text-ink',
  danger: 'bg-clay-600 text-white hover:bg-clay-500/90',
  dark: 'bg-ink text-white hover:bg-ink-soft',
}
const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: string
  iconRight?: string
  loading?: boolean
  block?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, loading, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'focus-ring inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-150',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        block && 'w-full',
        (disabled || loading) && 'pointer-events-none opacity-50',
        className,
      )}
      {...rest}
    >
      {loading ? <Icon name="Loader2" size={size === 'xs' ? 13 : 15} className="animate-spin" /> : icon ? <Icon name={icon} size={size === 'xs' ? 13 : 16} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={size === 'xs' ? 13 : 16} /> : null}
    </button>
  )
})

export function IconButton({
  icon,
  label,
  className,
  size = 34,
  variant = 'ghost',
  ...rest
}: { icon: string; label: string; size?: number; variant?: 'ghost' | 'outline' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'focus-ring inline-flex items-center justify-center rounded-lg transition-colors',
        variant === 'ghost' ? 'text-ink-muted hover:bg-canvas hover:text-ink' : 'bg-white text-ink-soft border border-line hover:border-line-strong hover:text-ink',
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      <Icon name={icon} size={16} />
    </button>
  )
}

/* ─────────────────────────────── Badge ─────────────────────────────── */
export type Tone = 'ember' | 'sage' | 'clay' | 'gold' | 'sky' | 'neutral'

const BADGE_TONES: Record<Tone, string> = {
  ember: 'bg-ember-50 text-ember-700 border-ember-200',
  sage: 'bg-sage-50 text-sage-700 border-sage-100',
  clay: 'bg-clay-50 text-clay-600 border-clay-100',
  gold: 'bg-gold-50 text-gold-600 border-gold-100',
  sky: 'bg-sky-50 text-sky-600 border-sky-100',
  neutral: 'bg-canvas-deep text-ink-muted border-line',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  icon,
  dot,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
  icon?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  )
}

/* ─────────────────────────────── Card ─────────────────────────────── */
export function Card({
  children,
  className,
  as: As = 'div',
  hover,
  ...rest
}: { children: React.ReactNode; className?: string; as?: React.ElementType; hover?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <As
      className={cn(
        'card',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:border-line-strong',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  )
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
  icon,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  icon?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-canvas-deep text-ink-muted">
              <Icon name={icon} size={14} />
            </span>
          )}
          <h3 className="truncate font-display text-[15px] font-semibold text-ink">{title}</h3>
        </div>
        {subtitle && <p className="mt-1 text-[13px] leading-snug text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  desc,
  actions,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  desc?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && <div className="label mb-1.5">{eyebrow}</div>}
        <h2 className="font-display text-xl font-semibold text-ink sm:text-[26px]">{title}</h2>
        {desc && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ─────────────────────────────── Form fields ─────────────────────────────── */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="flex items-center gap-1 text-[13px] font-semibold text-ink-soft">
          {label}
          {required && <span className="text-clay-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs font-medium text-clay-600">
          <Icon name="AlertCircle" size={12} /> {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}

const FIELD_BASE =
  'focus-ring w-full rounded-xl border bg-white px-3.5 text-sm text-ink placeholder:text-ink-faint transition-colors disabled:cursor-not-allowed disabled:bg-canvas-deep disabled:text-ink-faint'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; icon?: string }>(
  function Input({ className, invalid, icon, ...rest }, ref) {
    return (
      <div className="relative">
        {icon && <Icon name={icon} size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />}
        <input
          ref={ref}
          className={cn(
            FIELD_BASE,
            'h-10',
            icon && 'pl-9',
            invalid ? 'border-clay-500 focus-visible:ring-clay-500/40' : 'border-line-strong hover:border-ink-faint',
            className,
          )}
          {...rest}
        />
      </div>
    )
  },
)

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          FIELD_BASE,
          'min-h-[92px] resize-y py-2.5',
          invalid ? 'border-clay-500' : 'border-line-strong hover:border-ink-faint',
          className,
        )}
        {...rest}
      />
    )
  },
)

export function Select({
  className,
  options,
  invalid,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options?: { label: string; value: string }[]; invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        className={cn(
          FIELD_BASE,
          'h-10 cursor-pointer appearance-none pr-9',
          invalid ? 'border-clay-500' : 'border-line-strong hover:border-ink-faint',
          className,
        )}
        {...rest}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : rest.children}
      </select>
      <Icon name="ChevronDown" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
    </div>
  )
}

export function Checkbox({ label, desc, className, ...rest }: { label?: React.ReactNode; desc?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input
        type="checkbox"
        className="focus-ring mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong text-ember-600 accent-ember-600"
        {...rest}
      />
      <span className="min-w-0">
        {label && <span className="block text-sm font-medium text-ink">{label}</span>}
        {desc && <span className="block text-xs leading-snug text-ink-muted">{desc}</span>}
      </span>
    </label>
  )
}

export function Radio({ label, desc, className, ...rest }: { label?: React.ReactNode; desc?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input type="radio" className="focus-ring mt-0.5 h-4 w-4 shrink-0 cursor-pointer border-line-strong accent-ember-600" {...rest} />
      <span className="min-w-0">
        {label && <span className="block text-sm font-medium text-ink">{label}</span>}
        {desc && <span className="block text-xs leading-snug text-ink-muted">{desc}</span>}
      </span>
    </label>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  desc,
  size = 'md',
  disabled,
  defaultChecked,
}: {
  checked?: boolean
  onChange?: (v: boolean) => void
  label?: React.ReactNode
  desc?: React.ReactNode
  size?: 'sm' | 'md'
  disabled?: boolean
  defaultChecked?: boolean
}) {
  const [internal, setInternal] = useState(!!defaultChecked)
  const controlled = checked !== undefined
  const isOn = controlled ? !!checked : internal
  const toggle = (v: boolean) => {
    if (!controlled) setInternal(v)
    onChange?.(v)
  }
  const w = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'
  const k = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'
  const on = size === 'sm' ? 'translate-x-4' : 'translate-x-5'
  const inner = (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      disabled={disabled}
      onClick={() => toggle(!isOn)}
      className={cn('focus-ring relative shrink-0 rounded-full transition-colors duration-200', w, isOn ? 'bg-sage-600' : 'bg-line-strong', disabled && 'opacity-50')}
    >
      <span
        className={cn('absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200', k, isOn ? on : 'translate-x-0')}
        style={{ height: size === 'sm' ? 14 : 18, width: size === 'sm' ? 14 : 18 }}
      />
    </button>
  )
  if (!label) return inner
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {desc && <span className="block text-xs leading-snug text-ink-muted">{desc}</span>}
      </span>
      {inner}
    </label>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  onClear,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  onClear?: () => void
}) {
  return (
    <div className={cn('relative', className)}>
      <Icon name="Search" size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(FIELD_BASE, 'h-10 border-line-strong pl-9 pr-9 hover:border-ink-faint')}
      />
      {value && (
        <button
          onClick={() => {
            onChange('')
            onClear?.()
          }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
        >
          <Icon name="X" size={13} />
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────── Tabs / Segmented ─────────────────────────────── */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
  variant = 'underline',
}: {
  tabs: { label: string; value: string; count?: number }[]
  value: string
  onChange: (v: string) => void
  className?: string
  variant?: 'underline' | 'pill'
}) {
  if (variant === 'pill') {
    return (
      <div className={cn('inline-flex flex-wrap gap-1 rounded-xl bg-canvas-deep p-1', className)}>
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              'focus-ring rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all',
              value === t.value ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
            {t.count !== undefined && <span className={cn('ml-1.5 text-[11px]', value === t.value ? 'text-ember-600' : 'text-ink-faint')}>{t.count}</span>}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className={cn('scrollbar-none flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'focus-ring relative whitespace-nowrap px-3.5 py-2.5 text-[13px] font-semibold transition-colors',
            value === t.value ? 'text-ember-700' : 'text-ink-muted hover:text-ink',
          )}
        >
          <span className="flex items-center gap-1.5">
            {t.label}
            {t.count !== undefined && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', value === t.value ? 'bg-ember-100 text-ember-700' : 'bg-canvas-deep text-ink-faint')}>
                {t.count}
              </span>
            )}
          </span>
          {value === t.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ember-600" />}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────── Tooltip ─────────────────────────────── */
export function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'bottom' }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      {open && (
        <span
          className={cn(
            'pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white shadow-pop animate-fade-in',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

/* ─────────────────────────────── Progress ─────────────────────────────── */
export function Progress({ value, className, tone = 'ember', height = 6 }: { value: number; className?: string; tone?: Tone; height?: number }) {
  const tones: Record<Tone, string> = {
    ember: 'bg-ember-500', sage: 'bg-sage-500', clay: 'bg-clay-500', gold: 'bg-gold-500', sky: 'bg-sky-500', neutral: 'bg-ink-faint',
  }
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-line', className)} style={{ height }}>
      <div className={cn('h-full rounded-full transition-all duration-500', tones[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

/* ─────────────────────────────── Avatar ─────────────────────────────── */
export function Avatar({ name, tone = '#B54E17', size = 36, className }: { name: string; tone?: string; size?: number; className?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ background: tone, width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  )
}

/* ─────────────────────────────── Misc ─────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function Delta({ value, suffix = '%', className, invert }: { value: number; suffix?: string; className?: string; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
        positive ? 'text-sage-600' : 'text-clay-600',
        value === 0 && 'text-ink-faint',
        className,
      )}
    >
      <Icon name={value === 0 ? 'Minus' : value > 0 ? 'ArrowUpRight' : 'ArrowDownRight'} size={13} />
      {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  )
}

export function Stars({ value, size = 12, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icons.Star key={i} size={size} className={i <= Math.round(value) ? 'fill-gold-500 text-gold-500' : 'fill-line text-line'} />
      ))}
    </span>
  )
}

export function Rating({ value, reviews, size = 12 }: { value: number; reviews?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-md bg-gold-50 px-1.5 py-0.5 text-[11px] font-bold text-gold-600">
        <Icons.Star size={size} className="fill-gold-500 text-gold-500" />
        {value.toFixed(1)}
      </span>
      {reviews !== undefined && <span className="text-[11px] text-ink-faint">({reviews.toLocaleString()})</span>}
    </span>
  )
}

export function SpiceLevel({ level }: { level: number }) {
  if (!level) return null
  return (
    <span className="inline-flex items-center gap-0.5" title={`Spice level ${level} of 3`}>
      {[1, 2, 3].map((i) => (
        <Icons.Flame key={i} size={11} className={i <= level ? 'fill-clay-500 text-clay-500' : 'text-line-strong'} />
      ))}
    </span>
  )
}

export function Chip({ children, active, onClick, className }: { children: React.ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'focus-ring whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all',
        active ? 'border-ember-600 bg-ember-600 text-white' : 'border-line-strong bg-white text-ink-soft hover:border-ink-faint hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────────── Dropdown ─────────────────────────────── */
export function Dropdown({
  trigger,
  children,
  align = 'right',
  width = 220,
  className,
}: {
  trigger: (open: boolean) => React.ReactNode
  children: (close: () => void) => React.ReactNode
  align?: 'left' | 'right'
  width?: number
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div className={cn('relative', className)} ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="focus-ring rounded-lg" aria-haspopup="menu" aria-expanded={open}>
        {trigger(open)}
      </button>
      {open && (
        <div
          role="menu"
          className={cn('absolute z-40 mt-2 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-pop animate-scale-in', align === 'right' ? 'right-0' : 'left-0')}
          style={{ width }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItemRow({
  icon,
  children,
  onClick,
  tone = 'default',
  disabled,
}: {
  icon?: string
  children: React.ReactNode
  onClick?: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
        tone === 'danger' ? 'text-clay-600 hover:bg-clay-50' : 'text-ink-soft hover:bg-canvas hover:text-ink',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {icon && <Icon name={icon} size={15} />}
      <span className="flex-1 truncate">{children}</span>
    </button>
  )
}

/* ─────────────────────────────── Tabs context (kept simple) ─────────────────────────────── */
export const TooltipContext = createContext<string>('')
export const useTooltip = () => useContext(TooltipContext)

export { useId }
