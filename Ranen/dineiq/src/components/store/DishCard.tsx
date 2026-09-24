import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Icon, Rating, SpiceLevel, cn } from '../ui/primitives'
import { FoodImage } from '../shared'
import { useCart } from '../../store/app'
import { useFavourites } from '../../store/app'
import { useToast } from '../ui/overlay'
import { MenuItem } from '../../lib/data/menu'
import { pkr } from '../../lib/utils'

export function QtyStepper({
  qty,
  onChange,
  size = 'md',
  className,
}: {
  qty: number
  onChange: (v: number) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const h = size === 'sm' ? 'h-8' : 'h-9'
  return (
    <div className={cn('inline-flex items-center rounded-xl border border-line-strong bg-white', h, className)}>
      <button
        onClick={() => onChange(qty - 1)}
        aria-label="Decrease quantity"
        className="focus-ring flex h-full w-8 items-center justify-center rounded-l-xl text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
      >
        <Icon name={qty === 1 ? 'Trash2' : 'Minus'} size={14} />
      </button>
      <span className={cn('w-8 text-center text-[13px] font-bold tabular-nums text-ink')}>{qty}</span>
      <button
        onClick={() => onChange(qty + 1)}
        aria-label="Increase quantity"
        className="focus-ring flex h-full w-8 items-center justify-center rounded-r-xl text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
      >
        <Icon name="Plus" size={14} />
      </button>
    </div>
  )
}

export function AddToCartControl({ item, compact }: { item: MenuItem; compact?: boolean }) {
  const { lines, add, setQty } = useCart()
  const { push } = useToast()
  const [flash, setFlash] = useState(false)

  const inCart = lines
    .filter((l) => l.slug === item.slug)
    .reduce((s, l) => s + l.qty, 0)

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 900)
    return () => clearTimeout(t)
  }, [flash])

  if (!item.available) {
    return (
      <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-canvas px-3.5 text-[13px] font-semibold text-ink-faint">
        <Icon name="Clock" size={14} /> Unavailable today
      </span>
    )
  }

  if (inCart > 0) {
    return (
      <QtyStepper
        qty={inCart}
        onChange={(v) => {
          const line = [...lines].reverse().find((l) => l.slug === item.slug)
          if (line) setQty(line.lineId, v)
        }}
      />
    )
  }

  return (
    <button
      onClick={() => {
        add(item)
        setFlash(true)
        push({ title: `${item.name} added to cart`, body: `${pkr(item.price)} · ${item.prep} prep`, tone: 'success' })
      }}
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-ember-600 font-semibold text-white shadow-sm transition-all hover:bg-ember-700 active:scale-[.97]',
        compact ? 'h-9 w-9' : 'h-9 px-4 text-[13px]',
        flash && 'animate-scale-in',
      )}
      aria-label={`Add ${item.name} to cart`}
    >
      <Icon name="Plus" size={15} />
      {!compact && 'Add'}
    </button>
  )
}

export function DishCard({ item, layout = 'grid' }: { item: MenuItem; layout?: 'grid' | 'row' }) {
  const { toggle, isFav } = useFavourites()
  const fav = isFav(item.slug)

  if (layout === 'row') {
    return (
      <div className="group flex gap-3.5 rounded-2xl border border-line bg-white p-3 transition-all hover:border-line-strong hover:shadow-card">
        <Link to={`/menu/${item.slug}`} className="shrink-0">
          <FoodImage src={item.img} name={item.name} className="h-20 w-20 sm:h-24 sm:w-24" ratio="fill" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/menu/${item.slug}`} className="min-w-0">
              <h4 className="truncate font-display text-[15px] font-semibold text-ink group-hover:text-ember-700">{item.name}</h4>
            </Link>
            <button
              onClick={() => toggle(item.slug)}
              aria-label={fav ? 'Remove from favourites' : 'Save to favourites'}
              className={cn('focus-ring -mr-1 -mt-1 rounded-lg p-1.5 transition-colors', fav ? 'text-clay-500' : 'text-ink-faint hover:text-clay-500')}
            >
              <Icon name="Heart" size={15} className={fav ? 'fill-clay-500' : ''} />
            </button>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-muted">{item.desc}</p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <Rating value={item.rating} reviews={item.reviews} />
            <SpiceLevel level={item.spice} />
          </div>
          <div className="mt-auto flex items-end justify-between gap-3 pt-2.5">
            <span className="font-display text-[16px] font-semibold text-ink">{pkr(item.price)}</span>
            <AddToCartControl item={item} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:border-line-strong')}>
      <Link to={`/menu/${item.slug}`} className="relative block">
        <FoodImage src={item.img} name={item.name} ratio="wide" rounded="none" />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-full bg-white/94 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink shadow-sm backdrop-blur">
              {t}
            </span>
          ))}
        </div>
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/72 backdrop-blur-[2px]">
            <span className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white">Unavailable</span>
          </div>
        )}
      </Link>

      <button
        onClick={() => toggle(item.slug)}
        aria-label={fav ? 'Remove from favourites' : 'Save to favourites'}
        className={cn(
          'focus-ring absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/94 shadow-sm backdrop-blur transition-colors',
          fav ? 'text-clay-500' : 'text-ink-faint hover:text-clay-500',
        )}
      >
        <Icon name="Heart" size={14} className={fav ? 'fill-clay-500' : ''} />
      </button>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center gap-2">
          <Rating value={item.rating} reviews={item.reviews} />
          <SpiceLevel level={item.spice} />
        </div>
        <Link to={`/menu/${item.slug}`}>
          <h4 className="mt-1.5 font-display text-[15.5px] font-semibold leading-snug text-ink transition-colors group-hover:text-ember-700">
            {item.name}
          </h4>
        </Link>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">{item.desc}</p>
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
          <Icon name="Clock" size={12} />
          {item.prep}
          <span className="text-line-strong">•</span>
          {item.kcal} kcal
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 pt-0.5">
          <span className="font-display text-[17px] font-semibold text-ink">{pkr(item.price)}</span>
          <AddToCartControl item={item} />
        </div>
      </div>
    </div>
  )
}

export function DishCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="skeleton aspect-[16/10] rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-5 w-16" />
          <div className="skeleton h-9 w-16 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export { Badge }
