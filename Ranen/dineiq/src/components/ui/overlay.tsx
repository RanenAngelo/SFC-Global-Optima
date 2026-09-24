import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Icon, Button } from './primitives'
import { cn } from '../../lib/utils'

/* ─────────────────────────────── Toasts ─────────────────────────────── */
type Toast = { id: number; title: string; body?: string; tone: 'success' | 'error' | 'info' }
type ToastCtx = { push: (t: Omit<Toast, 'id'>) => void }
const ToastContext = createContext<ToastCtx>({ push: () => {} })
export const useToast = () => useContext(ToastContext)

const TOAST_STYLE: Record<Toast['tone'], { icon: string; ring: string; bg: string }> = {
  success: { icon: 'CheckCircle2', ring: 'text-sage-600', bg: 'bg-sage-50' },
  error: { icon: 'AlertTriangle', ring: 'text-clay-600', bg: 'bg-clay-50' },
  info: { icon: 'Info', ring: 'text-sky-600', bg: 'bg-sky-50' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s, { ...t, id }])
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 3800)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => {
          const s = TOAST_STYLE[t.tone]
          return (
            <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-pop animate-slide-in">
              <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', s.bg, s.ring)}>
                <Icon name={s.icon} size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs leading-snug text-ink-muted">{t.body}</p>}
              </div>
              <button
                aria-label="Dismiss"
                onClick={() => setItems((s) => s.filter((i) => i.id !== t.id))}
                className="rounded-md p-1 text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
              >
                <Icon name="X" size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

/* ─────────────────────────────── Modal ─────────────────────────────── */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  icon,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  icon?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop animate-fade-up sm:rounded-2xl',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ember-50 text-ember-600">
                <Icon name={icon} size={17} />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="font-display text-[17px] font-semibold text-ink">{title}</h3>
              {subtitle && <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="focus-ring -mr-1 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-canvas hover:text-ink">
            <Icon name="X" size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  icon?: string
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      icon={icon ?? (tone === 'danger' ? 'AlertTriangle' : 'CheckCircle2')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={cn('rounded-xl border p-3.5 text-[13px] leading-relaxed', tone === 'danger' ? 'border-clay-100 bg-clay-50 text-clay-600' : 'border-sage-100 bg-sage-50 text-sage-700')}>
        {message}
      </div>
    </Modal>
  )
}

/* ─────────────────────────────── Drawer ─────────────────────────────── */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
  badge,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: 'md' | 'lg' | 'xl'
  badge?: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const widths = { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn('relative z-10 flex h-full w-full flex-col bg-white shadow-pop animate-slide-in', widths[width])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="truncate font-display text-[17px] font-semibold text-ink">{title}</h3>
              {badge}
            </div>
            {subtitle && <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close panel" className="focus-ring -mr-1 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-canvas hover:text-ink">
            <Icon name="X" size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas/40">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}

/* ─────────────────────────────── Popover panel ─────────────────────────────── */
export function Panel({
  open,
  onClose,
  children,
  className,
  width = 300,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  width?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} className={cn('absolute right-0 z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-pop animate-scale-in', className)} style={{ width }}>
      {children}
    </div>
  )
}
